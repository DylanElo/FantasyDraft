import random
from enum import Enum, auto
from typing import List, Dict, Optional, Tuple, Union
from jjk_bot.characters import Character, get_random_character

class GameState(Enum):
    WAITING_FOR_PLAYERS = auto()
    IN_PROGRESS = auto() # Drafting
    DECIDING = auto()    # Drafting red-draw
    BATTLE = auto()      # Tactical Combat
    FINISHED = auto()

class Game:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.players: List[str] = [] 
        self.player_names: Dict[str, str] = {}
        self.teams: Dict[str, List[Character]] = {} 
        self.passes_used: Dict[str, bool] = {} 
        self.state = GameState.WAITING_FOR_PLAYERS
        self.current_player_idx = 0
        self.last_drawn_character: Optional[Character] = None
        self.max_team_size = 5

        # BATTLE STATE
        self.turn_count = 0
        self.hp: Dict[str, List[int]] = {} # player_id -> [hp1, hp2, ...]
        self.energy: Dict[str, Dict[str, int]] = {} # player_id -> {"blue": 2, ...}
        self.queued_actions: Dict[str, List[dict]] = {} # player_id -> [{"char_idx": 0, "skill_idx": 0, "target_idx": 0}, ...]
        self.battle_log: List[str] = []

    def add_player(self, player_id: str, name: str) -> Tuple[bool, str]:
        if self.state != GameState.WAITING_FOR_PLAYERS:
            return False, "Game already started."
        if player_id in self.players:
            return False, f"{name}, you're already in."
        self.players.append(player_id)
        self.player_names[player_id] = name
        self.teams[player_id] = []
        self.passes_used[player_id] = False
        return True, f"{name} joined."

    def start_game(self) -> Tuple[bool, str]:
        if len(self.players) < 2:
            return False, "Need 2 players."
        self.state = GameState.IN_PROGRESS
        self.current_player_idx = 0
        return True, "Draft started!"

    # ─── DRAFTING LOGIC ───────────────────────────────────────────────────────────
    def get_current_player_id(self) -> str:
        if not self.players: return ""
        return self.players[self.current_player_idx]

    def get_current_player_name(self) -> str:
        return self.player_names.get(self.get_current_player_id(), "Unknown")

    def draw(self, player_id: str) -> Tuple[bool, str, Optional[Character]]:
        if player_id != self.get_current_player_id(): return False, "Not your turn", None
        char = get_random_character()
        self.last_drawn_character = char
        if self.passes_used[player_id]:
            self.teams[player_id].append(char)
            self._next_turn()
            return True, f"Auto-kept {char.name}", char
        self.state = GameState.DECIDING
        return True, f"Drew {char.name}", char

    def keep(self, player_id: str) -> Tuple[bool, str]:
        if self.state != GameState.DECIDING: return False, "Nothing to keep"
        char = self.last_drawn_character
        self.teams[player_id].append(char)
        self._next_turn()
        return True, f"Kept {char.name}"

    def pass_card(self, player_id: str) -> Tuple[bool, str, Optional[Character]]:
        if self.passes_used[player_id]: return False, "Pass used", None
        self.passes_used[player_id] = True
        char = get_random_character()
        self.teams[player_id].append(char)
        self._next_turn()
        return True, f"Passed! New: {char.name}", char

    def _next_turn(self):
        self.current_player_idx = (self.current_player_idx + 1) % len(self.players)
        all_done = all(len(self.teams[p]) == self.max_team_size for p in self.players)
        if all_done:
            self._initialize_battle()
        else:
            if len(self.teams[self.get_current_player_id()]) == self.max_team_size:
                self._next_turn()
            else:
                self.state = GameState.IN_PROGRESS

    # ─── BATTLE ENGINE ────────────────────────────────────────────────────────────
    def _initialize_battle(self):
        self.state = GameState.BATTLE
        self.turn_count = 1
        for pid in self.players:
            self.hp[pid] = [c.hp for c in self.teams[pid]]
            self.energy[pid] = {"green": 1, "red": 1, "blue": 1, "white": 1, "black": 2}
            self.queued_actions[pid] = []
        self.battle_log.append("The Battle Begins!")

    def submit_actions(self, player_id: str, actions: List[dict]) -> Tuple[bool, str]:
        """actions: list of {'char_idx': int, 'skill_idx': int, 'target_idx': int}"""
        if self.state != GameState.BATTLE: return False, "Not in battle phase."
        self.queued_actions[player_id] = actions
        
        if all(pid in self.queued_actions and self.queued_actions[pid] for pid in self.players):
            self.resolve_turn()
            return True, "Turn resolved!"
        return True, "Actions locked in. Waiting for opponent..."

    def resolve_turn(self):
        """Simultaneous resolution of all queued actions."""
        p1, p2 = self.players[0], self.players[1]
        
        # 1. Resolve P1 actions onto P2
        self._execute_actions(p1, p2, self.queued_actions[p1])
        # 2. Resolve P2 actions onto P1
        self._execute_actions(p2, p1, self.queued_actions[p2])

        # Clear queues & Generate Energy
        for pid in self.players:
            self.queued_actions[pid] = []
            # Generate 1 random energy per alive character
            alive_count = sum(1 for h in self.hp[pid] if h > 0)
            colors = ["green", "red", "blue", "white", "black"]
            for _ in range(alive_count):
                c = random.choice(colors)
                self.energy[pid][c] = self.energy[pid].get(c, 0) + 1

        self.turn_count += 1
        
        # Check Win Condition
        p1_dead = all(h <= 0 for h in self.hp[p1])
        p2_dead = all(h <= 0 for h in self.hp[p2])
        if p1_dead or p2_dead:
            self.state = GameState.FINISHED

    def _execute_actions(self, actor_id: str, target_player_id: str, actions: List[dict]):
        for act in actions:
            char_idx = act.get('char_idx')
            skill_idx = act.get('skill_idx')
            target_idx = act.get('target_idx')
            
            if char_idx is None or skill_idx is None: continue
            if self.hp[actor_id][char_idx] <= 0: continue # Dead can't act

            char = self.teams[actor_id][char_idx]
            skill = char.skills[skill_idx]
            
            self.battle_log.append(f"{char.name} used {skill.name}!")
            
            for effect in skill.effects:
                etype = effect.get('type')
                val = effect.get('amount', 0)
                
                if etype == 'damage':
                    if target_idx is not None:
                        self.hp[target_player_id][target_idx] = max(0, self.hp[target_player_id][target_idx] - val)
                        self.battle_log.append(f" - Dealt {val} damage to {self.teams[target_player_id][target_idx].name}")
                elif etype == 'stun':
                    # TODO: Implement stun status
                    pass
                elif etype == 'invulnerable':
                    # TODO: Implement invulnerability
                    pass

    def get_results(self) -> Tuple[bool, str]:
        p1, p2 = self.players[0], self.players[1]
        p1_score = sum(self.hp[p1])
        p2_score = sum(self.hp[p2])
        winner = self.player_names[p1] if p1_score > p2_score else self.player_names[p2]
        return True, f"Battle Over! {winner} wins with {max(p1_score, p2_score)} total HP remaining!"

class GameManager:
    def __init__(self):
        self.games: Dict[str, Game] = {}
    def get_game(self, room_id: str) -> Game:
        if room_id not in self.games: self.games[room_id] = Game(room_id)
        return self.games[room_id]
    def reset_game(self, room_id: str):
        self.games[room_id] = Game(room_id)
