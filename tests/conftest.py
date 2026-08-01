import json
import os
import subprocess
from pathlib import Path

import pytest

from web import app as web_app

ROOT = Path(__file__).resolve().parents[1]


def run_node(script: str) -> dict:
    """Run an ESM script against the real Phaser scene/module source via Node.

    ponytail: was byte-for-byte duplicated across 9 test_phaser_*.py files;
    consolidated here since none of them varied the invocation itself, only
    the script body.
    """

    result = subprocess.run(
        ["node", "--experimental-default-type=module", "-"],
        input=script,
        text=True,
        capture_output=True,
        cwd=ROOT,
        check=True,
    )
    return json.loads(result.stdout)


@pytest.fixture(autouse=True, scope="session")
def isolate_runtime_store_database(tmp_path_factory):
    """Keep durable analytics/replay writes out of the real data/ directory during tests.

    `web_app.runtime_store` is a module-level singleton constructed once at
    import time, so redirecting `JJK_DATABASE_PATH` per test has no effect on
    it. Repoint its `.path` directly instead. Session-scoped (not per-test)
    because real background scheduler threads can still be mid-write to it
    after a per-test monkeypatch would have already reverted the path.
    """

    path = tmp_path_factory.mktemp("runtime_store") / "runtime.sqlite3"
    previous = os.environ.get("JJK_DATABASE_PATH")
    os.environ["JJK_DATABASE_PATH"] = str(path)
    web_app.runtime_store.path = path
    web_app.runtime_store._initialize()
    yield
    if previous is None:
        os.environ.pop("JJK_DATABASE_PATH", None)
    else:
        os.environ["JJK_DATABASE_PATH"] = previous


@pytest.fixture(autouse=True)
def reset_battle_v2_runtime_state():
    """Reset every Battle v2 lifecycle global before and after each test.

    Rooms, lobbies, and index maps are process-wide singletons on `web.app`.
    Without this, a test that leaves a room or lobby behind pollutes any
    later test that scans those globals wholesale (e.g. runtime pruning),
    making full-suite results depend on execution order.
    """

    manager_dict_attrs = (
        "rooms",
        "room_aliases",
        "rngs",
        "room_rosters",
        "room_skill_maps",
        "room_roster_modes",
        "room_cpu_difficulty",
        "room_first_creation_progress",
        "command_receipts",
        "room_locks",
        "room_replays",
        "_in_flight_commands",
    )

    def _reset():
        web_app.accepting_new_matches = True
        web_app.battle_command_handlers_inflight = 0
        manager = web_app.battle_v2_manager
        rooms = getattr(manager, "rooms", None)
        if isinstance(rooms, dict):
            for room_id in list(rooms):
                web_app.battle_v2_timer_scheduler.cancel(room_id)
        for attr in manager_dict_attrs:
            value = getattr(manager, attr, None)
            if isinstance(value, dict):
                value.clear()
        web_app.battle_v2_sessions.clear()
        web_app.v2_pvp_lobbies.clear()
        web_app.waiting_code_by_player.clear()
        web_app.active_match_by_player.clear()
        web_app.active_by_code.clear()
        web_app.lobby_code_by_match.clear()
        web_app.rematch_by_old_match.clear()
        web_app.rematch_receipts.clear()
        web_app.match_players.clear()
        web_app.match_roster_mode.clear()
        web_app.rate_limits.clear()
        web_app.room_last_activity.clear()
        web_app.lobby_last_activity.clear()
        web_app.archived_replays.clear()
        web_app.analytics_recorded_matches.clear()
        web_app.missions_settled_players.clear()
        web_app.missions_snapshotted_players.clear()
        web_app.mission_snapshot_retry_rooms.clear()
        web_app.mission_match_finished_at.clear()
        with web_app.runtime_store._connect() as connection:
            for table in (
                "first_creation_profiles",
                "battle_replays",
                "analytics_events",
                "mission_settlement_outbox",
            ):
                connection.execute(f"DELETE FROM {table}")

    _reset()
    yield
    _reset()
