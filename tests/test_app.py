import unittest
from web.app import character_to_dict
from jjk_bot.characters import Character, Skill

class TestApp(unittest.TestCase):
    def test_character_to_dict_none(self):
        self.assertIsNone(character_to_dict(None))

    def test_character_to_dict_valid(self):
        skill = Skill(name="Punch", description="A punch", cooldown="None", energy=["green"], classes="Physical,Instant")
        char = Character(name="Yuji Itadori", description="Vessel of Sukuna", image_url="http://example.com/yuji.png", skills=[skill])

        result = character_to_dict(char)

        self.assertEqual(result['name'], "Yuji Itadori")
        self.assertEqual(result['description'], "Vessel of Sukuna")
        self.assertEqual(result['image_url'], "http://example.com/yuji.png")
        self.assertEqual(len(result['skills']), 1)

        self.assertEqual(result['skills'][0]['name'], "Punch")
        self.assertEqual(result['skills'][0]['description'], "A punch")
        self.assertEqual(result['skills'][0]['cooldown'], "None")
        self.assertEqual(result['skills'][0]['energy'], ["green"])
        self.assertEqual(result['skills'][0]['classes'], "Physical,Instant")

if __name__ == '__main__':
    unittest.main()
