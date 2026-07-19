"""Real-network acceptance smoke for the maintained Battle v2 service.

This module deliberately does not use Flask-SocketIO's in-process test client.
It starts an isolated server process, connects through the real Engine.IO /
Socket.IO WebSocket transport, and drives the public Battle v2 event contract.
"""

from __future__ import annotations

import argparse
import itertools
import json
import os
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

import requests
import socketio


ROOT = Path(__file__).resolve().parents[1]
CORE_ENERGY = ("green", "red", "blue", "white")
OBSERVED_EVENTS = (
    "battle_v2_error",
    "battle_v2_finished",
    "battle_v2_lobby",
    "battle_v2_resume_rejected",
    "battle_v2_session",
    "battle_v2_update",
)
DEFAULT_EVENT_TIMEOUT = 10.0


class AcceptanceError(RuntimeError):
    """Raised when the real-network contract does not reach an expected state."""


@dataclass(frozen=True, slots=True)
class RecordedEvent:
    sequence: int
    name: str
    data: Any


def diagnostic_event(event: RecordedEvent) -> dict[str, Any]:
    data = event.data
    if event.name == "battle_v2_update" and isinstance(data, dict):
        data = {
            "match_id": data.get("match_id"),
            "phase": data.get("phase"),
            "state_revision": data.get("state_revision"),
        }
    elif event.name == "battle_v2_session" and isinstance(data, dict):
        data = {
            "room_id": data.get("room_id"),
            "player_id": data.get("player_id"),
            "resume_token": "<redacted>",
        }
    return {"sequence": event.sequence, "name": event.name, "data": data}


class SocketProbe:
    """One independent browser-like HTTP session and Socket.IO connection."""

    def __init__(self, name: str, base_url: str, *, timeout: float = DEFAULT_EVENT_TIMEOUT):
        self.name = name
        self.base_url = base_url
        self.timeout = timeout
        self.http = requests.Session()
        self.http.trust_env = False
        self.socket = socketio.Client(
            http_session=self.http,
            reconnection=False,
            logger=False,
            engineio_logger=False,
            request_timeout=timeout,
            websocket_extra_options={"http_no_proxy": ["127.0.0.1", "localhost"]},
        )
        self._condition = threading.Condition()
        self._events: list[RecordedEvent] = []
        self._sequence = 0
        for event_name in OBSERVED_EVENTS:
            self.socket.on(event_name, self._handler(event_name))

    def _handler(self, event_name: str) -> Callable[[Any], None]:
        def record(data: Any = None) -> None:
            with self._condition:
                self._sequence += 1
                self._events.append(RecordedEvent(self._sequence, event_name, data))
                self._condition.notify_all()

        return record

    def connect(self) -> None:
        response = self.http.get(f"{self.base_url}/", timeout=self.timeout)
        response.raise_for_status()
        self.socket.connect(
            self.base_url,
            transports=["websocket"],
            wait=True,
            wait_timeout=self.timeout,
        )
        if not self.socket.connected:
            raise AcceptanceError(f"{self.name} did not connect")
        if self.socket.transport() != "websocket":
            raise AcceptanceError(
                f"{self.name} connected through {self.socket.transport()!r}, expected 'websocket'"
            )

    def mark(self) -> int:
        with self._condition:
            return self._sequence

    def emit(self, event_name: str, payload: dict[str, Any]) -> int:
        marker = self.mark()
        self.socket.emit(event_name, payload)
        return marker

    def wait_for(
        self,
        event_name: str,
        *,
        after: int,
        predicate: Callable[[Any], bool] | None = None,
        timeout: float | None = None,
    ) -> Any:
        deadline = time.monotonic() + (self.timeout if timeout is None else timeout)
        predicate = predicate or (lambda _data: True)
        with self._condition:
            while True:
                for event in self._events:
                    if event.sequence <= after:
                        continue
                    if event.name == "battle_v2_error" and event_name != "battle_v2_error":
                        raise AcceptanceError(f"{self.name} received battle_v2_error: {event.data}")
                    if event.name == event_name and predicate(event.data):
                        return event.data
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    recent = [diagnostic_event(item) for item in self._events[-8:]]
                    raise AcceptanceError(
                        f"{self.name} timed out waiting for {event_name}; recent events={recent!r}"
                    )
                self._condition.wait(remaining)

    def disconnect(self) -> None:
        if self.socket.connected:
            self.socket.disconnect()
        self.http.close()


NONCES = itertools.count(1)


def command_payload(state: dict[str, Any], label: str, **payload: Any) -> dict[str, Any]:
    return {
        **payload,
        "state_revision": int(state["state_revision"]),
        "client_action_nonce": f"network-acceptance-{label}-{next(NONCES)}",
    }


def first_living_slot(player: dict[str, Any]) -> int:
    for slot, character in enumerate(player["team"]):
        if character.get("alive"):
            return slot
    raise AcceptanceError(f"player {player.get('id')} has no living character")


def payable_action(state: dict[str, Any], player_id: str) -> dict[str, Any]:
    """Choose a simple, condition-free action payable from initial core energy."""

    player = state["players"][player_id]
    opponent_id = next(item for item in state["players"] if item != player_id)
    opponent_slot = first_living_slot(state["players"][opponent_id])
    available = {
        color
        for color in CORE_ENERGY
        if int(player.get("energy", {}).get(color, 0)) > 0
    }
    for caster_slot, character in enumerate(player["team"]):
        if not character.get("alive"):
            continue
        profile = state["skill_catalog"][character["character_id"]]
        for skill in profile["skills"]:
            cost = list(skill.get("cost") or [])
            target_rule = dict(skill.get("target_rule") or {})
            target_kind = target_rule.get("kind")
            if len(cost) != 1 or cost[0] not in available:
                continue
            if skill.get("conditions") or target_kind not in {"enemy", "ally", "self"}:
                continue
            if target_kind == "enemy":
                target_player_id, target_slot = opponent_id, opponent_slot
            elif target_kind == "self":
                target_player_id, target_slot = player_id, caster_slot
            else:
                target_player_id, target_slot = player_id, first_living_slot(player)
                if not target_rule.get("allow_self", True) and target_slot == caster_slot:
                    other_slots = [
                        slot
                        for slot, ally in enumerate(player["team"])
                        if ally.get("alive") and slot != caster_slot
                    ]
                    if not other_slots:
                        continue
                    target_slot = other_slots[0]
            return {
                "id": f"accept-{skill['id']}",
                "caster_slot": caster_slot,
                "skill_id": skill["id"],
                "target_player_id": target_player_id,
                "target_slot": target_slot,
            }
    raise AcceptanceError(
        f"no simple payable action for {player_id}; energy={player.get('energy')}"
    )


def wait_for_update(
    probe: SocketProbe,
    *,
    after: int,
    match_id: str | None = None,
    minimum_revision: int | None = None,
    phase: str | None = None,
    timeout: float | None = None,
) -> dict[str, Any]:
    def matches(state: Any) -> bool:
        if not isinstance(state, dict):
            return False
        if match_id is not None and state.get("match_id") != match_id:
            return False
        if minimum_revision is not None and int(state.get("state_revision", -1)) < minimum_revision:
            return False
        if phase is not None and state.get("phase") != phase:
            return False
        return True

    return probe.wait_for(
        "battle_v2_update",
        after=after,
        predicate=matches,
        timeout=timeout,
    )


def run_cpu_flow(base_url: str) -> dict[str, Any]:
    client = SocketProbe("cpu-client", base_url)
    try:
        client.connect()
        marker = client.emit(
            "battle_v2_start_classic",
            {
                "room_id": "acceptance-cpu",
                "player_name": "Network CPU",
                "player_team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"],
                "enemy_team": ["satoru_gojo", "ryomen_sukuna", "mahito"],
                "difficulty": "normal",
            },
        )
        grant = client.wait_for("battle_v2_session", after=marker)
        match_id = grant["room_id"]
        player_id = grant["player_id"]
        state = wait_for_update(client, after=marker, match_id=match_id, phase="planning")
        if state["turn_player_id"] != player_id:
            raise AcceptanceError("CPU flow did not start on the human player's turn")

        action = payable_action(state, player_id)
        marker = client.emit(
            "battle_v2_submit_plan",
            command_payload(state, "cpu-submit", actions=[action]),
        )
        queued = wait_for_update(
            client,
            after=marker,
            match_id=match_id,
            minimum_revision=int(state["state_revision"]) + 1,
            phase="queue_review",
        )
        if [item["id"] for item in queued["pending_actions"][player_id]] != [action["id"]]:
            raise AcceptanceError("CPU Queue Review did not preserve the submitted action")

        marker = client.emit(
            "battle_v2_update_queue",
            command_payload(
                queued,
                "cpu-order",
                queue_order=[action["id"]],
                wildcard_pays={},
            ),
        )
        reviewed = wait_for_update(
            client,
            after=marker,
            match_id=match_id,
            minimum_revision=int(queued["state_revision"]) + 1,
            phase="queue_review",
        )
        if reviewed["queue_order"][player_id] != [action["id"]]:
            raise AcceptanceError("CPU Queue Review did not preserve authoritative order")
        if reviewed["players"][player_id]["energy"] != state["players"][player_id]["energy"]:
            raise AcceptanceError("Queue Review spent energy before final confirmation")

        marker = client.emit(
            "battle_v2_confirm_queue",
            command_payload(reviewed, "cpu-confirm"),
        )
        resolved = wait_for_update(
            client,
            after=marker,
            match_id=match_id,
            minimum_revision=int(reviewed["state_revision"]) + 1,
        )
        if not any(event.get("type") == "skill_resolved" for event in resolved["event_log"]):
            raise AcceptanceError("CPU confirm did not produce authoritative skill resolution")

        marker = client.emit(
            "battle_v2_surrender",
            command_payload(resolved, "cpu-surrender"),
        )
        finished = client.wait_for("battle_v2_finished", after=marker)
        terminal = wait_for_update(client, after=marker, match_id=match_id, phase="finished")
        if finished.get("winner_id") != "__cpu_v2__":
            raise AcceptanceError(f"unexpected CPU winner payload: {finished!r}")
        return {
            "transport": client.socket.transport(),
            "match_id": match_id,
            "skill_id": action["skill_id"],
            "queue_revision": reviewed["state_revision"],
            "final_revision": terminal["state_revision"],
            "winner_id": finished["winner_id"],
        }
    finally:
        client.disconnect()


def run_pvp_resume_flow(base_url: str) -> dict[str, Any]:
    first = SocketProbe("pvp-first", base_url)
    second = SocketProbe("pvp-second", base_url)
    resumed: SocketProbe | None = None
    replay: SocketProbe | None = None
    try:
        first.connect()
        second.connect()
        lobby_code = "acceptance-private"
        marker = first.emit(
            "battle_v2_join_pvp",
            {
                "room_id": lobby_code,
                "player_name": "Network P1",
                "player_team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"],
            },
        )
        waiting = first.wait_for(
            "battle_v2_lobby",
            after=marker,
            predicate=lambda data: data.get("status") == "waiting",
        )
        if waiting.get("room_id") != lobby_code:
            raise AcceptanceError(f"unexpected waiting lobby: {waiting!r}")

        first_marker = first.mark()
        second_marker = second.emit(
            "battle_v2_join_pvp",
            {
                "room_id": lobby_code,
                "player_name": "Network P2",
                "player_team": ["satoru_gojo", "ryomen_sukuna", "mahito"],
            },
        )
        first_grant = first.wait_for("battle_v2_session", after=first_marker)
        second_grant = second.wait_for("battle_v2_session", after=second_marker)
        match_id = first_grant["room_id"]
        if second_grant["room_id"] != match_id:
            raise AcceptanceError("PvP clients received different authoritative match ids")
        first_state = wait_for_update(first, after=first_marker, match_id=match_id)
        second_state = wait_for_update(second, after=second_marker, match_id=match_id)
        expected_players = {first_grant["player_id"], second_grant["player_id"]}
        if set(first_state["players"]) != expected_players or set(second_state["players"]) != expected_players:
            raise AcceptanceError("PvP state did not contain exactly the two HTTP sessions")

        second_pause_marker = second.mark()
        first.disconnect()
        paused = wait_for_update(second, after=second_pause_marker, match_id=match_id)
        if paused.get("paused") is not True:
            raise AcceptanceError("opponent did not receive the authoritative disconnect pause")

        resumed = SocketProbe("pvp-resumed", base_url)
        resumed.connect()
        marker = resumed.emit("battle_v2_resume", dict(first_grant))
        rotated = resumed.wait_for("battle_v2_session", after=marker)
        resumed_state = wait_for_update(resumed, after=marker, match_id=match_id)
        if rotated["resume_token"] == first_grant["resume_token"]:
            raise AcceptanceError("resume token did not rotate")
        if rotated["player_id"] != first_grant["player_id"] or rotated["room_id"] != match_id:
            raise AcceptanceError("rotated resume grant changed player or room scope")
        if resumed_state.get("paused") is not False:
            raise AcceptanceError("successful resume did not unpause the match")

        replay = SocketProbe("pvp-replay", base_url)
        replay.connect()
        marker = replay.emit("battle_v2_resume", dict(first_grant))
        rejected = replay.wait_for("battle_v2_resume_rejected", after=marker)
        if rejected != {"message": "Battle session could not be resumed."}:
            raise AcceptanceError(f"unexpected rotated-token rejection: {rejected!r}")

        by_player = {
            first_grant["player_id"]: resumed,
            second_grant["player_id"]: second,
        }
        active = by_player[resumed_state["turn_player_id"]]
        marker = active.emit(
            "battle_v2_end_turn",
            command_payload(resumed_state, "pvp-end-turn"),
        )
        advanced = wait_for_update(
            active,
            after=marker,
            match_id=match_id,
            minimum_revision=int(resumed_state["state_revision"]) + 1,
        )
        if advanced["turn_player_id"] == resumed_state["turn_player_id"]:
            raise AcceptanceError("PvP end-turn did not pass authority to the opponent")

        surrendering = by_player[advanced["turn_player_id"]]
        other = resumed if surrendering is second else second
        other_marker = other.mark()
        surrender_marker = surrendering.emit(
            "battle_v2_surrender",
            command_payload(advanced, "pvp-surrender"),
        )
        surrendered_finished = surrendering.wait_for("battle_v2_finished", after=surrender_marker)
        other_finished = other.wait_for("battle_v2_finished", after=other_marker)
        terminal = wait_for_update(
            surrendering,
            after=surrender_marker,
            match_id=match_id,
            phase="finished",
        )
        if surrendered_finished != other_finished:
            raise AcceptanceError("PvP clients did not receive the same terminal winner")
        return {
            "transports": [resumed.socket.transport(), second.socket.transport()],
            "match_id": match_id,
            "lobby_code": lobby_code,
            "resume_token_rotated": True,
            "rotated_token_rejected": True,
            "turn_advanced": True,
            "final_revision": terminal["state_revision"],
            "winner_id": surrendered_finished["winner_id"],
        }
    finally:
        for probe in (replay, resumed, second, first):
            if probe is not None:
                probe.disconnect()


def run_timeout_flow(base_url: str, *, planning_seconds: float) -> dict[str, Any]:
    client = SocketProbe(
        "timeout-client",
        base_url,
        timeout=max(DEFAULT_EVENT_TIMEOUT, planning_seconds + 8.0),
    )
    try:
        client.connect()
        marker = client.emit(
            "battle_v2_start_classic",
            {"room_id": "acceptance-timeout", "player_name": "Network Timeout"},
        )
        grant = client.wait_for("battle_v2_session", after=marker)
        match_id = grant["room_id"]
        state = wait_for_update(client, after=marker, match_id=match_id, phase="planning")
        if not state.get("phase_seconds_remaining"):
            raise AcceptanceError("planning state did not expose an authoritative deadline")
        timeout_marker = client.mark()
        started_at = time.monotonic()
        timed_out = client.wait_for(
            "battle_v2_update",
            after=timeout_marker,
            predicate=lambda payload: (
                payload.get("match_id") == match_id
                and int(payload.get("state_revision", -1)) > int(state["state_revision"])
                and any(event.get("type") == "phase_timeout" for event in payload.get("event_log", []))
            ),
            timeout=planning_seconds + 8.0,
        )
        elapsed = time.monotonic() - started_at
        # The deadline starts before the initial update traverses the socket,
        # so allow up to one second of delivery/scheduling latency in CI.
        if elapsed + 1.0 < planning_seconds:
            raise AcceptanceError(
                f"authoritative timeout fired too early: {elapsed:.3f}s < {planning_seconds:.3f}s"
            )
        marker = client.emit(
            "battle_v2_surrender",
            command_payload(timed_out, "timeout-surrender"),
        )
        client.wait_for("battle_v2_finished", after=marker)
        return {
            "transport": client.socket.transport(),
            "match_id": match_id,
            "elapsed_seconds": round(elapsed, 3),
            "state_revision": timed_out["state_revision"],
            "phase_timeout_event": True,
        }
    finally:
        client.disconnect()


def reserve_local_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.bind(("127.0.0.1", 0))
        return int(listener.getsockname()[1])


def wait_until_ready(base_url: str, process: subprocess.Popen[Any], *, timeout: float = 15.0) -> None:
    deadline = time.monotonic() + timeout
    last_error: Exception | None = None
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise AcceptanceError(f"isolated server exited with code {process.returncode}")
        try:
            with urllib.request.urlopen(f"{base_url}/readyz", timeout=1.0) as response:
                if response.status == 200:
                    return
        except (OSError, urllib.error.URLError) as exc:
            last_error = exc
        time.sleep(0.1)
    raise AcceptanceError(f"isolated server did not become ready: {last_error}")


def stop_exact_process(process: subprocess.Popen[Any]) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=5.0)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5.0)


def isolated_environment(port: int, database_path: Path) -> dict[str, str]:
    environment = dict(os.environ)
    environment.update(
        {
            "FLASK_SECRET_KEY": "network-acceptance-only-secret-key-000000000000000000000000",
            "JJK_BATTLE_SYSTEM": "v2",
            "JJK_CORS_ORIGINS": f"http://127.0.0.1:{port}",
            "JJK_DATABASE_PATH": str(database_path),
            "JJK_DEBUG": "0",
            "JJK_HOST": "127.0.0.1",
            "JJK_PORT": str(port),
            "JJK_PRODUCTION": "0",
            "JJK_SOCKETIO_ASYNC_MODE": "threading",
            "JJK_WEB_WORKERS": "1",
            "NO_PROXY": "127.0.0.1,localhost",
            "PYTHONDONTWRITEBYTECODE": "1",
            "PYTHONUNBUFFERED": "1",
            "no_proxy": "127.0.0.1,localhost",
        }
    )
    environment.pop("JJK_FIRST_CREATION_PROFILE_STORE", None)
    return environment


def run_network_acceptance(
    *,
    planning_seconds: float = 4.0,
    queue_review_seconds: float = 4.0,
) -> dict[str, Any]:
    """Run all acceptance scenarios against one isolated real server process."""

    if planning_seconds < 1.0 or queue_review_seconds < 1.0:
        raise ValueError("acceptance timer values must be at least one second")
    port = reserve_local_port()
    base_url = f"http://127.0.0.1:{port}"
    with tempfile.TemporaryDirectory(prefix="jjk-network-acceptance-") as temporary:
        temporary_path = Path(temporary)
        log_path = temporary_path / "server.log"
        database_path = temporary_path / "acceptance.sqlite3"
        command = [
            sys.executable,
            "-m",
            "tools.network_acceptance",
            "--serve",
            "--port",
            str(port),
            "--planning-seconds",
            str(planning_seconds),
            "--queue-review-seconds",
            str(queue_review_seconds),
        ]
        creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
        process: subprocess.Popen[Any] | None = None
        caught: Exception | None = None
        with log_path.open("w", encoding="utf-8") as log:
            try:
                process = subprocess.Popen(
                    command,
                    cwd=ROOT,
                    env=isolated_environment(port, database_path),
                    stdout=log,
                    stderr=subprocess.STDOUT,
                    creationflags=creation_flags,
                    start_new_session=os.name != "nt",
                )
                wait_until_ready(base_url, process)
                report = {
                    "base_url": base_url,
                    "cpu": run_cpu_flow(base_url),
                    "pvp": run_pvp_resume_flow(base_url),
                    "timeout": run_timeout_flow(base_url, planning_seconds=planning_seconds),
                }
                return report
            except Exception as exc:  # Preserve the server log before TemporaryDirectory cleanup.
                caught = exc
            finally:
                if process is not None:
                    stop_exact_process(process)
        log_tail = "\n".join(log_path.read_text(encoding="utf-8", errors="replace").splitlines()[-80:])
        raise AcceptanceError(f"{caught}\n--- isolated server log ---\n{log_tail}") from caught


def serve(port: int, planning_seconds: float, queue_review_seconds: float) -> None:
    """Internal child-process entry point for the isolated acceptance server."""

    from jjk_arena.battle_v2.timers import BattleTimerPolicy
    from web import app as web_app

    web_app.battle_v2_manager.timer_policy = BattleTimerPolicy(
        planning_seconds=planning_seconds,
        queue_review_seconds=queue_review_seconds,
    )
    web_app.socketio.run(
        web_app.app,
        debug=False,
        host="127.0.0.1",
        port=port,
        allow_unsafe_werkzeug=True,
        use_reloader=False,
        log_output=False,
    )


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--serve", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--port", type=int, default=0, help=argparse.SUPPRESS)
    parser.add_argument("--planning-seconds", type=float, default=4.0)
    parser.add_argument("--queue-review-seconds", type=float, default=4.0)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.serve:
        if not 1 <= args.port <= 65535:
            raise SystemExit("--serve requires a valid --port")
        serve(args.port, args.planning_seconds, args.queue_review_seconds)
        return 0
    report = run_network_acceptance(
        planning_seconds=args.planning_seconds,
        queue_review_seconds=args.queue_review_seconds,
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
