"""Production Gunicorn topology for process-local Battle v2 authority."""

import os


_TRUE_VALUES = {"1", "true", "yes", "on"}


def _require_supported_environment() -> None:
    production_mode = os.getenv("JJK_PRODUCTION", "").strip().lower()
    if production_mode not in _TRUE_VALUES:
        raise RuntimeError(
            "JJK_PRODUCTION must be explicitly true for the supported Gunicorn launch"
        )

    async_mode = os.getenv("JJK_SOCKETIO_ASYNC_MODE", "threading").strip().lower()
    if async_mode != "threading":
        raise RuntimeError(
            "JJK_SOCKETIO_ASYNC_MODE must be threading for the supported Gunicorn topology"
        )


_require_supported_environment()

workers = int(os.getenv("JJK_WEB_WORKERS", "1"))
if workers != 1:
    raise RuntimeError(
        "JJK_WEB_WORKERS must be 1 until Battle v2 rooms, timers, sessions, and "
        "command receipts use an external authoritative coordinator"
    )

worker_class = "gthread"
threads = max(2, int(os.getenv("JJK_WEB_THREADS", "8")))
bind = f"0.0.0.0:{os.getenv('PORT', os.getenv('JJK_PORT', '5000'))}"
timeout = max(30, int(os.getenv("JJK_GUNICORN_TIMEOUT", "60")))
graceful_timeout = 30
keepalive = 5
accesslog = "-"
errorlog = "-"
capture_output = True


def on_starting(server) -> None:
    """Reject unsafe effective settings after Gunicorn applies all overrides."""

    # Gunicorn applies ``--env`` values before this hook, so repeat the
    # environment checks to prevent a late raw-env override from putting the
    # worker application into development or a different Socket.IO mode.
    _require_supported_environment()

    issues = []
    if server.cfg.workers != 1:
        issues.append(f"workers must be 1 (got {server.cfg.workers})")

    effective_worker_class = server.cfg.worker_class_str
    if effective_worker_class != "gthread":
        issues.append(
            f"worker class must resolve to gthread (got {effective_worker_class!r})"
        )

    if server.cfg.threads < 2:
        issues.append(f"threads must be at least 2 (got {server.cfg.threads})")

    if issues:
        raise RuntimeError("Unsupported effective Gunicorn topology: " + "; ".join(issues))
