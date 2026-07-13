from jjk_arena.battle_v2.lifecycle_stress import run_stress_batch

# Runtime state (rooms, lobbies, index maps) is reset by the autouse
# reset_battle_v2_runtime_state fixture in tests/conftest.py.


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
    # Every client is disconnected and every finished room is prunable, so the
    # harness should not accumulate state across a batch: this is the
    # "bounded" half of the "1,000 matches, 0 softlocks" exit gate.
    assert result["final_rooms"] <= 5
    assert result["peak_rooms"] <= result["matches"] * 2 + 5
