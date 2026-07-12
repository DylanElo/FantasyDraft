"""Production Gunicorn topology for process-local Battle v2 authority."""

import os


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
