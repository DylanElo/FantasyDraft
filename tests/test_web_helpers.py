import unittest
from unittest.mock import MagicMock
import sys
import os

# Mock flask and flask_socketio before importing web.app
sys.modules['flask'] = MagicMock()
sys.modules['flask_socketio'] = MagicMock()

# Add root directory to sys.path to import jjk_bot and web
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from web.app import skill_to_dict, character_to_dict
from jjk_bot.characters import Skill, Character

class TestWebHelpers(unittest.TestCase):
    def test_skill_to_dict(self):
        skill = Skill(
            name="Test Skill",
            description="Test Description",
            cooldown="1",
            energy=["blue", "black"],
            classes="Energy,Instant"
        )
        expected = {
            'name': "Test Skill",
            'description': "Test Description",
            'cooldown': "1",
            'energy': ["blue", "black"],
            'classes': "Energy,Instant"
        }
        self.assertEqual(skill_to_dict(skill), expected)

    def test_skill_to_dict_empty(self):
        skill = Skill(
            name="",
            description="",
            cooldown="",
            energy=[],
            classes=""
        )
        expected = {
            'name': "",
            'description': "",
            'cooldown': "",
            'energy': [],
            'classes': ""
        }
        self.assertEqual(skill_to_dict(skill), expected)

    def test_character_to_dict(self):
        skill = Skill(
            name="Test Skill",
            description="Test Description",
            cooldown="1",
            energy=["blue"],
            classes="Energy"
        )
        char = Character(
            name="Test Char",
            description="Test Char Description",
            image_url="http://example.com/image.png",
            skills=[skill]
        )
        expected = {
            'name': "Test Char",
            'description': "Test Char Description",
            'image_url': "http://example.com/image.png",
            'skills': [{
                'name': "Test Skill",
                'description': "Test Description",
                'cooldown': "1",
                'energy': ["blue"],
                'classes': "Energy"
            }]
        }
        self.assertEqual(character_to_dict(char), expected)

    def test_character_to_dict_none(self):
        self.assertIsNone(character_to_dict(None))

    def test_character_to_dict_no_skills(self):
        char = Character(
            name="No Skill Char",
            description="No Skill Description",
            image_url="http://example.com/none.png",
            skills=[]
        )
        expected = {
            'name': "No Skill Char",
            'description': "No Skill Description",
            'image_url': "http://example.com/none.png",
            'skills': []
        }
        self.assertEqual(character_to_dict(char), expected)

if __name__ == "__main__":
    unittest.main()
