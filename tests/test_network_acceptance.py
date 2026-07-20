import pytest

from tools.network_acceptance import (
    AcceptanceError,
    SocketProbe,
    _assert_runtime_drained,
    run_network_acceptance,
)


def test_explicit_candidate_origin_suppresses_the_websocket_clients_default_origin():
    probe = SocketProbe(
        "origin-shape",
        "http://127.0.0.1:1",
        socket_origin="https://candidate.test",
    )

    assert probe.socket.eio.websocket_extra_options["suppress_origin"] is True
    assert probe.socket_origin == "https://candidate.test"
    probe.disconnect()


def test_safe_stop_rejects_terminal_persistence_still_pending():
    payload = {
        "accepting_new_matches": False,
        "live_rooms": 0,
        "waiting_lobbies": 0,
        "scheduler_tasks": 0,
        "scheduler_callbacks_inflight": 0,
        "scheduler_callback_errors_total": 0,
        "battle_command_handlers_inflight": 0,
        "analytics_outbox_size": 0,
        "mission_snapshot_retry_rooms": 0,
        "terminal_persistence_pending_rooms": 1,
        "mission_settlement_fallback_pending": 0,
        "mission_settlements": {},
    }

    with pytest.raises(AcceptanceError, match="terminal_persistence_pending_rooms"):
        _assert_runtime_drained(payload)


def test_safe_stop_rejects_scheduler_callback_errors():
    payload = {
        "accepting_new_matches": False,
        "live_rooms": 0,
        "waiting_lobbies": 0,
        "scheduler_tasks": 0,
        "scheduler_callbacks_inflight": 0,
        "scheduler_callback_errors_total": 1,
        "battle_command_handlers_inflight": 0,
        "analytics_outbox_size": 0,
        "mission_snapshot_retry_rooms": 0,
        "terminal_persistence_pending_rooms": 0,
        "mission_settlement_fallback_pending": 0,
        "mission_settlements": {},
    }

    with pytest.raises(AcceptanceError, match="scheduler_callback_errors_total"):
        _assert_runtime_drained(payload)


def test_safe_stop_rejects_pending_settlement_fallback_rows():
    payload = {
        "accepting_new_matches": False,
        "live_rooms": 0,
        "waiting_lobbies": 0,
        "scheduler_tasks": 0,
        "scheduler_callbacks_inflight": 0,
        "scheduler_callback_errors_total": 0,
        "battle_command_handlers_inflight": 0,
        "analytics_outbox_size": 0,
        "mission_snapshot_retry_rooms": 0,
        "terminal_persistence_pending_rooms": 0,
        "mission_settlement_fallback_pending": 1,
        "mission_settlements": {},
    }

    with pytest.raises(AcceptanceError, match="mission_settlement_fallback_pending"):
        _assert_runtime_drained(payload)


def test_real_network_cpu_pvp_resume_and_timeout_acceptance():
    report = run_network_acceptance(planning_seconds=3.0, queue_review_seconds=3.0)

    assert report["cpu"]["transport"] == "websocket"
    assert report["cpu"]["winner_id"] == "__cpu_v2__"
    assert report["cpu"]["final_revision"] > report["cpu"]["queue_revision"]
    assert report["cpu"]["finished_resume_rejected"] is True

    assert report["pvp"]["transports"] == ["websocket", "websocket"]
    assert report["pvp"]["resume_token_rotated"] is True
    assert report["pvp"]["rotated_token_rejected"] is True
    assert report["pvp"]["turn_advanced"] is True

    assert report["timeout"]["transport"] == "websocket"
    assert report["timeout"]["phase_timeout_event"] is True
    assert report["timeout"]["elapsed_seconds"] >= 2.0

    assert report["queue_timeout"]["transport"] == "websocket"
    assert report["queue_timeout"]["phase_timeout_event"] is True
    assert report["queue_timeout"]["pending_queue_discarded"] is True
    assert report["queue_timeout"]["unconfirmed_action_resolved"] is False

    assert report["http_before"]["health_status"] == 200
    assert report["http_before"]["readiness_status"] == 200
    assert report["http_before"]["mode"] == "development"
    assert report["http_before"]["topology"] == "single-authority-worker"
    assert report["http_before"]["debug_status"] == 404
    assert report["http_before"]["ops_missing_status"] == 404
    assert report["http_before"]["ops_wrong_status"] == 404
    assert report["http_before"]["ops_authorized_status"] == 200
    assert report["http_after"]["schema_version"] == 6
    assert report["drain"]["accepting_new_matches"] is False
    assert report["drain"]["maintenance"]["ok"] is True
    assert report["http_after"]["ops_snapshot"]["accepting_new_matches"] is False
    assert report["http_after"]["ops_snapshot"]["live_rooms"] == 0
    assert report["http_after"]["ops_snapshot"]["scheduler_tasks"] == 0
    assert report["http_after"]["ops_snapshot"]["scheduler_callbacks_inflight"] == 0
    assert report["http_after"]["ops_snapshot"]["battle_command_handlers_inflight"] == 0
    assert report["http_after"]["ops_snapshot"]["mission_snapshot_retry_rooms"] == 0
    assert report["http_after"]["ops_snapshot"]["terminal_persistence_pending_rooms"] == 0
    assert report["http_after"]["ops_snapshot"]["mission_settlement_fallback_pending"] == 0
