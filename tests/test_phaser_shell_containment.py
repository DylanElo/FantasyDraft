from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_desktop_shell_is_a_centered_bounded_phone_surface():
    shell_css = (ROOT / "web" / "static" / "phaser-shell.css").read_text(encoding="utf-8")

    assert ".phaser-shell-screen" in shell_css
    assert "display: flex;" in shell_css
    assert "align-items: center;" in shell_css
    assert "justify-content: center;" in shell_css
    assert "width: min(100vw, 430px);" in shell_css
    assert "height: min(100dvh, 932px);" in shell_css
    assert "contain: layout paint size;" in shell_css


def test_canvas_is_hard_clipped_to_the_phone_host():
    shell_css = (ROOT / "web" / "static" / "phaser-shell.css").read_text(encoding="utf-8")

    assert "#v2-phaser-shell {" in shell_css
    assert "overflow: hidden;" in shell_css
    assert "#v2-phaser-shell canvas {" in shell_css
    assert "position: absolute;" in shell_css
    assert "inset: 0;" in shell_css
    assert "max-width: 100%;" in shell_css
    assert "max-height: 100%;" in shell_css
