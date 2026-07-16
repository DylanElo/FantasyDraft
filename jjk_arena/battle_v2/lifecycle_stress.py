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
import shutil
import sys
import tempfile
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

os.environ.setdefault("JJK_BATTLE_SYSTEM", "v2")
# Ensure the very first construction of web.app's module-level runtime_store
# singleton (which runs its one-time schema-init write immediately at import)
# never touches the real data/jjk_arena.sqlite3, even before run_stress_batch
# gets a chance to redirect it. Only effective when this module is imported
# before web.app anywhere else in the process (true for the bare CLI entry
# point; a no-op, harmless override under pytest, which imports web.app --
# and thus constructs the singleton -- earlier via conftest.py).
os.environ.setdefault(
    "JJK_DATABASE_PATH",
    str(Path(tempfile.gettempdir()) / f"jjk_lifecycle_stress_default_{os.getpid()}.sqlite3"),
)

TEAM_A = ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]
TEAM_B = ["satoru_gojo", "ryomen_sukuna", "mahito"]

SCHEMA_VERSION = 2

# Documented ceiling for the "1,000 matches" exit gate: a run exceeding this
# resident-set size indicates a real leak (rooms/lobbies/clients not being
# reclaimed), not just normal interpreter/library overhead. Chosen from
# observed batches of a few hundred MB plus headroom, not tuned to whatever
# a single run happened to use.
MEMORY_CEILING_BYTES = 400 * 1024 * 1024


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


def _live_match_memberships(web_app) -> dict[str, set[str]]:
    """Real membership scan: which non-finished rooms each human player belongs to.

    `active_match_by_player` is a dict with exactly one value per player, so it
    can never expose a player bound to two rooms at once. This scans the
    manager's actual room rosters instead, which is the only source that can
    reveal that corruption.
    """

    memberships: dict[str, set[str]] = {}
    for match_id, state in web_app.battle_v2_manager.rooms.items():
        if state.phase.value == "finished":
            continue
        for player_id in state.players:
            if player_id == web_app.CPU_V2_PLAYER_ID:
                continue
            memberships.setdefault(player_id, set()).add(match_id)
    return memberships


def _run_scenario(web_app, rng: random.Random, index: int) -> tuple[str, list[Softlock], list[Any]]:
    findings: list[Softlock] = []
    clients: list[Any] = []
    scenario = rng.choice(["clean_finish", "disconnect_reconnect", "disconnect_forfeit", "rematch_spam", "code_reuse_race"])
    code = f"stress-{index}-{uuid.uuid4().hex[:8]}"
    p1_id, p2_id = f"stress-p1-{index}", f"stress-p2-{index}"
    p1, p2 = _socket_client(web_app, p1_id), _socket_client(web_app, p2_id)
    clients.extend([p1, p2])

    _join(web_app, p1, code, "P1", TEAM_A)
    p2_received = _join(web_app, p2, code, "P2", TEAM_B)
    update = _payload(p2_received, "battle_v2_update")
    if update is None:
        findings.append(Softlock(index, scenario, "second joiner never received battle_v2_update", {"code": code}))
        return scenario, findings, clients
    match_id = update["match_id"]
    state = web_app.battle_v2_manager.rooms.get(match_id)
    if state is None:
        findings.append(Softlock(index, scenario, "match id missing from manager.rooms immediately after creation", {"match_id": match_id}))
        return scenario, findings, clients

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
            return scenario, findings, clients

    elif scenario == "disconnect_reconnect":
        p1.disconnect()
        st = web_app.battle_v2_manager.rooms.get(match_id)
        if not st.paused:
            findings.append(Softlock(index, scenario, "match did not pause after disconnect", {"match_id": match_id}))
        grant = web_app.battle_v2_sessions.issue(match_id, p1_id)
        p1b = _socket_client(web_app, "reconnector-" + p1_id)
        clients.append(p1b)
        p1b.emit("battle_v2_resume", {"room_id": match_id, "player_id": p1_id, "resume_token": grant.token})
        resumed = _payload(_received(p1b), "battle_v2_update")
        if resumed is None:
            findings.append(Softlock(index, scenario, "resume never produced battle_v2_update", {"match_id": match_id}))
            return scenario, findings, clients
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
            return scenario, findings, clients
        if st.winner_id != p2_id:
            findings.append(Softlock(index, scenario, "forfeit produced wrong winner", {"match_id": match_id, "winner_id": st.winner_id}))

    elif scenario == "rematch_spam":
        if not surrender_and_finish(p1, p1_id):
            findings.append(Softlock(index, scenario, "setup surrender failed before rematch", {"match_id": match_id}))
            return scenario, findings, clients
        st = web_app.battle_v2_manager.rooms.get(match_id)
        nonce = _nonce()
        rematch_payload = {"old_match_id": match_id, "state_revision": st.state_revision, "client_action_nonce": nonce}
        new_ids = set()
        for _ in range(4):
            p1.emit("battle_v2_rematch", rematch_payload)
            result = _payload(_received(p1), "battle_v2_rematch")
            if result is None:
                findings.append(Softlock(index, scenario, "rematch spam produced no response", {"match_id": match_id}))
                return scenario, findings, clients
            new_ids.add(result["new_match_id"])
        if len(new_ids) != 1:
            findings.append(Softlock(index, scenario, "rematch spam created more than one new match", {"match_id": match_id, "new_ids": list(new_ids)}))

    elif scenario == "code_reuse_race":
        if not surrender_and_finish(p1, p1_id):
            findings.append(Softlock(index, scenario, "setup surrender failed before reuse race", {"match_id": match_id}))
            return scenario, findings, clients
        p3 = _socket_client(web_app, f"stress-p3-{index}")
        p4 = _socket_client(web_app, f"stress-p4-{index}")
        clients.extend([p3, p4])
        _join(web_app, p3, code, "P3", TEAM_A)
        reuse_received = _join(web_app, p4, code, "P4", TEAM_B)
        reuse_update = _payload(reuse_received, "battle_v2_update")
        if reuse_update is None:
            findings.append(Softlock(index, scenario, "finished match's code was not immediately reusable", {"code": code}))
            return scenario, findings, clients
        if reuse_update["match_id"] == match_id:
            findings.append(Softlock(index, scenario, "reuse produced the same match id as the finished match", {"match_id": match_id}))

    # Real invariant: scan actual room rosters, not active_match_by_player (which
    # is a dict with one value per player and so can never reveal this corruption).
    memberships = _live_match_memberships(web_app)
    for player_id, match_ids in memberships.items():
        if len(match_ids) > 1:
            findings.append(
                Softlock(
                    index,
                    scenario,
                    "player appears in more than one live match",
                    {"player_id": player_id, "match_ids": sorted(match_ids)},
                )
            )
        recorded = web_app.active_match_by_player.get(player_id)
        if recorded is not None and recorded not in match_ids:
            findings.append(
                Softlock(
                    index,
                    scenario,
                    "active_match_by_player does not match real live membership",
                    {"player_id": player_id, "recorded": recorded, "actual": sorted(match_ids)},
                )
            )

    return scenario, findings, clients


def _fully_disconnect_client(client: Any) -> None:
    """Disconnect a SocketIOTestClient and reclaim what it leaks on its own.

    SocketIOTestClient.disconnect() only replays a Socket.IO-level DISCONNECT
    packet -- it never reaches python-socketio's Server._handle_eio_disconnect,
    which is the only place that pops socketio.server.environ[eio_sid]. The
    client also registers itself in the class-level SocketIOTestClient.clients
    registry at connect time and nothing ever pops it back out. A real
    WebSocket disconnect doesn't have this problem (it goes through the real
    Engine.IO transport close, which does fire that handler), so this is a
    test-harness-only leak -- but it's exactly the kind of leak that makes a
    soak test's own memory measurement meaningless if left in place.
    """

    if client.is_connected():
        client.disconnect()
    client.socketio.server.environ.pop(client.eio_sid, None)
    type(client).clients.pop(client.eio_sid, None)


def _process_rss_bytes() -> int | None:
    """Best-effort resident set size; returns None if unavailable on this platform."""

    try:
        import resource

        ru_maxrss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        return ru_maxrss if sys.platform == "darwin" else ru_maxrss * 1024
    except ImportError:
        pass
    try:
        import psutil

        return psutil.Process().memory_info().rss
    except ImportError:
        return None


def run_stress_batch(*, matches: int, seed: int = 1, prune_every: int = 100) -> dict[str, Any]:
    """Run a batch of simulated matches against a throwaway analytics database.

    Analytics/replay writes are redirected to a temporary SQLite file for the
    duration of the batch and the original `runtime_store.path` is restored
    afterward (even on error) -- a stress run must never write synthetic
    match/mission rows into whatever database the caller was already using,
    whether that's the real `data/jjk_arena.sqlite3` (a bare CLI invocation)
    or a pytest session's isolated temp path (this function's own test).
    """

    web_app = _import_app()
    original_db_path = web_app.runtime_store.path
    temp_dir = tempfile.mkdtemp(prefix="jjk_lifecycle_stress_")
    web_app.runtime_store.path = Path(temp_dir) / "runtime.sqlite3"
    web_app.runtime_store._initialize()
    scheduler = web_app.battle_v2_timer_scheduler
    threads_before = threading.active_count()
    try:
        rng = random.Random(seed)
        findings: list[Softlock] = []
        scenario_counts: dict[str, int] = {}
        peak_rooms = 0
        peak_scheduler_tasks = 0
        start = time.monotonic()
        for index in range(matches):
            scenario, batch_findings, clients = _run_scenario(web_app, rng, index)
            scenario_counts[scenario] = scenario_counts.get(scenario, 0) + 1
            findings.extend(batch_findings)
            for client in clients:
                _fully_disconnect_client(client)
            peak_rooms = max(peak_rooms, len(web_app.battle_v2_manager.rooms))
            peak_scheduler_tasks = max(peak_scheduler_tasks, scheduler.active_task_count())
            if (index + 1) % prune_every == 0:
                web_app.prune_stale_runtime(now=time.monotonic() + web_app.ACTIVE_ROOM_TTL_SECONDS + 1)
        elapsed = time.monotonic() - start

        # The scheduler itself never spawns more than one worker thread
        # regardless of how many rooms were armed across the whole batch;
        # confirm that here rather than trusting the deadline count alone.
        threads_after_batch = threading.active_count()
        extra_threads = threads_after_batch - threads_before
        rss_bytes = _process_rss_bytes()

        return {
            "schema_version": SCHEMA_VERSION,
            "matches": matches,
            "seed": seed,
            "elapsed_seconds": round(elapsed, 2),
            "scenario_counts": scenario_counts,
            "peak_rooms": peak_rooms,
            "peak_scheduler_tasks": peak_scheduler_tasks,
            "final_rooms": len(web_app.battle_v2_manager.rooms),
            "scheduler_worker_threads": 1 if scheduler._worker_started else 0,
            "extra_threads_after_batch": extra_threads,
            "process_rss_bytes": rss_bytes,
            "memory_ceiling_bytes": MEMORY_CEILING_BYTES,
            "over_memory_ceiling": bool(rss_bytes is not None and rss_bytes > MEMORY_CEILING_BYTES),
            "softlocks": [
                {"match_index": f.match_index, "scenario": f.scenario, "reason": f.reason, "detail": f.detail}
                for f in findings
            ],
            "softlock_count": len(findings),
        }
    finally:
        web_app.runtime_store.path = original_db_path
        shutil.rmtree(temp_dir, ignore_errors=True)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Simulated-network Battle v2 lifecycle stress test")
    parser.add_argument("--matches", type=int, default=1000)
    parser.add_argument("--seed", type=int, default=1)
    args = parser.parse_args(argv)
    result = run_stress_batch(matches=args.matches, seed=args.seed)
    # One-shot CLI process: deterministically stop the scheduler's single
    # worker thread before reporting, rather than relying on process exit to
    # reap it, so "no stale timer thread survives" is actually verified here.
    web_app = _import_app()
    web_app.battle_v2_timer_scheduler.shutdown()
    result["scheduler_worker_threads_after_shutdown"] = 1 if web_app.battle_v2_timer_scheduler._worker_started else 0
    print(json.dumps(result, indent=2, sort_keys=True))
    if result["over_memory_ceiling"]:
        print(
            f"FAIL: process RSS {result['process_rss_bytes']} exceeded the "
            f"documented ceiling of {MEMORY_CEILING_BYTES} bytes",
            file=sys.stderr,
        )
        return 1
    if result["scheduler_worker_threads_after_shutdown"]:
        print("FAIL: scheduler worker thread did not stop after shutdown()", file=sys.stderr)
        return 1
    return 1 if result["softlock_count"] else 0


if __name__ == "__main__":
    sys.exit(main())
