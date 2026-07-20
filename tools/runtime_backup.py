"""Create, verify, and restore quiesced Battle v2 runtime backup bundles.

The SQLite database is copied with SQLite's online backup API, never with a
raw file copy.  The mission-settlement fallback sidecar is bundled separately
because SQLite cannot include it.  Operators must stop/quiesce the single
authoritative worker before invoking ``backup`` so those two durable sources
represent one release point.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import shutil
import sqlite3
import stat
import sys
import uuid
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from jjk_arena.battle_v2.runtime_store import SCHEMA_VERSION


BACKUP_FORMAT_VERSION = 1
DATABASE_FILE = "runtime.sqlite3"
SIDECAR_FILE = "mission-settlement-fallback.jsonl"
MANIFEST_FILE = "manifest.json"
SIDECAR_SUFFIX = ".mission-settlement-fallback.jsonl"
RESTORE_MARKER_SUFFIX = "-restore-complete.json"
SUPPORTED_BACKUP_SCHEMA_VERSIONS = frozenset({4, 5, 6})
COUNTED_TABLES = (
    "first_creation_profiles",
    "battle_replays",
    "analytics_events",
    "mission_settlement_outbox",
)
SCHEMA_FOUR_TABLES = COUNTED_TABLES[:-1]
REQUIRED_TABLES_BY_SCHEMA = {
    4: SCHEMA_FOUR_TABLES,
    5: ("mission_settlement_outbox",),
    6: COUNTED_TABLES,
}


class RuntimeBackupError(RuntimeError):
    """The requested backup operation is unsafe or failed verification."""


def settlement_sidecar_path(database_path: Path) -> Path:
    return database_path.with_name(f"{database_path.name}{SIDECAR_SUFFIX}")


def restore_completion_marker_path(database_path: Path) -> Path:
    return database_path.with_name(f"{database_path.name}{RESTORE_MARKER_SUFFIX}")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _fsync_file(path: Path) -> None:
    # Windows requires a writable descriptor for fsync/FlushFileBuffers.
    with path.open("r+b") as handle:
        os.fsync(handle.fileno())


def _fsync_directory(path: Path) -> None:
    """Persist directory entries on platforms that expose directory fsync."""

    if os.name == "nt":
        return
    flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0)
    descriptor = os.open(path, flags)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def _make_private(path: Path) -> None:
    os.chmod(path, 0o600)


def _reserve_private_file(path: Path) -> None:
    """Create an empty destination exclusively without a world-readable window."""

    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    os.close(descriptor)
    _make_private(path)


def _require_private_mode(path: Path, *, directory: bool = False) -> None:
    # Windows chmod does not manage DACLs. The runbook therefore requires the
    # backup parent itself to have an operator-only ACL on Windows.
    if os.name == "nt":
        return
    mode = stat.S_IMODE(path.stat().st_mode)
    if mode & 0o077:
        kind = "directory" if directory else "file"
        raise RuntimeBackupError(f"runtime backup {kind} is not private: {path.name}")


def _sqlite_uri(path: Path) -> str:
    return f"{path.resolve().as_uri()}?mode=ro"


def inspect_runtime_database(path: str | Path) -> dict[str, Any]:
    """Return privacy-safe integrity/schema/count evidence for one database."""

    database = Path(path)
    if not database.is_file():
        raise RuntimeBackupError(f"runtime database does not exist: {database}")
    try:
        with closing(sqlite3.connect(_sqlite_uri(database), uri=True, timeout=5.0)) as connection:
            integrity_rows = [str(row[0]) for row in connection.execute("PRAGMA integrity_check")]
            if integrity_rows != ["ok"]:
                raise RuntimeBackupError(
                    f"runtime database failed integrity_check: {integrity_rows!r}"
                )
            version_row = connection.execute(
                "SELECT value FROM runtime_meta WHERE key = 'schema_version'"
            ).fetchone()
            if version_row is None:
                raise RuntimeBackupError("runtime database has no schema_version")
            schema_version = int(version_row[0])
            if (
                schema_version not in SUPPORTED_BACKUP_SCHEMA_VERSIONS
                or schema_version > SCHEMA_VERSION
            ):
                raise RuntimeBackupError(
                    f"runtime schema {schema_version} is not one of the supported backup "
                    f"schemas {sorted(SUPPORTED_BACKUP_SCHEMA_VERSIONS)!r}"
                )
            table_names = {
                str(row[0])
                for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table'"
                )
            }
            required_tables = REQUIRED_TABLES_BY_SCHEMA[schema_version]
            missing = [table for table in required_tables if table not in table_names]
            if missing:
                raise RuntimeBackupError(f"runtime database is missing tables: {missing!r}")
            counts = {
                table: int(connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0])
                for table in COUNTED_TABLES
                if table in table_names
            }
    except RuntimeBackupError:
        raise
    except (OSError, sqlite3.Error, TypeError, ValueError) as exc:
        raise RuntimeBackupError(f"could not inspect runtime database: {exc}") from exc
    return {
        "integrity_check": "ok",
        "schema_version": schema_version,
        "row_counts": counts,
    }


def inspect_settlement_sidecar(path: str | Path) -> dict[str, int]:
    """Validate one private JSONL sidecar without exposing its player data."""

    sidecar = Path(path)
    if not sidecar.is_file() or sidecar.is_symlink():
        raise RuntimeBackupError(f"settlement sidecar is not a regular file: {sidecar}")
    records = 0
    try:
        with sidecar.open("r", encoding="utf-8", newline="") as handle:
            for line_number, line in enumerate(handle, start=1):
                if not line.endswith("\n"):
                    raise RuntimeBackupError(
                        f"settlement sidecar line {line_number} is truncated"
                    )
                if not line.strip():
                    raise RuntimeBackupError(
                        f"settlement sidecar line {line_number} is empty"
                    )
                try:
                    record = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise RuntimeBackupError(
                        f"settlement sidecar line {line_number} is not valid JSON"
                    ) from exc
                if not isinstance(record, dict):
                    raise RuntimeBackupError(
                        f"settlement sidecar line {line_number} must be an object"
                    )
                match_id = record.get("match_id")
                player_id = record.get("player_id")
                progress = record.get("progress")
                finished_at = record.get("finished_at")
                valid_finished_at = (
                    "finished_at" not in record
                    or (
                        isinstance(finished_at, (int, float))
                        and not isinstance(finished_at, bool)
                        and math.isfinite(float(finished_at))
                    )
                )
                if (
                    not isinstance(match_id, str)
                    or not match_id.strip()
                    or not isinstance(player_id, str)
                    or not player_id.strip()
                    or not isinstance(progress, dict)
                    or not valid_finished_at
                ):
                    raise RuntimeBackupError(
                        f"settlement sidecar line {line_number} has an invalid record shape"
                    )
                records += 1
    except RuntimeBackupError:
        raise
    except (OSError, UnicodeError) as exc:
        raise RuntimeBackupError(f"could not inspect settlement sidecar: {exc}") from exc
    if records == 0:
        raise RuntimeBackupError("settlement sidecar is empty")
    return {"records": records}


def _manifest_entry(path: Path) -> dict[str, Any]:
    return {
        "file": path.name,
        "bytes": path.stat().st_size,
        "sha256": sha256_file(path),
    }


def create_runtime_backup(
    database_path: str | Path,
    backup_directory: str | Path,
    *,
    quiesced: bool,
) -> dict[str, Any]:
    """Create one atomic, self-verifying database-plus-sidecar bundle."""

    if not quiesced:
        raise RuntimeBackupError(
            "backup requires a quiesced/stopped authoritative worker so the database "
            "and settlement sidecar share one release point"
        )
    source = Path(database_path).resolve()
    destination = Path(backup_directory).resolve()
    if not source.is_file():
        raise RuntimeBackupError(f"runtime database does not exist: {source}")
    if destination.exists():
        raise RuntimeBackupError(f"backup destination already exists: {destination}")
    if source == destination or destination in source.parents:
        raise RuntimeBackupError("database and backup destination must be distinct")

    # Validate before creating any output, then stage beside the destination so
    # hard-link publication stays on one filesystem.
    source_evidence = inspect_runtime_database(source)
    destination.parent.mkdir(parents=True, exist_ok=True)
    staging = destination.with_name(f".{destination.name}.tmp-{uuid.uuid4().hex}")
    staging.mkdir(mode=0o700)
    os.chmod(staging, 0o700)
    backup_database = staging / DATABASE_FILE
    published: dict[Path, tuple[int, int]] = {}
    destination_identity: tuple[int, int] | None = None
    try:
        with closing(sqlite3.connect(_sqlite_uri(source), uri=True, timeout=5.0)) as source_connection:
            with closing(sqlite3.connect(backup_database, timeout=5.0)) as backup_connection:
                source_connection.backup(backup_connection)
                backup_connection.commit()
                # Publish one self-contained SQLite file. The restored runtime
                # re-enables WAL on startup; keeping the bundle in DELETE mode
                # prevents verification from creating unmanifested -wal/-shm
                # files beside the snapshot.
                backup_connection.execute("PRAGMA wal_checkpoint(TRUNCATE)").fetchone()
                journal_mode = backup_connection.execute(
                    "PRAGMA journal_mode = DELETE"
                ).fetchone()[0]
                if str(journal_mode).lower() != "delete":
                    raise RuntimeBackupError(
                        "backup database could not be made self-contained"
                    )
        _make_private(backup_database)
        _fsync_file(backup_database)
        backup_evidence = inspect_runtime_database(backup_database)
        if backup_evidence != source_evidence:
            raise RuntimeBackupError("backup database evidence differs from the quiesced source")

        source_sidecar = settlement_sidecar_path(source)
        sidecar_entry = None
        if source_sidecar.exists():
            sidecar_evidence = inspect_settlement_sidecar(source_sidecar)
            source_sidecar_entry = {
                **_manifest_entry(source_sidecar),
                **sidecar_evidence,
            }
            backup_sidecar = staging / SIDECAR_FILE
            shutil.copyfile(source_sidecar, backup_sidecar)
            _make_private(backup_sidecar)
            _fsync_file(backup_sidecar)
            copied_sidecar_evidence = inspect_settlement_sidecar(backup_sidecar)
            copied_sidecar_entry = {
                **_manifest_entry(backup_sidecar),
                **copied_sidecar_evidence,
            }
            if (
                copied_sidecar_entry["bytes"] != source_sidecar_entry["bytes"]
                or copied_sidecar_entry["sha256"] != source_sidecar_entry["sha256"]
                or copied_sidecar_evidence != sidecar_evidence
                or _manifest_entry(source_sidecar) != {
                    key: source_sidecar_entry[key]
                    for key in ("file", "bytes", "sha256")
                }
            ):
                raise RuntimeBackupError(
                    "backup settlement sidecar evidence differs from the quiesced source"
                )
            sidecar_entry = copied_sidecar_entry

        manifest = {
            "format_version": BACKUP_FORMAT_VERSION,
            "created_at_utc": datetime.now(timezone.utc).isoformat(),
            "database": {
                **_manifest_entry(backup_database),
                **backup_evidence,
            },
            "settlement_sidecar": sidecar_entry,
        }
        manifest_path = staging / MANIFEST_FILE
        manifest_path.write_text(
            json.dumps(manifest, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        _make_private(manifest_path)
        _fsync_file(manifest_path)
        _require_private_mode(staging, directory=True)
        for private_file in staging.iterdir():
            _require_private_mode(private_file)
        _fsync_directory(staging)

        # Claim the destination name with an exclusive mkdir. Portable
        # os.rename() is allowed to replace an empty directory on POSIX, which
        # would make the preceding exists() check an unsafe TOCTOU boundary.
        try:
            destination.mkdir(mode=0o700)
        except FileExistsError as exc:
            raise RuntimeBackupError(
                f"backup destination appeared during publication: {destination}"
            ) from exc
        os.chmod(destination, 0o700)
        destination_identity = _file_identity(destination)

        # The manifest is the completion signal and is linked last. A crash or
        # error before that point leaves an unverifiable incomplete directory,
        # never a bundle that verify_runtime_backup can mistake for complete.
        for name in (DATABASE_FILE, SIDECAR_FILE):
            source_file = staging / name
            if not source_file.exists():
                continue
            target_file = destination / name
            published[target_file] = _install_file_no_replace(source_file, target_file)
        _fsync_directory(destination)
        target_manifest = destination / MANIFEST_FILE
        published[target_manifest] = _install_file_no_replace(
            manifest_path,
            target_manifest,
        )
        _fsync_directory(destination)
        shutil.rmtree(staging)
        _fsync_directory(destination.parent)
        return manifest
    except Exception as exc:
        shutil.rmtree(staging, ignore_errors=True)
        for published_path, identity in reversed(tuple(published.items())):
            try:
                _unlink_if_identity(published_path, identity)
            except OSError:
                pass
        if destination_identity is not None:
            try:
                _rmdir_if_identity(destination, destination_identity)
            except OSError:
                pass
        try:
            _fsync_directory(destination.parent)
        except OSError:
            pass
        if isinstance(exc, RuntimeBackupError):
            raise
        raise RuntimeBackupError(f"could not create runtime backup: {exc}") from exc


def verify_runtime_backup(backup_directory: str | Path) -> dict[str, Any]:
    """Fail closed unless the manifest, hashes, integrity, and schema agree."""

    bundle = Path(backup_directory).resolve()
    if not bundle.is_dir() or bundle.is_symlink():
        raise RuntimeBackupError(f"backup bundle is not a regular directory: {bundle}")
    _require_private_mode(bundle, directory=True)
    manifest_path = bundle / MANIFEST_FILE
    if not manifest_path.is_file() or manifest_path.is_symlink():
        raise RuntimeBackupError(f"backup manifest does not exist: {manifest_path}")
    _require_private_mode(manifest_path)
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeBackupError(f"backup manifest is unreadable: {exc}") from exc
    if not isinstance(manifest, dict):
        raise RuntimeBackupError("backup manifest must be a JSON object")
    if manifest.get("format_version") != BACKUP_FORMAT_VERSION:
        raise RuntimeBackupError("unsupported runtime backup format")

    database_entry = manifest.get("database")
    if not isinstance(database_entry, dict) or database_entry.get("file") != DATABASE_FILE:
        raise RuntimeBackupError("backup manifest has an invalid database entry")
    database = bundle / DATABASE_FILE
    if not database.is_file() or database.is_symlink():
        raise RuntimeBackupError("backup database is missing")
    _require_private_mode(database)
    if database.stat().st_size != database_entry.get("bytes"):
        raise RuntimeBackupError("backup database size does not match its manifest")
    if sha256_file(database) != database_entry.get("sha256"):
        raise RuntimeBackupError("backup database hash does not match its manifest")
    evidence = inspect_runtime_database(database)
    for key in ("integrity_check", "schema_version", "row_counts"):
        if evidence[key] != database_entry.get(key):
            raise RuntimeBackupError(f"backup database {key} does not match its manifest")

    sidecar_entry = manifest.get("settlement_sidecar")
    if sidecar_entry is not None:
        if not isinstance(sidecar_entry, dict) or sidecar_entry.get("file") != SIDECAR_FILE:
            raise RuntimeBackupError("backup manifest has an invalid settlement sidecar entry")
        sidecar = bundle / SIDECAR_FILE
        if not sidecar.is_file() or sidecar.is_symlink():
            raise RuntimeBackupError("backup settlement sidecar is missing")
        _require_private_mode(sidecar)
        if sidecar.stat().st_size != sidecar_entry.get("bytes"):
            raise RuntimeBackupError("backup settlement sidecar size does not match its manifest")
        if sha256_file(sidecar) != sidecar_entry.get("sha256"):
            raise RuntimeBackupError("backup settlement sidecar hash does not match its manifest")
        sidecar_evidence = inspect_settlement_sidecar(sidecar)
        if sidecar_evidence["records"] != sidecar_entry.get("records"):
            raise RuntimeBackupError(
                "backup settlement sidecar record count does not match its manifest"
            )
    elif (bundle / SIDECAR_FILE).exists():
        raise RuntimeBackupError(
            "backup contains an unexpected settlement sidecar not recorded in its manifest"
        )
    expected_files = {MANIFEST_FILE, DATABASE_FILE}
    if sidecar_entry is not None:
        expected_files.add(SIDECAR_FILE)
    actual_files = {entry.name for entry in bundle.iterdir()}
    if actual_files != expected_files:
        raise RuntimeBackupError("backup bundle contains unexpected files")
    return manifest


def _file_identity(path: Path) -> tuple[int, int]:
    metadata = path.stat(follow_symlinks=False)
    return int(metadata.st_dev), int(metadata.st_ino)


def _install_file_no_replace(source: Path, destination: Path) -> tuple[int, int]:
    """Publish a staged file without replacing any path created by another actor."""

    identity = _file_identity(source)
    try:
        os.link(source, destination, follow_symlinks=False)
    except FileExistsError as exc:
        raise RuntimeBackupError(
            f"restore destination appeared during installation: {destination}"
        ) from exc
    return identity


def _unlink_if_identity(path: Path, identity: tuple[int, int]) -> None:
    """Remove only a file this invocation installed and that was not replaced."""

    try:
        current_identity = _file_identity(path)
    except FileNotFoundError:
        return
    if current_identity == identity:
        path.unlink()


def _rmdir_if_identity(path: Path, identity: tuple[int, int]) -> None:
    """Remove only this invocation's now-empty publication directory."""

    try:
        current_identity = _file_identity(path)
    except FileNotFoundError:
        return
    if current_identity == identity:
        path.rmdir()


def _write_private_json(path: Path, payload: dict[str, Any]) -> None:
    _reserve_private_file(path)
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    _make_private(path)
    _fsync_file(path)


def restore_runtime_backup(
    backup_directory: str | Path,
    destination_database_path: str | Path,
) -> dict[str, Any]:
    """Restore a verified bundle into a new, separate environment only."""

    manifest = verify_runtime_backup(backup_directory)
    bundle = Path(backup_directory).resolve()
    destination = Path(destination_database_path).resolve()
    destination_sidecar = settlement_sidecar_path(destination)
    completion_marker = restore_completion_marker_path(destination)
    if destination.exists() or destination_sidecar.exists() or completion_marker.exists():
        raise RuntimeBackupError(
            "restore destination (including sidecar/marker) must not already exist"
        )
    if destination == bundle or bundle in destination.parents:
        raise RuntimeBackupError("backup bundle and restore destination must be distinct")

    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary_database = destination.with_name(f".{destination.name}.restore-{uuid.uuid4().hex}")
    temporary_sidecar = destination_sidecar.with_name(
        f".{destination_sidecar.name}.restore-{uuid.uuid4().hex}"
    )
    temporary_marker = completion_marker.with_name(
        f".{completion_marker.name}.restore-{uuid.uuid4().hex}"
    )
    installed: dict[Path, tuple[int, int]] = {}
    try:
        _reserve_private_file(temporary_database)
        shutil.copyfile(bundle / DATABASE_FILE, temporary_database)
        _fsync_file(temporary_database)
        if (
            temporary_database.stat().st_size != manifest["database"]["bytes"]
            or sha256_file(temporary_database) != manifest["database"]["sha256"]
        ):
            raise RuntimeBackupError("restored database bytes differ from the backup")
        if inspect_runtime_database(temporary_database) != {
            key: manifest["database"][key]
            for key in ("integrity_check", "schema_version", "row_counts")
        }:
            raise RuntimeBackupError("restored database evidence differs from the backup")

        sidecar_entry = manifest.get("settlement_sidecar")
        if sidecar_entry is not None:
            _reserve_private_file(temporary_sidecar)
            shutil.copyfile(bundle / SIDECAR_FILE, temporary_sidecar)
            _fsync_file(temporary_sidecar)
            if (
                temporary_sidecar.stat().st_size != sidecar_entry["bytes"]
                or sha256_file(temporary_sidecar) != sidecar_entry["sha256"]
                or inspect_settlement_sidecar(temporary_sidecar)["records"]
                != sidecar_entry["records"]
            ):
                raise RuntimeBackupError("restored settlement sidecar evidence differs from backup")

        marker_payload = {
            "backup_format_version": manifest["format_version"],
            "completed_at_utc": datetime.now(timezone.utc).isoformat(),
            "database_schema_version": manifest["database"]["schema_version"],
            "database_sha256": manifest["database"]["sha256"],
            "settlement_sidecar_sha256": (
                sidecar_entry["sha256"] if sidecar_entry is not None else None
            ),
            "status": "complete",
        }
        _write_private_json(temporary_marker, marker_payload)
        _fsync_directory(destination.parent)

        # Recheck immediately before no-replace publication. Hard-link install
        # is atomic and fails if another process creates any claimed path.
        if destination.exists() or destination_sidecar.exists() or completion_marker.exists():
            raise RuntimeBackupError("restore destination appeared during installation")
        installed[destination] = _install_file_no_replace(temporary_database, destination)
        temporary_database.unlink()
        if sidecar_entry is not None:
            installed[destination_sidecar] = _install_file_no_replace(
                temporary_sidecar,
                destination_sidecar,
            )
            temporary_sidecar.unlink()
        _fsync_directory(destination.parent)

        restored_evidence = inspect_runtime_database(destination)
        expected_database_evidence = {
            key: manifest["database"][key]
            for key in ("integrity_check", "schema_version", "row_counts")
        }
        if (
            restored_evidence != expected_database_evidence
            or destination.stat().st_size != manifest["database"]["bytes"]
            or sha256_file(destination) != manifest["database"]["sha256"]
        ):
            raise RuntimeBackupError("installed database differs from backup")
        if sidecar_entry is not None:
            restored_sidecar_evidence = inspect_settlement_sidecar(destination_sidecar)
            if (
                restored_sidecar_evidence["records"] != sidecar_entry["records"]
                or sha256_file(destination_sidecar) != sidecar_entry["sha256"]
            ):
                raise RuntimeBackupError("installed settlement sidecar differs from backup")

        # The completion marker is deliberately published last. Its presence
        # means the database and optional sidecar were installed and their
        # directory entries were fsync'd first.
        installed[completion_marker] = _install_file_no_replace(
            temporary_marker,
            completion_marker,
        )
        temporary_marker.unlink()
        _fsync_directory(destination.parent)
        return {
            "status": "restored",
            "database": restored_evidence,
            "settlement_sidecar_restored": sidecar_entry is not None,
            "completion_marker": completion_marker.name,
        }
    except Exception as exc:
        for temporary in (temporary_database, temporary_sidecar, temporary_marker):
            try:
                temporary.unlink(missing_ok=True)
            except OSError:
                pass
        for installed_path, identity in reversed(tuple(installed.items())):
            try:
                _unlink_if_identity(installed_path, identity)
            except OSError:
                pass
        try:
            _fsync_directory(destination.parent)
        except OSError:
            pass
        if isinstance(exc, RuntimeBackupError):
            raise
        raise RuntimeBackupError(f"could not restore runtime backup: {exc}") from exc


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    backup = subparsers.add_parser("backup", help="create a verified backup bundle")
    backup.add_argument("--database", required=True, type=Path)
    backup.add_argument("--output", required=True, type=Path)
    backup.add_argument(
        "--quiesced",
        action="store_true",
        help="acknowledge that the single authoritative worker is stopped/quiesced",
    )

    verify = subparsers.add_parser("verify", help="verify an existing backup bundle")
    verify.add_argument("--backup", required=True, type=Path)

    restore = subparsers.add_parser("restore", help="restore into a new database path")
    restore.add_argument("--backup", required=True, type=Path)
    restore.add_argument("--database", required=True, type=Path)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        if args.command == "backup":
            result = create_runtime_backup(args.database, args.output, quiesced=args.quiesced)
        elif args.command == "verify":
            result = verify_runtime_backup(args.backup)
        else:
            result = restore_runtime_backup(args.backup, args.database)
    except RuntimeBackupError as exc:
        print(f"runtime backup error: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
