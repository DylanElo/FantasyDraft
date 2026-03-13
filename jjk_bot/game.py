import random
from enum import Enum, auto
from typing import List, Dict, Optional, Tuple
from jjk_bot.characters import Character, get_random_character

class GameState(Enum):
    WAITING_FOR_PLAYERS = auto()
    IN_PROGRESS = auto()
    DECIDING = auto() # Waiting for a player to Keep or Pass
    FINISHED = auto()

class Game:
    def __init__(self, chat_id: int):
        self.chat_id = chat_id
        self.players = [] # List of player IDs
        self.player_names = {} # player_id -> name
        self.teams: Dict[int, List[Character]] = {} # player_id -> List[Character]
        self.passes_used: Dict[int, bool] = {} # player_id -> bool
        self.state = GameState.WAITING_FOR_PLAYERS
        self.current_player_idx = 0
        self.last_drawn_character: Optional[Character] = None
        self.max_team_size = 5

    def add_player(self, player_id: int, name: str) -> Tuple[bool, str]:
        if self.state != GameState.WAITING_FOR_PLAYERS:
            return False, "Game already started or finished."
        if player_id in self.players:
            return False, f"{name}, you're already in the game!"

        self.players.append(player_id)
        self.player_names[player_id] = name
        self.teams[player_id] = []
        self.passes_used[player_id] = False
        return True, f"{name} joined the game!"

    def start_game(self) -> Tuple[bool, str]:
        if self.state != GameState.WAITING_FOR_PLAYERS:
            if self.state == GameState.FINISHED:
                 return False, "Game is already finished. Start a new one with /start."
            return False, "Game already started."
        if len(self.players) < 2:
            return False, "At least 2 players are needed to start."

        self.state = GameState.IN_PROGRESS
        self.current_player_idx = 0
        return True, f"Game started! It's {self.get_current_player_name()}'s turn. Use /draw to get a card."

    def get_current_player_id(self) -> int:
        if not self.players:
            return -1
        return self.players[self.current_player_idx]

    def get_current_player_name(self) -> str:
        player_id = self.get_current_player_id()
        return self.player_names.get(player_id, "Unknown")

    def draw(self, player_id: int) -> Tuple[bool, str, Optional[Character]]:
        if player_id != self.get_current_player_id():
            return False, f"It's not your turn! It's {self.get_current_player_name()}'s turn.", None

        if self.state != GameState.IN_PROGRESS:
            if self.state == GameState.DECIDING:
                return False, "You already drew a card! Choose /keep or /pass.", None
            return False, "The game is not in progress.", None

        char = get_random_character()
        self.last_drawn_character = char

        if self.passes_used[player_id]:
            # Already used pass, must keep
            self.teams[player_id].append(char)
            msg = f"{self.player_names[player_id]} drew {char.name}. You've already used your pass, so you keep this card!"
            self._next_turn()
            if self.state == GameState.FINISHED:
                msg += "\n\nAll players have 5 characters! Use /result to see the winner."
            else:
                msg += f"\n\nIt's now {self.get_current_player_name()}'s turn."
            return True, msg, char
        else:
            self.state = GameState.DECIDING
            msg = f"{self.player_names[player_id]} drew {char.name}. Do you want to /keep or /pass?"
            return True, msg, char

    def keep(self, player_id: int) -> Tuple[bool, str]:
        if self.state != GameState.DECIDING:
            return False, "There's nothing to keep right now."
        if player_id != self.get_current_player_id():
            return False, "It's not your turn!"

        char = self.last_drawn_character
        self.teams[player_id].append(char)
        msg = f"{self.player_names[player_id]} kept {char.name}!"

        self._next_turn()
        if self.state == GameState.FINISHED:
            msg += "\n\nAll players have 5 characters! Use /result to see the winner."
        else:
            msg += f"\n\nIt's now {self.get_current_player_name()}'s turn."
        return True, msg

    def pass_card(self, player_id: int) -> Tuple[bool, str, Optional[Character]]:
        if player_id != self.get_current_player_id():
            return False, "It's not your turn!", None
        if self.state != GameState.DECIDING:
            return False, "There's nothing to pass right now.", None
        if self.passes_used[player_id]:
            return False, "You've already used your pass!", None

        self.passes_used[player_id] = True
        new_char = get_random_character()
        self.teams[player_id].append(new_char)
        msg = f"{self.player_names[player_id]} passed! Their new draw is {new_char.name}, which they must keep."

        self._next_turn()
        if self.state == GameState.FINISHED:
            msg += "\n\nAll players have 5 characters! Use /result to see the winner."
        else:
            msg += f"\n\nIt's now {self.get_current_player_name()}'s turn."
        return True, msg, new_char

    def _next_turn(self):
        num_players = len(self.players)
        # Move to next player
        self.current_player_idx = (self.current_player_idx + 1) % num_players

        # Check if everyone is done
        all_done = all(len(self.teams[p]) == self.max_team_size for p in self.players)

        if all_done:
            self.state = GameState.FINISHED
        else:
            # If the current player already has 5 cards, move to next
            if len(self.teams[self.get_current_player_id()]) == self.max_team_size:
                self._next_turn()
            else:
                self.state = GameState.IN_PROGRESS

    def resolve_battle(self) -> List[Tuple[int, str, List[str]]]:
        """
        Score each team by the total energy cost across all skills of all characters.
        A skill's energy cost = the number of energy tokens in its energy list.
        Higher total = more powerful team. Ties are broken randomly.
        """
        results = []
        for p_id in self.players:
            team = self.teams[p_id]
            score = sum(
                len(skill.energy)
                for char in team
                for skill in char.skills
            )
            team_names = [c.name for c in team]
            results.append((score, self.player_names[p_id], team_names))

        results.sort(key=lambda x: (x[0], random.random()), reverse=True)
        return results

    def get_results(self) -> Tuple[bool, str]:
        if not self.players:
            return False, "No players in the game."

        results = self.resolve_battle()

        msg = "🏆 *Game Results* 🏆\n\n"
        for i, (score, name, team) in enumerate(results):
            medal = "🥇" if i == 0 else "🥈" if i == 1 else "🥉" if i == 2 else "👤"
            team_str = ", ".join(team) if team else "Empty"
            msg += f"{medal} *{name}* — {score} pts\n"
            msg += f"Team: {team_str}\n\n"

        if self.state == GameState.FINISHED:
            winner = results[0][1]
            msg += f"The winner is *{winner}*! Congratulations! 🎉"
        else:
            msg += "Draft is still in progress!"

        return True, msg

class GameManager:
    def __init__(self):
        self.games: Dict[int, Game] = {}

    def get_game(self, chat_id: int) -> Game:
        if chat_id not in self.games:
            self.games[chat_id] = Game(chat_id)
        return self.games[chat_id]

    def reset_game(self, chat_id: int):
        self.games[chat_id] = Game(chat_id)
