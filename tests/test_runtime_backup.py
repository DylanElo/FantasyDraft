from contextlib import closing
import json
import os
from pathlib import Path
import sqlite3
import stat

import pytest

from jjk_arena.battle_v2.runtime_store import SCHEMA_VERSION, SQLiteRuntimeStore
from tools import runtime_backup as runtime_backup_module
from tools.runtime_backup import (
    RuntimeBackupError,
    create_runtime_backup,
    restore_completion_marker_path,
    restore_runtime_backup,
    verify_runtime_backup,
)


def populated_store(path: Path) -> SQLiteRuntimeStore:
    store = SQLiteRuntimeStore(path, clock=lambda: 1_000.0)
    store.save_profile("backup-player", {"completed_missions": ["welcome"]})
    store.save_replay(
        {"match_id": "backup-match", "commands": [{"type": "end_turn"}]},
        retention_days=30,
    )
    store.record_analytics_event(
        "match_finished",
        {"result_type": "WIN", "vs_cpu": True, "cpu_difficulty": "normal"},
        match_id="backup-match",
        event_key="match_finished:backup-match",
    )
    store.enqueue_mission_settlement(
        "database-settlement",
        "backup-player",
        {"completed_ids": ["welcome"]},
    )
    store.mission_settlement_fallback_path.write_text(
        json.dumps(
            {
                "match_id": "sidecar-settlement",
                "player_id": "backup-player",
                "progress": {"completed_ids": ["welcome", "bond"]},
                "finished_at": 999.0,
            }
        )
        + "\n",
        encoding="utf-8",
    )
    return store


def create_legacy_store(path: Path, schema_version: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(path)) as connection:
        with connection:
            connection.executescript(
                """
                CREATE TABLE runtime_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
                CREATE TABLE first_creation_profiles (
                    player_id TEXT PRIMARY KEY,
                    payload_json TEXT NOT NULL,
                    updated_at REAL NOT NULL
                );
                CREATE TABLE battle_replays (
                    match_id TEXT PRIMARY KEY,
                    payload_json TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    expires_at REAL NOT NULL
                );
                CREATE TABLE analytics_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    match_id TEXT,
                    player_id TEXT,
                    payload_json TEXT NOT NULL,
                    created_at REAL NOT NULL
                );
                """
            )
            if schema_version == 5:
                connection.executescript(
                    """
                    CREATE TABLE mission_settlement_outbox (
                        match_id TEXT NOT NULL,
                        player_id TEXT NOT NULL,
                        progress_json TEXT NOT NULL,
                        status TEXT NOT NULL,
                        retry_count INTEGER NOT NULL DEFAULT 0,
                        next_attempt_at REAL NOT NULL,
                        last_error TEXT,
                        updated_at REAL NOT NULL,
                        PRIMARY KEY(match_id, player_id)
                    );
                    """
                )
            connection.execute(
                "INSERT INTO runtime_meta(key, value) VALUES('schema_version', ?)",
                (str(schema_version),),
            )
            connection.execute(
                """
                INSERT INTO first_creation_profiles(player_id, payload_json, updated_at)
                VALUES('legacy-player', ?, 42)
                """,
                (json.dumps({"completed_missions": ["welcome"]}),),
            )


def create_minimal_schema_five_store(path: Path) -> None:
    """Create the smallest schema-5 database accepted by runtime migration."""

    path.parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(path)) as connection:
        with connection:
            connection.executescript(
                """
                CREATE TABLE runtime_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
                CREATE TABLE mission_settlement_outbox (
                    match_id TEXT NOT NULL,
                    player_id TEXT NOT NULL,
                    progress_json TEXT NOT NULL,
                    status TEXT NOT NULL,
                    retry_count INTEGER NOT NULL DEFAULT 0,
                    next_attempt_at REAL NOT NULL,
                    last_error TEXT,
                    updated_at REAL NOT NULL,
                    PRIMARY KEY(match_id, player_id)
                );
                INSERT INTO runtime_meta(key, value) VALUES('schema_version', '5');
                """
            )


def test_runtime_backup_round_trip_preserves_database_and_sidecar(tmp_path):
    source = tmp_path / "source" / "runtime.sqlite3"
    source_store = populated_store(source)
    backup = tmp_path / "backup-bundle"
    restored_path = tmp_path / "restored" / "runtime.sqlite3"

    manifest = create_runtime_backup(source, backup, quiesced=True)
    verified = verify_runtime_backup(backup)
    restored = restore_runtime_backup(backup, restored_path)

    assert manifest == verified
    assert manifest["database"]["schema_version"] == SCHEMA_VERSION
    assert manifest["database"]["integrity_check"] == "ok"
    assert manifest["database"]["row_counts"] == {
        "first_creation_profiles": 1,
        "battle_replays": 1,
        "analytics_events": 1,
        "mission_settlement_outbox": 1,
    }
    assert set(manifest["database"]) == {
        "file", "bytes", "sha256", "integrity_check", "schema_version", "row_counts",
    }
    assert restored["settlement_sidecar_restored"] is True
    assert restored["completion_marker"] == restore_completion_marker_path(
        restored_path
    ).name
    assert json.loads(restore_completion_marker_path(restored_path).read_text())["status"] == "complete"
    assert manifest["settlement_sidecar"]["records"] == 1

    restored_store = SQLiteRuntimeStore(restored_path, clock=lambda: 1_000.0)
    assert restored_store.load_profile("backup-player") == {"completed_missions": ["welcome"]}
    assert restored_store.load_replay("backup-match")["commands"] == [{"type": "end_turn"}]
    assert restored_store.analytics_summary()["match_finished"]["total"] == 1
    assert restored_store.restore_mission_settlement_fallback() == 1
    assert not restored_store.mission_settlement_fallback_path.exists()
    rows = restored_store.mission_settlement_rows()
    assert {(row["match_id"], row["player_id"]) for row in rows} == {
        ("database-settlement", "backup-player"),
        ("sidecar-settlement", "backup-player"),
    }

    # The source remains untouched by both backup and restore.
    assert source_store.load_profile("backup-player") == {"completed_missions": ["welcome"]}
    assert source_store.mission_settlement_fallback_path.exists()


@pytest.mark.parametrize("schema_version", [4, 5])
def test_runtime_backup_preserves_documented_legacy_schema_for_candidate_migration(
    tmp_path,
    schema_version,
):
    source = tmp_path / f"schema-{schema_version}" / "runtime.sqlite3"
    create_legacy_store(source, schema_version)
    backup = tmp_path / f"backup-{schema_version}"
    destination = tmp_path / f"restore-{schema_version}" / "runtime.sqlite3"

    manifest = create_runtime_backup(source, backup, quiesced=True)
    assert manifest["database"]["schema_version"] == schema_version
    assert verify_runtime_backup(backup) == manifest
    restore_runtime_backup(backup, destination)

    migrated = SQLiteRuntimeStore(destination)
    assert migrated.healthcheck() == {"ok": True, "schema_version": SCHEMA_VERSION}
    assert migrated.load_profile("legacy-player") == {"completed_missions": ["welcome"]}


def test_runtime_backup_accepts_minimal_schema_five_migration_source(tmp_path):
    source = tmp_path / "schema-5-minimal" / "runtime.sqlite3"
    create_minimal_schema_five_store(source)
    backup = tmp_path / "backup-schema-5-minimal"
    destination = tmp_path / "restore-schema-5-minimal" / "runtime.sqlite3"

    manifest = create_runtime_backup(source, backup, quiesced=True)
    assert manifest["database"]["schema_version"] == 5
    assert manifest["database"]["row_counts"] == {
        "mission_settlement_outbox": 0,
    }
    assert verify_runtime_backup(backup) == manifest
    restore_runtime_backup(backup, destination)

    migrated = SQLiteRuntimeStore(destination)
    assert migrated.healthcheck() == {"ok": True, "schema_version": SCHEMA_VERSION}
    assert migrated.load_profile("missing-player") == {}


@pytest.mark.parametrize(
    ("payload", "message"),
    [
        (b"", "sidecar is empty"),
        (b'{"match_id":"truncated"', "line 1 is truncated"),
        (
            b'{"match_id":"match","player_id":"player","progress":{},"finished_at":null}\n',
            "invalid record shape",
        ),
    ],
)
def test_runtime_backup_rejects_empty_truncated_or_malformed_sidecar(
    tmp_path,
    payload,
    message,
):
    source = tmp_path / "runtime.sqlite3"
    store = SQLiteRuntimeStore(source)
    store.mission_settlement_fallback_path.write_bytes(payload)
    backup = tmp_path / "backup"

    with pytest.raises(RuntimeBackupError, match=message):
        create_runtime_backup(source, backup, quiesced=True)

    assert not backup.exists()


def test_runtime_backup_accepts_legacy_sidecar_without_finished_at(tmp_path):
    source = tmp_path / "source" / "runtime.sqlite3"
    source_store = SQLiteRuntimeStore(source)
    source_store.mission_settlement_fallback_path.write_text(
        json.dumps(
            {
                "match_id": "legacy-sidecar",
                "player_id": "backup-player",
                "progress": {"completed_ids": ["welcome"]},
            }
        )
        + "\n",
        encoding="utf-8",
    )
    backup = tmp_path / "backup"
    destination = tmp_path / "restored" / "runtime.sqlite3"

    manifest = create_runtime_backup(source, backup, quiesced=True)
    assert manifest["settlement_sidecar"]["records"] == 1
    assert verify_runtime_backup(backup) == manifest
    restore_runtime_backup(backup, destination)

    restored_store = SQLiteRuntimeStore(destination, clock=lambda: 1_234.0)
    assert restored_store.restore_mission_settlement_fallback() == 1
    assert restored_store.mission_settlement_rows()[0]["finished_at"] == 1_234.0


@pytest.mark.skipif(os.name == "nt", reason="Windows chmod does not configure DACLs")
def test_runtime_backup_and_restore_files_are_private_on_posix(monkeypatch, tmp_path):
    source = tmp_path / "source" / "runtime.sqlite3"
    populated_store(source)
    backup = tmp_path / "backup"
    destination = tmp_path / "restored" / "runtime.sqlite3"

    create_runtime_backup(source, backup, quiesced=True)
    real_copyfile = runtime_backup_module.shutil.copyfile
    temporary_copy_modes = []

    def assert_private_before_copy(source_path, destination_path, *args, **kwargs):
        temporary = Path(destination_path)
        assert temporary.exists()
        temporary_copy_modes.append(stat.S_IMODE(temporary.stat().st_mode))
        return real_copyfile(source_path, destination_path, *args, **kwargs)

    monkeypatch.setattr(runtime_backup_module.shutil, "copyfile", assert_private_before_copy)
    restore_runtime_backup(backup, destination)

    assert temporary_copy_modes == [0o600, 0o600]
    assert stat.S_IMODE(backup.stat().st_mode) == 0o700
    for path in backup.iterdir():
        assert stat.S_IMODE(path.stat().st_mode) == 0o600
    for path in (
        destination,
        SQLiteRuntimeStore(destination).mission_settlement_fallback_path,
        restore_completion_marker_path(destination),
    ):
        assert stat.S_IMODE(path.stat().st_mode) == 0o600


def test_runtime_backup_refuses_missing_source_unquiesced_and_existing_destinations(tmp_path):
    source = tmp_path / "runtime.sqlite3"
    backup = tmp_path / "backup"
    with pytest.raises(RuntimeBackupError, match="quiesced"):
        create_runtime_backup(source, backup, quiesced=False)
    with pytest.raises(RuntimeBackupError, match="does not exist"):
        create_runtime_backup(source, backup, quiesced=True)

    populated_store(source)
    backup.mkdir()
    with pytest.raises(RuntimeBackupError, match="already exists"):
        create_runtime_backup(source, backup, quiesced=True)

    backup.rmdir()
    create_runtime_backup(source, backup, quiesced=True)
    destination = tmp_path / "restored.sqlite3"
    destination.write_bytes(b"operator-owned")
    with pytest.raises(RuntimeBackupError, match="must not already exist"):
        restore_runtime_backup(backup, destination)
    assert destination.read_bytes() == b"operator-owned"


def test_runtime_backup_verification_rejects_tampering(tmp_path):
    source = tmp_path / "runtime.sqlite3"
    populated_store(source)
    backup = tmp_path / "backup"
    create_runtime_backup(source, backup, quiesced=True)
    database = backup / "runtime.sqlite3"
    database.write_bytes(database.read_bytes() + b"tampered")

    with pytest.raises(RuntimeBackupError, match="size does not match"):
        verify_runtime_backup(backup)


def test_restore_failure_never_deletes_destination_created_after_initial_check(
    monkeypatch,
    tmp_path,
):
    source = tmp_path / "source.sqlite3"
    SQLiteRuntimeStore(source)
    backup = tmp_path / "backup"
    create_runtime_backup(source, backup, quiesced=True)
    destination = tmp_path / "restored" / "runtime.sqlite3"

    def fail_after_foreign_destination_appears(_source, _temporary):
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(b"operator-owned")
        raise OSError("simulated copy failure")

    monkeypatch.setattr(runtime_backup_module.shutil, "copyfile", fail_after_foreign_destination_appears)

    with pytest.raises(RuntimeBackupError, match="could not restore"):
        restore_runtime_backup(backup, destination)

    assert destination.read_bytes() == b"operator-owned"


def test_restore_no_replace_preserves_destination_created_at_publish(
    monkeypatch,
    tmp_path,
):
    source = tmp_path / "source.sqlite3"
    SQLiteRuntimeStore(source)
    backup = tmp_path / "backup"
    create_runtime_backup(source, backup, quiesced=True)
    destination = tmp_path / "restored" / "runtime.sqlite3"
    real_link = runtime_backup_module.os.link

    def race_at_publish(source_path, destination_path, **kwargs):
        target = Path(destination_path)
        if target == destination:
            target.write_bytes(b"operator-owned")
        return real_link(source_path, destination_path, **kwargs)

    monkeypatch.setattr(runtime_backup_module.os, "link", race_at_publish)

    with pytest.raises(RuntimeBackupError, match="appeared during installation"):
        restore_runtime_backup(backup, destination)

    assert destination.read_bytes() == b"operator-owned"
    assert not restore_completion_marker_path(destination).exists()


def test_backup_publication_never_replaces_raced_destination_directory(
    monkeypatch,
    tmp_path,
):
    source = tmp_path / "source.sqlite3"
    SQLiteRuntimeStore(source)
    backup = tmp_path / "backup"
    real_mkdir = Path.mkdir
    raced = {"value": False}

    def race_at_publication(path, *args, **kwargs):
        if Path(path) == backup and not raced["value"]:
            raced["value"] = True
            real_mkdir(path, *args, **kwargs)
            (Path(path) / "operator-owned.txt").write_text("keep", encoding="utf-8")
        return real_mkdir(path, *args, **kwargs)

    monkeypatch.setattr(Path, "mkdir", race_at_publication)

    with pytest.raises(RuntimeBackupError, match="appeared during publication"):
        create_runtime_backup(source, backup, quiesced=True)

    assert (backup / "operator-owned.txt").read_text(encoding="utf-8") == "keep"


def test_restore_revalidates_installed_bytes_before_completion_marker(
    monkeypatch,
    tmp_path,
):
    source = tmp_path / "source.sqlite3"
    SQLiteRuntimeStore(source)
    backup = tmp_path / "backup"
    create_runtime_backup(source, backup, quiesced=True)
    destination = tmp_path / "restored" / "runtime.sqlite3"
    real_inspect = runtime_backup_module.inspect_runtime_database
    tampered = {"value": False}

    def tamper_after_installed_inspection(path):
        evidence = real_inspect(path)
        if Path(path).resolve() == destination.resolve() and not tampered["value"]:
            tampered["value"] = True
            with Path(path).open("ab") as handle:
                handle.write(b"concurrent-writer")
        return evidence

    monkeypatch.setattr(
        runtime_backup_module,
        "inspect_runtime_database",
        tamper_after_installed_inspection,
    )

    with pytest.raises(RuntimeBackupError, match="installed database differs"):
        restore_runtime_backup(backup, destination)

    assert not destination.exists()
    assert not restore_completion_marker_path(destination).exists()
