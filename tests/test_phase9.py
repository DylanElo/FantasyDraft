import unittest
from jjk_bot.game import BattleEngine, CharacterBattleState, PlayerBattleState
from jjk_bot.characters import Character, Skill, Effect, EffectKind, Target

class TestPhase9(unittest.TestCase):
    def setUp(self):
        # Create standard test characters and skills
        self.strike_skill = Skill(
            name="Strike",
            desc="Deals damage to single target",
            cost=["black"],
            classes=["physical"],
            effects=[Effect(kind=EffectKind.DAMAGE, value=20, target=Target.ENEMY)],
            cooldown=0,
            target=Target.ENEMY
        )
        self.aoe_skill = Skill(
            name="AoE Slash",
            desc="Deals damage to all enemies",
            cost=["black"],
            classes=["cursed"],
            effects=[Effect(kind=EffectKind.DAMAGE, value=15, target=Target.ENEMIES)],
            cooldown=0,
            target=Target.ENEMIES
        )
        self.stun_skill = Skill(
            name="Stun Hit",
            desc="Stuns single target",
            cost=["black"],
            classes=["cursed"],
            effects=[Effect(kind=EffectKind.STUN, value=1, target=Target.ENEMY)],
            cooldown=0,
            target=Target.ENEMY
        )
        self.self_heal_skill = Skill(
            name="Heal Self",
            desc="Heals self",
            cost=["black"],
            classes=["reverse"],
            effects=[Effect(kind=EffectKind.HEAL, value=20, target=Target.SELF)],
            cooldown=0,
            target=Target.SELF
        )
        
        self.char1 = Character(name="Yuji", description="", image_url="", skills=[self.strike_skill, self.aoe_skill])
        self.char2 = Character(name="Megumi", description="", image_url="", skills=[self.strike_skill, self.stun_skill])
        self.char3 = Character(name="Nobara", description="", image_url="", skills=[self.strike_skill])
        self.char4 = Character(name="Maki", description="", image_url="", skills=[self.strike_skill])
        self.char5 = Character(name="Panda", description="", image_url="", skills=[self.strike_skill])

        self.active_teams = {
            1: [self.char1, self.char2, self.char3],
            2: [self.char1, self.char2, self.char3]
        }
        self.bench_teams = {
            1: [self.char4, self.char5],
            2: [self.char4, self.char5]
        }
        
        self.battle = BattleEngine(
            player_ids=[1, 2],
            active_teams=self.active_teams,
            bench_teams=self.bench_teams
        )

    def test_stun_action_skipping_and_decay(self):
        """Assert that stunned characters cannot act, and stuns correctly decay at end of turn."""
        p1 = 1
        p2 = 2
        
        # Give player 1 plenty of core energies
        for color in ["green", "red", "blue", "white"]:
            self.battle.player_states[p1].energy[color] = 5
        
        # Manually stun character slot 0 (Yuji) for 1 turn
        self.battle.char_states[p1][0].stun_turns = 1
        
        # Verify that active_chars_that_can_act does not include slot 0
        can_act = self.battle.active_chars_that_can_act(p1)
        self.assertNotIn(0, can_act)
        self.assertIn(1, can_act)
        self.assertIn(2, can_act)
        
        # Attempting to act with stunned Yuji should fail validation
        ok, err = self.battle.validate_action(p1, 0, "Strike", p2, 0)
        self.assertFalse(ok)
        self.assertIn("stunned and cannot act", err)
        
        # Act with slot 1 (Megumi)
        msgs = self.battle.apply_action(p1, 1, "Strike", p2, 0)
        self.assertTrue(any("used Strike" in m for m in msgs))
        
        # Act with slot 2 (Nobara)
        msgs = self.battle.apply_action(p1, 2, "Strike", p2, 0)
        self.assertTrue(any("used Strike" in m for m in msgs))
        
        # Player 1 has acted with slots 1 and 2. Slot 0 is stunned.
        # Since slot 0 is stunned, it cannot act, and all available characters (1 and 2) have acted.
        # The turn should have auto-advanced to player 2!
        self.assertEqual(self.battle.current_player_id, p2)
        
        # Now, the turn has advanced to player 2, and then player 2 takes turn or we manually advance it back to player 1.
        # Let's verify that player 1's stun decayed!
        # At the end of player 1's turn, stun_turns for slot 0 should have decremented from 1 to 0.
        self.assertEqual(self.battle.char_states[p1][0].stun_turns, 0)

    def test_end_turn_flexibility_no_softlock(self):
        """Assert players can voluntarily end their turn early and are not softlocked if all chars are stunned."""
        p1 = 1
        
        # Manually stun all player 1 active characters
        for cs in self.battle.char_states[p1][:3]:
            cs.stun_turns = 2
            
        # Verify no player 1 characters can act
        can_act = self.battle.active_chars_that_can_act(p1)
        self.assertEqual(len(can_act), 0)
        
        # Human player should still be allowed to end turn (or pass) without softlocking
        success, msgs = self.battle.end_turn(p1)
        self.assertTrue(success)
        
        # Turn should have advanced to player 2
        self.assertEqual(self.battle.current_player_id, 2)

    def test_target_safety_boundaries_aoe(self):
        """Assert that AoE / Target.ENEMIES hits only active characters (slots 0-2) and does not leak onto bench (3-4)."""
        p1 = 1
        p2 = 2
        
        # Give player 1 core energies for AoE Slash
        for color in ["green", "red", "blue", "white"]:
            self.battle.player_states[p1].energy[color] = 5
        
        # Reset HP of all player 2 characters
        for cs in self.battle.char_states[p2]:
            cs.current_hp = 100
            
        # Use AoE Slash
        msgs = self.battle.apply_action(p1, 0, "AoE Slash", p2, 0)
        
        # Active characters (0, 1, 2) should have taken damage
        self.assertLess(self.battle.char_states[p2][0].current_hp, 100)
        self.assertLess(self.battle.char_states[p2][1].current_hp, 100)
        self.assertLess(self.battle.char_states[p2][2].current_hp, 100)
        
        # Bench characters (3, 4) should NOT have taken damage (remains at 100)
        self.assertEqual(self.battle.char_states[p2][3].current_hp, 100)
        self.assertEqual(self.battle.char_states[p2][4].current_hp, 100)

    def test_target_safety_boundaries_validation(self):
        """Assert that players cannot manually target bench characters (slots 3-4) using single target skills."""
        p1 = 1
        p2 = 2
        
        # Give player 1 plenty of core energies
        for color in ["green", "red", "blue", "white"]:
            self.battle.player_states[p1].energy[color] = 5
        
        # Attempt to target player 2 bench slot 3 (Maki)
        ok, err = self.battle.validate_action(p1, 0, "Strike", p2, 3)
        self.assertFalse(ok)
        self.assertEqual(err, "Invalid target slot.")
        
        # Attempt to target player 2 active slot 2 (Nobara)
        ok, err = self.battle.validate_action(p1, 0, "Strike", p2, 2)
        self.assertTrue(ok)

    def test_wildcard_validation_and_spending(self):
        """Assert that manual wildcard payments are validated correctly, and spent correctly."""
        p1 = 1
        p2 = 2
        
        # 1. Setup exact energy levels for player 1: 1 green, 1 red, 0 blue, 0 white
        pstate = self.battle.player_states[p1]
        pstate.energy = {'green': 1, 'red': 1, 'blue': 0, 'white': 0}
        
        # Strike skill costs 1 black ("black")
        # Attempt with empty wildcard_pays -> fails validation since it expects 1 wildcard selection
        ok, err = self.battle.validate_action(p1, 0, "Strike", p2, 0, wildcard_pays=[])
        self.assertFalse(ok)
        self.assertIn("Incorrect number of wildcard selections", err)
        
        # Attempt with 2 selections -> fails validation
        ok, err = self.battle.validate_action(p1, 0, "Strike", p2, 0, wildcard_pays=["green", "red"])
        self.assertFalse(ok)
        self.assertIn("Incorrect number of wildcard selections", err)
        
        # Attempt with invalid color -> fails validation
        ok, err = self.battle.validate_action(p1, 0, "Strike", p2, 0, wildcard_pays=["yellow"])
        self.assertFalse(ok)
        self.assertIn("Invalid wildcard energy selection", err)
        
        # Attempt with a color we have 0 of (e.g. blue) -> fails validation
        ok, err = self.battle.validate_action(p1, 0, "Strike", p2, 0, wildcard_pays=["blue"])
        self.assertFalse(ok)
        self.assertIn("Not enough blue energy", err)
        
        # Attempt with a color we have 1 of (green) -> succeeds
        ok, err = self.battle.validate_action(p1, 0, "Strike", p2, 0, wildcard_pays=["green"])
        self.assertTrue(ok)
        
        # Apply the action and verify energy changes
        self.battle.apply_action(p1, 0, "Strike", p2, 0, wildcard_pays=["green"])
        self.assertEqual(pstate.energy['green'], 0)
        self.assertEqual(pstate.energy['red'], 1) # Red should be untouched
        
        # 2. Reset acted slot to allow another action for CPU fallback check
        self.battle.acted_slots[p1].clear()
        pstate.energy = {'green': 2, 'red': 5, 'blue': 1, 'white': 1}
        
        # Apply action without wildcard_pays (representing CPU or default fallback)
        # It should auto-spend the color we have the most of, which is red (5)
        self.battle.apply_action(p1, 0, "Strike", p2, 0)
        self.assertEqual(pstate.energy['red'], 4)
        self.assertEqual(pstate.energy['green'], 2)
        self.assertEqual(pstate.energy['blue'], 1)
        self.assertEqual(pstate.energy['white'], 1)

    def test_aoe_target_validation_dead_placeholder(self):
        """Assert that AoE enemy-targeting skills bypass the dead check on specific target slots."""
        p1 = 1
        p2 = 2
        
        # Give player 1 plenty of energy
        for color in ["green", "red", "blue", "white"]:
            self.battle.player_states[p1].energy[color] = 5
        
        # Kill the first active opponent character (slot 0, Yuji)
        self.battle.char_states[p2][0].current_hp = 0
        self.battle.char_states[p2][0].alive = False
        
        # Verify that AoE Slash (which is Target.ENEMIES) validates successfully even if target_slot is 0 (which is dead)
        ok, err = self.battle.validate_action(p1, 0, "AoE Slash", p2, 0)
        self.assertTrue(ok, f"AoE Slash validation failed unexpectedly: {err}")
        
        # Verify that a single target Strike fails validation when targeting slot 0 (which is dead)
        ok, err = self.battle.validate_action(p1, 0, "Strike", p2, 0)
        self.assertFalse(ok)
        self.assertEqual(err, "That target is already defeated.")

    def test_draft_five_pick_three_no_bench(self):
        """Assert that Game has 5 draft picks, submits exactly 3 active chars, and discards the other 2 (no bench)."""
        from jjk_bot.game import Game, GameState
        game = Game(1001)
        game.add_player(1, "Alice")
        game.start_game()
        
        # Verify draft size is 5, but battle selection is 3
        self.assertEqual(game.max_team_size, 5)
        self.assertEqual(game.battle_team_size, 3)
        
        # Populate draft with 5 dummy characters
        from jjk_bot.characters import Character
        chars = [
            Character(name=f"Sorcerer {i}", description="", image_url="", skills=[])
            for i in range(5)
        ]
        game.teams[1] = chars
        game.state = GameState.TEAM_SELECTION
        
        # Alice tries to submit active team
        # 1. Submitting 2 characters fails
        ok, err = game.submit_team(1, [c.name for c in chars[:2]])
        self.assertFalse(ok)
        self.assertIn("You must select exactly 3 characters", err)
        
        # 2. Submitting 3 characters succeeds
        ok, err = game.submit_team(1, [c.name for c in chars[:3]])
        self.assertTrue(ok)
        
        # 3. Verify that the 3 active characters are loaded, and the other 2 are discarded entirely (bench is empty)
        self.assertEqual(len(game.active_teams[1]), 3)
        self.assertEqual(len(game.bench_teams[1]), 0)

    def test_end_turn_with_no_action_allowed(self):
        """Assert that players can voluntarily end their turn at any time without having to act first."""
        p1 = 1
        p2 = 2
        
        # Give player 1 plenty of energy
        for color in ["green", "red", "blue", "white"]:
            self.battle.player_states[p1].energy[color] = 1
        
        # Verify that p1 has active unstunned characters who can act
        self.assertEqual(len(self.battle.active_chars_that_can_act(p1)), 3)
        self.assertEqual(len(self.battle.acted_slots[p1]), 0)
        
        # Try to voluntarily end the turn immediately without acting at all
        success, msgs = self.battle.end_turn(p1)
        
        # It should succeed without the "must act" validation error
        self.assertTrue(success)
        
        # Turn should successfully advance to player 2
        self.assertEqual(self.battle.current_player_id, p2)

if __name__ == "__main__":
    unittest.main()
