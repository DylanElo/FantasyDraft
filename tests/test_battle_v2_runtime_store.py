from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
import json
import sqlite3
import threading
import time

import pytest

from jjk_arena.battle_v2 import runtime_store as runtime_store_module
from jjk_arena.battle_v2.first_creation_profile import (
    load_first_creation_profile,
    merge_first_creation_profile_snapshot,
    merge_first_creation_progress,
    save_first_creation_profile,
)
from jjk_arena.battle_v2.runtime_store import SQLiteRuntimeStore


def test_runtime_store_closes_every_sqlite_connection(monkeypatch, tmp_path):
    real_connect = sqlite3.connect
    opened_connections = []

    def tracked_connect(*args, **kwargs):
        connection = real_connect(*args, **kwargs)
        opened_connections.append(connection)
        return connection

    monkeypatch.setattr(runtime_store_module.sqlite3, "connect", tracked_connect)
    path = tmp_path / "runtime.sqlite3"
    store = SQLiteRuntimeStore(path)
    for index in range(20):
        store.save_profile(f"player-{index}", {"completed_missions": []})

    assert opened_connections
    for connection in opened_connections:
        with pytest.raises(sqlite3.ProgrammingError, match="closed"):
            connection.execute("SELECT 1")


def test_runtime_store_refuses_to_downgrade_a_future_schema(tmp_path):
    path = tmp_path / "future.sqlite3"
    with closing(sqlite3.connect(path)) as connection:
        with connection:
            connection.execute(
                "CREATE TABLE runtime_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL)"
            )
            connection.execute(
                "INSERT INTO runtime_meta(key, value) VALUES('schema_version', '999')"
            )
        journal_mode_before = connection.execute("PRAGMA journal_mode").fetchone()[0]
    database_before = path.read_bytes()

    with pytest.raises(RuntimeError, match="newer than supported"):
        SQLiteRuntimeStore(path)

    with closing(sqlite3.connect(path)) as connection:
        version = connection.execute(
            "SELECT value FROM runtime_meta WHERE key = 'schema_version'"
        ).fetchone()[0]
        journal_mode_after = connection.execute("PRAGMA journal_mode").fetchone()[0]
    assert version == "999"
    assert journal_mode_before == journal_mode_after == "delete"
    assert path.read_bytes() == database_before


def test_runtime_store_refuses_unsupported_legacy_schema_without_mutation(tmp_path):
    path = tmp_path / "schema-three.sqlite3"
    with closing(sqlite3.connect(path)) as connection:
        with connection:
            connection.execute(
                "CREATE TABLE runtime_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL)"
            )
            connection.execute(
                "INSERT INTO runtime_meta(key, value) VALUES('schema_version', '3')"
            )
    database_before = path.read_bytes()

    with pytest.raises(RuntimeError, match="schema 3 is not supported"):
        SQLiteRuntimeStore(path)

    assert path.read_bytes() == database_before


def test_runtime_store_refuses_existing_schema_table_without_version(tmp_path):
    path = tmp_path / "missing-version.sqlite3"
    with closing(sqlite3.connect(path)) as connection:
        with connection:
            connection.execute(
                "CREATE TABLE runtime_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL)"
            )

    with pytest.raises(RuntimeError, match="no schema_version"):
        SQLiteRuntimeStore(path)

    with closing(sqlite3.connect(path)) as connection:
        tables = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }
    assert tables == {"runtime_meta"}


def test_sqlite_profiles_are_durable_across_store_instances(tmp_path):
    path = tmp_path / "runtime.sqlite3"
    first = SQLiteRuntimeStore(path)
    first.save_profile("player", {"completed_missions": ["m1"]})

    assert SQLiteRuntimeStore(path).load_profile("player") == {"completed_missions": ["m1"]}


def test_sqlite_profile_updates_are_atomic_across_threads(tmp_path):
    path = tmp_path / "runtime.sqlite3"
    store = SQLiteRuntimeStore(path)

    def add_unlock(index):
        def update(profile):
            unlocks = set(profile.get("unlocked", []))
            unlocks.add(f"u{index}")
            profile["unlocked"] = sorted(unlocks)
            return profile

        store.update_profile("player", update)

    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(add_unlock, range(20)))

    assert set(store.load_profile("player")["unlocked"]) == {f"u{index}" for index in range(20)}


def test_profile_api_uses_sqlite_by_default_and_merges_progress(monkeypatch, tmp_path):
    monkeypatch.delenv("JJK_FIRST_CREATION_PROFILE_STORE", raising=False)
    monkeypatch.setenv("JJK_DATABASE_PATH", str(tmp_path / "runtime.sqlite3"))
    save_first_creation_profile("player", {"selected_starter_team": ["yuji_itadori"]})
    merge_first_creation_progress(
        "player",
        {"completed_ids": ["welcome"], "unlocked": ["mission_board"], "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
    )

    profile = load_first_creation_profile("player")
    assert profile["completed_missions"] == ["welcome"]
    assert profile["unlocked"] == ["mission_board"]
    assert profile["selected_starter_team"] == ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]


def test_replay_retention_is_opt_in_storage_with_expiry(tmp_path):
    now = [1_000.0]
    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3", clock=lambda: now[0])
    replay = {"match_id": "room", "commands": [], "final_state_hash": "hash"}
    store.save_replay(replay, retention_days=1)
    assert store.load_replay("room") == replay

    now[0] += 86_401
    assert store.load_replay("room") is None
    assert store.prune_expired_replays() == 1


def test_runtime_store_healthcheck_reports_schema(tmp_path):
    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3")
    assert store.healthcheck() == {"ok": True, "schema_version": 6}


def test_schema_v4_migrates_to_v6_without_losing_profiles_or_analytics(tmp_path):
    """The deployed origin/main schema upgrades directly, without a v5 boot."""

    path = tmp_path / "runtime.sqlite3"
    profile = {
        "completed_missions": ["welcome_to_jujutsu_high"],
        "selected_starter_team": [
            "yuji_itadori",
            "megumi_fushiguro",
            "nobara_kugisaki",
        ],
    }
    analytics_payload = {
        "result_type": "WIN",
        "finish_reason": "elimination",
        "vs_cpu": False,
    }
    with sqlite3.connect(path) as connection:
        connection.executescript(
            """
            CREATE TABLE runtime_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            INSERT INTO runtime_meta(key, value) VALUES('schema_version', '4');
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
                created_at REAL NOT NULL,
                event_key TEXT,
                result_type TEXT,
                finish_reason TEXT,
                cpu_difficulty TEXT,
                vs_cpu INTEGER,
                outcome TEXT,
                mission_id TEXT
            );
            """
        )
        connection.execute(
            """
            INSERT INTO first_creation_profiles(player_id, payload_json, updated_at)
            VALUES('schema-v4-player', ?, 42)
            """,
            (json.dumps(profile),),
        )
        connection.execute(
            """
            INSERT INTO analytics_events(
                event_type, match_id, player_id, payload_json, created_at,
                event_key, result_type, finish_reason, vs_cpu
            ) VALUES(
                'match_finished', 'schema-v4-match', 'schema-v4-player', ?, 42,
                'match_finished:schema-v4-match', 'WIN', 'elimination', 0
            )
            """,
            (json.dumps(analytics_payload),),
        )

    store = SQLiteRuntimeStore(path)

    assert store.healthcheck() == {"ok": True, "schema_version": 6}
    assert store.load_profile("schema-v4-player") == profile
    assert store.analytics_summary()["match_finished"] == {
        "total": 1,
        "vs_cpu": 0,
        "by_difficulty": {},
        "by_result_type": {"WIN": 1},
        "wins": 0,
        "losses": 0,
        "draws": 0,
        "no_contests": 0,
    }
    assert store.mission_settlement_rows() == []
    with sqlite3.connect(path) as connection:
        settlement_columns = {
            row[1]
            for row in connection.execute("PRAGMA table_info(mission_settlement_outbox)")
        }
    assert {"finished_at", "claim_token", "claim_expires_at"} <= settlement_columns


def test_schema_v5_migrates_settlement_claim_and_finish_columns_without_losing_rows(tmp_path):
    path = tmp_path / "runtime.sqlite3"
    progress = {"completed_ids": ["welcome"]}
    with sqlite3.connect(path) as connection:
        connection.executescript(
            """
            CREATE TABLE runtime_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            INSERT INTO runtime_meta(key, value) VALUES('schema_version', '5');
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
            """
            INSERT INTO mission_settlement_outbox(
                match_id, player_id, progress_json, status,
                retry_count, next_attempt_at, last_error, updated_at
            ) VALUES('old-match', 'old-player', ?, 'pending', 0, 42, NULL, 42)
            """,
            (json.dumps(progress),),
        )

    store = SQLiteRuntimeStore(path)

    row = store.mission_settlement_rows()[0]
    assert store.healthcheck() == {"ok": True, "schema_version": 6}
    assert row["match_id"] == "old-match"
    assert row["finished_at"] == 42
    assert row["claim_token"] is None
    assert row["claim_expires_at"] is None


def test_mission_settlement_outbox_retries_after_process_restart(tmp_path):
    now = [100.0]
    path = tmp_path / "runtime.sqlite3"
    first = SQLiteRuntimeStore(path, clock=lambda: now[0])
    progress = {"completed_ids": ["welcome"], "unlocked": ["mission_board"]}
    first.enqueue_mission_settlement("match-1", "player-1", progress)

    def fail(*_args):
        raise RuntimeError("database is locked")

    assert first.process_mission_settlements(fail) == []
    failed = first.mission_settlement_rows()[0]
    assert failed["status"] == "failed_retryable"
    assert failed["retry_count"] == 1

    now[0] = 101.0
    restarted = SQLiteRuntimeStore(path, clock=lambda: now[0])
    received = []
    assert restarted.process_mission_settlements(
        lambda match_id, player_id, snapshot: received.append((match_id, player_id, snapshot))
    ) == [("match-1", "player-1")]
    assert received == [("match-1", "player-1", progress)]
    assert restarted.mission_settlement_rows()[0]["status"] == "settled"


def test_initial_settlement_enqueue_failure_uses_retryable_durable_fallback(monkeypatch, tmp_path):
    path = tmp_path / "runtime.sqlite3"
    store = SQLiteRuntimeStore(path)
    progress = {"completed_ids": ["welcome"]}

    monkeypatch.setattr(store, "enqueue_mission_settlement", lambda *_args: (_ for _ in ()).throw(RuntimeError("locked")))
    assert store.enqueue_mission_settlement_durable("match", "player", progress) == "fallback"
    assert store.mission_settlement_fallback_path.exists()
    assert store.mission_settlement_fallback_count() == 1

    restarted = SQLiteRuntimeStore(path)
    assert restarted.restore_mission_settlement_fallback() == 1
    assert restarted.mission_settlement_fallback_count() == 0
    received = []
    restarted.process_mission_settlements(
        lambda match_id, player_id, snapshot: received.append((match_id, player_id, snapshot))
    )
    assert received == [("match", "player", progress)]
    assert not restarted.mission_settlement_fallback_path.exists()


def test_empty_settlement_fallback_file_fails_closed(tmp_path):
    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3")
    store.mission_settlement_fallback_path.touch()

    assert store.mission_settlement_fallback_count() == 1


def test_concurrent_settlement_workers_claim_before_invoking_handler(tmp_path):
    path = tmp_path / "runtime.sqlite3"
    first = SQLiteRuntimeStore(path)
    second = SQLiteRuntimeStore(path)
    first.enqueue_mission_settlement("match", "player", {"completed_ids": ["welcome"]})
    calls = []
    lock = threading.Lock()

    def handler(*args):
        with lock:
            calls.append(args)
        # A repeated terminal hook may enqueue the same key while this worker
        # owns it. That must not reset `processing` back to `pending` and let a
        # concurrent worker invoke the handler a second time.
        second.enqueue_mission_settlement("match", "player", {"completed_ids": ["welcome"]})
        assert second.process_mission_settlements(lambda *_args: calls.append(("duplicate",))) == []
        time.sleep(0.05)

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda store: store.process_mission_settlements(handler), (first, second)))

    assert len(calls) == 1
    assert sum(len(result) for result in results) == 1
    assert first.mission_settlement_rows()[0]["status"] == "settled"


def test_expired_lease_is_at_least_once_but_stale_worker_reports_no_commit(tmp_path):
    now = [0.0]
    path = tmp_path / "runtime.sqlite3"
    first = SQLiteRuntimeStore(path, clock=lambda: now[0])
    second = SQLiteRuntimeStore(path, clock=lambda: now[0])
    first.enqueue_mission_settlement("lease", "player", {})
    started = threading.Event()
    release = threading.Event()
    calls = []

    def slow_handler(*_args):
        calls.append("stale")
        started.set()
        assert release.wait(timeout=5)

    with ThreadPoolExecutor(max_workers=1) as pool:
        stale_result = pool.submit(first.process_mission_settlements, slow_handler)
        assert started.wait(timeout=5)
        now[0] = 61.0
        replacement_result = second.process_mission_settlements(
            lambda *_args: calls.append("replacement")
        )
        release.set()

    assert replacement_result == [("lease", "player")]
    assert stale_result.result() == []
    assert calls == ["stale", "replacement"]
    assert first.mission_settlement_rows()[0]["status"] == "settled"


def test_fallback_restore_does_not_rewrite_unchanged_fsyncd_records(monkeypatch, tmp_path):
    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3")
    monkeypatch.setattr(
        store,
        "enqueue_mission_settlement",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("locked")),
    )
    assert store.enqueue_mission_settlement_durable("match", "player", {}) == "fallback"
    before = store.mission_settlement_fallback_path.read_bytes()
    before_mtime = store.mission_settlement_fallback_path.stat().st_mtime_ns

    assert store.restore_mission_settlement_fallback() == 0

    assert store.mission_settlement_fallback_path.read_bytes() == before
    assert store.mission_settlement_fallback_path.stat().st_mtime_ns == before_mtime


def test_atomic_profile_analytics_commit_rolls_back_and_retries_after_analytics_failure(tmp_path):
    now = [100.0]
    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3", clock=lambda: now[0])
    progress = {
        "completed_ids": ["welcome"],
        "unlocked": ["mission_board"],
        "team": ["yuji", "megumi", "nobara"],
    }
    store.enqueue_mission_settlement("atomic", "player", progress, finished_at=90.0)
    with sqlite3.connect(store.path) as connection:
        connection.execute(
            """
            CREATE TRIGGER fail_mission_analytics
            BEFORE INSERT ON analytics_events
            WHEN NEW.event_type = 'mission_completed'
            BEGIN
                SELECT RAISE(ABORT, 'simulated analytics failure');
            END
            """
        )

    assert store.process_mission_settlements(
        profile_updater=merge_first_creation_profile_snapshot
    ) == []
    assert store.load_profile("player") == {}
    assert store.mission_settlement_rows()[0]["status"] == "failed_retryable"

    with sqlite3.connect(store.path) as connection:
        connection.execute("DROP TRIGGER fail_mission_analytics")
    now[0] = 101.0
    assert store.process_mission_settlements(
        profile_updater=merge_first_creation_profile_snapshot
    ) == [("atomic", "player")]
    assert store.load_profile("player")["completed_missions"] == ["welcome"]
    assert store.analytics_summary()["missions_completed"] == {"welcome": 1}
    assert store.mission_settlement_rows()[0]["status"] == "settled"


def test_out_of_order_settlement_preserves_newer_team_and_corrects_first_completion_time(tmp_path):
    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3", clock=lambda: 1_000.0)
    newer = {
        "completed_ids": ["welcome"],
        "team": ["new-a", "new-b", "new-c"],
    }
    older = {
        "completed_ids": ["welcome"],
        "team": ["old-a", "old-b", "old-c"],
    }
    store.enqueue_mission_settlement("newer-match", "player", newer, finished_at=200.0)
    assert store.process_mission_settlements(
        profile_updater=merge_first_creation_profile_snapshot
    ) == [("newer-match", "player")]
    store.enqueue_mission_settlement("older-match", "player", older, finished_at=100.0)
    assert store.process_mission_settlements(
        profile_updater=merge_first_creation_profile_snapshot
    ) == [("older-match", "player")]

    profile = store.load_profile("player")
    assert profile["selected_starter_team"] == ["new-a", "new-b", "new-c"]
    completed_at = profile["mission_first_completed_at"]["welcome"]
    assert completed_at == "1970-01-01T00:01:40+00:00"
    assert store.analytics_summary()["missions_completed"] == {"welcome": 1}
    with sqlite3.connect(store.path) as connection:
        analytics_match = connection.execute(
            "SELECT match_id FROM analytics_events WHERE event_type = 'mission_completed'"
        ).fetchone()[0]
    # Analytics records the match that first durably introduced the completion;
    # a later chronological correction updates profile time without rewriting
    # the immutable aggregate event.
    assert analytics_match == "newer-match"


def test_operational_settlement_failures_remain_retryable_until_recovery(tmp_path):
    now = [100.0]
    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3", clock=lambda: now[0])
    store.enqueue_mission_settlement("retry", "player", {})
    for _ in range(8):
        store.process_mission_settlements(
            lambda *_args: (_ for _ in ()).throw(RuntimeError("database is locked"))
        )
        now[0] += 301.0

    assert store.mission_settlement_rows()[0]["status"] == "failed_retryable"
    assert store.mission_settlement_rows()[0]["retry_count"] == 8
    assert store.process_mission_settlements(lambda *_args: None) == [("retry", "player")]
    assert store.mission_settlement_rows()[0]["status"] == "settled"


def test_force_due_bypasses_backoff_only_once_per_drain(tmp_path):
    now = [100.0]
    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3", clock=lambda: now[0])
    store.enqueue_mission_settlement("force-once", "player", {})
    failure = lambda *_args: (_ for _ in ()).throw(RuntimeError("still unavailable"))
    store.process_mission_settlements(failure)
    calls = []

    store.process_mission_settlements(
        lambda *_args: calls.append("attempt") or failure(),
        player_id="player",
        force_due=True,
    )

    assert calls == ["attempt"]
    row = store.mission_settlement_rows()[0]
    assert row["status"] == "failed_retryable"
    assert row["retry_count"] == 2


def test_malformed_json_and_non_object_snapshots_dead_letter_and_can_be_redriven(tmp_path):
    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3")
    store.enqueue_mission_settlement("bad-json", "player", {})
    store.enqueue_mission_settlement("bad-shape", "player", {})
    with sqlite3.connect(store.path) as connection:
        connection.execute(
            "UPDATE mission_settlement_outbox SET progress_json = 'not-json' WHERE match_id = 'bad-json'"
        )
        connection.execute(
            "UPDATE mission_settlement_outbox SET progress_json = '\"string\"' WHERE match_id = 'bad-shape'"
        )

    assert store.process_mission_settlements(lambda *_args: None, limit=2) == []
    assert store.mission_settlement_counts() == {"dead_letter": 2}
    assert store.mission_settlement_dead_lettered_total == 2

    store.enqueue_mission_settlement("bad-json", "player", {"completed_ids": ["welcome"]})
    assert store.redrive_mission_settlement("bad-json", "player") is True
    assert store.process_mission_settlements(lambda *_args: None) == [("bad-json", "player")]


def test_unrepresentable_finish_timestamp_dead_letters_instead_of_retrying_forever(tmp_path):
    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3")
    store.enqueue_mission_settlement(
        "bad-finish-time",
        "player",
        {"completed_ids": ["welcome"]},
        finished_at=1e308,
    )

    assert store.process_mission_settlements(
        profile_updater=merge_first_creation_profile_snapshot
    ) == []

    row = store.mission_settlement_rows()[0]
    assert row["status"] == "dead_letter"
    assert row["retry_count"] == 1
    assert "supported datetime range" in row["last_error"]


def test_settled_rows_expire_but_dead_letters_remain_for_operator_redrive(tmp_path):
    now = [100.0]
    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3", clock=lambda: now[0])
    store.enqueue_mission_settlement("dead", "player", {})
    with sqlite3.connect(store.path) as connection:
        connection.execute(
            "UPDATE mission_settlement_outbox SET progress_json = 'not-json' WHERE match_id = 'dead'"
        )
    store.process_mission_settlements(lambda *_args: None)

    store.enqueue_mission_settlement("settled", "player", {})
    store.process_mission_settlements(lambda *_args: None)
    now[0] += 31 * 86400
    assert store.prune_settled_mission_settlements(retention_days=30) == 1
    assert store.mission_settlement_counts() == {"dead_letter": 1}


def test_analytics_summary_uses_sql_aggregation_not_python_payload_decoding(tmp_path):
    """Regression for the P2 finding that /ops/runtime decoded every row's
    JSON payload in Python. Corrupt a row's payload_json directly (bypassing
    the store's own write path) while leaving the typed dimension columns
    intact, and confirm the summary still reflects it correctly — proving
    the aggregation reads the typed columns, not payload_json."""

    import sqlite3

    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3")
    store.record_analytics_event(
        "match_finished",
        {"result_type": "WIN", "vs_cpu": True, "cpu_difficulty": "hard"},
        match_id="m1",
        event_key="match_finished:m1",
    )
    with sqlite3.connect(tmp_path / "runtime.sqlite3") as connection:
        connection.execute(
            "UPDATE analytics_events SET payload_json = 'not valid json' WHERE match_id = 'm1'"
        )

    summary = store.analytics_summary()["match_finished"]

    assert summary["total"] == 1
    assert summary["by_result_type"] == {"WIN": 1}
    assert summary["by_difficulty"] == {"hard": 1}


def test_analytics_summary_counts_match_finished_events_by_result_type_and_difficulty(tmp_path):
    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3")
    store.record_analytics_event(
        "match_finished",
        {"roster_mode": "classic", "vs_cpu": True, "cpu_difficulty": "hard", "result_type": "WIN", "finish_reason": "defeat"},
        match_id="m1",
        event_key="match_finished:m1",
    )
    store.record_analytics_event(
        "match_finished",
        {"roster_mode": "classic", "vs_cpu": True, "cpu_difficulty": "easy", "result_type": "WIN", "finish_reason": "defeat"},
        match_id="m2",
        event_key="match_finished:m2",
    )
    store.record_analytics_event(
        "match_finished",
        {"roster_mode": "first_creation", "vs_cpu": False, "result_type": "DRAW", "finish_reason": "tiebreak"},
        match_id="m3",
        event_key="match_finished:m3",
    )

    summary = store.analytics_summary()["match_finished"]

    assert summary["total"] == 3
    assert summary["vs_cpu"] == 2
    assert summary["by_difficulty"] == {"hard": 1, "easy": 1}
    assert summary["by_result_type"] == {"WIN": 2, "DRAW": 1}


def test_analytics_summary_splits_pvp_match_into_one_win_and_one_loss(tmp_path):
    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3")
    store.record_analytics_event(
        "match_finished",
        {"roster_mode": "classic", "vs_cpu": False, "result_type": "WIN", "finish_reason": "defeat"},
        match_id="pvp-1",
        event_key="match_finished:pvp-1",
    )
    store.record_analytics_event(
        "match_player_result",
        {"outcome": "win"},
        match_id="pvp-1",
        player_id="p1",
        event_key="match_player_result:pvp-1:p1",
    )
    store.record_analytics_event(
        "match_player_result",
        {"outcome": "loss"},
        match_id="pvp-1",
        player_id="p2",
        event_key="match_player_result:pvp-1:p2",
    )

    summary = store.analytics_summary()["match_finished"]

    assert summary["wins"] == 1
    assert summary["losses"] == 1


def test_record_analytics_event_is_idempotent_on_event_key(tmp_path):
    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3")
    inserted_first = store.record_analytics_event(
        "match_finished", {"result_type": "WIN"}, match_id="dup", event_key="match_finished:dup"
    )
    inserted_second = store.record_analytics_event(
        "match_finished", {"result_type": "WIN"}, match_id="dup", event_key="match_finished:dup"
    )

    assert inserted_first is True
    assert inserted_second is False
    assert store.analytics_summary()["match_finished"]["total"] == 1


def test_analytics_event_key_existence_distinguishes_durable_rows(tmp_path):
    store = SQLiteRuntimeStore(tmp_path / "analytics-key-existence.sqlite3")
    keys = ["match_finished:exists", "match_player_result:exists:p1"]

    assert store.analytics_event_keys_exist(keys) is False
    store.record_analytics_event(
        "match_finished",
        {"result_type": "WIN"},
        match_id="exists",
        event_key=keys[0],
    )
    assert store.analytics_event_keys_exist(keys) is False
    store.record_analytics_event(
        "match_player_result",
        {"outcome": "win"},
        match_id="exists",
        player_id="p1",
        event_key=keys[1],
    )
    assert store.analytics_event_keys_exist(keys) is True


def test_record_analytics_event_idempotency_survives_a_new_store_instance(tmp_path):
    path = tmp_path / "runtime.sqlite3"
    SQLiteRuntimeStore(path).record_analytics_event(
        "match_finished", {"result_type": "WIN"}, match_id="restart", event_key="match_finished:restart"
    )
    second_store = SQLiteRuntimeStore(path)
    inserted_after_restart = second_store.record_analytics_event(
        "match_finished", {"result_type": "WIN"}, match_id="restart", event_key="match_finished:restart"
    )

    assert inserted_after_restart is False
    assert second_store.analytics_summary()["match_finished"]["total"] == 1


def test_record_analytics_event_concurrent_duplicates_create_one_row(tmp_path):
    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3")

    def record(_index):
        return store.record_analytics_event(
            "match_finished", {"result_type": "WIN"}, match_id="race", event_key="match_finished:race"
        )

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(record, range(8)))

    assert sum(1 for inserted in results if inserted) == 1
    assert store.analytics_summary()["match_finished"]["total"] == 1


def test_analytics_summary_counts_mission_completed_events_per_mission(tmp_path):
    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3")
    store.record_analytics_event("mission_completed", {"mission_id": "welcome_to_jujutsu_high"}, player_id="p1")
    store.record_analytics_event("mission_completed", {"mission_id": "welcome_to_jujutsu_high"}, player_id="p2")
    store.record_analytics_event("mission_completed", {"mission_id": "cursed_child_bond"}, player_id="p1")

    summary = store.analytics_summary()["missions_completed"]

    assert summary == {"welcome_to_jujutsu_high": 2, "cursed_child_bond": 1}


def test_analytics_summary_since_filter_excludes_older_events(tmp_path):
    now = [1_000.0]
    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3", clock=lambda: now[0])
    store.record_analytics_event("match_finished", {"result_type": "WIN"}, match_id="m1")
    store.record_analytics_event("match_player_result", {"outcome": "win"}, match_id="m1", player_id="p1")
    now[0] += 100
    store.record_analytics_event("match_finished", {"result_type": "WIN"}, match_id="m2")
    store.record_analytics_event("match_player_result", {"outcome": "loss"}, match_id="m2", player_id="p2")

    summary = store.analytics_summary(since=now[0])["match_finished"]

    assert summary["total"] == 1
    assert summary["losses"] == 1


def test_record_analytics_event_queues_to_outbox_on_write_failure(tmp_path, monkeypatch):
    """A transient write failure (locked DB, disk full, ...) must queue the
    event for retry instead of silently dropping it."""

    import sqlite3

    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3")

    def boom(*args, **kwargs):
        raise sqlite3.OperationalError("database is locked")

    monkeypatch.setattr(store, "_insert_analytics_row", boom)

    inserted = store.record_analytics_event(
        "match_finished", {"result_type": "WIN"}, match_id="m1", event_key="match_finished:m1"
    )

    assert inserted is False
    assert store.outbox_size() == 1
    assert store.analytics_summary()["match_finished"]["total"] == 0


def test_flush_outbox_retries_and_clears_on_success(tmp_path, monkeypatch):
    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3")
    real_insert = store._insert_analytics_row
    fail = {"active": True}

    def flaky(*args, **kwargs):
        if fail["active"]:
            raise RuntimeError("simulated transient failure")
        return real_insert(*args, **kwargs)

    monkeypatch.setattr(store, "_insert_analytics_row", flaky)
    store.record_analytics_event("match_finished", {"result_type": "WIN"}, match_id="m1", event_key="match_finished:m1")
    assert store.outbox_size() == 1

    # Still failing: flush is a no-op, event stays queued.
    flushed_while_failing = store.flush_outbox()
    assert flushed_while_failing == 0
    assert store.outbox_size() == 1

    # Recovered: flush now succeeds and drains the outbox.
    fail["active"] = False
    flushed = store.flush_outbox()

    assert flushed == 1
    assert store.outbox_size() == 0


def test_outbox_size_includes_batch_currently_being_flushed(tmp_path, monkeypatch):
    store = SQLiteRuntimeStore(tmp_path / "outbox-inflight.sqlite3")
    insert_row = store._insert_analytics_row
    monkeypatch.setattr(
        store,
        "_insert_analytics_row",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(OSError("queue first")),
    )
    store.record_analytics_event(
        "match_finished",
        {"result_type": "WIN"},
        match_id="inflight",
        event_key="match_finished:inflight",
    )
    started = threading.Event()
    release = threading.Event()

    def blocking_insert(*args, **kwargs):
        started.set()
        assert release.wait(timeout=5)
        return insert_row(*args, **kwargs)

    monkeypatch.setattr(store, "_insert_analytics_row", blocking_insert)
    worker = threading.Thread(target=store.flush_outbox)
    worker.start()
    try:
        assert started.wait(timeout=5)
        assert store.outbox_size() == 1
    finally:
        release.set()
        worker.join(timeout=5)

    assert not worker.is_alive()
    assert store.outbox_size() == 0
    assert store.analytics_summary()["match_finished"]["total"] == 1


def test_outbox_drops_oldest_entry_past_max_size(tmp_path, monkeypatch):
    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3")
    monkeypatch.setattr(store, "MAX_OUTBOX_SIZE", 3)
    monkeypatch.setattr(store, "_insert_analytics_row", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("down")))

    for index in range(5):
        store.record_analytics_event("match_finished", {"result_type": "WIN"}, match_id=f"m{index}")

    assert store.outbox_size() == 3
    assert store.outbox_dropped_total == 2
    # The two oldest (m0, m1) were dropped; the three most recent remain queued.
    queued_match_ids = [entry["match_id"] for entry in store._outbox]
    assert queued_match_ids == ["m2", "m3", "m4"]


def test_prune_old_analytics_events_respects_retention_window(tmp_path):
    now = [10_000.0]
    store = SQLiteRuntimeStore(tmp_path / "runtime.sqlite3", clock=lambda: now[0])
    store.record_analytics_event("match_finished", {"result_type": "WIN"}, match_id="old", event_key="match_finished:old")
    now[0] += 91 * 86400  # just past the default 90-day retention window
    store.record_analytics_event("match_finished", {"result_type": "WIN"}, match_id="new", event_key="match_finished:new")

    removed = store.prune_old_analytics_events(retention_days=90)

    assert removed == 1
    summary = store.analytics_summary()["match_finished"]
    assert summary["total"] == 1
