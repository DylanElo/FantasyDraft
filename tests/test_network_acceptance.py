from tools.network_acceptance import run_network_acceptance


def test_real_network_cpu_pvp_resume_and_timeout_acceptance():
    report = run_network_acceptance(planning_seconds=3.0, queue_review_seconds=3.0)

    assert report["cpu"]["transport"] == "websocket"
    assert report["cpu"]["winner_id"] == "__cpu_v2__"
    assert report["cpu"]["final_revision"] > report["cpu"]["queue_revision"]

    assert report["pvp"]["transports"] == ["websocket", "websocket"]
    assert report["pvp"]["resume_token_rotated"] is True
    assert report["pvp"]["rotated_token_rejected"] is True
    assert report["pvp"]["turn_advanced"] is True

    assert report["timeout"]["transport"] == "websocket"
    assert report["timeout"]["phase_timeout_event"] is True
    assert report["timeout"]["elapsed_seconds"] >= 2.0
