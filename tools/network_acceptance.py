"""Real-network acceptance smoke for the maintained Battle v2 service.

This module deliberately does not use Flask-SocketIO's in-process test client.
It starts an isolated server process, connects through the real Engine.IO /
Socket.IO WebSocket transport, and drives the public Battle v2 event contract.
"""

from __future__ import annotations

import argparse
import itertools
import json
import math
import os
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

import requests
import socketio

from jjk_arena.battle_v2.runtime_store import SCHEMA_VERSION


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
NETWORK_ACCEPTANCE_OPS_TOKEN = "network-acceptance-ops-token-000000000000000000000000"


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

    def __init__(
        self,
        name: str,
        base_url: str,
        *,
        timeout: float = DEFAULT_EVENT_TIMEOUT,
        socket_origin: str | None = None,
    ):
        self.name = name
        self.base_url = base_url
        self.timeout = timeout
        self.socket_origin = socket_origin
        self.http = requests.Session()
        self.http.trust_env = False
        websocket_options = {"http_no_proxy": ["127.0.0.1", "localhost"]}
        if socket_origin:
            # websocket-client otherwise adds the HTTP base URL as a second
            # Origin alongside our production HTTPS Origin.
            websocket_options["suppress_origin"] = True
        self.socket = socketio.Client(
            http_session=self.http,
            reconnection=False,
            logger=False,
            engineio_logger=False,
            request_timeout=timeout,
            websocket_extra_options=websocket_options,
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
            headers={"Origin": self.socket_origin} if self.socket_origin else {},
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


def run_cpu_flow(
    base_url: str,
    *,
    socket_origin: str | None = None,
    run_id: str = "acceptance",
) -> dict[str, Any]:
    client = SocketProbe("cpu-client", base_url, socket_origin=socket_origin)
    finished_resume: SocketProbe | None = None
    try:
        client.connect()
        marker = client.emit(
            "battle_v2_start_classic",
            {
                "room_id": f"{run_id}-cpu",
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
        finished_resume = SocketProbe(
            "cpu-finished-resume",
            base_url,
            socket_origin=socket_origin,
        )
        finished_resume.connect()
        marker = finished_resume.emit("battle_v2_resume", dict(grant))
        finished_resume.wait_for("battle_v2_resume_rejected", after=marker)
        return {
            "transport": client.socket.transport(),
            "match_id": match_id,
            "skill_id": action["skill_id"],
            "queue_revision": reviewed["state_revision"],
            "final_revision": terminal["state_revision"],
            "winner_id": finished["winner_id"],
            "finished_resume_rejected": True,
        }
    finally:
        if finished_resume is not None:
            finished_resume.disconnect()
        client.disconnect()


def run_pvp_resume_flow(
    base_url: str,
    *,
    socket_origin: str | None = None,
    run_id: str = "acceptance",
) -> dict[str, Any]:
    first = SocketProbe("pvp-first", base_url, socket_origin=socket_origin)
    second = SocketProbe("pvp-second", base_url, socket_origin=socket_origin)
    resumed: SocketProbe | None = None
    replay: SocketProbe | None = None
    try:
        first.connect()
        second.connect()
        lobby_code = f"{run_id}-private"
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

        resumed = SocketProbe("pvp-resumed", base_url, socket_origin=socket_origin)
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

        replay = SocketProbe("pvp-replay", base_url, socket_origin=socket_origin)
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


def run_timeout_flow(
    base_url: str,
    *,
    planning_seconds: float,
    socket_origin: str | None = None,
    run_id: str = "acceptance",
) -> dict[str, Any]:
    client = SocketProbe(
        "timeout-client",
        base_url,
        timeout=max(DEFAULT_EVENT_TIMEOUT, planning_seconds + 8.0),
        socket_origin=socket_origin,
    )
    try:
        client.connect()
        marker = client.emit(
            "battle_v2_start_classic",
            {"room_id": f"{run_id}-planning-timeout", "player_name": "Network Timeout"},
        )
        grant = client.wait_for("battle_v2_session", after=marker)
        match_id = grant["room_id"]
        state = wait_for_update(client, after=marker, match_id=match_id, phase="planning")
        observed_seconds = state.get("phase_seconds_remaining")
        if not observed_seconds:
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
            timeout=max(planning_seconds, float(observed_seconds)) + 8.0,
        )
        elapsed = time.monotonic() - started_at
        # The deadline starts before the initial update traverses the socket,
        # so allow up to one second of delivery/scheduling latency in CI.
        if elapsed + 1.0 < float(observed_seconds):
            raise AcceptanceError(
                f"authoritative timeout fired too early: {elapsed:.3f}s < {observed_seconds:.3f}s"
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
            "observed_deadline_seconds": observed_seconds,
            "state_revision": timed_out["state_revision"],
            "phase_timeout_event": True,
        }
    finally:
        client.disconnect()


def run_queue_timeout_flow(
    base_url: str,
    *,
    queue_review_seconds: float,
    socket_origin: str | None = None,
    run_id: str = "acceptance",
) -> dict[str, Any]:
    """Prove an unconfirmed real-network queue is discarded at its deadline."""

    client = SocketProbe(
        "queue-timeout-client",
        base_url,
        timeout=max(DEFAULT_EVENT_TIMEOUT, queue_review_seconds + 8.0),
        socket_origin=socket_origin,
    )
    try:
        client.connect()
        marker = client.emit(
            "battle_v2_start_classic",
            {"room_id": f"{run_id}-queue-timeout", "player_name": "Network Queue Timeout"},
        )
        grant = client.wait_for("battle_v2_session", after=marker)
        match_id = grant["room_id"]
        player_id = grant["player_id"]
        state = wait_for_update(client, after=marker, match_id=match_id, phase="planning")
        action = payable_action(state, player_id)
        marker = client.emit(
            "battle_v2_submit_plan",
            command_payload(state, "queue-timeout-submit", actions=[action]),
        )
        queued = wait_for_update(
            client,
            after=marker,
            match_id=match_id,
            minimum_revision=int(state["state_revision"]) + 1,
            phase="queue_review",
        )
        observed_seconds = queued.get("phase_seconds_remaining")
        if not observed_seconds:
            raise AcceptanceError("Queue Review did not expose an authoritative deadline")

        timeout_marker = client.mark()
        started_at = time.monotonic()
        timed_out = client.wait_for(
            "battle_v2_update",
            after=timeout_marker,
            predicate=lambda payload: (
                isinstance(payload, dict)
                and payload.get("match_id") == match_id
                and int(payload.get("state_revision", -1)) > int(queued["state_revision"])
                and any(
                    event.get("type") == "phase_timeout"
                    and event.get("payload", {}).get("player_id") == player_id
                    for event in payload.get("event_log", [])
                )
            ),
            timeout=max(queue_review_seconds, float(observed_seconds)) + 8.0,
        )
        elapsed = time.monotonic() - started_at
        if elapsed + 1.0 < float(observed_seconds):
            raise AcceptanceError(
                f"Queue Review timeout fired too early: {elapsed:.3f}s < {observed_seconds:.3f}s"
            )
        if timed_out.get("pending_actions", {}).get(player_id):
            raise AcceptanceError("Queue Review timeout did not discard the pending action")
        if any(
            event.get("type") == "skill_resolved"
            and event.get("payload", {}).get("action_id") == action["id"]
            for event in timed_out.get("event_log", [])
        ):
            raise AcceptanceError("Queue Review timeout resolved an unconfirmed action")

        marker = client.emit(
            "battle_v2_surrender",
            command_payload(timed_out, "queue-timeout-surrender"),
        )
        client.wait_for("battle_v2_finished", after=marker)
        return {
            "transport": client.socket.transport(),
            "match_id": match_id,
            "elapsed_seconds": round(elapsed, 3),
            "observed_deadline_seconds": observed_seconds,
            "phase_timeout_event": True,
            "pending_queue_discarded": True,
            "unconfirmed_action_resolved": False,
        }
    finally:
        client.disconnect()


def _assert_runtime_drained(ops_payload: dict[str, Any]) -> None:
    zero_fields = (
        "live_rooms",
        "waiting_lobbies",
        "scheduler_tasks",
        "scheduler_callbacks_inflight",
        "scheduler_callback_errors_total",
        "battle_command_handlers_inflight",
        "analytics_outbox_size",
        "mission_snapshot_retry_rooms",
        "terminal_persistence_pending_rooms",
        "mission_settlement_fallback_pending",
    )
    nonzero = {
        key: ops_payload.get(key)
        for key in zero_fields
        if ops_payload.get(key) != 0
    }
    settlements = ops_payload.get("mission_settlements")
    if not isinstance(settlements, dict):
        raise AcceptanceError("authorized ops payload has invalid mission_settlements")
    for status in ("pending", "processing", "failed_retryable"):
        value = settlements.get(status, 0)
        if value != 0:
            nonzero[f"mission_settlements.{status}"] = value
    if ops_payload.get("accepting_new_matches") is not False:
        nonzero["accepting_new_matches"] = ops_payload.get("accepting_new_matches")
    if nonzero:
        raise AcceptanceError(f"candidate is not safely drained: {nonzero!r}")


def run_http_contract(
    base_url: str,
    *,
    ops_token: str | None = None,
    require_production: bool = False,
    require_drained: bool = False,
) -> dict[str, Any]:
    """Check candidate liveness/readiness and fail-closed operations surfaces."""

    if (require_production or require_drained) and not ops_token:
        raise AcceptanceError("production candidate checks require JJK_OPS_TOKEN")
    with requests.Session() as session:
        session.trust_env = False
        health = session.get(f"{base_url}/healthz", timeout=DEFAULT_EVENT_TIMEOUT)
        ready = session.get(f"{base_url}/readyz", timeout=DEFAULT_EVENT_TIMEOUT)
        debug = session.get(f"{base_url}/debug-state", timeout=DEFAULT_EVENT_TIMEOUT)
        ops_missing = session.get(f"{base_url}/ops/runtime", timeout=DEFAULT_EVENT_TIMEOUT)
        wrong_token = f"{ops_token}-wrong" if ops_token else "definitely-wrong-token"
        ops_wrong = session.get(
            f"{base_url}/ops/runtime",
            headers={"Authorization": f"Bearer {wrong_token}"},
            timeout=DEFAULT_EVENT_TIMEOUT,
        )
        if health.status_code != 200 or health.json() != {"service": "jjk-arena", "status": "ok"}:
            raise AcceptanceError(f"unexpected /healthz response: {health.status_code} {health.text!r}")
        ready_payload = ready.json()
        if ready.status_code != 200 or ready_payload.get("status") != "ready":
            raise AcceptanceError(f"unexpected /readyz response: {ready.status_code} {ready.text!r}")
        if ready_payload.get("issues") != []:
            raise AcceptanceError(f"/readyz returned non-empty issues: {ready_payload.get('issues')!r}")
        storage = ready_payload.get("storage")
        if not isinstance(storage, dict) or storage.get("ok") is not True:
            raise AcceptanceError(f"/readyz storage is not healthy: {storage!r}")
        if storage.get("schema_version") != SCHEMA_VERSION:
            raise AcceptanceError(
                f"/readyz schema is {storage.get('schema_version')!r}, expected {SCHEMA_VERSION}"
            )
        if ready_payload.get("topology") != "single-authority-worker":
            raise AcceptanceError(f"unexpected authority topology: {ready_payload.get('topology')!r}")
        if require_production and ready_payload.get("mode") != "production":
            raise AcceptanceError(
                f"external candidate is not in production mode: {ready_payload.get('mode')!r}"
            )
        if debug.status_code != 404:
            raise AcceptanceError(f"debug endpoint returned {debug.status_code}, expected 404")
        if ops_missing.status_code != 404 or ops_wrong.status_code != 404:
            raise AcceptanceError("ops endpoint did not hide itself from missing/wrong tokens")

        ops_payload = None
        if ops_token:
            ops = session.get(
                f"{base_url}/ops/runtime",
                headers={"Authorization": f"Bearer {ops_token}"},
                timeout=DEFAULT_EVENT_TIMEOUT,
            )
            if ops.status_code != 200:
                raise AcceptanceError(f"authorized ops endpoint returned {ops.status_code}")
            ops_payload = ops.json()
            for key in (
                "accepting_new_matches",
                "analytics",
                "analytics_outbox_dropped_total",
                "analytics_outbox_size",
                "finished_rooms",
                "live_rooms",
                "battle_command_handlers_inflight",
                "mission_settlements",
                "mission_settlement_fallback_pending",
                "mission_settlement_dead_lettered_total",
                "mission_snapshot_retry_rooms",
                "terminal_persistence_pending_rooms",
                "scheduler_tasks",
                "scheduler_callbacks_inflight",
                "scheduler_callback_errors_total",
                "waiting_lobbies",
            ):
                if key not in ops_payload:
                    raise AcceptanceError(f"authorized ops payload is missing {key}")
            if require_drained:
                _assert_runtime_drained(ops_payload)

    return {
        "health_status": health.status_code,
        "readiness_status": ready.status_code,
        "schema_version": ready_payload.get("storage", {}).get("schema_version"),
        "mode": ready_payload.get("mode"),
        "topology": ready_payload.get("topology"),
        "debug_status": debug.status_code,
        "ops_missing_status": ops_missing.status_code,
        "ops_wrong_status": ops_wrong.status_code,
        "ops_authorized_status": 200 if ops_payload is not None else None,
        "ops_snapshot": (
            {
                "live_rooms": ops_payload.get("live_rooms"),
                "finished_rooms": ops_payload.get("finished_rooms"),
                "scheduler_tasks": ops_payload.get("scheduler_tasks"),
                "scheduler_callbacks_inflight": ops_payload.get(
                    "scheduler_callbacks_inflight"
                ),
                "scheduler_callback_errors_total": ops_payload.get(
                    "scheduler_callback_errors_total"
                ),
                "waiting_lobbies": ops_payload.get("waiting_lobbies"),
                "battle_command_handlers_inflight": ops_payload.get(
                    "battle_command_handlers_inflight"
                ),
                "accepting_new_matches": ops_payload.get("accepting_new_matches"),
                "analytics_outbox_size": ops_payload.get("analytics_outbox_size"),
                "analytics_outbox_dropped_total": ops_payload.get(
                    "analytics_outbox_dropped_total"
                ),
                "mission_snapshot_retry_rooms": ops_payload.get("mission_snapshot_retry_rooms"),
                "terminal_persistence_pending_rooms": ops_payload.get(
                    "terminal_persistence_pending_rooms"
                ),
                "mission_settlements": ops_payload.get("mission_settlements"),
                "mission_settlement_fallback_pending": ops_payload.get(
                    "mission_settlement_fallback_pending"
                ),
                "mission_settlement_dead_lettered_total": ops_payload.get(
                    "mission_settlement_dead_lettered_total"
                ),
            }
            if ops_payload is not None
            else None
        ),
    }


def activate_runtime_drain(base_url: str, *, ops_token: str) -> dict[str, Any]:
    """Enable the protected new-match gate and prompt bounded persistence work."""

    with requests.Session() as session:
        session.trust_env = False
        response = session.post(
            f"{base_url}/ops/drain",
            headers={"Authorization": f"Bearer {ops_token}"},
            json={"draining": True},
            timeout=DEFAULT_EVENT_TIMEOUT,
        )
    if response.status_code != 200:
        raise AcceptanceError(
            f"drain activation returned {response.status_code}: {response.text!r}"
        )
    payload = response.json()
    if payload.get("accepting_new_matches") is not False:
        raise AcceptanceError(f"drain activation did not close new matches: {payload!r}")
    maintenance = payload.get("maintenance")
    if not isinstance(maintenance, dict) or maintenance.get("ok") is not True:
        raise AcceptanceError(f"drain persistence maintenance failed: {maintenance!r}")
    return payload


def run_http_load(
    base_url: str,
    *,
    request_count: int,
    concurrency: int,
) -> dict[str, Any]:
    """Run a bounded endpoint correctness ramp and return latency/error evidence."""

    if request_count < 1:
        raise ValueError("request_count must be positive")
    if concurrency < 1:
        raise ValueError("concurrency must be positive")
    worker_count = min(request_count, concurrency)

    def request_once(index: int) -> float:
        endpoint = "/healthz" if index % 2 == 0 else "/readyz"
        started = time.perf_counter()
        with requests.Session() as session:
            session.trust_env = False
            response = session.get(f"{base_url}{endpoint}", timeout=DEFAULT_EVENT_TIMEOUT)
        elapsed_ms = (time.perf_counter() - started) * 1000.0
        if response.status_code != 200:
            raise AcceptanceError(f"{endpoint} returned {response.status_code}")
        payload = response.json()
        expected_status = "ok" if endpoint == "/healthz" else "ready"
        if payload.get("status") != expected_status:
            raise AcceptanceError(f"{endpoint} returned status {payload.get('status')!r}")
        return elapsed_ms

    started = time.perf_counter()
    latencies: list[float] = []
    errors: list[str] = []
    with ThreadPoolExecutor(max_workers=worker_count) as pool:
        futures = [pool.submit(request_once, index) for index in range(request_count)]
        for future in as_completed(futures):
            try:
                latencies.append(future.result())
            except Exception as exc:
                errors.append(str(exc))
    elapsed = time.perf_counter() - started
    if errors:
        raise AcceptanceError(
            f"bounded HTTP load had {len(errors)} errors; first errors={errors[:5]!r}"
        )
    ordered = sorted(latencies)

    def percentile(value: float) -> float:
        index = max(0, math.ceil(value * len(ordered)) - 1)
        return round(ordered[index], 3)

    return {
        "requests": request_count,
        "concurrency": worker_count,
        "errors": 0,
        "elapsed_seconds": round(elapsed, 3),
        "requests_per_second": round(request_count / elapsed, 3),
        "latency_ms": {
            "p50": percentile(0.50),
            "p95": percentile(0.95),
            "p99": percentile(0.99),
            "max": round(ordered[-1], 3),
        },
    }


def run_safe_stop_gate_flow(base_url: str) -> dict[str, Any]:
    """Confirm the safe-stop drain gate reports ready once the server is idle.

    Runs last, after every other scenario's matches have finished and
    disconnected, so this is a real end-to-end check that
    `/ops/safe_stop` (docs/production_runbook.md, "Safe-Stop Drain Gate")
    actually reaches `safe_to_stop: true` -- not just that the pure decision
    function is correct in isolation.
    """

    headers = {"Authorization": f"Bearer {NETWORK_ACCEPTANCE_OPS_TOKEN}"}
    deadline = time.monotonic() + DEFAULT_EVENT_TIMEOUT
    last_payload: dict[str, Any] | None = None
    while time.monotonic() < deadline:
        response = requests.get(f"{base_url}/ops/safe_stop", headers=headers, timeout=DEFAULT_EVENT_TIMEOUT)
        if response.status_code == 200:
            last_payload = response.json()
            if last_payload.get("safe_to_stop") is True and not last_payload.get("blockers"):
                return {"status_code": response.status_code, **last_payload}
        else:
            last_payload = {"status_code": response.status_code, **response.json()}
        time.sleep(0.1)
    raise AcceptanceError(f"/ops/safe_stop never reached safe_to_stop=true: {last_payload!r}")


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
            "JJK_OPS_TOKEN": NETWORK_ACCEPTANCE_OPS_TOKEN,
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


def run_acceptance_against(
    base_url: str,
    *,
    planning_seconds: float,
    queue_review_seconds: float,
    ops_token: str | None = None,
    socket_origin: str | None = None,
    load_requests: int = 0,
    load_concurrency: int = 16,
    require_production: bool = False,
    drain_at_end: bool = False,
    require_drained: bool = False,
) -> dict[str, Any]:
    """Drive the complete contract against an already-running server."""

    normalized_url = base_url.rstrip("/")
    run_id = f"accept-{uuid.uuid4().hex[:12]}"
    report = {
        "base_url": normalized_url,
        "run_id": run_id,
        "http_before": run_http_contract(
            normalized_url,
            ops_token=ops_token,
            require_production=require_production,
        ),
        "cpu": run_cpu_flow(
            normalized_url,
            socket_origin=socket_origin,
            run_id=run_id,
        ),
        "pvp": run_pvp_resume_flow(
            normalized_url,
            socket_origin=socket_origin,
            run_id=run_id,
        ),
        "timeout": run_timeout_flow(
            normalized_url,
            planning_seconds=planning_seconds,
            socket_origin=socket_origin,
            run_id=run_id,
        ),
        "queue_timeout": run_queue_timeout_flow(
            normalized_url,
            queue_review_seconds=queue_review_seconds,
            socket_origin=socket_origin,
            run_id=run_id,
        ),
    }
    if load_requests:
        report["load"] = run_http_load(
            normalized_url,
            request_count=load_requests,
            concurrency=load_concurrency,
        )
    if drain_at_end:
        if not ops_token:
            raise AcceptanceError("drain activation requires JJK_OPS_TOKEN")
        report["drain"] = activate_runtime_drain(normalized_url, ops_token=ops_token)
    report["http_after"] = run_http_contract(
        normalized_url,
        ops_token=ops_token,
        require_production=require_production,
        require_drained=require_drained,
    )
    return report


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
                report = run_acceptance_against(
                    base_url,
                    planning_seconds=planning_seconds,
                    queue_review_seconds=queue_review_seconds,
                    ops_token=NETWORK_ACCEPTANCE_OPS_TOKEN,
                    drain_at_end=True,
                    require_drained=True,
                )
                # Run last: every scenario's matches, and the drain-at-end
                # activation above, have already completed, so this proves
                # the safe-stop gate reaches a real go decision once the
                # server is genuinely idle -- via a different endpoint than
                # the raw /ops/runtime field checks `run_acceptance_against`
                # already performed.
                report["safe_stop"] = run_safe_stop_gate_flow(base_url)
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
    parser.add_argument(
        "--base-url",
        help="drive an already-running Gunicorn/candidate server instead of starting Werkzeug",
    )
    parser.add_argument(
        "--socket-origin",
        help="explicit browser Origin header accepted by the candidate CORS policy",
    )
    parser.add_argument("--load-requests", type=int, default=0)
    parser.add_argument("--load-concurrency", type=int, default=16)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.serve:
        if not 1 <= args.port <= 65535:
            raise SystemExit("--serve requires a valid --port")
        serve(args.port, args.planning_seconds, args.queue_review_seconds)
        return 0
    if args.planning_seconds < 1.0 or args.queue_review_seconds < 1.0:
        raise SystemExit("acceptance timer values must be at least one second")
    if args.base_url:
        ops_token = os.getenv("JJK_OPS_TOKEN", "").strip()
        if not ops_token:
            raise SystemExit("external candidate acceptance requires JJK_OPS_TOKEN in the environment")
        if not args.socket_origin or "," in args.socket_origin:
            raise SystemExit("external candidate acceptance requires one explicit --socket-origin")
        report = run_acceptance_against(
            args.base_url,
            planning_seconds=args.planning_seconds,
            queue_review_seconds=args.queue_review_seconds,
            ops_token=ops_token,
            socket_origin=args.socket_origin,
            load_requests=args.load_requests,
            load_concurrency=args.load_concurrency,
            require_production=True,
            drain_at_end=True,
            require_drained=True,
        )
    else:
        report = run_network_acceptance(
            planning_seconds=args.planning_seconds,
            queue_review_seconds=args.queue_review_seconds,
        )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
