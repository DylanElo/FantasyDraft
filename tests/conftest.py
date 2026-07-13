import pytest

from web import app as web_app


@pytest.fixture(autouse=True)
def isolate_first_creation_profile_store(tmp_path, monkeypatch):
    """Keep first-creation profile persistence out of the working tree during tests."""

    monkeypatch.setenv("JJK_FIRST_CREATION_PROFILE_STORE", str(tmp_path / "first_creation_profiles.json"))


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
        "room_first_creation_progress",
        "command_receipts",
        "room_locks",
        "room_replays",
    )

    def _reset():
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

    _reset()
    yield
    _reset()
