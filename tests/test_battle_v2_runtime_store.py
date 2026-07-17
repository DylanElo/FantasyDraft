from concurrent.futures import ThreadPoolExecutor

from jjk_arena.battle_v2.first_creation_profile import (
    load_first_creation_profile,
    merge_first_creation_progress,
    save_first_creation_profile,
)
from jjk_arena.battle_v2.runtime_store import SQLiteRuntimeStore


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
    assert store.healthcheck() == {"ok": True, "schema_version": 5}


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
