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
    assert store.healthcheck() == {"ok": True, "schema_version": 1}
