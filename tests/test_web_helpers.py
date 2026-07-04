import unittest
from unittest.mock import MagicMock
import sys
import os

# Mock flask and flask_socketio before importing web.app
sys.modules['flask'] = MagicMock()
sys.modules['flask_socketio'] = MagicMock()

# Add root directory to sys.path to import jjk_bot and web
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from web.app import (
    char_to_dict,
    clean_player_name,
    clean_room_id,
    clean_selected_names,
    clamp_int,
    static_portrait_url,
    skill_to_dict,
)
from jjk_bot.characters import Skill, Character

class TestWebHelpers(unittest.TestCase):
    def test_skill_to_dict(self):
        skill = Skill(
            name="Test Skill",
            desc="Test Description",
            cooldown=1,
            cost=["blue", "black"],
            classes=["Energy", "Instant"],
            effects=[]
        )
        expected = {
            'name': "Test Skill",
            'description': "Test Description",
            'cooldown': 1,
            'cooldown_int': 1,
            'energy': ["blue", "black"],
            'classes': "Energy, Instant",
            'target_type': 'enemy',
            'is_aoe': False,
            'damage': 0,
            'heal': 0,
            'stun_turns': 0,
            'invuln_turns': 0,
            'dot_damage': 0,
            'dot_turns': 0,
            'damage_reduction': 0,
            'ignores_dr': False,
            'ignores_invuln': False,
            'is_piercing': False,
            'is_affliction': False,
        }
        self.assertEqual(skill_to_dict(skill), expected)

    def test_skill_to_dict_empty(self):
        skill = Skill(
            name="",
            desc="",
            cooldown=0,
            cost=[],
            classes=[],
            effects=[]
        )
        expected = {
            'name': "",
            'description': "",
            'cooldown': 0,
            'cooldown_int': 0,
            'energy': [],
            'classes': "",
            'target_type': 'enemy',
            'is_aoe': False,
            'damage': 0,
            'heal': 0,
            'stun_turns': 0,
            'invuln_turns': 0,
            'dot_damage': 0,
            'dot_turns': 0,
            'damage_reduction': 0,
            'ignores_dr': False,
            'ignores_invuln': False,
            'is_piercing': False,
            'is_affliction': False,
        }
        self.assertEqual(skill_to_dict(skill), expected)

    def test_character_to_dict(self):
        skill = Skill(
            name="Test Skill",
            desc="Test Description",
            cooldown=1,
            cost=["blue"],
            classes=["Energy"],
            effects=[]
        )
        char = Character(
            name="Test Char",
            description="Test Char Description",
            image_url="http://example.com/image.png",
            skills=[skill]
        )
        expected = {
            'name': "Test Char",
            'identity': "Test Char",
            'description': "Test Char Description",
            'image_url': "http://example.com/image.png",
            'portrait_url': "http://example.com/image.png",
            'portrait_source': "remote",
            'char_type': "Specialist",
            'role': "Specialist",
            'rarity': "Rare",
            'skills': [{
                'name': "Test Skill",
                'description': "Test Description",
                'cooldown': 1,
                'cooldown_int': 1,
                'energy': ["blue"],
                'classes': "Energy",
                'target_type': 'enemy',
                'is_aoe': False,
                'damage': 0,
                'heal': 0,
                'stun_turns': 0,
                'invuln_turns': 0,
                'dot_damage': 0,
                'dot_turns': 0,
                'damage_reduction': 0,
                'ignores_dr': False,
                'ignores_invuln': False,
                'is_piercing': False,
                'is_affliction': False,
            }]
        }
        self.assertEqual(char_to_dict(char), expected)
        self.assertNotIn('unique_mechanic', char_to_dict(char))
        self.assertNotIn('achievement_name', char_to_dict(char))
        self.assertNotIn('achievement_desc', char_to_dict(char))

    def test_character_to_dict_none(self):
        self.assertIsNone(char_to_dict(None))

    def test_character_to_dict_no_skills(self):
        char = Character(
            name="No Skill Char",
            description="No Skill Description",
            image_url="http://example.com/none.png",
            skills=[]
        )
        expected = {
            'name': "No Skill Char",
            'identity': "No Skill Char",
            'description': "No Skill Description",
            'image_url': "http://example.com/none.png",
            'portrait_url': "http://example.com/none.png",
            'portrait_source': "remote",
            'char_type': "Specialist",
            'role': "Specialist",
            'rarity': "Rare",
            'skills': []
        }
        self.assertEqual(char_to_dict(char), expected)

    def test_clean_room_id(self):
        self.assertEqual(clean_room_id(" arena-01_ABC "), "arena-01_ABC")
        self.assertEqual(clean_room_id("../bad room<script>"), "badroomscript")
        self.assertEqual(clean_room_id(""), "lobby")

    def test_clean_player_name(self):
        self.assertEqual(clean_player_name(" Dylan\nElo ", "Player"), "DylanElo")
        self.assertEqual(clean_player_name("", "Player"), "Player")
        self.assertEqual(len(clean_player_name("x" * 40, "Player")), 24)

    def test_clean_selected_names(self):
        names = clean_selected_names(["Yuji", "Gojo", "Nobara", "Megumi"])
        self.assertEqual(names, ["Yuji", "Gojo", "Nobara"])
        self.assertEqual(clean_selected_names("Yuji"), [])

    def test_clamp_int(self):
        self.assertEqual(clamp_int("2", 0, 4), 2)
        self.assertEqual(clamp_int("-1", 0, 4), 0)
        self.assertEqual(clamp_int("99", 0, 4), 4)
        self.assertEqual(clamp_int("bad", 0, 4, default=3), 3)

    def test_static_portrait_url(self):
        self.assertEqual(
            static_portrait_url("assets/portraits/gojo-young.svg", "remote.png"),
            "/static/assets/portraits/gojo-young.svg",
        )
        self.assertEqual(static_portrait_url(None, "remote.png"), "remote.png")

if __name__ == "__main__":
    unittest.main()
