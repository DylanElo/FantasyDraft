from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LAUNCHER = ROOT / "start_server.bat"


def launcher_text() -> str:
    return LAUNCHER.read_text(encoding="utf-8").lower()


def test_windows_launcher_targets_the_maintained_runtime_only():
    launcher = launcher_text()

    assert 'set "jjk_battle_system=v2"' in launcher
    assert 'if /i not "%jjk_battle_system%"=="v2"' in launcher
    assert '"%python_exe%" run_server.py' in launcher
    assert "eventlet" not in launcher
    assert "node " not in launcher
    assert "npm " not in launcher


def test_windows_launcher_keeps_dependencies_in_sync():
    launcher = launcher_text()

    assert "requirements.txt" in launcher
    assert ".requirements.sha256" in launcher
    assert "get-filehash -algorithm sha256" in launcher
    assert "import flask, flask_socketio, simple_websocket" in launcher
    assert '"%python_exe%" -m pip check' in launcher


def test_windows_launcher_opens_only_after_readiness_and_supports_opt_out():
    launcher = launcher_text()

    assert "'/readyz'" in launcher
    assert "start-process $url" in launcher
    assert "jjk_no_browser" in launcher
    assert "jjk_cors_origins" in launcher
    assert "jjk_browser_url" in launcher
