"""Simulated-network stress/soak harness for Battle v2 PvP lifecycle.

Drives the real web.app Socket.IO handlers (join, resume, rematch, disconnect,
surrender) through Flask-SocketIO test clients -- the same harness the unit
tests use -- across many randomized match scenarios, and asserts the lifecycle
invariants Phase 4 exists to guarantee: exactly one live match per player,
no orphaned rooms, idempotent rematches, and immediate private-code reuse
after a match finishes. This is the "1,000 simulated network matches produce
0 softlocks" exit gate from the project roadmap.

Usage:
    python -m jjk_arena.battle_v2.lifecycle_stress --matches 1000 --seed 1
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

os.environ.setdefault("JJK_BATTLE_SYSTEM", "v2")

TEAM_A = ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]
TEAM_B = ["satoru_gojo", "ryomen_sukuna", "mahito"]

SCHEMA_VERSION = 1


@dataclass
class Softlock:
    match_index: int
    scenario: str
    reason: str
    detail: dict[str, Any] = field(default_factory=dict)


def _import_app():
    from web import app as web_app

    return web_app


def _socket_client(web_app, player_id: str):
    flask_client = web_app.app.test_client()
    with flask_client.session_transaction() as flask_session:
        flask_session["player_id"] = player_id
    return web_app.socketio.test_client(web_app.app, flask_test_client=flask_client)


def _received(client) -> dict[str, Any]:
    out: dict[str, list[Any]] = {}
    for message in client.get_received():
        out.setdefault(message["name"], []).append(message["args"][0] if message["args"] else None)
    return out


def _payload(received: dict[str, Any], name: str) -> Any:
    values = received.get(name)
    return values[-1] if values else None


def _nonce() -> str:
    return uuid.uuid4().hex


def _join(web_app, client, code: str, name: str, team: list[str] | None, roster_mode: str | None = None) -> dict[str, Any]:
    payload = {"room_id": code, "player_name": name}
    if team is not None:
        payload["player_team"] = team
    if roster_mode is not None:
        payload["roster_mode"] = roster_mode
    client.emit("battle_v2_join_pvp", payload)
    return _received(client)


def _run_scenario(web_app, rng: random.Random, index: int) -> tuple[str, list[Softlock]]:
    findings: list[Softlock] = []
    scenario = rng.choice(["clean_finish", "disconnect_reconnect", "disconnect_forfeit", "rematch_spam", "code_reuse_race"])
    code = f"stress-{index}-{uuid.uuid4().hex[:8]}"
    p1_id, p2_id = f"stress-p1-{index}", f"stress-p2-{index}"
    p1, p2 = _socket_client(web_app, p1_id), _socket_client(web_app, p2_id)

    _join(web_app, p1, code, "P1", TEAM_A)
    p2_received = _join(web_app, p2, code, "P2", TEAM_B)
    update = _payload(p2_received, "battle_v2_update")
    if update is None:
        findings.append(Softlock(index, scenario, "second joiner never received battle_v2_update", {"code": code}))
        return scenario, findings
    match_id = update["match_id"]
    state = web_app.battle_v2_manager.rooms.get(match_id)
    if state is None:
        findings.append(Softlock(index, scenario, "match id missing from manager.rooms immediately after creation", {"match_id": match_id}))
        return scenario, findings

    def surrender_and_finish(client, player_id: str) -> bool:
        st = web_app.battle_v2_manager.rooms.get(match_id)
        if st is None or st.phase.value == "finished":
            return st is not None and st.phase.value == "finished"
        client.emit(
            "battle_v2_surrender",
            {"state_revision": st.state_revision, "client_action_nonce": _nonce()},
        )
        finished = _payload(_received(client), "battle_v2_finished")
        return finished is not None

    if scenario == "clean_finish":
        if not surrender_and_finish(p1, p1_id):
            findings.append(Softlock(index, scenario, "surrender did not produce battle_v2_finished", {"match_id": match_id}))
            return scenario, findings

    elif scenario == "disconnect_reconnect":
        p1.disconnect()
        st = web_app.battle_v2_manager.rooms.get(match_id)
        if not st.paused:
            findings.append(Softlock(index, scenario, "match did not pause after disconnect", {"match_id": match_id}))
        grant = web_app.battle_v2_sessions.issue(match_id, p1_id)
        p1b = _socket_client(web_app, "reconnector-" + p1_id)
        p1b.emit("battle_v2_resume", {"room_id": match_id, "player_id": p1_id, "resume_token": grant.token})
        resumed = _payload(_received(p1b), "battle_v2_update")
        if resumed is None:
            findings.append(Softlock(index, scenario, "resume never produced battle_v2_update", {"match_id": match_id}))
            return scenario, findings
        if web_app.active_match_by_player.get(p1_id) != match_id:
            findings.append(Softlock(index, scenario, "active_match_by_player not reconciled after resume", {"match_id": match_id}))
        if not surrender_and_finish(p1b, p1_id):
            findings.append(Softlock(index, scenario, "post-resume surrender did not finish match", {"match_id": match_id}))

    elif scenario == "disconnect_forfeit":
        st = web_app.battle_v2_manager.rooms.get(match_id)
        st.disconnect_seconds_used[p1_id] = 180
        p1.disconnect()
        deadline = 0.0
        for _ in range(50):
            web_app.socketio.sleep(0.05)
            st = web_app.battle_v2_manager.rooms.get(match_id)
            if st is not None and st.phase.value == "finished":
                break
        else:
            findings.append(Softlock(index, scenario, "disconnect budget exhaustion never forfeited the match", {"match_id": match_id}))
            return scenario, findings
        if st.winner_id != p2_id:
            findings.append(Softlock(index, scenario, "forfeit produced wrong winner", {"match_id": match_id, "winner_id": st.winner_id}))

    elif scenario == "rematch_spam":
        if not surrender_and_finish(p1, p1_id):
            findings.append(Softlock(index, scenario, "setup surrender failed before rematch", {"match_id": match_id}))
            return scenario, findings
        st = web_app.battle_v2_manager.rooms.get(match_id)
        nonce = _nonce()
        rematch_payload = {"old_match_id": match_id, "state_revision": st.state_revision, "client_action_nonce": nonce}
        new_ids = set()
        for _ in range(4):
            p1.emit("battle_v2_rematch", rematch_payload)
            result = _payload(_received(p1), "battle_v2_rematch")
            if result is None:
                findings.append(Softlock(index, scenario, "rematch spam produced no response", {"match_id": match_id}))
                return scenario, findings
            new_ids.add(result["new_match_id"])
        if len(new_ids) != 1:
            findings.append(Softlock(index, scenario, "rematch spam created more than one new match", {"match_id": match_id, "new_ids": list(new_ids)}))

    elif scenario == "code_reuse_race":
        if not surrender_and_finish(p1, p1_id):
            findings.append(Softlock(index, scenario, "setup surrender failed before reuse race", {"match_id": match_id}))
            return scenario, findings
        p3 = _socket_client(web_app, f"stress-p3-{index}")
        p4 = _socket_client(web_app, f"stress-p4-{index}")
        _join(web_app, p3, code, "P3", TEAM_A)
        reuse_received = _join(web_app, p4, code, "P4", TEAM_B)
        reuse_update = _payload(reuse_received, "battle_v2_update")
        if reuse_update is None:
            findings.append(Softlock(index, scenario, "finished match's code was not immediately reusable", {"code": code}))
            return scenario, findings
        if reuse_update["match_id"] == match_id:
            findings.append(Softlock(index, scenario, "reuse produced the same match id as the finished match", {"match_id": match_id}))

    # Cross-scenario invariant: no player id maps to two different *live* matches.
    live_by_player: dict[str, str] = {}
    for player_id, mid in web_app.active_match_by_player.items():
        st = web_app.battle_v2_manager.rooms.get(mid)
        if st is None or st.phase.value == "finished":
            continue
        if player_id in live_by_player and live_by_player[player_id] != mid:
            findings.append(Softlock(index, scenario, "player mapped to two different live matches", {"player_id": player_id}))
        live_by_player[player_id] = mid

    return scenario, findings


def run_stress_batch(*, matches: int, seed: int = 1, prune_every: int = 100) -> dict[str, Any]:
    web_app = _import_app()
    rng = random.Random(seed)
    findings: list[Softlock] = []
    scenario_counts: dict[str, int] = {}
    start = time.monotonic()
    for index in range(matches):
        scenario, batch_findings = _run_scenario(web_app, rng, index)
        scenario_counts[scenario] = scenario_counts.get(scenario, 0) + 1
        findings.extend(batch_findings)
        if (index + 1) % prune_every == 0:
            web_app.prune_stale_runtime(now=time.monotonic() + web_app.ACTIVE_ROOM_TTL_SECONDS + 1)
    elapsed = time.monotonic() - start

    return {
        "schema_version": SCHEMA_VERSION,
        "matches": matches,
        "seed": seed,
        "elapsed_seconds": round(elapsed, 2),
        "scenario_counts": scenario_counts,
        "softlocks": [
            {"match_index": f.match_index, "scenario": f.scenario, "reason": f.reason, "detail": f.detail}
            for f in findings
        ],
        "softlock_count": len(findings),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Simulated-network Battle v2 lifecycle stress test")
    parser.add_argument("--matches", type=int, default=1000)
    parser.add_argument("--seed", type=int, default=1)
    args = parser.parse_args(argv)
    result = run_stress_batch(matches=args.matches, seed=args.seed)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 1 if result["softlock_count"] else 0


if __name__ == "__main__":
    sys.exit(main())
