"""Health, readiness, and security-header wiring for web/app.py.

Extracted as part of that file's split (see docs/audit_ledger.md). Everything
here only *reads* shared config/state, never reassigns it, which is what
keeps this slice safe: every read goes through `app_module.NAME` (not a bare
`from web.app import NAME`) so a test's `monkeypatch.setattr(web_app, "NAME",
...)` is still observed correctly, since a bare import would have captured a
stale copy of the value at import time instead of the live module attribute.
"""

from __future__ import annotations

import os
from urllib.parse import urlsplit

from flask import jsonify, request

import web.app as app_module


def _is_exact_https_origin(origin: str) -> bool:
    """Return whether *origin* is an exact HTTPS origin, not a URL prefix."""

    candidate = str(origin or "")
    if not candidate or candidate != candidate.strip() or "*" in candidate:
        return False
    if any(character.isspace() for character in candidate) or "\\" in candidate:
        return False
    try:
        parsed = urlsplit(candidate)
        # Accessing port validates malformed and out-of-range explicit ports.
        parsed.port
    except ValueError:
        return False
    rendered_host = (
        f"[{parsed.hostname}]"
        if parsed.hostname and ":" in parsed.hostname
        else parsed.hostname
    )
    expected_netloc = rendered_host or ""
    if parsed.port is not None:
        expected_netloc = f"{expected_netloc}:{parsed.port}"
    return bool(
        parsed.scheme.lower() == "https"
        and parsed.hostname
        and parsed.netloc.lower() == expected_netloc.lower()
        and parsed.username is None
        and parsed.password is None
        and parsed.path == ""
        and parsed.query == ""
        and parsed.fragment == ""
    )


def _runtime_storage_health() -> dict:
    try:
        return app_module.runtime_store.healthcheck()
    except Exception:
        return {"ok": False, "schema_version": None}


def production_readiness_issues(*, storage: dict | None = None) -> list[str]:
    issues = []
    ops_token = os.getenv("JJK_OPS_TOKEN", "").strip()
    configured_secret = app_module.configured_secret
    production_mode = app_module.PRODUCTION_MODE
    if production_mode and (not configured_secret or len(configured_secret) < 32):
        issues.append("FLASK_SECRET_KEY must contain at least 32 characters in production")
    elif production_mode and configured_secret == app_module.EXAMPLE_SECRET:
        issues.append("FLASK_SECRET_KEY must not use the .env.example placeholder")
    if production_mode and not ops_token:
        issues.append("JJK_OPS_TOKEN must be configured in production")
    elif production_mode and len(ops_token) < 32:
        issues.append("JJK_OPS_TOKEN must contain at least 32 characters in production")
    elif production_mode and ops_token == app_module.EXAMPLE_OPS_TOKEN:
        issues.append("JJK_OPS_TOKEN must not use the .env.example placeholder")
    elif production_mode and configured_secret and ops_token == configured_secret:
        issues.append("JJK_OPS_TOKEN must be distinct from FLASK_SECRET_KEY")
    if production_mode and app_module.DEBUG_MODE:
        issues.append("JJK_DEBUG must remain disabled in production")
    if app_module.WEB_WORKERS != 1:
        issues.append("JJK_WEB_WORKERS must remain 1 until authoritative rooms use an external coordinator")
    if production_mode and app_module.SOCKETIO_ASYNC_MODE != "threading":
        issues.append("JJK_SOCKETIO_ASYNC_MODE must remain threading in production")
    if production_mode and (not app_module.configured_cors_origins or not app_module.CORS_ORIGINS):
        issues.append("JJK_CORS_ORIGINS must be explicitly configured in production")
    if production_mode and any(not _is_exact_https_origin(origin) for origin in app_module.CORS_ORIGINS):
        issues.append("JJK_CORS_ORIGINS must contain only explicit HTTPS origins in production")
    if production_mode and app_module.EXAMPLE_CORS_ORIGIN in app_module.CORS_ORIGINS:
        issues.append("JJK_CORS_ORIGINS must not use the .env.example origin")
    if production_mode and not os.getenv("JJK_DATABASE_PATH"):
        issues.append("JJK_DATABASE_PATH must point to a durable production volume")
    storage = _runtime_storage_health() if storage is None else storage
    if not storage.get("ok"):
        issues.append("runtime database is unavailable")
    return issues


@app_module.app.after_request
def apply_security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "same-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "img-src 'self' data: blob:; connect-src 'self' ws: wss:; font-src 'self' data: https://fonts.gstatic.com; "
        "object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    )
    if app_module.PRODUCTION_MODE and request.is_secure:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response


@app_module.app.route("/healthz")
def healthz():
    app_module.operational_counters["health_checks"] += 1
    return jsonify({"status": "ok", "service": "jjk-arena"})


@app_module.app.route("/readyz")
def readyz():
    app_module.operational_counters["readiness_checks"] += 1
    storage = _runtime_storage_health()
    issues = production_readiness_issues(storage=storage)
    payload = {
        "status": "ready" if not issues else "not_ready",
        "issues": issues,
        "storage": storage,
        "topology": "single-authority-worker",
        "mode": "production" if app_module.PRODUCTION_MODE else "development",
    }
    return jsonify(payload), 200 if not issues else 503
