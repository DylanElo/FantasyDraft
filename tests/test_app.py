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
    assert '"aoi_todo"' in html
    assert '"hiromi_higuruma"' in html
    assert 'id="btn-v2-new-match"' in html
    assert 'id="v2-player-summary"' in html
    assert 'data-v2-mode="cpu"' in html
    assert 'data-v2-mode="pvp"' in html
    assert 'id="v2-lobby-note"' in html
    assert 'characters_data.js?v=19' in html
    assert 'vendor/phaser.min.js?v=3.90.0' in html
    assert 'phaser-battle.js?v=4' in html
    assert 'app.js?v=58' in html
    assert 'style.css?v=47' in html
    assert 'Battle v2 Arena' in html
    assert 'Classic Queue Test' not in html


def test_battle_v2_public_surface_uses_production_copy(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = web_app.app.test_client()

    html = client.get("/").get_data(as_text=True)
    app_js = Path(web_app.app.static_folder, "app.js").read_text(encoding="utf-8")
    style_css = Path(web_app.app.static_folder, "style.css").read_text(encoding="utf-8")

    assert "Battle v2 Arena" in html
    assert "Battle v2 Arena" in app_js
    assert "Classic Queue Test" not in html
    assert "Classic Queue Test" not in app_js
    assert "Classic Arena v2" not in html
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

