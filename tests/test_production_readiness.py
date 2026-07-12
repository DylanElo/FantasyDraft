from types import SimpleNamespace
import os
import subprocess
import sys
from pathlib import Path

from web import app as web_app


ROOT = Path(__file__).resolve().parents[1]


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


def test_ops_runtime_is_hidden_without_configured_bearer(monkeypatch):
    monkeypatch.delenv("JJK_OPS_TOKEN", raising=False)
    client = web_app.app.test_client()
    assert client.get("/ops/runtime").status_code == 404

    monkeypatch.setenv("JJK_OPS_TOKEN", "secret-token")
    assert client.get("/ops/runtime").status_code == 404
    response = client.get("/ops/runtime", headers={"Authorization": "Bearer secret-token"})
    assert response.status_code == 200
    assert set(response.get_json()) == {"active_rooms", "waiting_lobbies", "rate_limit_keys", "counters"}


def test_stale_runtime_prunes_finished_rooms_lobbies_and_rate_limits(monkeypatch):
    room_id = "production-prune-room"
    lobby_id = "production-prune-lobby"
    web_app.battle_v2_manager.rooms[room_id] = SimpleNamespace(winner_id="p1")
    web_app.room_last_activity[room_id] = 0.0
    web_app.v2_pvp_lobbies[lobby_id] = [{"id": "p1"}]
    web_app.lobby_last_activity[lobby_id] = 0.0
    web_app.rate_limits[("p1", "event")].append(0.0)
    monkeypatch.setattr(web_app.runtime_store, "prune_expired_replays", lambda: 2)

    result = web_app.prune_stale_runtime(now=10_000.0)

    assert result == {"rooms": 1, "lobbies": 1, "rate_limits": 1, "replays": 2}
    assert room_id not in web_app.battle_v2_manager.rooms
    assert lobby_id not in web_app.v2_pvp_lobbies


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
    env = {**os.environ, "JJK_WEB_WORKERS": "2"}
    result = subprocess.run(
        [sys.executable, "-c", "import runpy; runpy.run_path('gunicorn.conf.py')"],
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
    )
    assert result.returncode != 0
    assert "must be 1" in result.stderr


def test_production_launch_surfaces_use_guarded_gunicorn_config():
    assert "gunicorn -c gunicorn.conf.py web.app:app" in (ROOT / "Procfile").read_text(encoding="utf-8")
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    assert '"gunicorn", "-c", "gunicorn.conf.py", "web.app:app"' in dockerfile
    assert "/readyz" in dockerfile
