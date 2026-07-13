import pytest

from jjk_arena.battle_v2.lifecycle_stress import run_stress_batch
from web import app as web_app


@pytest.fixture(autouse=True)
def clear_v2_state():
    def _clear():
        for room_id in list(web_app.battle_v2_manager.rooms):
            web_app.battle_v2_timer_scheduler.cancel(room_id)
        web_app.battle_v2_manager.rooms.clear()
        web_app.battle_v2_manager.rngs.clear()
        web_app.battle_v2_manager.command_receipts.clear()
        web_app.battle_v2_manager.room_locks.clear()
        web_app.battle_v2_sessions.clear()
        web_app.v2_pvp_lobbies.clear()
        web_app.active_by_code.clear()
        web_app.active_match_by_player.clear()
        web_app.waiting_code_by_player.clear()
        web_app.lobby_code_by_match.clear()
        web_app.rematch_by_old_match.clear()
        web_app.rematch_receipts.clear()
        web_app.match_players.clear()
        web_app.match_roster_mode.clear()
        web_app.rate_limits.clear()

    _clear()
    yield
    _clear()


def test_lifecycle_stress_batch_produces_zero_softlocks():
    result = run_stress_batch(matches=100, seed=1)
    assert result["softlock_count"] == 0, result["softlocks"]
    assert result["matches"] == 100
    assert set(result["scenario_counts"]) == {
        "clean_finish",
        "disconnect_reconnect",
        "disconnect_forfeit",
        "rematch_spam",
        "code_reuse_race",
    }
