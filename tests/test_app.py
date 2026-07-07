from pathlib import Path
import unittest
from web import app as web_app
from web.app import char_to_dict, v2_character_id_for_name
from jjk_bot.characters import Character, Skill

class TestApp(unittest.TestCase):
    def test_character_to_dict_none(self):
        self.assertIsNone(char_to_dict(None))

    def test_character_to_dict_valid(self):
        skill = Skill(
            name="Punch",
            desc="A punch",
            cost=["green"],
            classes=["Physical", "Instant"],
            effects=[],
            cooldown=0
        )
        char = Character(
            name="Yuji Itadori",
            description="Vessel of Sukuna",
            image_url="http://example.com/yuji.png",
            skills=[skill]
        )

        result = char_to_dict(char)

        self.assertEqual(result['name'], "Yuji Itadori")
        self.assertEqual(result['description'], "Vessel of Sukuna")
        self.assertEqual(result['image_url'], "http://example.com/yuji.png")
        self.assertEqual(result['portrait_url'], "http://example.com/yuji.png")
        self.assertEqual(result['portrait_source'], "remote")
        self.assertEqual(len(result['skills']), 1)

        s_dict = result['skills'][0]
        self.assertEqual(s_dict['name'], "Punch")
        self.assertEqual(s_dict['description'], "A punch")
        self.assertEqual(s_dict['cooldown'], 0)
        self.assertEqual(s_dict['cooldown_int'], 0)
        self.assertEqual(s_dict['energy'], ["green"])
        self.assertEqual(s_dict['classes'], "Physical, Instant")


def test_index_hides_battle_v2_entry_by_default(monkeypatch):
    monkeypatch.delenv("JJK_BATTLE_SYSTEM", raising=False)
    client = web_app.app.test_client()

    html = client.get("/").get_data(as_text=True)

    assert 'const BATTLE_V2_ENABLED = false;' in html
    assert 'id="btn-classic-v2" class="btn-ghost roster-lab-entry hidden"' in html


def test_index_exposes_battle_v2_entry_when_enabled(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = web_app.app.test_client()

    html = client.get("/").get_data(as_text=True)

    assert 'const BATTLE_V2_ENABLED = true;' in html
    assert 'id="btn-classic-v2" class="btn-ghost roster-lab-entry"' in html
    assert 'id="btn-classic-v2" class="btn-ghost roster-lab-entry" type="button" disabled' in html
    assert 'id="setup" class="screen"' in html
    assert 'id="classic-v2" class="screen stitch-screen active' in html
    assert '"aoi_todo"' in html
    assert '"hiromi_higuruma"' in html
    assert 'id="btn-v2-new-match"' in html
    assert 'id="v2-lobby-view"' in html
    assert 'id="v2-history-view"' in html
    assert 'id="v2-history-view-content"' in html
    assert 'id="v2-player-name"' in html
    assert 'id="v2-room-id"' in html
    assert 'id="v2-lobby-activity"' in html
    assert 'id="v2-selection-dock"' in html
    assert 'id="v2-result-rank"' in html
    assert 'data-v2-enter-mode="cpu"' in html
    assert 'data-v2-result-action="lobby"' in html
    assert 'id="v2-player-summary"' in html
    assert 'data-v2-mode="cpu"' in html
    assert 'data-v2-mode="pvp"' in html
    assert 'id="v2-lobby-note"' in html
    assert 'v2-first-creation-guide stitch-panel stitch-cut' in html
    assert 'Welcome to Jujutsu High' in html
    assert 'aria-label="Energy legend"' in html
    assert 'id="v2-mission-roadmap"' in html
    assert 'id="v2-character-details"' in html
    assert 'characters_data.js?v=19' in html
    assert 'vendor/phaser.min.js?v=3.90.0' in html
    assert 'phaser-battle.js?v=4' in html
    assert 'app.js?v=81' in html
    assert 'stitch-tokens.css?v=1' in html
    assert 'style.css?v=55' in html
    assert 'stitch-archive.css?v=12' in html
    assert 'stitch/generated/lobby-hero.jpg' in html
    assert 'stitch/generated/victory-trophy.jpg' in html
    assert 'Open Cursed Clash' in html
    assert 'Classic Queue Test' not in html


def test_battle_v2_public_surface_uses_production_copy(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = web_app.app.test_client()

    html = client.get("/").get_data(as_text=True)
    app_js = Path(web_app.app.static_folder, "app.js").read_text(encoding="utf-8")
    style_css = Path(web_app.app.static_folder, "style.css").read_text(encoding="utf-8")

    assert "Open Cursed Clash" in html
    assert "Assemble Your Trio" in app_js
    assert "Classic Queue Test" not in html
    assert "Classic Queue Test" not in app_js
    assert "Classic Arena v2" not in html
    assert "Battle v2 Arena" not in html
    assert "Classic Arena v2" not in style_css
    assert "dev surface" not in app_js.lower()
    assert "dev surface" not in style_css.lower()


def test_v2_character_id_for_v1_names():
    assert v2_character_id_for_name("Yuji Itadori") == "yuji_itadori"
    assert v2_character_id_for_name("Ryomen Sukuna") == "ryomen_sukuna"
    assert v2_character_id_for_name("Sukuna (Incarnation)") == "ryomen_sukuna"
    assert v2_character_id_for_name("Yuta Okkotsu (JJK 0)") == "yuta_okkotsu"
    assert v2_character_id_for_name("Gojo (Unsealed)") == "satoru_gojo"
    assert v2_character_id_for_name("Kento Nanami") is None

if __name__ == '__main__':
    unittest.main()



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
    app_js = Path(web_app.app.static_folder, "app.js").read_text(encoding="utf-8")
    assert "FIRST_CREATION?.roster" in app_js
    assert "roster_mode: 'first_creation'" in app_js
    assert "v2-preset-card" in app_js
    assert "v2-roster-skill-preview" in app_js
    assert "v2MissionRoadmapHTML" in app_js
    assert "v2CharacterDetailsHTML" in app_js
    assert "Onboarding rules" in app_js


def test_stitch_design_system_bridge_is_loaded_after_tokens(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = web_app.app.test_client()

    html = client.get("/").get_data(as_text=True)
    tokens_index = html.index("jjk-tokens.css")
    stitch_index = html.index("stitch-tokens.css")
    style_index = html.index("style.css")

    assert tokens_index < stitch_index < style_index

    stitch_tokens = Path(web_app.app.static_folder, "stitch-tokens.css").read_text(encoding="utf-8")
    style_css = Path(web_app.app.static_folder, "style.css").read_text(encoding="utf-8")

    assert "--stitch-void: var(--jjk-bg-void)" in stitch_tokens
    stitch_archive = Path(web_app.app.static_folder, "stitch-archive.css").read_text(encoding="utf-8")

    assert ".stitch-screen" in stitch_tokens
    assert "--stitch-void: #04040d" not in style_css
    assert ".v2-first-creation-guide" in stitch_archive
    assert "var(--stitch-panel" in stitch_archive
    assert ".v2-mission-roadmap" in stitch_archive
    assert ".v2-character-details" in stitch_archive
