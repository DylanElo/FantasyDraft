import unittest
from web import app as web_app
from web.app import char_to_dict
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
    assert '"aoi_todo"' in html
    assert '"hiromi_higuruma"' in html
    assert 'id="btn-v2-new-match"' in html
    assert 'id="v2-player-summary"' in html
    assert 'app.js?v=27' in html
    assert 'style.css?v=25' in html

if __name__ == '__main__':
    unittest.main()

