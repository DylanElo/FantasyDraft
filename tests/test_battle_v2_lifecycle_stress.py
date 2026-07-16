from flask_socketio.test_client import SocketIOTestClient

from jjk_arena.battle_v2.lifecycle_stress import MEMORY_CEILING_BYTES, run_stress_batch
from web import app as web_app

# Runtime state (rooms, lobbies, index maps) is reset by the autouse
# reset_battle_v2_runtime_state fixture in tests/conftest.py.


def test_lifecycle_stress_batch_produces_zero_softlocks():
    result = run_stress_batch(matches=100, seed=1)
    assert result["softlock_count"] == 0, result["softlocks"]
    assert result["matches"] == 100
    assert set(result["scenario_counts"]) == {
        "clean_finish",
        "disconnect_reconnect",
        "disconnect_forfeit",
        "rematch_spam",
        "code_reuse_race",
    }
    # Every client is disconnected and every finished room is prunable, so the
    # harness should not accumulate state across a batch: this is the
    # "bounded" half of the "1,000 matches, 0 softlocks" exit gate.
    assert result["final_rooms"] <= 5
    assert result["peak_rooms"] <= result["matches"] * 2 + 5


def test_lifecycle_stress_batch_stays_within_one_scheduler_worker_and_memory_ceiling():
    """The real teeth of "no stale timer thread, memory-bounded run": a batch
    of matches (each arming and cancelling many phase/disconnect timers)
    must never accumulate extra background threads beyond the scheduler's
    single shared worker, and must stay under the documented RSS ceiling."""

    # Thread-count/memory-ceiling behavior doesn't need a full 100-match
    # batch to demonstrate -- a smaller batch across many rooms proves the
    # same property (one shared scheduler worker, bounded memory) much faster.
    result = run_stress_batch(matches=25, seed=2)

    assert result["softlock_count"] == 0, result["softlocks"]
    # Exactly one scheduler worker thread total, no matter how many rooms
    # were armed/cancelled across the whole batch.
    assert result["scheduler_worker_threads"] == 1
    # The batch itself must not leave any *other* stray thread running
    # (test clients, socket handlers) beyond what already existed.
    assert result["extra_threads_after_batch"] <= 1
    assert result["memory_ceiling_bytes"] == MEMORY_CEILING_BYTES
    if result["process_rss_bytes"] is not None:
        assert not result["over_memory_ceiling"], (
            f"process RSS {result['process_rss_bytes']} exceeded the "
            f"documented ceiling of {MEMORY_CEILING_BYTES} bytes"
        )


def test_lifecycle_stress_batch_does_not_leak_socketio_test_client_state():
    """Regression: SocketIOTestClient.disconnect() only replays a Socket.IO-
    level DISCONNECT packet -- it never reaches python-socketio's
    Server._handle_eio_disconnect (the real Engine.IO transport-close path,
    which is the only place that pops socketio.server.environ[eio_sid]).
    The class-level SocketIOTestClient.clients registry has the same gap.
    A batch of matches must not leave either behind: this was the actual
    mechanism behind a 1,000-match run's RSS blowing well past the
    documented ceiling despite peak_rooms staying flat, since it retains
    whole client objects (queues, socketio/app references) forever."""

    clients_before = len(SocketIOTestClient.clients)
    environ_before = len(web_app.socketio.server.environ)

    run_stress_batch(matches=200, seed=4)

    clients_after = len(SocketIOTestClient.clients)
    environ_after = len(web_app.socketio.server.environ)

    assert clients_after == clients_before, (
        f"SocketIOTestClient.clients grew by {clients_after - clients_before} "
        "over the batch -- test clients are not being fully disconnected"
    )
    assert environ_after == environ_before, (
        f"socketio.server.environ grew by {environ_after - environ_before} "
        "over the batch -- test clients are not being fully disconnected"
    )


def test_lifecycle_stress_batch_never_writes_to_the_configured_runtime_database():
    """Regression: a bare CLI invocation of this module previously wrote
    hundreds of synthetic match/mission analytics rows straight into
    whatever database `runtime_store` was configured with -- the real
    `data/jjk_arena.sqlite3` outside of pytest. The batch must redirect to
    its own throwaway database for its duration and restore the original
    path afterward, leaving the caller's database untouched either way."""

    configured_path_before = web_app.runtime_store.path
    summary_before = web_app.runtime_store.analytics_summary()["match_finished"]["total"]

    run_stress_batch(matches=20, seed=3)

    assert web_app.runtime_store.path == configured_path_before
    summary_after = web_app.runtime_store.analytics_summary()["match_finished"]["total"]
    assert summary_after == summary_before
