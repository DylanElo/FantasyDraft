import unittest
from jjk_bot.game import Game, GameState

class TestGame(unittest.TestCase):
    def test_game_flow(self):
        game = Game(123)

        # Test joining
        success, msg = game.add_player(1, "Alice")
        self.assertTrue(success)
        success, msg = game.add_player(2, "Bob")
        self.assertTrue(success)

        # Test start
        success, msg = game.start_game()
        self.assertTrue(success)
        self.assertEqual(game.state, GameState.IN_PROGRESS)
        self.assertEqual(game.get_current_player_id(), 1)

        # Alice draws
        success, msg, char = game.draw(1)
        self.assertTrue(success)
        self.assertEqual(game.state, GameState.DECIDING)

        # Alice keeps
        success, msg = game.keep(1)
        self.assertTrue(success)
        self.assertEqual(len(game.teams[1]), 1)
        self.assertEqual(game.get_current_player_id(), 2)
        self.assertEqual(game.state, GameState.IN_PROGRESS)

        # Bob draws
        success, msg, char = game.draw(2)
        self.assertTrue(success)

        # Bob passes
        success, msg, new_char = game.pass_card(2)
        self.assertTrue(success)
        self.assertTrue(game.passes_used[2])
        self.assertEqual(len(game.teams[2]), 1)
        self.assertEqual(game.get_current_player_id(), 1)

        # Bob tries to pass again (later)
        # Fast forward Alice to her next turn
        game.draw(1)
        game.keep(1)

        # Alice draws and keeps
        game.draw(1)
        game.keep(1)

        # Bob draws. He already used his pass, so he should MUST keep it.
        # But wait, the test is testing that he CANNOT call pass_card if he already used it.
        # If he already used it, draw(2) should automatically add to team and move turn.
        success, msg, _ = game.draw(2)
        self.assertTrue(success)
        self.assertIn("already used your pass", msg)
        self.assertEqual(game.get_current_player_id(), 1) # Turn should have moved

        # Now if Bob tries to call pass_card(2) while it's Alice's turn:
        success, msg, _ = game.pass_card(2)
        self.assertFalse(success)
        self.assertEqual(msg, "It's not your turn!")

    def test_game_end(self):
        game = Game(456)
        game.add_player(1, "Alice")
        game.add_player(2, "Bob")
        game.start_game()
        game.max_team_size = 1 # Set to 1 for quick test

        game.draw(1)
        game.keep(1)

        game.draw(2)
        game.keep(2)

        self.assertEqual(game.state, GameState.FINISHED)
        success, results = game.get_results()
        self.assertTrue(success)
        self.assertIn("Draft Results", results)
        self.assertIn("Draft phase is complete! Ready for battle!", results)

if __name__ == "__main__":
    unittest.main()
