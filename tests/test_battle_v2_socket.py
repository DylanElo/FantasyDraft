import pytest
from copy import deepcopy
from itertools import count
from threading import Barrier, Thread

from jjk_arena.battle_v2.models import EnergyType, SkillClass, StatusEffect
from jjk_arena.battle_v2.timers import BattleTimerPolicy
from web import app as web_app


COMMAND_NONCES = count(1)


def command_payload(state, payload=None, *, revision_offset=0):
    return {
        **(payload or {}),
        "state_revision": state.state_revision + revision_offset,
        "client_action_nonce": f"test-{next(COMMAND_NONCES)}",
    }


@pytest.fixture(autouse=True)
def clear_v2_rooms():
    for room_id in list(web_app.battle_v2_manager.rooms):
        web_app.battle_v2_timer_scheduler.cancel(room_id)
    web_app.battle_v2_manager.rooms.clear()
    web_app.battle_v2_manager.rngs.clear()
    web_app.battle_v2_manager.command_receipts.clear()
    web_app.battle_v2_manager.room_locks.clear()
    web_app.battle_v2_sessions.clear()
    web_app.v2_pvp_lobbies.clear()
    web_app.rate_limits.clear()
    yield
    for room_id in list(web_app.battle_v2_manager.rooms):
        web_app.battle_v2_timer_scheduler.cancel(room_id)
    web_app.battle_v2_manager.rooms.clear()
    web_app.battle_v2_manager.rngs.clear()
    web_app.battle_v2_manager.command_receipts.clear()
    web_app.battle_v2_manager.room_locks.clear()
    web_app.battle_v2_sessions.clear()
    web_app.v2_pvp_lobbies.clear()
    web_app.rate_limits.clear()


def socket_client():
    flask_client = web_app.app.test_client()
    return web_app.socketio.test_client(web_app.app, flask_test_client=flask_client)


def socket_client_with_player(player_id):
    flask_client = web_app.app.test_client()
    with flask_client.session_transaction() as flask_session:
        flask_session["player_id"] = player_id
    return web_app.socketio.test_client(web_app.app, flask_test_client=flask_client)


def received_names(client):
    return [message["name"] for message in client.get_received()]


def received_payload(client, event_name):
    for message in client.get_received():
        if message["name"] == event_name:
            return message["args"][0]
    return None


def received_payloads(client):
    return {message["name"]: message["args"][0] for message in client.get_received()}


def test_battle_v2_socket_events_are_feature_flagged(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v1")
    client = socket_client()

    client.emit("battle_v2_start_classic", {"room_id": "socket-v2"})

    payload = received_payload(client, "battle_v2_error")
    assert payload["message"].startswith("Battle v2 is disabled")


def test_battle_v2_socket_requires_command_revision_and_nonce(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client()
    client.emit("battle_v2_start_classic", {"room_id": "versioned-v2"})
    received_payload(client, "battle_v2_update")

    client.emit("battle_v2_end_turn", {})

    error = received_payload(client, "battle_v2_error")
    assert error == {"message": "state_revision is required"}
    assert web_app.battle_v2_manager.get_state("versioned-v2").turn_number == 1


def test_battle_v2_start_classic_threads_cpu_difficulty(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client()
    client.emit("battle_v2_start_classic", {"room_id": "difficulty-hard", "difficulty": "hard"})
    payload = received_payload(client, "battle_v2_update")

    assert web_app.battle_v2_manager.room_cpu_difficulty[payload["match_id"]] == "hard"


def test_battle_v2_start_classic_rejects_invalid_difficulty_string(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client()
    client.emit("battle_v2_start_classic", {"room_id": "difficulty-bogus", "difficulty": "impossible"})
    payload = received_payload(client, "battle_v2_update")

    assert web_app.battle_v2_manager.room_cpu_difficulty[payload["match_id"]] == "normal"


def test_cpu_rematch_preserves_the_original_difficulty(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client()
    client.emit("battle_v2_start_classic", {"room_id": "rematch-difficulty", "difficulty": "hard"})
    started = received_payload(client, "battle_v2_update")
    match_id = started["match_id"]
    state = web_app.battle_v2_manager.get_state(match_id)

    client.emit("battle_v2_surrender", command_payload(state))
    received_payload(client, "battle_v2_finished")

    client.emit(
        "battle_v2_rematch",
        {
            "old_match_id": match_id,
            "state_revision": state.state_revision,
            "client_action_nonce": "rematch-difficulty-nonce",
        },
    )
    rematch = received_payload(client, "battle_v2_rematch")

    assert web_app.battle_v2_manager.room_cpu_difficulty[rematch["new_match_id"]] == "hard"


def test_match_finished_analytics_are_recorded_without_any_broadcast(monkeypatch):
    """Match-finished analytics must come from the authoritative state
    transition, not the emit_battle_v2_update broadcast path.

    Regression for the P2 finding that analytics were only ever recorded
    as a side effect of broadcasting a viewer update — calling the
    manager's authoritative `surrender()` directly (with no socket client,
    no `emit_battle_v2_update` call at all) must still produce the event.
    """

    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    web_app.battle_v2_manager.start_classic_match("no-broadcast-room", [
        {"id": "p1", "name": "Player One", "team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]},
        {"id": "p2", "name": "Player Two", "team": ["satoru_gojo", "ryomen_sukuna", "mahito"]},
    ])

    before = web_app.runtime_store.analytics_summary()["match_finished"]["total"]
    web_app.battle_v2_manager.surrender("no-broadcast-room", "p1")
    after = web_app.runtime_store.analytics_summary()["match_finished"]["total"]

    assert after - before == 1


def test_mission_settlement_happens_from_surrender_with_no_broadcast_at_all(monkeypatch):
    """Mirrors test_match_finished_analytics_are_recorded_without_any_broadcast:
    settlement must fire from the real terminal-state transition
    (manager._finish_match, via the on_match_finished hook), not from a
    broadcast -- calling surrender() directly, with no socket client and no
    emit_battle_v2_update call, must still merge and record mission progress."""

    from jjk_arena.battle_v2.models import BattleEvent

    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    web_app.battle_v2_manager.start_first_creation_match("mission-no-broadcast-room", [
        {"id": "p1", "name": "Player One", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
        {"id": "p2", "name": "Player Two", "team": ["maki_zenin", "toge_inumaki", "panda"]},
    ])
    state = web_app.battle_v2_manager.get_state("mission-no-broadcast-room")
    for index, skill_id in enumerate([
        "fc_yuji_itadori_divergent_fist",
        "fc_megumi_fushiguro_divine_dogs",
        "fc_nobara_kugisaki_nail_barrage",
    ]):
        state.event_log.append(BattleEvent(
            type="skill_resolved",
            message=f"skill {index}",
            turn_number=1,
            payload={"player_id": "p1", "skill_id": skill_id},
        ))
    state.event_log.append(BattleEvent(
        type="status_applied",
        message="Momentum",
        turn_number=1,
        payload={"status": "momentum", "source_player_id": "p1", "source_skill_id": "fc_yuji_itadori_black_flash_attempt"},
    ))

    before = web_app.runtime_store.analytics_summary()["missions_completed"].get("welcome_to_jujutsu_high", 0)
    web_app.battle_v2_manager.surrender("mission-no-broadcast-room", "p2")  # p2 surrenders, p1 wins
    after = web_app.runtime_store.analytics_summary()["missions_completed"].get("welcome_to_jujutsu_high", 0)

    assert after - before == 1
    profile = web_app.load_first_creation_profile("p1")
    assert "welcome_to_jujutsu_high" in profile["completed_missions"]


def _finish_first_creation_match_for_p1(room_id: str) -> None:
    from jjk_arena.battle_v2.models import BattleEvent, BattlePhase

    state = web_app.battle_v2_manager.get_state(room_id)
    for index, skill_id in enumerate([
        "fc_yuji_itadori_divergent_fist",
        "fc_megumi_fushiguro_divine_dogs",
        "fc_nobara_kugisaki_nail_barrage",
    ]):
        state.event_log.append(BattleEvent(
            type="skill_resolved",
            message=f"skill {index}",
            turn_number=1,
            payload={"player_id": "p1", "skill_id": skill_id},
        ))
    state.event_log.append(BattleEvent(
        type="status_applied",
        message="Momentum",
        turn_number=1,
        payload={"status": "momentum", "source_player_id": "p1", "source_skill_id": "fc_yuji_itadori_black_flash_attempt"},
    ))
    state.winner_id = "p1"
    state.result_type = "WIN"
    state.phase = BattlePhase.FINISHED


def test_settle_first_creation_missions_records_analytics_exactly_once(monkeypatch):
    """Mission settlement is idempotent: calling it again (e.g. a duplicate
    or late-arriving terminal-state hook fire) must not double-count."""

    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    web_app.battle_v2_manager.start_first_creation_match("mission-analytics-room", [
        {"id": "p1", "name": "Player One", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
        {"id": "p2", "name": "Player Two", "team": ["maki_zenin", "toge_inumaki", "panda"]},
    ])
    _finish_first_creation_match_for_p1("mission-analytics-room")

    before = web_app.runtime_store.analytics_summary()["missions_completed"].get("welcome_to_jujutsu_high", 0)
    web_app.settle_first_creation_missions("mission-analytics-room")
    web_app.settle_first_creation_missions("mission-analytics-room")
    after = web_app.runtime_store.analytics_summary()["missions_completed"].get("welcome_to_jujutsu_high", 0)

    assert after - before == 1


def test_settle_first_creation_missions_retries_after_a_transient_write_failure(monkeypatch):
    """Regression: a transient failure merging one player's profile must not
    permanently mark the match as settled -- the next natural retry (e.g. a
    reconnect-triggered rebroadcast, or another on_match_finished fire) must
    still be able to persist the mission credit and unlock instead of losing
    it forever the moment one write happens to fail."""

    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    web_app.battle_v2_manager.start_first_creation_match("mission-retry-room", [
        {"id": "p1", "name": "Player One", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
        {"id": "p2", "name": "Player Two", "team": ["maki_zenin", "toge_inumaki", "panda"]},
    ])
    _finish_first_creation_match_for_p1("mission-retry-room")

    real_merge = web_app.merge_first_creation_progress

    def failing_merge(*args, **kwargs):
        raise RuntimeError("simulated transient SQLite write failure")

    monkeypatch.setattr(web_app, "merge_first_creation_progress", failing_merge)
    web_app.settle_first_creation_missions("mission-retry-room")

    profile = web_app.load_first_creation_profile("p1")
    assert "welcome_to_jujutsu_high" not in profile["completed_missions"], (
        "sanity check: the failing write must not itself have persisted anything"
    )

    monkeypatch.setattr(web_app, "merge_first_creation_progress", real_merge)
    web_app.settle_first_creation_missions("mission-retry-room")

    profile = web_app.load_first_creation_profile("p1")
    assert "welcome_to_jujutsu_high" in profile["completed_missions"], (
        "a transient failure must not permanently mark the match settled -- "
        "a later retry must still be able to persist the mission credit"
    )


def test_emit_battle_v2_update_no_longer_settles_missions_itself(monkeypatch):
    """Regression: mission settlement moved out of the broadcast path onto
    the authoritative terminal-state hook. Broadcasting a finished state
    without that hook having fired first must not itself merge/record
    anything -- it can only read whatever profile state already exists."""

    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    web_app.battle_v2_manager.start_first_creation_match("mission-broadcast-only-room", [
        {"id": "p1", "name": "Player One", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
        {"id": "p2", "name": "Player Two", "team": ["maki_zenin", "toge_inumaki", "panda"]},
    ])
    _finish_first_creation_match_for_p1("mission-broadcast-only-room")

    before = web_app.runtime_store.analytics_summary()["missions_completed"].get("welcome_to_jujutsu_high", 0)
    with web_app.app.test_request_context():
        web_app.emit_battle_v2_update("mission-broadcast-only-room", "p1")
    after = web_app.runtime_store.analytics_summary()["missions_completed"].get("welcome_to_jujutsu_high", 0)

    assert after == before


def test_decisive_pvp_match_records_one_win_and_one_loss(monkeypatch):
    """A decisive PvP match must produce exactly one winner and one loser.

    Regression for the Milestone C audit finding that every decisive PvP
    match was recorded as a "win" (the outcome logic only ever checked
    whether the CPU player won), with no paired loss anywhere in the data.
    """

    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1_client = socket_client_with_player("pvp-win-loss-p1")
    p2_client = socket_client_with_player("pvp-win-loss-p2")
    for client, player_id, team in [
        (p1_client, "P1", ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]),
        (p2_client, "P2", ["satoru_gojo", "ryomen_sukuna", "mahito"]),
    ]:
        client.emit(
            "battle_v2_join_pvp",
            {"room_id": "pvp-win-loss", "player_name": player_id, "player_team": team},
        )
    received_payload(p1_client, "battle_v2_update")
    match_id = received_payload(p2_client, "battle_v2_update")["match_id"]
    state = web_app.battle_v2_manager.get_state(match_id)

    before = web_app.runtime_store.analytics_summary()["match_finished"]

    p1_client.emit("battle_v2_surrender", command_payload(state))
    received_payload(p1_client, "battle_v2_finished")
    received_payload(p2_client, "battle_v2_finished")

    after = web_app.runtime_store.analytics_summary()["match_finished"]
    assert after["wins"] - before["wins"] == 1
    assert after["losses"] - before["losses"] == 1


def test_background_planning_timeout_broadcasts_and_runs_cpu(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    monkeypatch.setattr(
        web_app.battle_v2_manager,
        "timer_policy",
        BattleTimerPolicy(planning_seconds=0.03, queue_review_seconds=0.03),
    )
    client = socket_client()
    client.emit("battle_v2_start_classic", {"room_id": "scheduled-timeout"})
    start = received_payload(client, "battle_v2_update")
    player_id = start["turn_player_id"]

    web_app.socketio.sleep(0.12)
    timed_out = received_payload(client, "battle_v2_update")

    assert timed_out["turn_player_id"] == player_id
    assert timed_out["state_revision"] >= 2
    assert any(event["type"] == "phase_timeout" for event in timed_out["event_log"])
    assert any(event["type"] == "skill_resolved" for event in timed_out["event_log"])


def test_resume_rebinds_socket_and_restores_viewer_specific_queue_without_hidden_leak(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    original = socket_client_with_player("original")
    original.emit("battle_v2_start_classic", {"room_id": "resume-v2"})
    started = received_payloads(original)
    grant = started["battle_v2_session"]
    state = web_app.battle_v2_manager.get_state("resume-v2")
    state.players["original"].energy[EnergyType.GREEN] = 1
    state.players["original"].team[0].statuses.append(
        StatusEffect("enemy_secret", "Enemy Secret", "__cpu_v2__", 0, "original", 0, 2, invisible=True)
    )
    original.emit("battle_v2_submit_plan", command_payload(state, {"actions": [{
        "id": "resume-action",
        "caster_slot": 0,
        "skill_id": "divergent_fist",
        "target_player_id": "__cpu_v2__",
        "target_slot": 0,
    }]}))
    received_payload(original, "battle_v2_update")
    original.disconnect()

    resumed = socket_client_with_player("different-browser-session")
    resumed.emit("battle_v2_resume", grant)
    messages = received_payloads(resumed)
    snapshot = messages["battle_v2_update"]

    assert messages["battle_v2_session"]["resume_token"] != grant["resume_token"]
    assert snapshot["pending_actions"]["original"][0]["id"] == "resume-action"
    assert snapshot["phase"] == "queue_review"
    assert snapshot["phase_seconds_remaining"] > 0
    assert snapshot["players"]["original"]["team"][0]["statuses"] == []


def test_invalid_or_rotated_resume_token_is_rejected(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    original = socket_client_with_player("original")
    original.emit("battle_v2_start_classic", {"room_id": "resume-reject"})
    grant = received_payloads(original)["battle_v2_session"]

    first_resume = socket_client_with_player("new-session")
    first_resume.emit("battle_v2_resume", grant)
    received_payloads(first_resume)
    replay = socket_client_with_player("attacker")
    replay.emit("battle_v2_resume", grant)

    rejected = received_payloads(replay)
    assert rejected == {"battle_v2_resume_rejected": {"message": "Battle session could not be resumed."}}


def test_concurrent_resume_replay_admits_only_atomic_rotation_winner(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    original = socket_client_with_player("resume-owner")
    original.emit("battle_v2_start_classic", {"room_id": "resume-concurrent"})
    grant = received_payloads(original)["battle_v2_session"]
    original.disconnect()

    first = socket_client_with_player("first-replay-session")
    second = socket_client_with_player("second-replay-session")
    contenders = (first, second)
    rotate_barrier = Barrier(len(contenders))
    original_rotate = web_app.battle_v2_sessions.rotate

    def synchronized_rotate(room_id, player_id, token):
        rotate_barrier.wait(timeout=2)
        return original_rotate(room_id, player_id, token)

    monkeypatch.setattr(web_app.battle_v2_sessions, "rotate", synchronized_rotate)
    failures = []

    def attempt_resume(client):
        try:
            client.emit("battle_v2_resume", grant)
        except BaseException as exc:  # Surface worker failures in the test thread.
            failures.append(exc)

    workers = [Thread(target=attempt_resume, args=(client,)) for client in contenders]
    for worker in workers:
        worker.start()
    for worker in workers:
        worker.join(timeout=3)

    assert not any(worker.is_alive() for worker in workers)
    assert failures == []
    messages = [received_payloads(client) for client in contenders]
    winners = [payloads for payloads in messages if "battle_v2_session" in payloads]
    losers = [payloads for payloads in messages if "battle_v2_resume_rejected" in payloads]

    assert len(winners) == 1
    assert len(losers) == 1
    assert winners[0]["battle_v2_session"]["resume_token"] != grant["resume_token"]
    assert "battle_v2_update" in winners[0]
    assert losers[0] == {
        "battle_v2_resume_rejected": {"message": "Battle session could not be resumed."},
    }


def test_battle_v2_socket_retry_does_not_repeat_energy_conversion(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client()
    client.emit("battle_v2_start_classic", {"room_id": "retry-v2"})
    start = received_payload(client, "battle_v2_update")
    state = web_app.battle_v2_manager.get_state("retry-v2")
    player_id = start["turn_player_id"]
    state.players[player_id].energy[EnergyType.GREEN] = 2
    command = {
        "source": "green",
        "target": "red",
        "state_revision": 0,
        "client_action_nonce": "socket-retry",
    }

    client.emit("battle_v2_convert_energy", command)
    first = received_payload(client, "battle_v2_update")
    client.emit("battle_v2_convert_energy", command)
    second = received_payload(client, "battle_v2_update")

    assert second == first
    assert second["state_revision"] == 1
    assert [event["type"] for event in second["event_log"]].count("energy_converted") == 1


def test_battle_v2_socket_rejects_stale_revision_without_mutation(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client()
    client.emit("battle_v2_start_classic", {"room_id": "stale-v2"})
    start = received_payload(client, "battle_v2_update")
    state = web_app.battle_v2_manager.get_state("stale-v2")
    before = deepcopy(web_app.battle_v2_manager.serialize_for_player("stale-v2", start["turn_player_id"]))

    client.emit("battle_v2_end_turn", {
        "state_revision": 12,
        "client_action_nonce": "stale-command",
    })

    error = received_payload(client, "battle_v2_error")
    assert "stale state revision" in error["message"]
    assert web_app.battle_v2_manager.serialize_for_player("stale-v2", start["turn_player_id"]) == before


def test_battle_v2_socket_start_submit_confirm(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client()

    client.emit(
        "battle_v2_start_classic",
        {
            "room_id": "socket-v2",
            "player_name": "Tester",
            "player_team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"],
            "enemy_team": ["satoru_gojo", "ryomen_sukuna", "mahito"],
        },
    )
    start_state = received_payload(client, "battle_v2_update")
    player_id = start_state["turn_player_id"]
    assert start_state["phase"] == "planning"

    state = web_app.battle_v2_manager.get_state("socket-v2")
    state.players[player_id].energy[EnergyType.GREEN] = 1

    client.emit(
        "battle_v2_submit_plan",
        command_payload(state, {
            "actions": [
                {
                    "id": "a1",
                    "caster_slot": 0,
                    "skill_id": "divergent_fist",
                    "target_player_id": "__cpu_v2__",
                    "target_slot": 0,
                }
            ]
        }),
    )
    assert "battle_v2_update" in received_names(client)

    client.emit("battle_v2_confirm_queue", command_payload(state))
    resolved_state = received_payload(client, "battle_v2_update")

    assert resolved_state["turn_player_id"] == player_id
    assert resolved_state["players"]["__cpu_v2__"]["team"][0]["hp"] == 80
    assert any(event["type"] == "skill_resolved" and "used" in event["message"] for event in resolved_state["event_log"])


def test_battle_v2_socket_convert_energy(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client()
    client.emit(
        "battle_v2_start_classic",
        {
            "room_id": "socket-v2",
            "player_name": "Tester",
            "player_team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"],
            "enemy_team": ["satoru_gojo", "ryomen_sukuna", "mahito"],
        },
    )
    start_state = received_payload(client, "battle_v2_update")
    player_id = start_state["turn_player_id"]
    state = web_app.battle_v2_manager.get_state("socket-v2")
    state.players[player_id].energy[EnergyType.GREEN] = 2
    state.players[player_id].energy[EnergyType.RED] = 0

    client.emit("battle_v2_convert_energy", command_payload(state, {"source": "green", "target": "red"}))
    converted = received_payload(client, "battle_v2_update")

    assert converted["players"][player_id]["energy"]["green"] == 0
    assert converted["players"][player_id]["energy"]["red"] == 1
    assert converted["players"][player_id]["energy_converted_this_turn"] is True
    assert any(event["type"] == "energy_converted" for event in converted["event_log"])


def test_battle_v2_socket_surrender_finishes_match(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client()
    client.emit("battle_v2_start_classic", {"room_id": "socket-v2"})
    received_payload(client, "battle_v2_update")
    state = web_app.battle_v2_manager.get_state("socket-v2")

    client.emit("battle_v2_surrender", command_payload(state))

    finished = received_payload(client, "battle_v2_finished")
    assert finished == {"winner_id": "__cpu_v2__"}


def test_battle_v2_socket_start_accepts_expanded_roster_teams(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client()

    client.emit(
        "battle_v2_start_classic",
        {
            "room_id": "socket-v2",
            "player_team": ["aoi_todo", "maki_zenin", "yuta_okkotsu"],
            "enemy_team": ["hiromi_higuruma", "satoru_gojo", "mahito"],
        },
    )

    state = received_payload(client, "battle_v2_update")
    assert [character["character_id"] for character in state["players"][state["turn_player_id"]]["team"]] == [
        "aoi_todo",
        "maki_zenin",
        "yuta_okkotsu",
    ]
    assert "hiromi_higuruma" in state["skill_catalog"]


def test_battle_v2_socket_end_turn_runs_cpu_response(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client()
    client.emit("battle_v2_start_classic", {"room_id": "socket-v2", "player_name": "Tester"})
    start_state = received_payload(client, "battle_v2_update")
    player_id = start_state["turn_player_id"]

    state = web_app.battle_v2_manager.get_state("socket-v2")
    client.emit("battle_v2_end_turn", command_payload(state))

    resolved_state = received_payload(client, "battle_v2_update")
    assert resolved_state["turn_player_id"] == player_id
    assert any(event["message"] == "Tester ended their turn" for event in resolved_state["event_log"])
    assert any(event["type"] == "skill_resolved" for event in resolved_state["event_log"])


def test_battle_v2_socket_resolves_ally_target_skill(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client()
    client.emit(
        "battle_v2_start_classic",
        {
            "room_id": "socket-v2",
            "player_name": "Tester",
            "player_team": ["yuta_okkotsu", "yuji_itadori", "nobara_kugisaki"],
            "enemy_team": ["satoru_gojo", "ryomen_sukuna", "mahito"],
        },
    )
    start_state = received_payload(client, "battle_v2_update")
    player_id = start_state["turn_player_id"]
    state = web_app.battle_v2_manager.get_state("socket-v2")
    state.players[player_id].energy[EnergyType.WHITE] = 1
    state.players[player_id].energy[EnergyType.GREEN] = 1
    state.players[player_id].team[1].hp = 50

    client.emit(
        "battle_v2_submit_plan",
        command_payload(state, {
            "actions": [
                {
                    "id": "heal-ally",
                    "caster_slot": 0,
                    "skill_id": "reverse_cursed_technique",
                    "target_player_id": player_id,
                    "target_slot": 1,
                    "wildcard_pays": ["green"],
                }
            ]
        }),
    )
    assert "battle_v2_update" in received_names(client)

    client.emit("battle_v2_confirm_queue", command_payload(state))
    resolved_state = received_payload(client, "battle_v2_update")

    heal_events = [event for event in resolved_state["event_log"] if event["type"] == "heal"]
    assert heal_events
    assert heal_events[0]["payload"]["target_player_id"] == player_id
    assert heal_events[0]["payload"]["target_slot"] == 1
    assert heal_events[0]["payload"]["amount"] == 30


def test_battle_v2_socket_broadcasts_viewer_specific_private_state(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1_client = socket_client_with_player("p1")
    p2_client = socket_client_with_player("p2")

    web_app.battle_v2_manager.start_classic_match(
        "human-v2",
        [
            {"id": "p1", "name": "P1", "team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]},
            {"id": "p2", "name": "P2", "team": ["satoru_gojo", "ryomen_sukuna", "mahito"]},
        ],
    )
    state = web_app.battle_v2_manager.get_state("human-v2")
    state.players["p2"].team[0].statuses.append(
        StatusEffect(
            "hidden_trap",
            "Hidden Trap",
            "p1",
            2,
            "p2",
            0,
            duration=2,
            classes=[SkillClass.INVISIBLE],
            invisible=True,
        )
    )
    p2_client.emit("battle_v2_cancel_queue", command_payload(state, {"room_id": "human-v2"}))
    p2_client.get_received()

    p1_client.emit("battle_v2_cancel_queue", command_payload(state, {"room_id": "human-v2"}))
    p1_update = received_payload(p1_client, "battle_v2_update")
    p2_update = received_payload(p2_client, "battle_v2_update")

    assert p1_update["players"]["p2"]["team"][0]["statuses"][0]["id"] == "hidden_trap"
    assert p2_update["players"]["p2"]["team"][0]["statuses"] == []


def test_battle_v2_pvp_join_waits_then_starts_two_human_room(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1_client = socket_client_with_player("p1")
    p2_client = socket_client_with_player("p2")

    p1_client.emit(
        "battle_v2_join_pvp",
        {
            "room_id": "human-start",
            "player_name": "P1",
            "player_team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"],
        },
    )

    waiting = received_payload(p1_client, "battle_v2_lobby")
    assert waiting["status"] == "waiting"
    assert waiting["room_id"] == "human-start"
    assert "human-start" not in web_app.battle_v2_manager.rooms

    p2_client.emit(
        "battle_v2_join_pvp",
        {
            "room_id": "human-start",
            "player_name": "P2",
            "player_team": ["satoru_gojo", "ryomen_sukuna", "mahito"],
        },
    )

    p1_messages = received_payloads(p1_client)
    p2_messages = received_payloads(p2_client)
    p1_update = p1_messages["battle_v2_update"]
    p2_update = p2_messages["battle_v2_update"]
    p1_session = p1_messages["battle_v2_session"]
    p2_session = p2_messages["battle_v2_session"]

    assert set(p1_update["players"]) == {"p1", "p2"}
    assert set(p2_update["players"]) == {"p1", "p2"}
    assert "__cpu_v2__" not in p1_update["players"]
    assert p1_session["player_id"] == "p1"
    assert p2_session["player_id"] == "p2"
    assert p1_session["room_id"] == p1_update["match_id"]
    assert p2_session["room_id"] == p2_update["match_id"]


def test_battle_v2_pvp_waiting_player_can_cancel_lobby(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1_client = socket_client_with_player("p1")
    p2_client = socket_client_with_player("p2")

    p1_client.emit(
        "battle_v2_join_pvp",
        {
            "room_id": "human-cancel",
            "player_name": "P1",
            "player_team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"],
        },
    )
    assert received_payload(p1_client, "battle_v2_lobby")["status"] == "waiting"

    p1_client.emit("battle_v2_leave_pvp", {"room_id": "human-cancel"})
    cancelled = received_payload(p1_client, "battle_v2_lobby")

    assert cancelled["status"] == "cancelled"
    assert "human-cancel" not in web_app.v2_pvp_lobbies

    p2_client.emit(
        "battle_v2_join_pvp",
        {
            "room_id": "human-cancel",
            "player_name": "P2",
            "player_team": ["satoru_gojo", "ryomen_sukuna", "mahito"],
        },
    )
    waiting = received_payload(p2_client, "battle_v2_lobby")

    assert waiting["status"] == "waiting"
    assert "human-cancel" not in web_app.battle_v2_manager.rooms


def test_battle_v2_pvp_disconnect_cleans_waiting_lobby(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1_client = socket_client_with_player("p1")
    p2_client = socket_client_with_player("p2")

    p1_client.emit(
        "battle_v2_join_pvp",
        {
            "room_id": "human-disconnect",
            "player_name": "P1",
            "player_team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"],
        },
    )
    assert received_payload(p1_client, "battle_v2_lobby")["status"] == "waiting"

    p1_client.disconnect()

    assert "human-disconnect" not in web_app.v2_pvp_lobbies

    p2_client.emit(
        "battle_v2_join_pvp",
        {
            "room_id": "human-disconnect",
            "player_name": "P2",
            "player_team": ["satoru_gojo", "ryomen_sukuna", "mahito"],
        },
    )
    waiting = received_payload(p2_client, "battle_v2_lobby")

    assert waiting["status"] == "waiting"
    assert "human-disconnect" not in web_app.battle_v2_manager.rooms


def test_public_reset_room_event_is_not_registered(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client_with_player("p1")
    client.emit(
        "battle_v2_join_pvp",
        {
            "room_id": "human-reset",
            "player_name": "P1",
            "player_team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"],
        },
    )
    assert received_payload(client, "battle_v2_lobby")["status"] == "waiting"

    client.emit("reset_room")

    assert "human-reset" in web_app.v2_pvp_lobbies
    assert "reset_room" not in web_app.socketio.server.handlers.get("/", {})


def test_non_member_cannot_join_or_delete_active_room(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1 = socket_client_with_player("owner-one")
    p2 = socket_client_with_player("owner-two")
    intruder = socket_client_with_player("intruder")
    for client, name in ((p1, "P1"), (p2, "P2")):
        client.emit("battle_v2_join_pvp", {"room_id": "protected-code", "player_name": name})
    p2_messages = received_payloads(p2)
    match_id = p2_messages["battle_v2_update"]["match_id"]
    original = web_app.battle_v2_manager.rooms[match_id]

    intruder.emit("battle_v2_join_pvp", {"room_id": "protected-code"})
    error = received_payload(intruder, "battle_v2_error")
    intruder.emit("reset_room")

    assert "active match" in error["message"].lower()
    assert web_app.battle_v2_manager.rooms[match_id] is original


def test_cpu_start_cannot_overwrite_pvp_or_invalid_start_delete_room(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1 = socket_client_with_player("collision-one")
    p2 = socket_client_with_player("collision-two")
    for client in (p1, p2):
        client.emit("battle_v2_join_pvp", {"room_id": "collision-code"})
    match_id = received_payload(p2, "battle_v2_update")["match_id"]
    original = web_app.battle_v2_manager.rooms[match_id]

    attacker = socket_client_with_player("collision-attacker")
    attacker.emit("battle_v2_start_classic", {"room_id": "collision-code"})
    assert received_payload(attacker, "battle_v2_error")
    assert web_app.battle_v2_manager.rooms[match_id] is original

    web_app.battle_v2_manager.start_classic_match("protected-invalid", [
        {"id": "x", "name": "X", "team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]},
        {"id": "y", "name": "Y", "team": ["satoru_gojo", "ryomen_sukuna", "mahito"]},
    ])
    protected = web_app.battle_v2_manager.rooms["protected-invalid"]
    attacker.emit("battle_v2_start_classic", {"room_id": "protected-invalid", "roster_mode": "first_creation", "player_team": ["unknown", "unknown", "unknown"]})
    assert web_app.battle_v2_manager.rooms["protected-invalid"] is protected


def test_battle_v2_human_confirm_does_not_run_cpu_turn(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1_client = socket_client_with_player("p1")
    p2_client = socket_client_with_player("p2")
    for client, player_id, team in [
        (p1_client, "P1", ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]),
        (p2_client, "P2", ["satoru_gojo", "ryomen_sukuna", "mahito"]),
    ]:
        client.emit(
            "battle_v2_join_pvp",
            {
                "room_id": "human-turns",
                "player_name": player_id,
                "player_team": team,
            },
        )
    p1_client.get_received()
    p2_client.get_received()
    state = web_app.battle_v2_manager.get_state("human-turns")
    state.players["p1"].energy[EnergyType.GREEN] = 1

    p1_client.emit(
        "battle_v2_submit_plan",
        command_payload(state, {
            "actions": [
                {
                    "id": "a1",
                    "caster_slot": 0,
                    "skill_id": "divergent_fist",
                    "target_player_id": "p2",
                    "target_slot": 0,
                }
            ]
        }),
    )
    p1_client.get_received()

    p1_client.emit("battle_v2_confirm_queue", command_payload(state))
    update = received_payload(p1_client, "battle_v2_update")

    assert update["turn_player_id"] == "p2"
    assert update["players"]["p2"]["team"][0]["hp"] == 80
    assert update["phase"] == "planning"


def test_battle_v2_socket_start_first_creation_mode_rejects_locked_variants(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client()

    client.emit(
        "battle_v2_start_classic",
        {
            "room_id": "first-v2",
            "roster_mode": "first_creation",
            "player_team": ["yuji_itadori", "megumi_fushiguro", "mahito"],
            "enemy_team": ["yuta_okkotsu_jjk0", "maki_zenin", "toge_inumaki"],
        },
    )

    payload = received_payload(client, "battle_v2_error")
    assert "Locked or unknown" in payload["message"]


def test_battle_v2_socket_start_first_creation_mode_uses_first_creation_catalog(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = socket_client()

    client.emit(
        "battle_v2_start_classic",
        {
            "room_id": "first-v2",
            "roster_mode": "first_creation",
            "player_team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"],
            "enemy_team": ["yuta_okkotsu_jjk0", "maki_zenin", "toge_inumaki"],
        },
    )

    state = received_payload(client, "battle_v2_update")
    assert "satoru_gojo_young" in state["skill_catalog"]
    assert "mahito" not in state["skill_catalog"]
    assert state["players"]["__cpu_v2__"]["team"][0]["character_id"] == "yuta_okkotsu_jjk0"


def test_todo_alternate_redirect_survives_socket_cleaner_manager_and_resolver(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    monkeypatch.setattr(web_app, "allow_event", lambda *args, **kwargs: True)
    monkeypatch.setattr(web_app, "battle_v2_has_cpu", lambda room_id: False)
    client = socket_client()
    client.emit(
        "battle_v2_start_classic",
        {
            "room_id": "todo-socket",
            "roster_mode": "first_creation",
            "player_team": ["aoi_todo", "yuji_itadori", "maki_zenin"],
            "enemy_team": ["mai_zenin", "panda", "megumi_fushiguro"],
        },
    )
    start = received_payload(client, "battle_v2_update")
    player_id = start["turn_player_id"]
    state = web_app.battle_v2_manager.get_state("todo-socket")
    state.players[player_id].energy[EnergyType.BLUE] = 1
    state.players[player_id].energy[EnergyType.WHITE] = 1

    client.emit(
        "battle_v2_submit_plan",
        command_payload(state, {"actions": [{
            "id": "todo",
            "caster_slot": 0,
            "skill_id": "fc_aoi_todo_boogie_woogie",
            "target_player_id": "__cpu_v2__",
            "target_slot": 0,
            "alternate_target_player_id": player_id,
            "alternate_target_slot": 1,
        }]}),
    )
    queued = received_payload(client, "battle_v2_update")
    action = queued["pending_actions"][player_id][0]
    assert action["alternate_target_player_id"] == player_id
    assert action["alternate_target_slot"] == 1

    client.emit("battle_v2_confirm_queue", command_payload(state))
    received_payload(client, "battle_v2_update")
    redirect = next(status for status in state.players["__cpu_v2__"].team[0].statuses if status.id == "boogie_woogie_redirect")
    assert redirect.payload["redirect_to_player_id"] == player_id
    assert redirect.payload["redirect_to_slot"] == 1


def test_venom_bloom_secondary_target_survives_socket_cleaner_manager_and_resolver(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    monkeypatch.setattr(web_app, "allow_event", lambda *args, **kwargs: True)
    client = socket_client()
    client.emit(
        "battle_v2_start_classic",
        {
            "room_id": "venom-socket",
            "roster_mode": "first_creation",
            "player_team": ["junpei_yoshino", "yuji_itadori", "maki_zenin"],
            "enemy_team": ["mai_zenin", "panda", "megumi_fushiguro"],
        },
    )
    start = received_payload(client, "battle_v2_update")
    player_id = start["turn_player_id"]
    state = web_app.battle_v2_manager.get_state("venom-socket")
    state.players[player_id].energy[EnergyType.RED] = 1
    state.players[player_id].energy[EnergyType.GREEN] = 1
    state.players["__cpu_v2__"].team[0].statuses.append(
        StatusEffect("poison", "Poison", player_id, 0, "__cpu_v2__", 0, 2)
    )

    client.emit(
        "battle_v2_submit_plan",
        command_payload(state, {"actions": [{
            "id": "venom",
            "caster_slot": 0,
            "skill_id": "fc_junpei_yoshino_venom_bloom",
            "target_player_id": "__cpu_v2__",
            "target_slot": 0,
            "target_slots": [0, 1],
            "secondary_target_slot": 1,
        }]}),
    )
    queued = received_payload(client, "battle_v2_update")
    action = queued["pending_actions"][player_id][0]
    assert action["target_slots"] == [0, 1]
    assert action["secondary_target_slot"] == 1

    client.emit(
        "battle_v2_update_queue",
        command_payload(state, {"queue_order": ["venom"], "wildcard_pays": {"venom": ["green"]}}),
    )
    received_payload(client, "battle_v2_update")
    client.emit("battle_v2_confirm_queue", command_payload(state))
    received_payload(client, "battle_v2_update")
    spread = next(
        event for event in state.event_log
        if event.type == "status_applied"
        and event.payload.get("status") == "poison"
        and event.payload.get("target_slot") == 1
    )
    assert spread.payload["target_player_id"] == "__cpu_v2__"


def test_incompatible_second_joiner_does_not_corrupt_first_players_lobby(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1_client = socket_client_with_player("lobby-owner")
    p2_client = socket_client_with_player("lobby-intruder")

    p1_client.emit(
        "battle_v2_join_pvp",
        {
            "room_id": "mismatched-code",
            "player_name": "P1",
            "player_team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"],
        },
    )
    assert received_payload(p1_client, "battle_v2_lobby")["status"] == "waiting"

    p2_client.emit(
        "battle_v2_join_pvp",
        {
            "room_id": "mismatched-code",
            "player_name": "P2",
            "roster_mode": "first_creation",
        },
    )
    error = received_payload(p2_client, "battle_v2_error")
    assert error is not None

    lobby = web_app.v2_pvp_lobbies["mismatched-code"]
    assert [entry["id"] for entry in lobby] == ["lobby-owner"]
    assert "mismatched-code" not in web_app.battle_v2_manager.rooms

    p3_client = socket_client_with_player("lobby-real-opponent")
    p3_client.emit(
        "battle_v2_join_pvp",
        {
            "room_id": "mismatched-code",
            "player_name": "P3",
            "player_team": ["satoru_gojo", "ryomen_sukuna", "mahito"],
        },
    )
    p1_update = received_payload(p1_client, "battle_v2_update")
    assert set(p1_update["players"]) == {"lobby-owner", "lobby-real-opponent"}


def test_finished_match_releases_private_code_and_player_slot_without_ack(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1_client = socket_client_with_player("finish-p1")
    p2_client = socket_client_with_player("finish-p2")
    for client, player_id, team in [
        (p1_client, "P1", ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]),
        (p2_client, "P2", ["satoru_gojo", "ryomen_sukuna", "mahito"]),
    ]:
        client.emit(
            "battle_v2_join_pvp",
            {"room_id": "reuse-code", "player_name": player_id, "player_team": team},
        )
    received_payload(p1_client, "battle_v2_update")
    match_id = received_payload(p2_client, "battle_v2_update")["match_id"]
    state = web_app.battle_v2_manager.get_state(match_id)

    p1_client.emit("battle_v2_surrender", command_payload(state))
    received_payload(p1_client, "battle_v2_finished")
    received_payload(p2_client, "battle_v2_finished")

    assert web_app.active_by_code.get("reuse-code") == match_id
    assert web_app.active_match_by_player.get("finish-p1") == match_id

    p3_client = socket_client_with_player("finish-p1")
    p4_client = socket_client_with_player("finish-p3")
    p3_client.emit(
        "battle_v2_join_pvp",
        {"room_id": "reuse-code", "player_name": "P1-again", "player_team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]},
    )
    waiting = received_payload(p3_client, "battle_v2_lobby")
    assert waiting["status"] == "waiting"

    p4_client.emit(
        "battle_v2_join_pvp",
        {"room_id": "reuse-code", "player_name": "P3", "player_team": ["satoru_gojo", "ryomen_sukuna", "mahito"]},
    )
    new_match = received_payload(p4_client, "battle_v2_update")
    assert new_match["match_id"] != match_id


def test_rematch_spam_with_same_nonce_creates_exactly_one_new_match(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1_client = socket_client_with_player("rematch-p1")
    p2_client = socket_client_with_player("rematch-p2")
    for client, player_id, team in [
        (p1_client, "P1", ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]),
        (p2_client, "P2", ["satoru_gojo", "ryomen_sukuna", "mahito"]),
    ]:
        client.emit(
            "battle_v2_join_pvp",
            {"room_id": "rematch-code", "player_name": player_id, "player_team": team},
        )
    received_payload(p1_client, "battle_v2_update")
    match_id = received_payload(p2_client, "battle_v2_update")["match_id"]
    state = web_app.battle_v2_manager.get_state(match_id)

    p1_client.emit("battle_v2_surrender", command_payload(state))
    received_payload(p1_client, "battle_v2_finished")
    received_payload(p2_client, "battle_v2_finished")

    rooms_before = set(web_app.battle_v2_manager.rooms)
    rematch_payload = {
        "old_match_id": match_id,
        "state_revision": state.state_revision,
        "client_action_nonce": "rematch-spam-nonce",
    }
    p1_client.emit("battle_v2_rematch", rematch_payload)
    first = received_payload(p1_client, "battle_v2_rematch")
    p1_client.emit("battle_v2_rematch", rematch_payload)
    second = received_payload(p1_client, "battle_v2_rematch")

    assert first["new_match_id"] == second["new_match_id"]
    new_rooms = set(web_app.battle_v2_manager.rooms) - rooms_before
    assert len(new_rooms) == 1
    assert new_rooms == {first["new_match_id"]}


def test_resume_reconciles_active_match_and_blocks_second_pvp_join(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    original = socket_client_with_player("resume-reconcile")
    original.emit("battle_v2_start_classic", {"room_id": "reconcile-v2"})
    grant = received_payloads(original)["battle_v2_session"]
    original.disconnect()
    web_app.active_match_by_player.pop("resume-reconcile", None)

    resumed = socket_client_with_player("resume-reconcile")
    resumed.emit("battle_v2_resume", grant)
    received_payloads(resumed)

    assert web_app.active_match_by_player.get("resume-reconcile") == grant["room_id"]

    resumed.emit("battle_v2_join_pvp", {"room_id": "some-other-code", "player_name": "Dup"})
    error = received_payload(resumed, "battle_v2_error")
    assert error is not None
    assert "already in an active match" in error["message"].lower()


def test_disconnect_grace_expiry_forfeits_through_live_scheduler(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1_client = socket_client_with_player("grace-p1")
    p2_client = socket_client_with_player("grace-p2")
    for client, player_id, team in [
        (p1_client, "P1", ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]),
        (p2_client, "P2", ["satoru_gojo", "ryomen_sukuna", "mahito"]),
    ]:
        client.emit(
            "battle_v2_join_pvp",
            {"room_id": "grace-code", "player_name": player_id, "player_team": team},
        )
    received_payload(p1_client, "battle_v2_update")
    match_id = received_payload(p2_client, "battle_v2_update")["match_id"]
    state = web_app.battle_v2_manager.get_state(match_id)
    # Exhaust the 180s disconnect budget up front so the real scheduler
    # fires almost immediately, instead of waiting out the full 90s grace window.
    state.disconnect_seconds_used["grace-p1"] = 180

    p1_client.disconnect()
    # A near-zero remaining budget means the real background scheduler may
    # already run and forfeit the match before this line executes; either
    # way the outcome below proves the disconnect deadline was wired up.
    web_app.socketio.sleep(0.8)

    # p2 receives at least two "battle_v2_update" broadcasts here: an
    # immediate one from on_disconnect() itself (still in progress, paused,
    # winner_id None) and a later one from the scheduler's forfeit once the
    # disconnect budget actually expires. Scan for the terminal one instead
    # of taking the first match, which would race against whichever of the
    # two happens to be queued first.
    updates = [message["args"][0] for message in p2_client.get_received() if message["name"] == "battle_v2_update"]
    finished = next((update for update in updates if update.get("phase") == "finished"), None)
    assert finished is not None, f"no finished battle_v2_update received; got {[u.get('phase') for u in updates]}"
    assert finished["winner_id"] == "grace-p2"
    assert finished["finish_reason"] == "disconnect_budget"


def test_opponent_is_immediately_notified_when_a_player_disconnects(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1_client = socket_client_with_player("notify-p1")
    p2_client = socket_client_with_player("notify-p2")
    for client, player_id, team in [
        (p1_client, "P1", ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]),
        (p2_client, "P2", ["satoru_gojo", "ryomen_sukuna", "mahito"]),
    ]:
        client.emit(
            "battle_v2_join_pvp",
            {"room_id": "notify-code", "player_name": player_id, "player_team": team},
        )
    received_payload(p1_client, "battle_v2_update")
    received_payload(p2_client, "battle_v2_update")

    p1_client.disconnect()

    update = received_payload(p2_client, "battle_v2_update")
    assert update is not None, "the connected opponent must learn about a disconnect immediately, not only on the next unrelated update"
    assert update["paused"] is True
    assert update["disconnect_grace_seconds_remaining"] == pytest.approx(90, abs=1)


def test_rematch_is_rejected_when_a_participant_started_another_match(monkeypatch):
    """Reproduces the P0 double-membership bug: P1/P2 finish a PvP match, P2
    starts a CPU match, then P1 requests a rematch of the old PvP match. The
    rematch must be rejected instead of silently binding P2 to two live
    matches.
    """

    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1_client = socket_client_with_player("p0-p1")
    p2_client = socket_client_with_player("p0-p2")
    for client, player_id, team in [
        (p1_client, "P1", ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]),
        (p2_client, "P2", ["satoru_gojo", "ryomen_sukuna", "mahito"]),
    ]:
        client.emit(
            "battle_v2_join_pvp",
            {"room_id": "p0-code", "player_name": player_id, "player_team": team},
        )
    received_payload(p1_client, "battle_v2_update")
    old_match_id = received_payload(p2_client, "battle_v2_update")["match_id"]
    old_state = web_app.battle_v2_manager.get_state(old_match_id)

    p1_client.emit("battle_v2_surrender", command_payload(old_state))
    received_payload(p1_client, "battle_v2_finished")
    received_payload(p2_client, "battle_v2_finished")

    p2_client.emit("battle_v2_start_classic", {})
    cpu_update = received_payload(p2_client, "battle_v2_update")
    assert cpu_update is not None
    cpu_match_id = cpu_update["match_id"]
    assert cpu_match_id != old_match_id
    assert web_app.active_match_by_player["p0-p2"] == cpu_match_id

    # The old (finished) match's identity must not have been corrupted into
    # an alias for the new CPU match.
    assert web_app.battle_v2_manager.get_state(old_match_id) is old_state
    assert web_app.battle_v2_manager.get_state(old_match_id).phase.value == "finished"

    p1_client.emit(
        "battle_v2_rematch",
        {
            "old_match_id": old_match_id,
            "state_revision": old_state.state_revision,
            "client_action_nonce": "p0-rematch-nonce",
        },
    )
    error = received_payload(p1_client, "battle_v2_error")
    assert error is not None
    assert "already in another active match" in error["message"].lower()

    # P2 must remain bound to exactly one live match: the CPU game.
    live_rooms_for_p2 = {
        match_id
        for match_id, state in web_app.battle_v2_manager.rooms.items()
        if state.phase.value != "finished" and "p0-p2" in state.players
    }
    assert live_rooms_for_p2 == {cpu_match_id}
