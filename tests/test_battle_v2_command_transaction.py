"""Regressions for full command-transaction atomicity.

`BattleV2Manager._execute_player_command` must treat the gameplay mutation,
the `state_revision` bump, the authoritative replay transcript append, and
the nonce receipt insertion as one rollbackable unit: a failure in any of
those steps must restore state, first-creation progress, RNG, replay, and
receipts exactly as if the command never ran, and must not let a queued
terminal (`on_match_finished`) callback escape before the whole transaction
commits.
"""

import pytest

from jjk_arena.battle_v2.manager import BattleV2Manager


def players():
    return [
        {"id": "p1", "name": "Player One", "team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]},
        {"id": "p2", "name": "Player Two", "team": ["satoru_gojo", "ryomen_sukuna", "mahito"]},
    ]


def started_manager(room_id="txn-room"):
    manager = BattleV2Manager(rng_seed=1, clock=lambda: 0.0, capture_replays=True)
    manager.start_classic_match(room_id, players())
    return manager


@pytest.mark.parametrize(
    "seam",
    ["_compute_authoritative_state_hash", "_append_replay_transcript", "_record_command_receipt"],
)
def test_injected_commit_seam_failure_rolls_back_the_whole_transaction(monkeypatch, seam):
    manager = started_manager()
    room_id = "txn-room"
    state_before = manager.get_state(room_id)
    revision_before = state_before.state_revision
    turn_player_before = state_before.turn_player_id
    replay_before = manager.room_replays[room_id]
    commands_before = list(replay_before["commands"])
    events_before = list(replay_before["events"])
    final_hash_before = replay_before["final_state_hash"]

    def explode(*_args, **_kwargs):
        raise RuntimeError(f"injected failure in {seam}")

    monkeypatch.setattr(manager, seam, explode)

    with pytest.raises(RuntimeError):
        manager.execute_player_command(room_id, turn_player_before, "end_turn", revision_before, "commit-seam-1", {})

    state_after = manager.get_state(room_id)
    assert state_after.state_revision == revision_before
    assert state_after.turn_player_id == turn_player_before
    assert manager.room_replays[room_id]["commands"] == commands_before
    assert manager.room_replays[room_id]["events"] == events_before
    assert manager.room_replays[room_id]["final_state_hash"] == final_hash_before
    assert "commit-seam-1" not in manager.command_receipts[room_id].get(turn_player_before, {})

    # The receipt was never recorded, so retrying the exact same nonce after
    # the injected failure is lifted must re-run the command instead of
    # silently short-circuiting as an idempotent replay.
    monkeypatch.undo()
    manager.execute_player_command(room_id, turn_player_before, "end_turn", revision_before, "commit-seam-1", {})
    assert manager.get_state(room_id).state_revision == revision_before + 1
    assert "commit-seam-1" in manager.command_receipts[room_id][turn_player_before]


def test_terminal_callback_does_not_fire_when_commit_fails_after_finish(monkeypatch):
    manager = started_manager()
    room_id = "txn-room"
    state = manager.get_state(room_id)
    surrendering_player = state.turn_player_id
    revision_before = state.state_revision

    finished_rooms = []
    manager.on_match_finished = finished_rooms.append

    def explode(*_args, **_kwargs):
        raise RuntimeError("injected failure after finish")

    monkeypatch.setattr(manager, "_compute_authoritative_state_hash", explode)

    with pytest.raises(RuntimeError):
        manager.execute_player_command(
            room_id, surrendering_player, "surrender", revision_before, "surrender-1", {}
        )

    # The finish itself must have been rolled back along with everything else.
    state_after = manager.get_state(room_id)
    assert state_after.phase.value != "finished"
    assert state_after.state_revision == revision_before
    assert finished_rooms == []

    # Once the injected failure is lifted, the same surrender succeeds and
    # the terminal callback fires exactly once, only after the transaction
    # that produced it fully committed.
    monkeypatch.undo()
    manager.execute_player_command(
        room_id, surrendering_player, "surrender", revision_before, "surrender-1", {}
    )
    assert finished_rooms == [room_id]
    assert manager.get_state(room_id).phase.value == "finished"
