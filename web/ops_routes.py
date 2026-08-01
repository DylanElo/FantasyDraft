"""Operator-facing routes for web/app.py: token-gated drain/runtime/safe-stop.

Extracted as part of that file's split (see docs/audit_ledger.md). Same rule
as web/health_routes.py: every reference to app.py-owned state goes through
`app_module.NAME`, never a bare `from web.app import NAME` -- this module
also *writes* `app_module.accepting_new_matches`, which is the one landmine
that blocked this slice earlier. A bare `global accepting_new_matches`
inside a function defined in *this* file would only rebind a name in this
module's namespace, not web.app's actual attribute, silently breaking every
other reader of `web_app.accepting_new_matches` (several socket handlers
still living in app.py check it directly). Assigning
`app_module.accepting_new_matches = ...` instead mutates the real attribute
on the shared module object, which is what every reader actually sees.
"""

from __future__ import annotations

import os
import secrets

from flask import abort, jsonify, request

from jjk_arena.battle_v2.safe_stop import evaluate_safe_stop
from web.validation import player_room

import web.app as app_module


def _require_ops_token() -> None:
    token = os.getenv("JJK_OPS_TOKEN", "").strip()
    supplied = request.headers.get("Authorization", "")
    if not token or not secrets.compare_digest(supplied, f"Bearer {token}"):
        abort(404)


def _drain_storage_maintenance() -> dict:
    """Make one bounded, operator-triggered attempt to persist deferred work."""

    results = {
        "mission_snapshots_reconstructed": 0,
        "terminal_persistence_completed": 0,
        "mission_settlements_flushed": 0,
        "analytics_outbox_flushed": 0,
        "ok": True,
    }
    terminal_room_ids = [
        room_id
        for room_id, state in list(app_module.battle_v2_manager.rooms.items())
        if getattr(getattr(state, "phase", None), "value", None) == "finished"
        and app_module.terminal_persistence_pending(room_id, state=state)
    ][:50]
    for room_id in terminal_room_ids:
        was_pending = app_module.terminal_persistence_pending(room_id)
        try:
            completed = app_module.ensure_terminal_persistence(room_id)
        except Exception:
            completed = False
        if completed and was_pending:
            results["terminal_persistence_completed"] += 1
        elif not completed:
            results["ok"] = False
            app_module.operational_counters["drain_storage_errors"] += 1
    try:
        results["mission_snapshots_reconstructed"] = app_module.reconstruct_terminal_mission_snapshots(
            limit=max(50, len(app_module.mission_snapshot_retry_rooms)),
        )
    except Exception:
        results["ok"] = False
        app_module.operational_counters["drain_storage_errors"] += 1
    try:
        results["mission_settlements_flushed"] = len(
            app_module.flush_mission_settlements(force_due=True)
        )
    except Exception:
        results["ok"] = False
        app_module.operational_counters["drain_storage_errors"] += 1
    try:
        results["analytics_outbox_flushed"] = app_module.runtime_store.flush_outbox()
    except Exception:
        results["ok"] = False
        app_module.operational_counters["drain_storage_errors"] += 1
    return results


@app_module.app.route("/ops/drain", methods=["POST"])
def runtime_drain():
    """Atomically gate new matches and make deferred persistence observable."""

    _require_ops_token()
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or type(payload.get("draining")) is not bool:
        return jsonify({"error": "draining must be a boolean"}), 400

    cancelled_lobbies: list[tuple[str, list[dict]]] = []
    with app_module.lifecycle_lock:
        app_module.accepting_new_matches = not payload["draining"]
        if payload["draining"]:
            cancelled_lobbies = [
                (room_id, [dict(entry) for entry in entries])
                for room_id, entries in app_module.v2_pvp_lobbies.items()
            ]
            app_module.v2_pvp_lobbies.clear()
            app_module.waiting_code_by_player.clear()
            app_module.lobby_last_activity.clear()
            app_module.operational_counters["drain_activations"] += 1
            app_module.operational_counters["drain_lobbies_cancelled"] += len(cancelled_lobbies)
        else:
            app_module.operational_counters["drain_releases"] += 1

    for room_id, entries in cancelled_lobbies:
        for entry in entries:
            app_module.socketio.emit(
                "battle_v2_lobby",
                {
                    "room_id": room_id,
                    "status": "cancelled",
                    "message": app_module.NEW_MATCHES_DRAINED_MESSAGE,
                    "players": [],
                },
                room=player_room(entry["id"]),
            )

    maintenance = _drain_storage_maintenance() if payload["draining"] else None
    return jsonify(
        {
            "accepting_new_matches": app_module.accepting_new_matches,
            "cancelled_lobbies": len(cancelled_lobbies),
            "maintenance": maintenance,
        }
    )


@app_module.app.route("/ops/runtime")
def runtime_status():
    _require_ops_token()
    with app_module.lifecycle_lock:
        # Materialize room objects once. Cleanup can finish on another socket
        # thread, so repeated dictionary iteration/lookups could otherwise
        # raise or mix counts from two lifecycle instants.
        room_items = list(app_module.battle_v2_manager.rooms.items())
        active_rooms = len(room_items)
        live_rooms = sum(
            1
            for _room_id, state in room_items
            if getattr(getattr(state, "phase", None), "value", None) != "finished"
        )
        finished_rooms = active_rooms - live_rooms
        terminal_persistence_pending_rooms = sum(
            1
            for room_id, state in room_items
            if app_module.terminal_persistence_pending(room_id, state=state)
        )
        waiting_lobbies = len(app_module.v2_pvp_lobbies)
        snapshot_retry_rooms = len(app_module.mission_snapshot_retry_rooms)
        accepting_matches = app_module.accepting_new_matches
    # Per-room aggregates: never a single global in-flight flag, so an
    # unrelated busy room can never make this snapshot (or the safe-stop
    # gate) look busier than it actually is for a specific room.
    command_handlers_inflight = app_module.battle_v2_manager.in_flight_command_total()
    mission_settlement_snapshot = app_module.runtime_store.mission_settlement_counts()
    analytics_outbox_size = app_module.runtime_store.outbox_size()
    return jsonify(
        {
            "active_rooms": active_rooms,
            "live_rooms": live_rooms,
            "finished_rooms": finished_rooms,
            "scheduler_tasks": app_module.battle_v2_timer_scheduler.active_task_count(),
            "scheduler_callbacks_inflight": app_module.battle_v2_timer_scheduler.in_flight_total(),
            "scheduler_callback_errors_total": app_module.battle_v2_timer_scheduler.callback_errors_total,
            "waiting_lobbies": waiting_lobbies,
            "battle_command_handlers_inflight": command_handlers_inflight,
            "accepting_new_matches": accepting_matches,
            "mission_snapshot_retry_rooms": snapshot_retry_rooms,
            "terminal_persistence_pending_rooms": terminal_persistence_pending_rooms,
            "rate_limit_keys": len(app_module.rate_limits),
            "counters": dict(app_module.operational_counters),
            "analytics": app_module.runtime_store.analytics_summary(),
            # Aggregate counts only -- never the queued events themselves.
            "analytics_outbox_size": analytics_outbox_size,
            "analytics_outbox_dropped_total": app_module.runtime_store.outbox_dropped_total,
            "mission_settlements": mission_settlement_snapshot,
            "mission_settlement_dead_lettered_total": app_module.runtime_store.mission_settlement_dead_lettered_total,
            "mission_settlement_claimed_total": app_module.runtime_store.mission_settlement_claimed_total,
        }
    )


@app_module.app.route("/ops/safe_stop")
def safe_stop():
    """Go/no-go for stopping the one authoritative worker (see production_runbook.md).

    Hidden the same way as `/ops/runtime`: this reports whether it is safe to
    drain, never room/player data, but still requires the ops token so an
    unauthenticated caller cannot use it to fingerprint operational state.
    """

    _require_ops_token()
    decision = evaluate_safe_stop(
        analytics_outbox_dropped_total=app_module.runtime_store.outbox_dropped_total,
        mission_settlement_counts=app_module.runtime_store.mission_settlement_counts(),
        in_flight_commands=app_module.battle_v2_manager.in_flight_command_total(),
        in_flight_scheduler_callbacks=app_module.battle_v2_timer_scheduler.in_flight_total(),
    )
    return jsonify(decision.as_dict()), 200 if decision.ready else 503
