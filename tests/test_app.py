from pathlib import Path
from web import app as web_app


def test_index_defaults_to_phaser_cursed_clash(monkeypatch):
    monkeypatch.delenv("JJK_BATTLE_SYSTEM", raising=False)
    client = web_app.app.test_client()

    html = client.get("/").get_data(as_text=True)

    assert 'const BATTLE_V2_ENABLED = true;' in html
    assert 'id="classic-v2" class="phaser-shell-screen"' in html
    assert 'id="v2-phaser-shell"' in html
    assert 'id="setup"' not in html
    assert 'id="game-arena"' not in html
    assert 'id="team-selection"' not in html
    assert 'id="battle-arena"' not in html
    assert 'id="results"' not in html
    assert 'id="v2-lobby-view"' not in html
    assert 'id="v2-setup-view"' not in html
    assert 'id="v2-battle-view"' not in html
    assert 'id="v2-result-view"' not in html
    assert 'id="v2-bottom-nav"' not in html
    assert "cdn.tailwindcss.com" not in html
    assert "style.css" not in html
    assert "jjk-theme.css" not in html
    assert "arena-redesign.css" not in html
    assert "jjk-tokens.css" not in html
    assert "stitch-tokens.css" not in html
    assert "stitch-archive.css" not in html


def test_index_exposes_battle_v2_entry_when_enabled(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = web_app.app.test_client()

    html = client.get("/").get_data(as_text=True)

    assert 'const BATTLE_V2_ENABLED = true;' in html
    assert 'id="classic-v2" class="phaser-shell-screen"' in html
    assert 'id="v2-phaser-shell"' in html
    assert '"aoi_todo"' in html
    assert '"hiromi_higuruma"' in html
    assert 'id="btn-v2-new-match"' not in html
    assert 'id="v2-lobby-view"' not in html
    assert 'id="v2-history-view"' not in html
    assert 'id="v2-setup-view"' not in html
    assert 'id="v2-battle-view"' not in html
    assert 'id="v2-result-view"' not in html
    assert 'id="v2-bottom-nav"' not in html
    assert 'v2-fighter-card' not in html
    assert 'v2-enemy-team' not in html
    assert 'v2-my-team' not in html
    assert 'vendor/phaser.min.js?v=3.90.0' in html
    assert 'phaser-shell.js?v=1' in html
    assert 'phaser-shell.css?v=1' in html
    assert 'phaser-battle.js' not in html
    assert 'app.js' not in html
    assert 'stitch-tokens.css' not in html
    assert 'stitch-archive.css' not in html
    assert 'stitch/generated/lobby-hero.jpg' not in html
    assert 'stitch/generated/victory-trophy.jpg' not in html
    assert 'Classic Queue Test' not in html


def test_battle_v2_public_surface_uses_production_copy(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = web_app.app.test_client()

    html = client.get("/").get_data(as_text=True)
    shell_js = Path(web_app.app.static_folder, "phaser-shell.js").read_text(encoding="utf-8")

    assert "class BootScene" in shell_js
    assert "class LobbyScene" in shell_js
    assert "class DraftScene" in shell_js
    assert "class CombatScene" in shell_js
    assert "class ResultScene" in shell_js
    assert "class RecordsScene" in shell_js
    assert "battle_v2_start_classic" in shell_js
    assert "battle_v2_submit_plan" in shell_js
    assert "battle_v2_update_queue" in shell_js
    assert "battle_v2_confirm_queue" in shell_js
    assert "battle_v2_convert_energy" in shell_js
    assert "playEvent(event, frame)" in shell_js
    assert "consumePlaybackEvents" in shell_js
    assert "REPLAY" in shell_js
    assert "BIGGEST STRIKES" in shell_js
    assert "MISSION ROUTE" in shell_js
    assert "setDraftTarget" in shell_js
    assert "jjk:ui-tap" in shell_js
    assert "Classic Queue Test" not in html
    assert "Classic Queue Test" not in shell_js
    assert "Classic Arena v2" not in html
    assert "Battle v2 Arena" not in html
    assert "dev surface" not in shell_js.lower()
    assert "document.getElementById('btn-join')" not in shell_js
    assert "showScreen('game-arena')" not in shell_js
    assert "showScreen('battle-arena')" not in shell_js
    assert "showScreen('team-selection')" not in shell_js


def test_index_exposes_first_creation_payload_when_battle_v2_enabled(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = web_app.app.test_client()

    html = client.get("/").get_data(as_text=True)

    assert "const FIRST_CREATION =" in html
    assert '"availability": "starter"' in html
    assert '"era": "student_era"' in html
    assert '"satoru_gojo_young"' in html
    assert '"yuta_okkotsu_jjk0"' in html
    assert '"mahito"' in html  # locked variant list, not the starter roster
    shell_js = Path(web_app.app.static_folder, "phaser-shell.js").read_text(encoding="utf-8")
    assert "BOOT.firstCreation && BOOT.firstCreation.roster" in shell_js
    assert "roster_mode: 'first_creation'" in shell_js
    assert "applyPreset" in shell_js
    assert "renderRosterCard" in shell_js
    assert "MISSION OBJECTIVE" in shell_js
    assert "Skill cards show cost / cooldown / target / effect." in shell_js
    assert "completed_missions" in html
    assert "unlock_registry" in html
    assert "first_creation_account" not in shell_js


def test_v2_page_uses_phaser_container_css_not_stitch_bridge(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = web_app.app.test_client()

    html = client.get("/").get_data(as_text=True)
    shell_css = Path(web_app.app.static_folder, "phaser-shell.css").read_text(encoding="utf-8")

    assert "phaser-shell.css" in html
    assert not Path(web_app.app.static_folder, "stitch").exists()
    assert "stitch-tokens.css" not in html
    assert "stitch-archive.css" not in html
    assert "#v2-phaser-shell canvas" in shell_css
    assert ".stitch-screen" not in shell_css
    assert ".v2-first-creation-guide" not in shell_css

def test_index_embeds_persisted_first_creation_profile(monkeypatch, tmp_path):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    monkeypatch.setenv("JJK_FIRST_CREATION_PROFILE_STORE", str(tmp_path / "profiles.json"))
    web_app.save_first_creation_profile("player-profile", {"completed_missions": ["welcome_to_jujutsu_high"], "unlocked": ["mission_board"]})
    client = web_app.app.test_client()
    with client.session_transaction() as flask_session:
        flask_session["player_id"] = "player-profile"

    html = client.get("/").get_data(as_text=True)

    assert '"completed_missions": ["welcome_to_jujutsu_high"]' in html
    assert '"unlocked": ["mission_board"]' in html
    assert '"owned": true' in html
