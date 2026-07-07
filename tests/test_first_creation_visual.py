"""Optional browser screenshot smoke tests for first-creation onboarding.

These tests are skipped unless Playwright and a browser are installed. They make
visual QA executable without forcing the default unit-test environment to bundle
browser tooling.
"""

from __future__ import annotations

import os
import threading
from pathlib import Path
from wsgiref.simple_server import make_server

import pytest

from web import app as web_app


pytestmark = pytest.mark.skipif(
    os.getenv("JJK_RUN_VISUAL_TESTS") != "1",
    reason="set JJK_RUN_VISUAL_TESTS=1 to run browser visual tests",
)


@pytest.fixture()
def live_first_creation_server(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    server = make_server("127.0.0.1", 0, web_app.app)
    port = server.server_port
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{port}"
    finally:
        server.shutdown()
        thread.join(timeout=2)


def test_first_creation_onboarding_visual_snapshots(live_first_creation_server, tmp_path):
    playwright = pytest.importorskip("playwright.sync_api")

    output_dir = Path(os.getenv("JJK_VISUAL_OUTPUT_DIR", tmp_path))
    output_dir.mkdir(parents=True, exist_ok=True)

    with playwright.sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 430, "height": 932}, device_scale_factor=1)
        page.goto(live_first_creation_server, wait_until="networkidle")

        page.locator("#classic-v2").screenshot(path=output_dir / "first_creation_lobby.png")

        page.locator('[data-v2-enter-mode="cpu"]').click()
        page.locator("#v2-setup-view").screenshot(path=output_dir / "first_creation_setup.png")

        page.locator('[data-v2-pick-team="playerTeam"]').first.click()
        page.locator("#v2-character-details").screenshot(path=output_dir / "first_creation_character_details.png")

        browser.close()

    assert (output_dir / "first_creation_lobby.png").exists()
    assert (output_dir / "first_creation_setup.png").exists()
    assert (output_dir / "first_creation_character_details.png").exists()
