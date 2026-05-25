import unittest
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

if __name__ == '__main__':
    unittest.main()

