import json
import os
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

from web import app as web_app
from jjk_arena.battle_v2.models import BattlePhase


ROOT = Path(__file__).resolve().parents[1]

_REAL_GUNICORN_CONFIG_PROBE = r"""
import json
import os
import sys
import types

# Gunicorn is POSIX-only, but its configuration resolver is still testable on
# Windows with import-time platform shims. Production launches use unmodified
# Gunicorn; these shims exist only inside this short-lived test subprocess.
if os.name == "nt":
    for name in ("geteuid", "getegid", "getuid", "getgid"):
        if not hasattr(os, name):
            setattr(os, name, lambda: 0)
    for module_name in ("fcntl", "grp", "pwd"):
        sys.modules.setdefault(module_name, types.ModuleType(module_name))
    arbiter_module = types.ModuleType("gunicorn.arbiter")
    arbiter_module.Arbiter = object
    sys.modules["gunicorn.arbiter"] = arbiter_module

from gunicorn.app.wsgiapp import WSGIApplication

application = WSGIApplication("gunicorn-config-probe")
for key, value in application.cfg.env.items():
    os.environ[key] = value
application.cfg.on_starting(types.SimpleNamespace(cfg=application.cfg))
print(json.dumps({
    "workers": application.cfg.workers,
    "worker_class": application.cfg.worker_class_str,
    "threads": application.cfg.threads,
}))
"""


def gunicorn_environment(**overrides: str | None) -> dict[str, str]:
    environment = {
        **os.environ,
        "JJK_PRODUCTION": "1",
        "JJK_SOCKETIO_ASYNC_MODE": "threading",
        "JJK_WEB_THREADS": "8",
        "JJK_WEB_WORKERS": "1",
    }
    environment.pop("GUNICORN_CMD_ARGS", None)
    for key, value in overrides.items():
        if value is None:
            environment.pop(key, None)
        else:
            environment[key] = value
    return environment


def run_real_gunicorn_config(
    *arguments: str,
    gunicorn_cmd_args: str | None = None,
) -> subprocess.CompletedProcess[str]:
    environment = gunicorn_environment()
    if gunicorn_cmd_args is not None:
        environment["GUNICORN_CMD_ARGS"] = gunicorn_cmd_args
    return subprocess.run(
        [
            sys.executable,
            "-c",
            _REAL_GUNICORN_CONFIG_PROBE,
            "-c",
            "gunicorn.conf.py",
            "web.app:app",
            *arguments,
        ],
        cwd=ROOT,
        env=environment,
        text=True,
        capture_output=True,
    )


def configure_valid_production(monkeypatch):
    monkeypatch.setattr(web_app, "PRODUCTION_MODE", True)
    monkeypatch.setattr(web_app, "DEBUG_MODE", False)
    monkeypatch.setattr(web_app, "configured_secret", "s" * 32)
    monkeypatch.setattr(web_app, "configured_cors_origins", "https://candidate.test")
    monkeypatch.setattr(web_app, "CORS_ORIGINS", ["https://candidate.test"])
    monkeypatch.setattr(web_app, "WEB_WORKERS", 1)
    monkeypatch.setattr(web_app, "SOCKETIO_ASYNC_MODE", "threading")
    monkeypatch.setenv("JJK_OPS_TOKEN", "o" * 32)
    monkeypatch.setenv("JJK_DATABASE_PATH", str(web_app.runtime_store.path))


def test_health_and_readiness_expose_no_room_or_player_data():
    client = web_app.app.test_client()
    health = client.get("/healthz")
    ready = client.get("/readyz")

    assert health.status_code == 200
    assert health.get_json() == {"service": "jjk-arena", "status": "ok"}
    assert ready.status_code == 200
    assert ready.get_json()["topology"] == "single-authority-worker"
    assert "players" not in ready.get_data(as_text=True)
    assert health.headers["X-Content-Type-Options"] == "nosniff"
    assert health.headers["X-Frame-Options"] == "DENY"
    assert "frame-ancestors 'none'" in health.headers["Content-Security-Policy"]


def test_readiness_fails_closed_for_ephemeral_production_secret(monkeypatch):
    monkeypatch.setattr(web_app, "PRODUCTION_MODE", True)
    monkeypatch.setattr(web_app, "configured_secret", None)
    response = web_app.app.test_client().get("/readyz")

    assert response.status_code == 503
    assert "FLASK_SECRET_KEY" in " ".join(response.get_json()["issues"])


def test_valid_production_configuration_has_no_readiness_issues(monkeypatch):
    configure_valid_production(monkeypatch)

    assert web_app.production_readiness_issues() == []


def test_production_readiness_rejects_missing_or_shared_ops_token(monkeypatch):
    configure_valid_production(monkeypatch)
    monkeypatch.delenv("JJK_OPS_TOKEN")
    assert "JJK_OPS_TOKEN must be configured in production" in web_app.production_readiness_issues()

    monkeypatch.setenv("JJK_OPS_TOKEN", "s" * 32)
    assert "JJK_OPS_TOKEN must be distinct from FLASK_SECRET_KEY" in web_app.production_readiness_issues()


def test_production_readiness_rejects_short_ops_token(monkeypatch):
    configure_valid_production(monkeypatch)
    monkeypatch.setenv("JJK_OPS_TOKEN", "too-short")

    assert (
        "JJK_OPS_TOKEN must contain at least 32 characters in production"
        in web_app.production_readiness_issues()
    )


def test_production_readiness_rejects_example_placeholders(monkeypatch):
    configure_valid_production(monkeypatch)
    monkeypatch.setattr(web_app, "configured_secret", web_app.EXAMPLE_SECRET)
    monkeypatch.setenv("JJK_OPS_TOKEN", web_app.EXAMPLE_OPS_TOKEN)
    monkeypatch.setattr(web_app, "configured_cors_origins", web_app.EXAMPLE_CORS_ORIGIN)
    monkeypatch.setattr(web_app, "CORS_ORIGINS", [web_app.EXAMPLE_CORS_ORIGIN])

    issues = web_app.production_readiness_issues()

    assert "FLASK_SECRET_KEY must not use the .env.example placeholder" in issues
    assert "JJK_OPS_TOKEN must not use the .env.example placeholder" in issues
    assert "JJK_CORS_ORIGINS must not use the .env.example origin" in issues


def test_production_readiness_rejects_debug_and_wrong_socket_mode(monkeypatch):
    configure_valid_production(monkeypatch)
    monkeypatch.setattr(web_app, "DEBUG_MODE", True)
    monkeypatch.setattr(web_app, "SOCKETIO_ASYNC_MODE", "eventlet")

    issues = web_app.production_readiness_issues()

    assert "JJK_DEBUG must remain disabled in production" in issues
    assert "JJK_SOCKETIO_ASYNC_MODE must remain threading in production" in issues
    assert web_app.app.test_client().get("/debug-state").status_code == 404


def test_local_socket_cors_defaults_follow_the_configured_bind_port():
    assert web_app.resolve_cors_origins(
        None,
        "127.0.0.1",
        5017,
        production_mode=False,
    ) == [
        "http://127.0.0.1:5017",
        "http://localhost:5017",
    ]
    assert web_app.resolve_cors_origins(
        None,
        "0.0.0.0",
        6400,
        production_mode=False,
    ) == [
        "http://127.0.0.1:6400",
        "http://localhost:6400",
    ]


def test_app_initialization_uses_custom_port_for_default_socket_cors(tmp_path):
    env = {**os.environ}
    env.pop("JJK_CORS_ORIGINS", None)
    env.update({
        "JJK_PRODUCTION": "0",
        "JJK_HOST": "127.0.0.1",
        "JJK_PORT": "5017",
        "JJK_DATABASE_PATH": str(tmp_path / "cors-runtime.sqlite3"),
    })
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            (
                "import json; from web import app as web_app; "
                "print(json.dumps({'port': web_app.PORT, 'origins': web_app.CORS_ORIGINS, "
                "'socket_origins': web_app.socketio.server.eio.cors_allowed_origins}))"
            ),
        ],
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
        check=True,
    )

    assert json.loads(result.stdout.strip().splitlines()[-1]) == {
        "port": 5017,
        "origins": ["http://127.0.0.1:5017", "http://localhost:5017"],
        "socket_origins": ["http://127.0.0.1:5017", "http://localhost:5017"],
    }


def test_explicit_socket_cors_origins_are_trimmed_and_deduplicated():
    assert web_app.resolve_cors_origins(
        " https://arena.example,https://arena.example, https://admin.example ",
        "127.0.0.1",
        5017,
        production_mode=True,
    ) == ["https://arena.example", "https://admin.example"]


def test_production_socket_cors_has_no_implicit_http_fallback(monkeypatch):
    assert web_app.resolve_cors_origins(
        None,
        "127.0.0.1",
        5017,
        production_mode=True,
    ) == []

    monkeypatch.setattr(web_app, "PRODUCTION_MODE", True)
    monkeypatch.setattr(web_app, "configured_secret", "s" * 32)
    monkeypatch.setattr(web_app, "configured_cors_origins", "   ")
    monkeypatch.setattr(web_app, "CORS_ORIGINS", [])
    monkeypatch.setenv("JJK_DATABASE_PATH", str(web_app.runtime_store.path))
    issues = web_app.production_readiness_issues()

    assert "JJK_CORS_ORIGINS must be explicitly configured in production" in issues


def test_production_readiness_still_requires_explicit_https_cors(monkeypatch):
    monkeypatch.setattr(web_app, "PRODUCTION_MODE", True)
    monkeypatch.setattr(web_app, "configured_secret", "s" * 32)
    monkeypatch.setattr(web_app, "configured_cors_origins", "http://arena.example")
    monkeypatch.setattr(web_app, "CORS_ORIGINS", ["http://arena.example"])
    monkeypatch.setenv("JJK_DATABASE_PATH", str(web_app.runtime_store.path))

    issues = web_app.production_readiness_issues()

    assert "JJK_CORS_ORIGINS must contain only explicit HTTPS origins in production" in issues


@pytest.mark.parametrize(
    "origin",
    [
        "https://",
        "https://arena.example/path",
        "https://arena.example/",
        "https://user:password@arena.example",
        "https://arena.example?query=yes",
        "https://arena.example#fragment",
        "https://*.arena.example",
        "https://arena.example:",
        "https://arena.example:99999",
    ],
)
def test_production_readiness_rejects_urls_that_are_not_exact_origins(monkeypatch, origin):
    configure_valid_production(monkeypatch)
    monkeypatch.setattr(web_app, "configured_cors_origins", origin)
    monkeypatch.setattr(web_app, "CORS_ORIGINS", [origin])

    assert (
        "JJK_CORS_ORIGINS must contain only explicit HTTPS origins in production"
        in web_app.production_readiness_issues()
    )


def test_readyz_healthchecks_storage_once_and_reports_runtime_mode(monkeypatch):
    calls = []
    monkeypatch.setattr(
        web_app.runtime_store,
        "healthcheck",
        lambda: calls.append(True) or {"ok": True, "schema_version": 6},
    )

    payload = web_app.app.test_client().get("/readyz").get_json()

    assert calls == [True]
    assert payload["mode"] == "development"


def test_ops_runtime_is_hidden_without_configured_bearer(monkeypatch):
    monkeypatch.delenv("JJK_OPS_TOKEN", raising=False)
    client = web_app.app.test_client()
    assert client.get("/ops/runtime").status_code == 404

    monkeypatch.setenv("JJK_OPS_TOKEN", "secret-token")
    assert client.get("/ops/runtime").status_code == 404
    response = client.get("/ops/runtime", headers={"Authorization": "Bearer secret-token"})
    assert response.status_code == 200
    assert set(response.get_json()) == {
        "active_rooms", "live_rooms", "finished_rooms", "scheduler_tasks", "waiting_lobbies",
        "accepting_new_matches", "mission_snapshot_retry_rooms",
        "rate_limit_keys", "counters", "analytics",
        "analytics_outbox_size", "analytics_outbox_dropped_total",
        "mission_settlements", "mission_settlement_dead_lettered_total",
        "mission_settlement_claimed_total",
    }
    assert set(response.get_json()["analytics"]) == {"match_finished", "missions_completed"}
    # Aggregate counts only: no raw queued-event payloads are ever exposed.
    assert isinstance(response.get_json()["analytics_outbox_size"], int)
    assert isinstance(response.get_json()["analytics_outbox_dropped_total"], int)


def test_ops_drain_cancels_waiting_lobbies_and_rejects_new_cpu_or_pvp_matches(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    monkeypatch.setenv("JJK_OPS_TOKEN", "o" * 32)
    http_client = web_app.app.test_client()
    with http_client.session_transaction() as session_data:
        session_data["player_id"] = "drain-waiter"
    socket_client = web_app.socketio.test_client(
        web_app.app,
        flask_test_client=http_client,
    )
    socket_client.emit(
        "battle_v2_join_pvp",
        {"room_id": "drain-lobby", "player_name": "Waiter"},
    )
    socket_client.get_received()

    unauthorized = http_client.post("/ops/drain", json={"draining": True})
    drained = http_client.post(
        "/ops/drain",
        json={"draining": True},
        headers={"Authorization": f"Bearer {'o' * 32}"},
    )
    cancellation = socket_client.get_received()

    assert unauthorized.status_code == 404
    assert drained.status_code == 200
    assert drained.get_json()["accepting_new_matches"] is False
    assert drained.get_json()["cancelled_lobbies"] == 1
    assert any(
        message["name"] == "battle_v2_lobby"
        and message["args"][0]["status"] == "cancelled"
        for message in cancellation
    )
    assert web_app.v2_pvp_lobbies == {}
    assert web_app.waiting_code_by_player == {}

    socket_client.emit("battle_v2_start_classic", {"room_id": "drained-cpu"})
    cpu_rejection = socket_client.get_received()
    socket_client.emit("battle_v2_join_pvp", {"room_id": "drained-pvp"})
    pvp_rejection = socket_client.get_received()
    assert any(
        message["name"] == "battle_v2_error"
        and "maintenance" in message["args"][0]["message"]
        for message in cpu_rejection
    )
    assert any(
        message["name"] == "battle_v2_error"
        and "maintenance" in message["args"][0]["message"]
        for message in pvp_rejection
    )
    assert web_app.battle_v2_manager.rooms == {}


def test_ops_drain_rejects_new_rematches_but_allows_release(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    monkeypatch.setenv("JJK_OPS_TOKEN", "o" * 32)
    http_client = web_app.app.test_client()
    with http_client.session_transaction() as session_data:
        session_data["player_id"] = "drain-rematch-player"
    socket_client = web_app.socketio.test_client(
        web_app.app,
        flask_test_client=http_client,
    )
    socket_client.emit("battle_v2_start_classic", {"room_id": "drain-rematch"})
    update = next(
        message["args"][0]
        for message in reversed(socket_client.get_received())
        if message["name"] == "battle_v2_update"
    )
    socket_client.emit(
        "battle_v2_surrender",
        {
            "state_revision": update["state_revision"],
            "client_action_nonce": "drain-rematch-surrender",
        },
    )
    finished_update = next(
        message["args"][0]
        for message in reversed(socket_client.get_received())
        if message["name"] == "battle_v2_update"
    )
    http_client.post(
        "/ops/drain",
        json={"draining": True},
        headers={"Authorization": f"Bearer {'o' * 32}"},
    )

    socket_client.emit(
        "battle_v2_rematch",
        {
            "old_match_id": finished_update["match_id"],
            "state_revision": finished_update["state_revision"],
            "client_action_nonce": "drained-rematch-attempt",
        },
    )
    rejection = socket_client.get_received()
    assert any(
        message["name"] == "battle_v2_error"
        and "maintenance" in message["args"][0]["message"]
        for message in rejection
    )

    released = http_client.post(
        "/ops/drain",
        json={"draining": False},
        headers={"Authorization": f"Bearer {'o' * 32}"},
    )
    assert released.status_code == 200
    assert released.get_json()["accepting_new_matches"] is True


def test_ops_runtime_separates_live_and_retained_finished_rooms(monkeypatch):
    monkeypatch.setenv("JJK_OPS_TOKEN", "secret-token")
    web_app.battle_v2_manager.rooms["live-room"] = SimpleNamespace(phase=BattlePhase.PLANNING)
    web_app.battle_v2_manager.rooms["finished-room"] = SimpleNamespace(phase=BattlePhase.FINISHED)
    web_app.mission_snapshot_retry_rooms.add("finished-room")

    response = web_app.app.test_client().get(
        "/ops/runtime",
        headers={"Authorization": "Bearer secret-token"},
    )

    assert response.status_code == 200
    assert response.get_json()["active_rooms"] == 2
    assert response.get_json()["live_rooms"] == 1
    assert response.get_json()["finished_rooms"] == 1
    assert isinstance(response.get_json()["scheduler_tasks"], int)
    assert response.get_json()["mission_snapshot_retry_rooms"] == 1


def test_ops_runtime_analytics_reflects_a_finished_cpu_match(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    monkeypatch.setenv("JJK_OPS_TOKEN", "secret-token")
    http_client = web_app.app.test_client()
    socket_client = web_app.socketio.test_client(web_app.app, flask_test_client=http_client)

    socket_client.emit("battle_v2_start_classic", {"room_id": "ops-analytics-room", "difficulty": "normal"})
    updates = [message for message in socket_client.get_received() if message["name"] == "battle_v2_update"]
    match_id = updates[-1]["args"][0]["match_id"]
    state = web_app.battle_v2_manager.get_state(match_id)
    socket_client.emit(
        "battle_v2_surrender",
        {"state_revision": state.state_revision, "client_action_nonce": "ops-analytics-nonce"},
    )

    response = http_client.get("/ops/runtime", headers={"Authorization": "Bearer secret-token"})

    assert response.status_code == 200
    assert response.get_json()["analytics"]["match_finished"]["total"] >= 1


def test_stale_runtime_prunes_finished_rooms_lobbies_and_rate_limits(monkeypatch):
    room_id = "production-prune-room"
    lobby_id = "production-prune-lobby"
    web_app.battle_v2_manager.rooms[room_id] = SimpleNamespace(winner_id="p1")
    web_app.room_last_activity[room_id] = 0.0
    web_app.v2_pvp_lobbies[lobby_id] = [{"id": "p1"}]
    web_app.lobby_last_activity[lobby_id] = 0.0
    web_app.rate_limits[("p1", "event")].append(0.0)
    monkeypatch.setattr(web_app.runtime_store, "prune_expired_replays", lambda: 2)
    monkeypatch.setattr(web_app.runtime_store, "flush_outbox", lambda: 3)
    monkeypatch.setattr(web_app.runtime_store, "prune_old_analytics_events", lambda: 4)

    result = web_app.prune_stale_runtime(now=10_000.0)

    assert result == {
        "rooms": 1,
        "lobbies": 1,
        "rate_limits": 1,
        "replays": 2,
        "analytics_flushed": 3,
        "mission_settlements_flushed": 0,
        "mission_settlements_pruned": 0,
        "analytics_pruned": 4,
    }
    assert room_id not in web_app.battle_v2_manager.rooms
    assert lobby_id not in web_app.v2_pvp_lobbies


def test_terminal_room_cleanup_reconstructs_missing_player_settlement_rows(monkeypatch):
    room_id = "cleanup-settlement-reconstruction"
    web_app.battle_v2_manager.start_first_creation_match(room_id, [
        {"id": "cleanup-p1", "name": "P1", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
        {"id": "cleanup-p2", "name": "P2", "team": ["maki_zenin", "toge_inumaki", "panda"]},
    ])
    state = web_app.battle_v2_manager.get_state(room_id)
    state.phase = BattlePhase.FINISHED
    state.result_type = "WIN"
    state.winner_id = "cleanup-p1"
    captured = []
    monkeypatch.setattr(
        web_app.runtime_store,
        "enqueue_mission_settlement_durable",
        lambda match_id, player_id, progress, **_kwargs: captured.append(
            (match_id, player_id, progress)
        ) or "fallback",
    )

    assert web_app.remove_battle_v2_room(room_id) is True
    assert {(match_id, player_id) for match_id, player_id, _progress in captured} == {
        (room_id, "cleanup-p1"), (room_id, "cleanup-p2"),
    }
    assert all(isinstance(progress, dict) for _match_id, _player_id, progress in captured)
    assert room_id not in web_app.battle_v2_manager.rooms


def test_terminal_room_cleanup_refuses_removal_when_database_and_sidecar_both_fail(monkeypatch):
    room_id = "cleanup-settlement-both-paths-fail"
    web_app.battle_v2_manager.start_first_creation_match(room_id, [
        {"id": "cleanup-fail-p1", "name": "P1", "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]},
        {"id": "cleanup-fail-p2", "name": "P2", "team": ["maki_zenin", "toge_inumaki", "panda"]},
    ])
    state = web_app.battle_v2_manager.get_state(room_id)
    state.phase = BattlePhase.FINISHED
    state.result_type = "WIN"
    state.winner_id = "cleanup-fail-p1"
    monkeypatch.setattr(
        web_app.runtime_store,
        "enqueue_mission_settlement_durable",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(OSError("database and sidecar unavailable")),
    )

    assert web_app.remove_battle_v2_room(room_id) is False
    assert room_id in web_app.battle_v2_manager.rooms


def test_finished_update_recovers_initial_dual_snapshot_failure_without_duplicate_credit(monkeypatch):
    """A brief outage of both durable paths must recover before room cleanup."""

    monkeypatch.delenv("JJK_FIRST_CREATION_PROFILE_STORE", raising=False)
    room_id = "finished-update-total-snapshot-recovery"
    player_one = "finished-update-total-p1"
    player_two = "finished-update-total-p2"
    teams = {
        player_one: ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"],
        player_two: ["maki_zenin", "toge_inumaki", "panda"],
    }
    web_app.battle_v2_manager.start_first_creation_match(room_id, [
        {"id": player_one, "name": "P1", "team": teams[player_one]},
        {"id": player_two, "name": "P2", "team": teams[player_two]},
    ])
    state = web_app.battle_v2_manager.get_state(room_id)
    state.phase = BattlePhase.FINISHED
    state.result_type = "WIN"
    state.winner_id = player_one
    progress_by_player = {
        player_one: {
            "completed_ids": ["welcome"],
            "unlocked": ["mission_board"],
            "team": teams[player_one],
        },
        player_two: {
            "completed_ids": [],
            "unlocked": [],
            "team": teams[player_two],
        },
    }
    monkeypatch.setattr(
        web_app.battle_v2_manager,
        "mission_progress_for_player",
        lambda _room_id, player_id: progress_by_player[player_id],
    )
    durable_enqueue = web_app.runtime_store.enqueue_mission_settlement_durable
    monkeypatch.setattr(
        web_app.runtime_store,
        "enqueue_mission_settlement_durable",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(
            OSError("database and sidecar temporarily unavailable")
        ),
    )
    before = web_app.runtime_store.analytics_summary()["missions_completed"].get("welcome", 0)

    web_app.settle_first_creation_missions(room_id)

    assert room_id in web_app.mission_snapshot_retry_rooms
    assert room_id in web_app.battle_v2_manager.rooms
    assert not [
        row for row in web_app.runtime_store.mission_settlement_rows()
        if row["match_id"] == room_id
    ]

    monkeypatch.setattr(
        web_app.runtime_store,
        "enqueue_mission_settlement_durable",
        durable_enqueue,
    )
    with web_app.app.test_request_context():
        web_app.emit_battle_v2_update(room_id, player_one)
        web_app.emit_battle_v2_update(room_id, player_one)

    rows = [
        row for row in web_app.runtime_store.mission_settlement_rows()
        if row["match_id"] == room_id
    ]
    after = web_app.runtime_store.analytics_summary()["missions_completed"].get("welcome", 0)
    assert {(row["player_id"], row["status"]) for row in rows} == {
        (player_one, "settled"),
        (player_two, "settled"),
    }
    assert after - before == 1
    assert web_app.runtime_store.load_profile(player_one)["completed_missions"] == ["welcome"]
    assert room_id not in web_app.mission_snapshot_retry_rooms
    assert web_app.remove_battle_v2_room(room_id) is True


def test_finished_update_reconstructs_only_missing_player_after_partial_snapshot_failure(monkeypatch):
    """A mixed enqueue result must preserve success and retry only the gap."""

    monkeypatch.delenv("JJK_FIRST_CREATION_PROFILE_STORE", raising=False)
    room_id = "finished-update-partial-snapshot-recovery"
    player_one = "finished-update-partial-p1"
    player_two = "finished-update-partial-p2"
    teams = {
        player_one: ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"],
        player_two: ["maki_zenin", "toge_inumaki", "panda"],
    }
    web_app.battle_v2_manager.start_first_creation_match(room_id, [
        {"id": player_one, "name": "P1", "team": teams[player_one]},
        {"id": player_two, "name": "P2", "team": teams[player_two]},
    ])
    state = web_app.battle_v2_manager.get_state(room_id)
    state.phase = BattlePhase.FINISHED
    state.result_type = "WIN"
    state.winner_id = player_one
    monkeypatch.setattr(
        web_app.battle_v2_manager,
        "mission_progress_for_player",
        lambda _room_id, player_id: {
            "completed_ids": [],
            "unlocked": [],
            "team": teams[player_id],
        },
    )
    durable_enqueue = web_app.runtime_store.enqueue_mission_settlement_durable
    calls = []
    fail_second_player_once = {"value": True}

    def partially_failing_enqueue(match_id, player_id, progress, **kwargs):
        calls.append(player_id)
        if player_id == player_two and fail_second_player_once["value"]:
            fail_second_player_once["value"] = False
            raise OSError("database and sidecar temporarily unavailable")
        return durable_enqueue(match_id, player_id, progress, **kwargs)

    monkeypatch.setattr(
        web_app.runtime_store,
        "enqueue_mission_settlement_durable",
        partially_failing_enqueue,
    )

    web_app.settle_first_creation_missions(room_id)

    assert web_app.missions_snapshotted_players[room_id] == {player_one}
    assert room_id in web_app.mission_snapshot_retry_rooms
    with web_app.app.test_request_context():
        web_app.emit_battle_v2_update(room_id, player_one)
        web_app.emit_battle_v2_update(room_id, player_one)

    rows = [
        row for row in web_app.runtime_store.mission_settlement_rows()
        if row["match_id"] == room_id
    ]
    assert calls.count(player_one) == 1
    assert calls.count(player_two) == 2
    assert {(row["player_id"], row["status"]) for row in rows} == {
        (player_one, "settled"),
        (player_two, "settled"),
    }
    assert room_id not in web_app.mission_snapshot_retry_rooms
    assert web_app.remove_battle_v2_room(room_id) is True


def test_profile_read_force_drains_retryable_credit_without_socket_traffic(monkeypatch):
    monkeypatch.delenv("JJK_FIRST_CREATION_PROFILE_STORE", raising=False)
    match_id = "profile-read-recovery-match"
    player_id = "profile-read-recovery-player"
    progress = {
        "completed_ids": ["welcome"],
        "unlocked": ["mission_board"],
        "team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"],
    }
    web_app.runtime_store.enqueue_mission_settlement(match_id, player_id, progress)
    web_app.runtime_store.process_mission_settlements(
        lambda *_args: (_ for _ in ()).throw(RuntimeError("temporary write failure")),
        player_id=player_id,
    )
    assert next(
        row for row in web_app.runtime_store.mission_settlement_rows()
        if row["match_id"] == match_id
    )["status"] == "failed_retryable"

    profile = web_app.load_first_creation_profile_with_recovery(player_id)

    assert profile["completed_missions"] == ["welcome"]
    assert profile["unlocked"] == ["mission_board"]
    assert next(
        row for row in web_app.runtime_store.mission_settlement_rows()
        if row["match_id"] == match_id
    )["status"] == "settled"


def test_readiness_rejects_unsafe_authoritative_worker_count(monkeypatch):
    monkeypatch.setattr(web_app, "WEB_WORKERS", 2)
    issues = web_app.production_readiness_issues()
    assert any("must remain 1" in issue for issue in issues)


def test_finished_replay_is_archived_once_when_capture_is_opted_in(monkeypatch):
    room_id = "archive-once"
    saved = []
    manager = SimpleNamespace(
        rooms={room_id: SimpleNamespace(winner_id="p1")},
        replay_document=lambda requested: {"match_id": requested, "commands": []},
    )
    store = SimpleNamespace(save_replay=lambda replay, retention_days: saved.append((replay, retention_days)))
    monkeypatch.setattr(web_app, "CAPTURE_REPLAYS", True)
    monkeypatch.setattr(web_app, "REPLAY_RETENTION_DAYS", 14)
    monkeypatch.setattr(web_app, "battle_v2_manager", manager)
    monkeypatch.setattr(web_app, "runtime_store", store)
    web_app.archived_replays.discard(room_id)

    web_app.archive_finished_replay(room_id)
    web_app.archive_finished_replay(room_id)

    assert saved == [({"match_id": room_id, "commands": []}, 14)]
    web_app.archived_replays.discard(room_id)


def test_gunicorn_topology_fails_closed_above_one_worker():
    env = gunicorn_environment(JJK_WEB_WORKERS="2")
    result = subprocess.run(
        [sys.executable, "-c", "import runpy; runpy.run_path('gunicorn.conf.py')"],
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
    )
    assert result.returncode != 0
    assert "must be 1" in result.stderr


def test_gunicorn_launch_requires_explicit_production_mode():
    for configured_value in (None, "0", "production"):
        result = subprocess.run(
            [sys.executable, "-c", "import runpy; runpy.run_path('gunicorn.conf.py')"],
            cwd=ROOT,
            env=gunicorn_environment(JJK_PRODUCTION=configured_value),
            text=True,
            capture_output=True,
        )

        assert result.returncode != 0
        assert "JJK_PRODUCTION must be explicitly true" in result.stderr


def test_gunicorn_topology_accepts_exactly_one_threaded_worker():
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            (
                "import json, runpy; config=runpy.run_path('gunicorn.conf.py'); "
                "print(json.dumps({key: config[key] for key in "
                "('workers', 'worker_class', 'threads')}))"
            ),
        ],
        cwd=ROOT,
        env=gunicorn_environment(),
        text=True,
        capture_output=True,
        check=True,
    )

    assert json.loads(result.stdout) == {
        "workers": 1,
        "worker_class": "gthread",
        "threads": 8,
    }


def test_gunicorn_topology_rejects_non_threading_socket_mode():
    result = subprocess.run(
        [sys.executable, "-c", "import runpy; runpy.run_path('gunicorn.conf.py')"],
        cwd=ROOT,
        env=gunicorn_environment(JJK_SOCKETIO_ASYNC_MODE="eventlet"),
        text=True,
        capture_output=True,
    )

    assert result.returncode != 0
    assert "must be threading" in result.stderr


def test_real_gunicorn_resolution_accepts_supported_effective_topology():
    result = run_real_gunicorn_config()

    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout) == {
        "workers": 1,
        "worker_class": "gthread",
        "threads": 8,
    }


def test_real_gunicorn_resolution_rejects_cli_worker_override():
    result = run_real_gunicorn_config("--workers", "2")

    assert result.returncode != 0
    assert "Unsupported effective Gunicorn topology" in result.stderr
    assert "workers must be 1 (got 2)" in result.stderr


def test_real_gunicorn_resolution_rejects_environment_argument_overrides():
    result = run_real_gunicorn_config(
        gunicorn_cmd_args="--worker-class sync --threads 1"
    )

    assert result.returncode != 0
    assert "worker class must resolve to gthread" in result.stderr
    assert "threads must be at least 2 (got 1)" in result.stderr


def test_real_gunicorn_resolution_rejects_late_production_mode_override():
    result = run_real_gunicorn_config(
        gunicorn_cmd_args="--env JJK_PRODUCTION=0"
    )

    assert result.returncode != 0
    assert "JJK_PRODUCTION must be explicitly true" in result.stderr


def test_production_launch_surfaces_use_guarded_gunicorn_config():
    assert "gunicorn -c gunicorn.conf.py web.app:app" in (ROOT / "Procfile").read_text(encoding="utf-8")
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    assert '"gunicorn", "-c", "gunicorn.conf.py", "web.app:app"' in dockerfile
    assert "/readyz" in dockerfile
