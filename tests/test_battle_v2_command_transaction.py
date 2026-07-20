"""Regressions for full command-transaction atomicity.

`BattleV2Manager._execute_player_command` must treat the gameplay mutation,
the `state_revision` bump, the authoritative replay transcript append, and
the nonce receipt insertion as one rollbackable unit: a failure in any of
those steps must restore state, first-creation progress, RNG, replay, and
receipts exactly as if the command never ran, and must not let a queued
terminal (`on_match_finished`) callback escape before the whole transaction
commits.
"""

import threading

import pytest

import jjk_arena.battle_v2.manager as manager_module
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


def test_deferred_finish_callbacks_do_not_leak_across_concurrent_rooms(monkeypatch):
    """`_deferred_match_finished`-style state must be thread-local, not a shared attribute.

    Different rooms are only serialized by their own per-room `room_locks`
    entry, so two rooms can have their command transactions in flight on
    different threads at the same moment. A plain shared instance attribute
    tracking "the current transaction's pending terminal callbacks" would
    let one room's in-progress queue be clobbered by another room's queue
    setup/teardown running concurrently on a different thread.
    """

    manager = BattleV2Manager(rng_seed=1, clock=lambda: 0.0)
    manager.start_classic_match("room-a", players())
    manager.start_classic_match("room-b", players())

    finished_rooms: list[str] = []
    finished_lock = threading.Lock()

    def record(room_id):
        with finished_lock:
            finished_rooms.append(room_id)

    manager.on_match_finished = record

    entered_a = threading.Event()
    release_a = threading.Event()
    original_record_receipt = manager._record_command_receipt

    def blocking_record_receipt(player_receipts, nonce, fingerprint):
        if nonce == "surrender-a":
            entered_a.set()
            assert release_a.wait(timeout=2.0)
        return original_record_receipt(player_receipts, nonce, fingerprint)

    monkeypatch.setattr(manager, "_record_command_receipt", blocking_record_receipt)

    state_a = manager.get_state("room-a")
    player_a = state_a.turn_player_id
    revision_a = state_a.state_revision

    thread_a = threading.Thread(
        target=lambda: manager.execute_player_command(
            "room-a", player_a, "surrender", revision_a, "surrender-a", {}
        )
    )
    thread_a.start()
    assert entered_a.wait(timeout=2.0)

    # room-a's transaction is now parked mid-commit, inside its own open
    # `_defer_finished_callbacks()` block, with its finish already queued
    # but not yet published. room-b's surrender must complete and publish
    # independently on this (the main) thread without waiting for or being
    # corrupted by room-a's still-open queue.
    state_b = manager.get_state("room-b")
    player_b = state_b.turn_player_id
    manager.execute_player_command("room-b", player_b, "surrender", state_b.state_revision, "surrender-b", {})

    assert finished_rooms == ["room-b"]
    assert manager.get_state("room-b").phase.value == "finished"

    release_a.set()
    thread_a.join(timeout=2.0)
    assert not thread_a.is_alive()

    assert finished_rooms == ["room-b", "room-a"]
    assert manager.get_state("room-a").phase.value == "finished"


def test_expire_phase_if_needed_does_not_publish_when_a_later_step_raises(monkeypatch):
    """`_expire_phase_if_needed` has no state rollback of its own: `check_winner`
    can call `_finish_match`, and several more mutations (turn completion,
    progress refresh, next-turn energy, re-arming the phase timer) still run
    afterward. If one of those later steps raises, the terminal callback must
    not have already escaped for a finish that never cleanly completed.
    """

    manager = BattleV2Manager(rng_seed=1, clock=lambda: 0.0)
    manager.start_classic_match("room-a", players())
    state = manager.get_state("room-a")

    finished_rooms: list[str] = []
    manager.on_match_finished = finished_rooms.append

    monkeypatch.setattr(manager_module, "phase_timer_expired", lambda _state, _clock: True)

    def fake_check_winner(inner_state):
        manager._finish_match(inner_state, "WIN", next(iter(inner_state.players)), "test-injected")

    monkeypatch.setattr(manager_module, "check_winner", fake_check_winner)

    def exploding_complete_player_turn(*_args, **_kwargs):
        raise RuntimeError("injected failure after finish")

    monkeypatch.setattr(manager, "_complete_player_turn", exploding_complete_player_turn)

    with pytest.raises(RuntimeError):
        manager.expire_phase_if_needed("room-a")

    assert finished_rooms == []
    # This layer has no state rollback of its own -- the phase transition
    # itself is not undone -- but the terminal callback must still never
    # have fired for a pass that did not complete cleanly.
    assert state.phase.value == "finished"
