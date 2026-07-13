from jjk_arena.battle_v2.models import BattleEvent, BattlePhase
from jjk_arena.battle_v2.resolver import event_is_meaningful_progress, finish_match
from web import app as web_app


def client(player_id):
    flask_client = web_app.app.test_client()
    with flask_client.session_transaction() as session:
        session["player_id"] = player_id
    return web_app.socketio.test_client(web_app.app, flask_test_client=flask_client)


def payload(received, name):
    return next((message["args"][0] for message in received if message["name"] == name), None)


def team():
    return ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]


def join_pvp(socket, code, *, mode="classic"):
    socket.emit("battle_v2_join_pvp", {"room_id": code, "player_team": team(), "roster_mode": mode})
    return socket.get_received()


def test_one_player_cannot_wait_in_two_lobbies(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1 = client("lifecycle-waiter")
    join_pvp(p1, "first-code")
    join_pvp(p1, "second-code")
    assert web_app.waiting_code_by_player["lifecycle-waiter"] == "second-code"
    assert "first-code" not in web_app.v2_pvp_lobbies


def test_incompatible_second_player_does_not_destroy_waiter(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1, p2 = client("compatible-waiter"), client("bad-joiner")
    join_pvp(p1, "mode-code", mode="classic")
    second = join_pvp(p2, "mode-code", mode="first_creation")
    notice = payload(p1.get_received(), "battle_v2_lobby")
    assert payload(second, "battle_v2_error")["message"].startswith("Both PvP players")
    assert notice["status"] == "join_failed"
    assert [entry["id"] for entry in web_app.v2_pvp_lobbies["mode-code"]] == ["compatible-waiter"]


def test_premature_resume_does_not_consume_token(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    original = client("resume-owner")
    original.emit("battle_v2_start_classic", {"room_id": "resume-transaction"})
    grant = payload(original.get_received(), "battle_v2_session")
    real_serialize = web_app.battle_v2_manager.serialize_for_player
    monkeypatch.setattr(web_app.battle_v2_manager, "serialize_for_player", lambda *_: (_ for _ in ()).throw(RuntimeError("not ready")))
    attempt = client("resume-attempt")
    attempt.emit("battle_v2_resume", grant)
    assert payload(attempt.get_received(), "battle_v2_resume_rejected")
    assert web_app.battle_v2_sessions.verify(grant["room_id"], grant["player_id"], grant["resume_token"])
    monkeypatch.setattr(web_app.battle_v2_manager, "serialize_for_player", real_serialize)
    attempt.emit("battle_v2_resume", grant)
    rotated = payload(attempt.get_received(), "battle_v2_session")
    assert rotated["resume_token"] != grant["resume_token"]
    assert not web_app.battle_v2_sessions.verify(grant["room_id"], grant["player_id"], grant["resume_token"])


def test_no_contest_clears_pause_state_and_zero_drain_is_not_progress():
    manager = web_app.BattleV2Manager(rng_seed=1)
    manager.start_classic_match("terminal-normalization", [
        {"id": "p1", "name": "P1", "team": team()},
        {"id": "p2", "name": "P2", "team": team()},
    ])
    state = manager.get_state("terminal-normalization")
    state.paused = True
    state.paused_phase = "planning"
    state.paused_seconds_remaining = 12
    state.phase_deadline = 123
    finish_match(state, result_type="NO_CONTEST", winner_id=None, reason="connection policy")
    assert state.phase == BattlePhase.FINISHED
    assert (state.paused, state.paused_phase, state.paused_seconds_remaining, state.phase_deadline) == (False, None, None, None)
    assert not event_is_meaningful_progress(BattleEvent("energy_drained", "none", 1, {"amount": 0}))


def test_result_scene_uses_current_state_instead_of_previous_record():
    source = (web_app.app.root_path + "/static/phaser/scenes/result-scene.js")
    text = open(source, encoding="utf-8").read()
    assert "this.store.records[0]" not in text
    assert "state.result_type" in text
    assert "state.result_reason" in text


def test_one_player_cannot_start_two_active_matches(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1 = client("single-context-player")
    p1.emit("battle_v2_start_classic", {"room_id": "active-one"})
    p1.get_received()
    p1.emit("battle_v2_start_classic", {"room_id": "active-two"})
    error = payload(p1.get_received(), "battle_v2_error")
    assert error["message"] == "Player is already in an active match."
    assert web_app.active_match_by_player["single-context-player"] == "active-one"


def test_repeated_cpu_rematch_requests_create_one_room(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1 = client("cpu-rematcher")
    p1.emit("battle_v2_start_classic", {"room_id": "cpu-old"})
    p1.get_received()
    old = web_app.battle_v2_manager.get_state("cpu-old")
    finish_match(old, result_type="WIN", winner_id="cpu-rematcher", reason="test")
    request = {"old_match_id": "cpu-old", "state_revision": old.state_revision, "client_action_nonce": "cpu-rematch-nonce"}
    p1.emit("battle_v2_rematch", request)
    first = payload(p1.get_received(), "battle_v2_rematch")
    p1.emit("battle_v2_rematch", request)
    second = payload(p1.get_received(), "battle_v2_rematch")
    assert first["new_match_id"] == second["new_match_id"]
    assert web_app.rematch_by_old_match["cpu-old"] == first["new_match_id"]


def test_repeated_pvp_rematch_requests_create_one_room(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1, p2 = client("pvp-rematch-one"), client("pvp-rematch-two")
    join_pvp(p1, "pvp-rematch-code")
    second_join = join_pvp(p2, "pvp-rematch-code")
    match_id = payload(second_join, "battle_v2_update")["match_id"]
    state = web_app.battle_v2_manager.get_state(match_id)
    finish_match(state, result_type="DRAW", winner_id=None, reason="test")
    p1.emit("battle_v2_rematch", {"old_match_id": match_id, "state_revision": state.state_revision, "client_action_nonce": "p1-rematch"})
    first = payload(p1.get_received(), "battle_v2_rematch")
    p2.emit("battle_v2_rematch", {"old_match_id": match_id, "state_revision": state.state_revision, "client_action_nonce": "p2-rematch"})
    second = payload(p2.get_received(), "battle_v2_rematch")
    assert first["new_match_id"] == second["new_match_id"]


def test_finished_lobby_code_reusable_while_match_remains_archived(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    p1, p2, p3 = client("reuse-one"), client("reuse-two"), client("reuse-three")
    join_pvp(p1, "reusable-code")
    started = join_pvp(p2, "reusable-code")
    match_id = payload(started, "battle_v2_update")["match_id"]
    state = web_app.battle_v2_manager.get_state(match_id)
    finish_match(state, result_type="WIN", winner_id="reuse-one", reason="test")
    p1.emit("battle_v2_ack_result", {"match_id": match_id})
    waiting = payload(join_pvp(p3, "reusable-code"), "battle_v2_lobby")
    assert waiting["status"] == "waiting"
    assert match_id in web_app.battle_v2_manager.rooms
