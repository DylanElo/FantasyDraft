import unittest
import collections
from jjk_bot.game import Game, GameState, CPU_PLAYER_ID
from jjk_bot.characters import get_random_character, CHARACTERS

class TestPhase11(unittest.TestCase):
    def test_yuta_variants_count_for_special_grade_synergy(self):
        """Assert that newer Yuta variants count as Yuta for special-grade team checks."""
        from jjk_bot.synergies import check_synergies

        synergies = check_synergies(["Gojo (Unsealed)", "Yuta Okkotsu (Sendai)", "Panda"])
        names = [s.name for s in synergies]

        self.assertIn("Special Grade Sorcerers", names)

    def test_unique_draft_pool_vs_cpu(self):
        """Assert that characters drafted by CPU are never present in the Human's draw_three pool, and team uniqueness is strictly enforced."""
        game = Game(123)
        
        # Start game vs CPU - CPU completes its full draft immediately
        success, msg = game.start_game_vs_cpu(1, "Alice")
        self.assertTrue(success)
        self.assertEqual(game.state, GameState.IN_PROGRESS)
        
        # CPU has drafted 5 characters
        cpu_team_names = [c.name for c in game.teams[CPU_PLAYER_ID]]
        self.assertEqual(len(cpu_team_names), 5)
        
        # Verify drafted_names has the CPU characters
        for name in cpu_team_names:
            self.assertIn(name, game.drafted_names)
            
        # Draw 3 for Human
        success, msg, choices = game.draw_three(1)
        self.assertTrue(success)
        self.assertEqual(len(choices), 3)
        
        # Assert none of the human's choices overlap with the CPU's drafted team
        for c in choices:
            self.assertNotIn(c.name, cpu_team_names)
            
        # Human picks the first choice
        chosen_char = choices[0]
        success, msg = game.choose_card(1, 0)
        self.assertTrue(success)
        self.assertIn(chosen_char.name, game.drafted_names)
        self.assertIn(chosen_char, game.teams[1])
        
        # Draw 3 again - choices must not overlap with CPU's team or the human's first choice
        success, msg, choices2 = game.draw_three(1)
        self.assertTrue(success)
        for c in choices2:
            self.assertNotIn(c.name, cpu_team_names)
            self.assertNotEqual(c.name, chosen_char.name)

    def test_rarity_probability_weights(self):
        """Assert that character choices respect rarity weights (Legendary 5%, Epic 20%, Rare 75%) over statistical distributions."""
        counts = collections.Counter()
        samples = 1000
        
        for _ in range(samples):
            char = get_random_character()
            counts[char.rarity] += 1
            
        # Verify the rank ordering of counts reflects the weights: Rare > Epic > Legendary
        self.assertGreater(counts["Rare"], counts["Epic"])
        self.assertGreater(counts["Epic"], counts["Legendary"])
        
        # Check statistical sanity limits (with 1000 samples, Legendary should be > 5 and Rare > 400)
        self.assertGreater(counts["Rare"], 500)
        self.assertGreater(counts["Epic"], 50)
        self.assertGreater(counts["Legendary"], 5)
        
        print(f"Rarity Distribution in 1000 samples: {dict(counts)}")

    def test_living_count_active_only(self):
        """Assert that living_count only counts active fighter slots (0-2) and ignores the bench slots (3-4)."""
        game = Game(123)
        # Start game vs CPU (initializes players, teams, CPU player draft)
        game.start_game_vs_cpu(1, "Alice")
        # Prepopulate roster after initialization so it is not cleared
        game.teams[1] = [
            CHARACTERS[0], CHARACTERS[1], CHARACTERS[2], CHARACTERS[3], CHARACTERS[4]
        ]
        game.active_teams[1] = game.teams[1][:3]
        game.bench_teams[1] = game.teams[1][3:]
        
        # Start battle manually
        from jjk_bot.game import BattleEngine
        game.battle = BattleEngine(
            player_ids=game.players,
            active_teams=game.active_teams,
            bench_teams=game.bench_teams
        )
        
        # Assert that initially 3 active characters are alive
        self.assertEqual(game.battle.living_count(1), 3)
        
        # Kill an active character slot 0
        game.battle.char_states[1][0].current_hp = 0
        game.battle.char_states[1][0].alive = False
        
        # Assert living_count is now 2
        self.assertEqual(game.battle.living_count(1), 2)
        
        # Kill bench character slot 3 (not an active fighter slot)
        game.battle.char_states[1][3].current_hp = 0
        game.battle.char_states[1][3].alive = False
        
        # Assert living_count remains 2, because slot 3 is bench and not counted!
        self.assertEqual(game.battle.living_count(1), 2)

    def test_cpu_synergy_draft(self):
        """Assert that the CPU synergy drafting algorithm successfully chooses a synergistic combination when possible."""
        game = Game(456)
        # Manually assign CPU a synergistic drafted pool:
        # e.g., Yuji Itadori, Megumi Fushiguro, Nobara Kugisaki (gives Tokyo First Years synergy), and Panda, Kusakabe
        # We find characters by name in CHARACTERS
        yuji = next(c for c in CHARACTERS if c.name == "Yuji Itadori")
        megumi = next(c for c in CHARACTERS if c.name == "Megumi Fushiguro")
        nobara = next(c for c in CHARACTERS if c.name == "Nobara Kugisaki")
        panda = next(c for c in CHARACTERS if c.name == "Panda")
        kusakabe = next(c for c in CHARACTERS if c.name == "Kusakabe")
        
        # Set CPU team
        game.teams[CPU_PLAYER_ID] = [panda, kusakabe, yuji, megumi, nobara]
        game.player_names[CPU_PLAYER_ID] = "CPU"
        
        # Run completed draft team selection
        game._cpu_complete_draft()
        
        # CPU active team must be Yuji, Megumi, and Nobara because of the Tokyo First Years synergy (+100 score)
        active_names = [c.name for c in game.active_teams[CPU_PLAYER_ID]]
        self.assertIn("Yuji Itadori", active_names)
        self.assertIn("Megumi Fushiguro", active_names)
        self.assertIn("Nobara Kugisaki", active_names)
