import random
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import List, Dict, Optional, Tuple, Any
from jjk_bot.characters import Character, get_random_character
from jjk_bot.effects import Effect, EffectKind, Target

class GameState(Enum):
    WAITING_FOR_PLAYERS = auto()
    IN_PROGRESS = auto()
    DECIDING = auto() # Waiting for a player to Keep or Pass
    TEAM_SELECTION = auto() # Players pick 3 out of 5
    BATTLE = auto() # Active tactical battle
    FINISHED = auto()


class Trigger(Enum):
    ON_HARM = auto()
    ON_DEATH = auto()
    ON_RES = auto()
    ON_ACTION = auto()
    ON_HEALED = auto()

@dataclass
class Trap:
    trigger: Trigger
    skill: Any
    user_pid: int
    user_slot: int
    turns_remaining: int = -1
    is_soulbound: bool = False

@dataclass
class Channel:
    skill: Any
    target_pid: int
    target_slot: int
    turns_remaining: int
    is_soulbound: bool = False

@dataclass
class Bomb:
    skill: Any
    user_pid: int
    user_slot: int
    turns_remaining: int
    trigger_on_remove: bool = False
    is_soulbound: bool = False


# ─────────────────────────────────────────────────────────────────────────────
#  BATTLE ENGINE DATA MODELS
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class CharacterBattleState:
    char_name: str
    max_hp: int = 100
    current_hp: int = 100
    alive: bool = True

    # Per-skill cooldown tracking: skill_name -> turns_remaining
    cooldowns: Dict[str, int] = field(default_factory=dict)

    # Active effects (integer = turns remaining; 0 = inactive)
    stun_turns: int = 0
    invuln_turns: int = 0
    damage_reduction: int = 0
    dr_turns: int = 0
    destructible_defense: int = 0
    dd_turns: int = 0
    increase_damage: int = 0
    inc_dmg_turns: int = 0
    decrease_damage: int = 0
    dec_dmg_turns: int = 0
    dot_damage: int = 0
    dot_turns: int = 0

    # One-shot bonuses cleared after use
    bonus_damage: int = 0
    
    # Advanced Unison Mechanics
    traps: List[Trap] = field(default_factory=list)
    channels: List[Channel] = field(default_factory=list)
    bombs: List[Bomb] = field(default_factory=list)

    def take_damage(self, amount: int, is_piercing: bool = False,
                    is_affliction: bool = False, ignores_invuln: bool = False) -> int:
        """Apply damage using the exact Naruto Arena 3-Tier Defense System."""
        if self.invuln_turns > 0 and not is_affliction and not ignores_invuln:
            return 0

        effective_hp_damage = 0

        if is_affliction:
            # AFFLICTION: Ignores ALL defenses (Damage Reduction + Shields), goes straight to HP
            effective_hp_damage = amount
        elif is_piercing:
            # PIERCING: Ignores Damage Reduction, but hits Shields first
            if self.destructible_defense > 0:
                absorbed = min(amount, self.destructible_defense)
                self.destructible_defense -= absorbed
                effective_hp_damage = amount - absorbed
            else:
                effective_hp_damage = amount
        else:
            # NORMAL: Subject to Damage Reduction, then Shields, then HP
            reduced_damage = max(0, amount - self.damage_reduction)
            if reduced_damage > 0 and self.destructible_defense > 0:
                absorbed = min(reduced_damage, self.destructible_defense)
                self.destructible_defense -= absorbed
                effective_hp_damage = reduced_damage - absorbed
            else:
                effective_hp_damage = reduced_damage

        self.current_hp = max(0, self.current_hp - effective_hp_damage)
        if self.current_hp <= 0:
            self.alive = False
        return effective_hp_damage

    def heal_hp(self, amount: int) -> int:
        """Heal up to max_hp. Returns actual amount healed."""
        before = self.current_hp
        self.current_hp = min(self.max_hp, self.current_hp + amount)
        return self.current_hp - before

    def tick_turn_start(self) -> List[str]:
        """Called at the start of a turn for this character. Returns log messages."""
        msgs = []
        if self.dot_turns > 0:
            # DoT is inherently an affliction
            dmg = self.take_damage(self.dot_damage, is_affliction=True)
            if dmg > 0:
                msgs.append(f"{self.char_name} takes {dmg} damage from a cursed effect.")
                if not self.alive:
                    msgs.append(f"{self.char_name} has been defeated!")
                    # NOTE: We can't clear_soulbound here directly because CharacterBattleState doesn't have reference to BattleEngine
                    # But the caller of tick_turn_start (battle_action) checks for death immediately after and clears it.
            self.dot_turns -= 1
            if self.dot_turns == 0:
                self.dot_damage = 0
        # Invuln expires at start of the protected character's OWN next turn,
        # so it persists through the opponent's full turn.
        if self.invuln_turns > 0:
            self.invuln_turns -= 1
        return msgs

    def tick_turn_end(self) -> List[str]:
        """Called at the end of a turn for this character."""
        msgs = []
        if self.stun_turns > 0:
            self.stun_turns -= 1
        if self.dr_turns > 0:
            self.dr_turns -= 1
            if self.dr_turns == 0:
                self.damage_reduction = 0
        if self.dd_turns > 0:
            self.dd_turns -= 1
            if self.dd_turns == 0:
                self.destructible_defense = 0
        if self.inc_dmg_turns > 0:
            self.inc_dmg_turns -= 1
            if self.inc_dmg_turns == 0:
                self.increase_damage = 0
        if self.dec_dmg_turns > 0:
            self.dec_dmg_turns -= 1
            if self.dec_dmg_turns == 0:
                self.decrease_damage = 0

        for skill_name in list(self.cooldowns.keys()):
            if self.cooldowns[skill_name] > 0:
                self.cooldowns[skill_name] -= 1

        active_bombs = []
        for bomb in self.bombs:
            bomb.turns_remaining -= 1
            if bomb.turns_remaining <= 0:
                dmg = self.take_damage(bomb.skill.bomb_damage, is_affliction=bomb.skill.is_affliction)
                msgs.append(f"💣 BOMB DETONATED! {bomb.skill.name} explodes on {self.char_name} for {dmg} damage!")
                if not self.alive:
                    msgs.append(f"{self.char_name} has been defeated by a bomb explosion!")
                    # Bomb deaths also trigger soulbound clears, but handled in battle_action.
            else:
                active_bombs.append(bomb)
        self.bombs = active_bombs
        return msgs


@dataclass
class PlayerBattleState:
    player_id: int
    energy: Dict[str, int] = field(default_factory=lambda: {
        'green': 0, 'red': 0, 'blue': 0, 'white': 0
    })
    synergy_bonus_damage: int = 0
    synergy_bonus_affliction: int = 0
    synergy_immune_stun: bool = False
    active_synergies: List[str] = field(default_factory=list)

    def gain_energy_for_living(self, living_count: int, rng=None):
        """Gain 1 random energy of the 4 core types per living character."""
        if rng is None:
            rng = random
        colors = ['green', 'red', 'blue', 'white']
        for _ in range(living_count):
            self.energy[rng.choice(colors)] += 1

    def can_afford(self, cost: List[str]) -> bool:
        temp = dict(self.energy)
        black_cost = 0
        for c in cost:
            if c == 'black':
                black_cost += 1
            else:
                if temp.get(c, 0) <= 0:
                    return False
                temp[c] -= 1
        
        surplus = sum(max(0, temp.get(color, 0)) for color in ['green', 'red', 'blue', 'white'])
        return surplus >= black_cost

    def spend(self, cost: List[str], wildcard_pays: List[str] = None):
        specific_costs = [c for c in cost if c != 'black']
        for c in specific_costs:
            self.energy[c] = max(0, self.energy[c] - 1)
        
        if wildcard_pays:
            for c in wildcard_pays:
                self.energy[c] = max(0, self.energy[c] - 1)
        else:
            # CPU Fallback: spend from color we have the most of
            num_wildcards = cost.count('black')
            for _ in range(num_wildcards):
                max_color = max(
                    ['green', 'red', 'blue', 'white'],
                    key=lambda c: self.energy.get(c, 0)
                )
                self.energy[max_color] = max(0, self.energy[max_color] - 1)


class BattleEngine:
    def __init__(self, player_ids: List[int], active_teams: Dict[int, List[Character]], bench_teams: Dict[int, List[Character]]):
        self.player_ids = list(player_ids)
        self.turn_number: int = 1
        self.current_player_idx: int = 0
        self.action_log: List[str] = []
        self.winner_id: Optional[int] = None

        # Build per-character battle states (including bench)
        self.char_states: Dict[int, List[CharacterBattleState]] = {}
        for pid in self.player_ids:
            active_states = [CharacterBattleState(char_name=c.name) for c in active_teams[pid]]
            bench_states = [CharacterBattleState(char_name=c.name) for c in bench_teams[pid]]
            self.char_states[pid] = active_states + bench_states

        # Build per-player energy states
        self.player_states: Dict[int, PlayerBattleState] = {
            pid: PlayerBattleState(player_id=pid)
            for pid in self.player_ids
        }

        # Keep reference to Character objects for skill lookup (active + bench)
        self.all_team_chars: Dict[int, List[Character]] = {}
        for pid in self.player_ids:
            self.all_team_chars[pid] = active_teams[pid] + bench_teams[pid]

        # 3-skills-per-turn tracking: which char slots have acted this turn
        # { player_id: set of char slots that have already used a skill this turn }
        self.acted_slots: Dict[int, set] = {pid: set() for pid in self.player_ids}

        # Award starting energy for turn 1: 1 random colored energy only, per Naruto Arena spec
        # (Black/Generic is only awarded on subsequent turns as the guaranteed pip)
        first_pid = self.player_ids[0]
        self.player_states[first_pid].gain_energy_for_living(1)

        # Run first turn start ticking
        for cs in self.char_states[first_pid]:
            if cs.alive:
                cs.tick_turn_start()

        # Check and apply synergies
        from jjk_bot.synergies import check_synergies
        for pid in self.player_ids:
            team_names = [c.name for c in active_teams[pid]]
            syns = check_synergies(team_names)
            pstate = self.player_states[pid]
            pstate.active_synergies = [s.name for s in syns]

            for s in syns:
                # Apply starting energy bonuses
                for color, qty in s.bonus_energy.items():
                    if color == 'black':
                        colors = ['green', 'red', 'blue', 'white']
                        for _ in range(qty):
                            pstate.energy[random.choice(colors)] += 1
                    else:
                        pstate.energy[color] += qty
                # Apply passive combat bonuses
                pstate.synergy_bonus_damage += s.bonus_damage
                pstate.synergy_bonus_affliction += s.bonus_affliction
                if s.immune_to_stun:
                    pstate.synergy_immune_stun = True

                # Tokyo Faculty starting DR
                if s.tokyo_faculty_dr:
                    for cs in self.char_states[pid]:
                        cs.damage_reduction = max(cs.damage_reduction, 15)
                        cs.dr_turns = max(cs.dr_turns, 1)

                # Prison Realm starting stun
                if s.prison_realm_stun:
                    opp_id = self.get_opponent_id(pid)
                    enemy_actives = [cs for cs in self.char_states[opp_id][:3] if cs.alive]
                    if enemy_actives:
                        import random as engine_random
                        target_enemy = engine_random.choice(enemy_actives)
                        target_enemy.stun_turns = max(target_enemy.stun_turns, 1)
                        self.action_log.append(f"Prison Realm! {target_enemy.char_name} is sealed and stunned for 1 turn at battle start!")

    @property
    def current_player_id(self) -> int:
        return self.player_ids[self.current_player_idx]

    def get_opponent_id(self, player_id: int) -> int:
        for pid in self.player_ids:
            if pid != player_id:
                return pid
        return player_id

    def is_tokyo_first_years_active(self, player_id: int) -> bool:
        pstate = self.player_states[player_id]
        if "Tokyo First Years" not in pstate.active_synergies:
            return False
        active_cs = self.char_states[player_id][:3]
        living_names = {cs.char_name for cs in active_cs if cs.alive}
        from jjk_bot.synergies import matches_name
        has_yuji = any(matches_name(n, "Yuji") for n in living_names)
        has_megumi = any(matches_name(n, "Megumi") for n in living_names)
        has_nobara = any(matches_name(n, "Nobara") for n in living_names)
        return has_yuji and has_megumi and has_nobara

    def get_adjusted_cost(self, player_id: int, skill: Any) -> List[str]:
        cost = list(skill.energy)
        pstate = self.player_states[player_id]
        
        if "Black Flash Masters" in pstate.active_synergies:
            if "black" in cost:
                cost.remove("black")
                
        if "Heavenly Restriction" in pstate.active_synergies and "Physical" in skill.classes:
            if cost:
                if "black" in cost:
                    cost.remove("black")
                else:
                    cost.pop(0)
        return cost

    def living_count(self, player_id: int) -> int:
        return sum(1 for cs in self.char_states[player_id][:3] if cs.alive)

    def get_skill(self, player_id: int, char_slot: int, skill_name: str):
        """Return the Skill object or None."""
        team = self.all_team_chars.get(player_id, [])
        if char_slot < 0 or char_slot >= len(team):
            return None
        char = team[char_slot]
        return next((s for s in char.skills if s.name == skill_name), None)

    def clear_soulbound(self, dead_pid: int, dead_slot: int):
        """Removes all Traps, Channels, and Bombs originating from a specific character that are soulbound."""
        for pid, states in self.char_states.items():
            for cs in states:
                cs.traps = [t for t in cs.traps if not (t.user_pid == dead_pid and t.user_slot == dead_slot and t.is_soulbound)]
                cs.channels = [c for c in cs.channels if not (c.target_pid == dead_pid and c.target_slot == dead_slot and c.is_soulbound)]
                cs.bombs = [b for b in cs.bombs if not (b.user_pid == dead_pid and b.user_slot == dead_slot and b.is_soulbound)]

    def is_battle_over(self) -> bool:
        """Check if any player has 0 living ACTIVE characters (slots 0-2)."""
        dead_players = []
        for pid in self.player_ids:
            active_living = sum(1 for cs in self.char_states[pid][:3] if cs.alive)
            if active_living == 0:
                dead_players.append(pid)

        if not dead_players:
            return False

        alive_players = [pid for pid in self.player_ids if pid not in dead_players]
        if alive_players:
            self.winner_id = alive_players[0]
        else:
            # All dead simultaneously — pick player with most HP remaining
            self.winner_id = max(
                self.player_ids,
                key=lambda pid: sum(cs.current_hp for cs in self.char_states[pid])
            )
        return True

    # ── Effect Pipeline ───────────────────────────────────────────────────────

    def _resolve_targets(self, effect: Effect, player_id: int, char_slot: int,
                         target_player_id: int, target_slot: int) -> List[Tuple[int, int]]:
        """Expand an Effect's Target into concrete (pid, slot) pairs."""
        t = effect.target
        opp_id = self.get_opponent_id(player_id)
        solo = (opp_id == player_id)

        if t == Target.ENEMY:
            return [(target_player_id, target_slot)]

        elif t == Target.ENEMIES:
            if solo:
                return []
            return [
                (opp_id, s)
                for s in range(min(3, len(self.char_states[opp_id])))
                if self.char_states[opp_id][s].alive
            ]

        elif t == Target.SELF:
            return [(player_id, char_slot)]

        elif t == Target.ALLY:
            return [(target_player_id, target_slot)]

        elif t == Target.ALLIES:
            return [
                (player_id, s)
                for s in range(min(3, len(self.char_states[player_id])))
                if self.char_states[player_id][s].alive
            ]

        elif t == Target.XALLIES:
            return [
                (player_id, s)
                for s in range(min(3, len(self.char_states[player_id])))
                if self.char_states[player_id][s].alive and s != char_slot
            ]

        return []

    def _fire_on_harm_traps(self, attacker_pid: int, attacker_slot: int,
                            defender_pid: int, defender_slot: int,
                            msgs: List[str]) -> None:
        """Fire all ON_HARM traps on the defender, dealing counter-damage to attacker."""
        attacker_cs = self.char_states[attacker_pid][attacker_slot]
        defender_cs = self.char_states[defender_pid][defender_slot]
        triggered = []

        for trap_obj in list(defender_cs.traps):
            if trap_obj.trigger != Trigger.ON_HARM:
                continue
            trap_dmg = 0
            for eff in trap_obj.skill.effects:
                if eff.kind == EffectKind.TRAP:
                    trap_dmg = eff.trap_value
                    break
            if trap_dmg <= 0:
                continue
            counter = attacker_cs.take_damage(trap_dmg)
            msgs.append(f"Counter-trap fires! {defender_cs.char_name} retaliates for {counter} damage against {attacker_cs.char_name}!")
            triggered.append(trap_obj)
            if not attacker_cs.alive:
                msgs.append(f"{attacker_cs.char_name} was defeated by a counter-trap!")
                self.clear_soulbound(attacker_pid, attacker_slot)
                break

        for t in triggered:
            if t in defender_cs.traps:
                defender_cs.traps.remove(t)

    def _resolve_single_effect(self, effect: Effect, user_pid: int, user_slot: int,
                                t_pid: int, t_slot: int, skill: Any,
                                msgs: List[str]) -> None:
        """Apply one Effect to one resolved target."""
        user_cs = self.char_states[user_pid][user_slot]
        tcs = self.char_states[t_pid][t_slot]

        if not tcs.alive:
            return

        kind = effect.kind

        user_pstate = self.player_states.get(user_pid)

        if kind == EffectKind.DAMAGE:
            syn_dmg = user_pstate.synergy_bonus_damage if user_pstate else 0
            tokyo_bonus = 5 if self.is_tokyo_first_years_active(user_pid) else 0
            zenin_bonus = 10 if (user_pstate and "Zenin Clan" in user_pstate.active_synergies and "Physical" in skill.classes) else 0
            best_friends_dmg = 0
            if user_pstate and "Best Friends" in user_pstate.active_synergies:
                if "Yuji" in user_cs.char_name and "Physical" in skill.classes:
                    best_friends_dmg = 20
            copy_bonus = 0
            if user_pstate and "JJK 0 Unit" in user_pstate.active_synergies and "Copy" in skill.name:
                copy_bonus = 10

            raw = max(0, effect.value + user_cs.increase_damage + user_cs.bonus_damage + syn_dmg + tokyo_bonus + zenin_bonus + best_friends_dmg + copy_bonus - tcs.decrease_damage)
            
            is_piercing = False
            if "Physical" in skill.classes and user_pstate and "Sorcerer Killers" in user_pstate.active_synergies:
                is_piercing = True

            actual = tcs.take_damage(raw, is_piercing=is_piercing, is_affliction=False, ignores_invuln=skill.ignores_invuln)
            if actual == 0 and tcs.invuln_turns > 0 and not skill.ignores_invuln:
                msgs.append(f"{tcs.char_name} is invulnerable!")
            else:
                pierce_label = " piercing" if is_piercing else ""
                msgs.append(f"{user_cs.char_name} dealt {actual}{pierce_label} damage to {tcs.char_name}.")
            if actual > 0 and tcs.alive:
                self._fire_on_harm_traps(user_pid, user_slot, t_pid, t_slot, msgs)
            if not tcs.alive:
                msgs.append(f"{tcs.char_name} has been defeated!")
                self.clear_soulbound(t_pid, t_slot)

        elif kind == EffectKind.PIERCE:
            syn_dmg = user_pstate.synergy_bonus_damage if user_pstate else 0
            tokyo_bonus = 5 if self.is_tokyo_first_years_active(user_pid) else 0
            zenin_bonus = 10 if (user_pstate and "Zenin Clan" in user_pstate.active_synergies and "Physical" in skill.classes) else 0
            best_friends_dmg = 0
            if user_pstate and "Best Friends" in user_pstate.active_synergies:
                if "Yuji" in user_cs.char_name and "Physical" in skill.classes:
                    best_friends_dmg = 20
            copy_bonus = 0
            if user_pstate and "JJK 0 Unit" in user_pstate.active_synergies and "Copy" in skill.name:
                copy_bonus = 10

            raw = max(0, effect.value + user_cs.increase_damage + user_cs.bonus_damage + syn_dmg + tokyo_bonus + zenin_bonus + best_friends_dmg + copy_bonus - tcs.decrease_damage)
            actual = tcs.take_damage(raw, is_piercing=True, is_affliction=False, ignores_invuln=skill.ignores_invuln)
            if actual == 0 and tcs.invuln_turns > 0 and not skill.ignores_invuln:
                msgs.append(f"{tcs.char_name} is invulnerable!")
            else:
                msgs.append(f"{user_cs.char_name} dealt {actual} piercing damage to {tcs.char_name}.")
            if actual > 0 and tcs.alive:
                self._fire_on_harm_traps(user_pid, user_slot, t_pid, t_slot, msgs)
            if not tcs.alive:
                msgs.append(f"{tcs.char_name} has been defeated!")
                self.clear_soulbound(t_pid, t_slot)

        elif kind == EffectKind.AFFLICT:
            syn_aff = user_pstate.synergy_bonus_affliction if user_pstate else 0
            choso_bonus = 0
            if "Choso" in user_cs.char_name and user_pstate and "Death Paintings" in user_pstate.active_synergies:
                choso_bonus = 10
            vessel_affliction_bonus = 0
            if "Yuji" in user_cs.char_name and user_pstate and "Vessel and Curse" in user_pstate.active_synergies:
                vessel_affliction_bonus = 20

            actual = tcs.take_damage(effect.value + syn_aff + choso_bonus + vessel_affliction_bonus, is_piercing=False, is_affliction=True)
            msgs.append(f"{user_cs.char_name} dealt {actual} affliction damage to {tcs.char_name}.")
            if not tcs.alive:
                msgs.append(f"{tcs.char_name} has been defeated!")
                self.clear_soulbound(t_pid, t_slot)

        elif kind == EffectKind.HEAL:
            if skill.name == "Idle Death Gamble" and t_pid == user_pid and t_slot == user_slot:
                if random.random() < 0.40:
                    tcs.current_hp = tcs.max_hp
                    tcs.invuln_turns = max(tcs.invuln_turns, 2)
                    tcs.increase_damage = max(tcs.increase_damage, 30)
                    tcs.inc_dmg_turns = max(tcs.inc_dmg_turns, 2)
                    msgs.append("🎰 JACKPOT! Kinji Hakari hits the Idle Death Gamble Jackpot! Fully healed, invulnerable for 2 turns, and deals +30 damage!")
                else:
                    healed = tcs.heal_hp(effect.value)
                    msgs.append(f"{tcs.char_name} restored {healed} HP (Jackpot missed).")
            else:
                healed = tcs.heal_hp(effect.value)
                msgs.append(f"{tcs.char_name} restored {healed} HP.")

        elif kind == EffectKind.STUN:
            target_player_state = self.player_states.get(t_pid)
            if target_player_state and target_player_state.synergy_immune_stun:
                msgs.append(f"{tcs.char_name} is immune to stuns (Synergy)!")
            else:
                best_friends_stun = 0
                if user_pstate and "Best Friends" in user_pstate.active_synergies and "Todo" in user_cs.char_name:
                    best_friends_stun = 1
                tcs.stun_turns = max(tcs.stun_turns, effect.turns + best_friends_stun)
                msgs.append(f"{tcs.char_name} is stunned for {effect.turns + best_friends_stun} turn(s).")

        elif kind == EffectKind.INVULN:
            tcs.invuln_turns = max(tcs.invuln_turns, effect.turns)
            msgs.append(f"{tcs.char_name} is invulnerable for {effect.turns} turn(s).")

        elif kind == EffectKind.REDUCE:
            tcs.damage_reduction = max(tcs.damage_reduction, effect.value)
            tcs.dr_turns = max(tcs.dr_turns, effect.turns)
            msgs.append(f"{tcs.char_name} gains {effect.value} damage reduction for {effect.turns} turn(s).")

        elif kind == EffectKind.STRENGTHEN:
            tcs.increase_damage = max(tcs.increase_damage, effect.value)
            tcs.inc_dmg_turns = max(tcs.inc_dmg_turns, effect.turns)
            msgs.append(f"{tcs.char_name} gains +{effect.value} bonus damage for {effect.turns} turn(s).")

        elif kind == EffectKind.WEAKEN:
            target_player_state = self.player_states.get(t_pid)
            if target_player_state and "Heavenly Restriction" in target_player_state.active_synergies:
                msgs.append(f"{tcs.char_name} is immune to weaken (Heavenly Restriction)!")
            else:
                tcs.decrease_damage = max(tcs.decrease_damage, effect.value)
                tcs.dec_dmg_turns = max(tcs.dec_dmg_turns, effect.turns)
                msgs.append(f"{tcs.char_name} is weakened by {effect.value} damage for {effect.turns} turn(s).")

        elif kind == EffectKind.DEFEND:
            tcs.destructible_defense += effect.value
            tcs.dd_turns = max(tcs.dd_turns, effect.turns)
            msgs.append(f"{tcs.char_name} gains a shield of {effect.value} HP.")

        elif kind == EffectKind.DOT:
            extra_dot = 0
            if user_pstate:
                if "Death Paintings" in user_pstate.active_synergies:
                    extra_dot += 10
                if "Blood Manipulation" in user_pstate.active_synergies:
                    extra_dot += 5
            tcs.dot_damage = effect.value + extra_dot
            tcs.dot_turns = effect.turns
            msgs.append(f"{tcs.char_name} is afflicted with {effect.value + extra_dot} damage/turn for {effect.turns} turn(s).")

        elif kind == EffectKind.TRAP:
            trigger_map = {'ON_HARM': Trigger.ON_HARM, 'ON_ACTION': Trigger.ON_ACTION,
                           'ON_DEATH': Trigger.ON_DEATH}
            trigger = trigger_map.get(effect.trap_trigger, Trigger.ON_HARM)
            already = any(
                tr.user_pid == user_pid and tr.user_slot == user_slot and tr.skill.name == skill.name
                for tr in tcs.traps
            )
            if not already:
                tcs.traps.append(Trap(
                    trigger=trigger,
                    skill=skill,
                    user_pid=user_pid,
                    user_slot=user_slot,
                    is_soulbound=effect.is_soulbound,
                ))
                msgs.append(f"{tcs.char_name} is protected by a counter-trap.")

        elif kind == EffectKind.CHANNEL:
            tcs.channels.append(Channel(
                skill=skill,
                target_pid=t_pid,
                target_slot=t_slot,
                turns_remaining=effect.turns,
                is_soulbound=effect.is_soulbound,
            ))
            msgs.append(f"{tcs.char_name} begins channeling {skill.name} for {effect.turns} turn(s).")

    def _tick_channels(self, msgs: List[str]) -> None:
        """Decrement active channel counters, remove expired ones."""
        for pid in self.player_ids:
            for cs in self.char_states[pid]:
                active = []
                for chan in cs.channels:
                    chan.turns_remaining -= 1
                    if chan.turns_remaining > 0:
                        active.append(chan)
                cs.channels = active

    def _score_cpu_skill(self, cpu_pid: int, char_slot: int, skill, cpu_states, opp_states, alive_opp_slots, opp_pid) -> Tuple[int, int, int]:
        """Score a CPU skill and return (score, t_pid, t_slot). Returns (-1, 0, 0) if invalid."""
        pstate = self.player_states[cpu_pid]
        cs = cpu_states[char_slot]

        # Check cooldown and affordability
        if cs.cooldowns.get(skill.name, 0) > 0:
            return -1, 0, 0
        adjusted_cost = self.get_adjusted_cost(cpu_pid, skill)
        if not pstate.can_afford(adjusted_cost):
            return -1, 0, 0

        # Pick best target for this skill
        if skill.target_type == 'self':
            t_pid, t_slot = cpu_pid, char_slot
        elif skill.target_type == 'ally':
            if skill.is_aoe:
                t_pid, t_slot = opp_pid, 0  # AoE ally: target ignored by engine
            else:
                alive_ally_slots = [s for s in range(min(3, len(cpu_states))) if cpu_states[s].alive]
                if not alive_ally_slots:
                    return -1, 0, 0
                min_hp_slot = min(alive_ally_slots, key=lambda s: cpu_states[s].current_hp)
                t_pid, t_slot = cpu_pid, min_hp_slot
        else:
            if not alive_opp_slots:
                return -1, 0, 0
            t_slot = min(alive_opp_slots, key=lambda s: opp_states[s].current_hp)
            t_pid = opp_pid

        # If Easy difficulty, use a simple random-vibrated damage/heal heuristic
        diff = getattr(self, 'cpu_difficulty', 'normal')
        if diff == 'easy':
            score = 0
            for e in skill.effects:
                if e.kind.name in ('DAMAGE', 'PIERCE', 'AFFLICT'):
                    score += e.value
                elif e.kind.name == 'HEAL':
                    score += e.value
                elif e.kind.name == 'STUN':
                    score += 20 * e.turns
                else:
                    score += 5
            score += random.randint(-15, 15)
            return score, t_pid, t_slot

        # --- NORMAL & HARD STRATEGIC AI ---
        score = 0
        
        # Threat Assessment
        allies_alive = [c for c in cpu_states[:3] if c.alive]
        enemies_alive = [c for c in opp_states[:3] if c.alive]
        
        my_lowest_hp_ally = min(allies_alive, key=lambda c: c.current_hp / c.max_hp) if allies_alive else None
        enemy_lowest_hp = min(enemies_alive, key=lambda c: c.current_hp / c.max_hp) if enemies_alive else None
        
        ally_critical = (my_lowest_hp_ally.current_hp / my_lowest_hp_ally.max_hp) < 0.35 if my_lowest_hp_ally else False
        enemy_critical = (enemy_lowest_hp.current_hp / enemy_lowest_hp.max_hp) < 0.35 if enemy_lowest_hp else False
        
        my_total_hp = sum(c.current_hp for c in allies_alive)
        opp_total_hp = sum(c.current_hp for c in enemies_alive)
        am_losing = my_total_hp < opp_total_hp

        # Basic effects valuation
        has_heal = False
        has_stun = False
        has_invuln = False
        has_aoe = skill.is_aoe
        damage_sum = 0
        
        for e in skill.effects:
            if e.kind.name == 'DAMAGE':
                damage_sum += e.value
                score += e.value
            elif e.kind.name == 'PIERCE':
                damage_sum += e.value
                score += int(e.value * 1.25)
            elif e.kind.name == 'AFFLICT':
                damage_sum += e.value
                score += int(e.value * 1.5)
            elif e.kind.name == 'DOT':
                damage_sum += e.value * e.turns
                score += e.value * e.turns
            elif e.kind.name == 'HEAL':
                has_heal = True
                score += e.value
            elif e.kind.name == 'STUN':
                has_stun = True
                score += 35 * e.turns
            elif e.kind.name in ('INVULN', 'DEFEND', 'REDUCE'):
                has_invuln = True
                score += 20 + e.value
            elif e.kind.name == 'STRENGTHEN':
                score += e.value * 2

        # 1. EMERGENCY HEAL priority
        if ally_critical:
            if has_heal and skill.target_type in ('ally', 'self'):
                # Make sure we heal the critical ally
                if skill.is_aoe or (t_pid == cpu_pid and cpu_states[t_slot].current_hp / cpu_states[t_slot].max_hp < 0.35):
                    score += 1500  # Extreme priority boost
            if has_invuln and skill.target_type in ('ally', 'self'):
                if skill.is_aoe or (t_pid == cpu_pid and cpu_states[t_slot].current_hp / cpu_states[t_slot].max_hp < 0.35):
                    score += 1200  # Shield/invuln critical ally

        # 2. FINISHING BLOW priority
        if skill.target_type == 'enemy' and enemy_lowest_hp:
            # Check if this skill can defeat the lowest HP enemy
            target_char_state = opp_states[t_slot]
            if damage_sum >= target_char_state.current_hp:
                score += 2500  # Absolute highest priority to secure the kill!

        # 3. STUN + NUKE SETUP priority
        if has_stun and skill.target_type == 'enemy':
            # Check if target is not stun-immune and is alive
            target_state = opp_states[t_slot]
            if not target_state.stun_turns > 0:
                score += 400
                # Stun first before nuking
                if diff == 'hard':
                    # If hard difficulty, check if we have a high-damage skill available on another character
                    # to clean up next turn
                    has_nuke = False
                    for other_slot in range(min(3, len(cpu_states))):
                        if other_slot != char_slot and cpu_states[other_slot].alive:
                            other_char = self.all_team_chars.get(cpu_pid, [])[other_slot]
                            for s in other_char.skills:
                                s_dmg = sum(e2.value for e2 in s.effects if e2.kind.name in ('DAMAGE', 'PIERCE', 'AFFLICT'))
                                if s_dmg > 30 and cpu_states[other_slot].cooldowns.get(s.name, 0) == 0:
                                    has_nuke = True
                                    break
                    if has_nuke:
                        score += 300  # Extra setup bonus

        # 4. INVULN SETUP priority
        if has_invuln and am_losing:
            score += 500

        # 5. AoE priority
        if has_aoe and len(enemies_alive) >= 2:
            score += 250

        # 6. DOMAIN / CD4 priority
        is_domain = any('domain' in c.lower() for c in skill.classes) or skill.cooldown >= 4
        if is_domain:
            # Only use domain if affordable and enemy is not already nearly dead
            # (don't waste a huge domain on a 5hp enemy)
            target_hp = opp_states[t_slot].current_hp if skill.target_type == 'enemy' else 100
            if target_hp > 25:
                score += 600
            else:
                score -= 400  # Penalty for wasting domain on almost-dead target

        # 7. Energy management (Hard difficulty only)
        if diff == 'hard':
            # Prefer skills that use black energy over colored energy if equivalent damage
            # by penalizing colored energy costs slightly to preserve them for big moves
            colored_cost = sum(1 for c in adjusted_cost if c != 'black')
            score -= colored_cost * 5

            # Do not spend domain energy if saving for a high cooldown skill off-cooldown next turn
            from collections import Counter
            adjusted_cost_counts = Counter(adjusted_cost)
            for s in self.all_team_chars.get(cpu_pid, [])[char_slot].skills:
                if s.cooldown >= 4 and cs.cooldowns.get(s.name, 0) == 1:
                    # Domain is off cooldown next turn! Check if this skill uses colors needed for it
                    needed = self.get_adjusted_cost(cpu_pid, s)
                    needed_counts = Counter(needed)
                    overlap = False
                    for color, amt in needed_counts.items():
                        if amt > 0 and pstate.energy.get(color, 0) - adjusted_cost_counts.get(color, 0) < amt:
                            overlap = True
                    if overlap:
                        score -= 800  # Heavy penalty: save energy for domain!

        return score, t_pid, t_slot

    def cpu_take_turn(self, cpu_pid: int) -> List[str]:
        """Execute a FULL CPU turn — acts with all available characters. Returns log messages."""
        if self.current_player_id != cpu_pid:
            return []

        all_msgs: List[str] = []
        opp_pid = self.get_opponent_id(cpu_pid)
        team = self.all_team_chars.get(cpu_pid, [])

        # Loop: keep acting until no chars left to act or turn advances automatically
        safety = 0
        failed_actions = set() # Avoid retrying actions that fail validation (prevent softlocks)
        while self.current_player_id == cpu_pid and safety < 10:
            safety += 1
            cpu_states = self.char_states[cpu_pid]
            opp_states = self.char_states[opp_pid]

            # Which slots can still act this turn?
            available_slots = self.active_chars_that_can_act(cpu_pid)
            if not available_slots:
                # All chars acted or none available — end turn
                if self.acted_slots.get(cpu_pid):
                    # Already acted at least once — engine should have auto-advanced
                    break
                else:
                    # No chars can act at all (all stunned/dead)
                    advance_msgs = self._advance_turn()
                    all_msgs.extend(advance_msgs)
                    all_msgs.append("CPU has no available characters and passes.")
                    break

            alive_opp_slots = [
                s for s in range(min(3, len(opp_states)))
                if opp_states[s].alive
            ]
            if not alive_opp_slots:
                break

            # Find the best action among all available char slots
            best_action = None
            best_score = -1

            for char_slot in available_slots:
                if char_slot >= len(team):
                    continue
                char = team[char_slot]
                cs = cpu_states[char_slot]
                for skill in char.skills:
                    if (char_slot, skill.name) in failed_actions:
                        continue
                    score, t_pid, t_slot = self._score_cpu_skill(
                        cpu_pid, char_slot, skill, cpu_states, opp_states, alive_opp_slots, opp_pid
                    )
                    if score > best_score:
                        best_score = score
                        best_action = (char_slot, skill.name, t_pid, t_slot)

            if best_action is None:
                # No affordable skill for any remaining char — end turn early
                if self.acted_slots.get(cpu_pid):
                    success, end_msgs = self.end_turn(cpu_pid)
                    all_msgs.extend(end_msgs)
                else:
                    advance_msgs = self._advance_turn()
                    all_msgs.extend(advance_msgs)
                    all_msgs.append("CPU cannot afford any skill and passes.")
                break

            char_slot, skill_name, t_pid, t_slot = best_action
            msgs = self.apply_action(cpu_pid, char_slot, skill_name, t_pid, t_slot)
            all_msgs.extend(msgs)

            if msgs and any(m.startswith("Action failed:") for m in msgs):
                failed_actions.add((char_slot, skill_name))

            # If battle ended, stop
            if self.is_battle_over():
                break

        return all_msgs

    def can_player_end_turn(self, player_id: int) -> bool:
        """True if it is currently the player's turn, allowing them to end turn or pass."""
        return player_id == self.current_player_id

    def active_chars_that_can_act(self, player_id: int) -> List[int]:
        """Return list of active (0-2) slot indices that are alive, unstunned, and haven't acted."""
        acted = self.acted_slots.get(player_id, set())
        result = []
        for slot in range(min(3, len(self.char_states[player_id]))):
            cs = self.char_states[player_id][slot]
            if cs.alive and cs.stun_turns == 0 and slot not in acted:
                result.append(slot)
        return result

    def validate_action(self, player_id: int, char_slot: int, skill_name: str,
                        target_player_id: int, target_slot: int, wildcard_pays: List[str] = None) -> Tuple[bool, str]:
        if player_id != self.current_player_id:
            return False, "It's not your turn."

        char_states = self.char_states.get(player_id, [])
        if char_slot < 0 or char_slot >= min(3, len(char_states)):
            return False, "Invalid character slot."

        cs = char_states[char_slot]
        if not cs.alive:
            return False, f"{cs.char_name} is already defeated."
        if cs.stun_turns > 0:
            return False, f"{cs.char_name} is stunned and cannot act."

        # Check if this char slot has already acted this turn
        if char_slot in self.acted_slots.get(player_id, set()):
            return False, f"{cs.char_name} has already acted this turn."

        skill = self.get_skill(player_id, char_slot, skill_name)
        if skill is None:
            return False, f"Unknown skill: {skill_name}"

        remaining_cd = cs.cooldowns.get(skill_name, 0)
        if remaining_cd > 0:
            return False, f"{skill_name} is on cooldown ({remaining_cd} turn(s) remaining)."

        pstate = self.player_states[player_id]
        adjusted_cost = self.get_adjusted_cost(player_id, skill)
        
        if wildcard_pays is not None:
            num_wildcards = adjusted_cost.count('black')
            if len(wildcard_pays) != num_wildcards:
                return False, f"Incorrect number of wildcard selections: expected {num_wildcards}, got {len(wildcard_pays)}."
            
            from collections import Counter
            needed_counts = Counter([c for c in adjusted_cost if c != 'black'])
            needed_counts.update(wildcard_pays)
            
            for color, count in needed_counts.items():
                if color not in ('green', 'red', 'blue', 'white'):
                    return False, f"Invalid wildcard energy selection: {color}."
                if pstate.energy.get(color, 0) < count:
                    return False, f"Not enough {color} energy for manual wildcard allocation."
        else:
            if not pstate.can_afford(adjusted_cost):
                return False, f"Not enough energy to use {skill_name}."

        # Validate target
        target_states = self.char_states.get(target_player_id, [])
        if target_slot < 0 or target_slot >= min(3, len(target_states)):
            return False, "Invalid target slot."

        target_cs = target_states[target_slot]

        solo = len(self.player_ids) == 1
        if skill.target_type == 'enemy':
            if solo:
                # No opponent exists — allow the action but it will be a no-op in apply_action
                pass
            elif target_player_id == player_id:
                return False, "This skill must target an enemy."
            elif skill.is_aoe:
                pass  # AoE enemy: target slot is just a placeholder, ignore alive check of specific slot
            elif not target_cs.alive:
                return False, "That target is already defeated."
        elif skill.target_type == 'ally':
            if skill.is_aoe:
                pass  # AoE ally: targets auto-expanded per effect, ignore passed target
            else:
                if target_player_id != player_id:
                    return False, "This skill must target an ally."
                if not target_cs.alive:
                    return False, "That target is already defeated."
        elif skill.target_type == 'self':
            # Auto-correct to self — validation passes regardless of what was sent
            pass

        return True, ""

    def apply_action(self, player_id: int, char_slot: int, skill_name: str,
                     target_player_id: int, target_slot: int, wildcard_pays: List[str] = None) -> List[str]:
        """Execute a skill action. Returns list of log messages."""
        ok, err = self.validate_action(player_id, char_slot, skill_name,
                                       target_player_id, target_slot, wildcard_pays)
        if not ok:
            return [f"Action failed: {err}"]

        skill = self.get_skill(player_id, char_slot, skill_name)
        user_cs = self.char_states[player_id][char_slot]
        pstate = self.player_states[player_id]
        msgs: List[str] = []

        # Spend energy
        adjusted_cost = self.get_adjusted_cost(player_id, skill)
        pstate.spend(adjusted_cost, wildcard_pays)

        # Set cooldown
        if skill.cooldown_int > 0:
            user_cs.cooldowns[skill_name] = skill.cooldown_int

        # Gojo Purple check: Clear Gojo's own invuln window when he uses Hollow Purple
        if skill_name == "Hollow Technique: Purple":
            user_cs.invuln_turns = 0
            msgs.append(f"{user_cs.char_name} expended all Limitless energy for Purple, removing their own invulnerability!")

        # --- EFFECT PIPELINE ---
        msgs.append(f"{user_cs.char_name} used {skill_name}.")
        any_effect_fired = False

        for effect in skill.effects:
            resolved = self._resolve_targets(
                effect, player_id, char_slot, target_player_id, target_slot
            )
            for t_pid, t_slot in resolved:
                if not self.char_states[t_pid][t_slot].alive:
                    continue
                prev_len = len(msgs)
                self._resolve_single_effect(
                    effect, player_id, char_slot, t_pid, t_slot, skill, msgs
                )
                if len(msgs) > prev_len:
                    any_effect_fired = True

        self._tick_channels(msgs)

        # Clear one-shot bonus for acting character
        user_cs.bonus_damage = 0

        # Mark this char slot as having acted
        self.acted_slots.setdefault(player_id, set()).add(char_slot)

        remaining = self.active_chars_that_can_act(player_id)
        is_last_action_this_turn = (len(remaining) == 0)

        # Advance turn only when all available active chars have acted
        if is_last_action_this_turn:
            advance_msgs = self._advance_turn()
            msgs.extend(advance_msgs)

        # Store in action log
        self.action_log.extend(msgs)
        self.action_log = self.action_log[-20:]

        return msgs

    def end_turn(self, player_id: int) -> Tuple[bool, List[str]]:
        """Allow player to voluntarily end their turn early (skip remaining chars)."""
        if player_id != self.current_player_id:
            return False, ["It's not your turn."]
        msgs = self._advance_turn()
        self.action_log.extend(msgs)
        self.action_log = self.action_log[-20:]
        return True, msgs

    def swap_in(self, player_id: int, active_slot: int, bench_slot: int) -> Tuple[bool, List[str]]:
        """Swap an active character (slot 0-2) with a bench character (slot 3-4).
        Costs the player's entire turn. The bench char enters with full HP."""
        if player_id != self.current_player_id:
            return False, ["It's not your turn."]

        chars = self.char_states.get(player_id, [])
        if active_slot < 0 or active_slot >= 3:
            return False, ["Invalid active slot."]
        if bench_slot < 3 or bench_slot >= len(chars):
            return False, ["Invalid bench slot."]

        bench_cs = chars[bench_slot]
        if not bench_cs.alive:
            return False, [f"{bench_cs.char_name} is defeated and cannot be tagged in."]

        active_cs = chars[active_slot]
        
        # Soulbound effects are lost on swap-out
        self.clear_soulbound(player_id, active_slot)
        
        # Swap the CharacterBattleState objects
        chars[active_slot], chars[bench_slot] = chars[bench_slot], chars[active_slot]
        
        # Also swap the Character data objects
        team = self.all_team_chars[player_id]
        team[active_slot], team[bench_slot] = team[bench_slot], team[active_slot]

        # Reset the bench character's volatile state (cool-downs, buffs, debuffs, traps, channels, bombs)
        swapped_out = chars[bench_slot]
        swapped_out.cooldowns.clear()
        swapped_out.stun_turns = 0
        swapped_out.invuln_turns = 0
        swapped_out.damage_reduction = 0
        swapped_out.dr_turns = 0
        swapped_out.destructible_defense = 0
        swapped_out.dd_turns = 0
        swapped_out.increase_damage = 0
        swapped_out.inc_dmg_turns = 0
        swapped_out.decrease_damage = 0
        swapped_out.dec_dmg_turns = 0
        swapped_out.dot_damage = 0
        swapped_out.dot_turns = 0
        swapped_out.bonus_damage = 0
        swapped_out.traps.clear()
        swapped_out.channels.clear()
        swapped_out.bombs.clear()

        msgs = [f"🔄 {bench_cs.char_name} tags in, replacing {active_cs.char_name}!"]

        # Costs the whole turn
        advance_msgs = self._advance_turn()
        msgs.extend(advance_msgs)

        self.action_log.extend(msgs)
        self.action_log = self.action_log[-20:]
        return True, msgs

    def _advance_turn(self) -> List[str]:
        """Flip current player, increment turn counter, award energy, reset acted slots, and tick boundary effects."""
        msgs = []
        old_pid = self.current_player_id
        # End of turn ticking for the player whose turn is ending
        for slot_idx, cs in enumerate(self.char_states[old_pid]):
            if cs.alive:
                msgs.extend(cs.tick_turn_end())
                if not cs.alive:
                    self.clear_soulbound(old_pid, slot_idx)

        n = len(self.player_ids)
        prev_idx = self.current_player_idx
        self.current_player_idx = (self.current_player_idx + 1) % n
        # Increment turn_number when we wrap back to player 0
        if self.current_player_idx <= prev_idx:
            self.turn_number += 1

        # Reset acted_slots for the new current player (fresh turn)
        pid = self.current_player_id
        self.acted_slots[pid] = set()

        # Award energy: 1 random per living char, per Naruto Arena spec
        living = self.living_count(pid)
        self.player_states[pid].gain_energy_for_living(living)

        # Start of turn ticking for the player whose turn is starting
        for slot_idx, cs in enumerate(self.char_states[pid]):
            if cs.alive:
                msgs.extend(cs.tick_turn_start())
                if not cs.alive:
                    self.clear_soulbound(pid, slot_idx)

        return msgs


# ─────────────────────────────────────────────────────────────────────────────
#  MAIN GAME CLASS
# ─────────────────────────────────────────────────────────────────────────────

CPU_PLAYER_ID = -1  # Reserved int ID for the CPU player


class Game:
    def __init__(self, chat_id: int):
        self.chat_id = chat_id
        self.players = [] # List of player IDs
        self.player_names = {} # player_id -> name
        self.teams: Dict[int, List[Character]] = {} # player_id -> List[Character]
        self.seen_chars: Dict[int, List[str]] = {} # player_id -> all char names ever shown (kept or passed)
        self.drafted_names: List[str] = [] # globally drafted character names to enforce uniqueness
        self.passes_used: Dict[int, bool] = {} # player_id -> bool
        self.active_teams: Dict[int, List[Character]] = {} # player_id -> List[Character] (size 3)
        self.bench_teams: Dict[int, List[Character]] = {} # player_id -> List[Character] (size 0)
        self.state = GameState.WAITING_FOR_PLAYERS
        self.current_player_idx = 0
        self.last_drawn_choices: Dict[int, List[Character]] = {} # player_id -> List of 3 characters
        self.max_team_size = 5
        self.battle_team_size = 3
        self.battle: Optional[BattleEngine] = None
        self.cpu_player_id: Optional[int] = None  # Set to CPU_PLAYER_ID when playing vs CPU
        self.cpu_difficulty: str = 'normal'

    def add_player(self, player_id: int, name: str) -> Tuple[bool, str]:
        if self.state != GameState.WAITING_FOR_PLAYERS:
            return False, "Game already started or finished."
        if player_id in self.players:
            return False, f"{name}, you're already in the game!"

        self.players.append(player_id)
        self.player_names[player_id] = name
        self.teams[player_id] = []
        self.seen_chars[player_id] = []
        self.passes_used[player_id] = False
        self.last_drawn_choices[player_id] = []
        return True, f"{name} joined the game!"

    def start_game(self) -> Tuple[bool, str]:
        if self.state != GameState.WAITING_FOR_PLAYERS:
            if self.state == GameState.FINISHED:
                 return False, "Game is already finished. Start a new one with /start."
            return False, "Game already started."
        if len(self.players) < 1:
            return False, "At least 1 player is needed to start."

        self.state = GameState.IN_PROGRESS
        self.current_player_idx = 0
        return True, f"Game started! It's {self.get_current_player_name()}'s turn. Draw 3 options to choose from!"

    def start_game_vs_cpu(self, human_player_id: int, human_name: str, difficulty: str = 'normal') -> Tuple[bool, str]:
        """Start a solo game against the CPU. Adds human + CPU player, then CPU auto-drafts."""
        if self.state != GameState.WAITING_FOR_PLAYERS:
            return False, "Game already started."

        self.cpu_difficulty = difficulty

        # Register human player
        self.players.append(human_player_id)
        self.player_names[human_player_id] = human_name
        self.teams[human_player_id] = []
        self.seen_chars[human_player_id] = []
        self.passes_used[human_player_id] = False
        self.last_drawn_choices[human_player_id] = []

        # Register CPU player
        self.cpu_player_id = CPU_PLAYER_ID
        self.players.append(CPU_PLAYER_ID)
        self.player_names[CPU_PLAYER_ID] = f"CPU ({difficulty.capitalize()})"
        self.teams[CPU_PLAYER_ID] = []
        self.seen_chars[CPU_PLAYER_ID] = []
        self.passes_used[CPU_PLAYER_ID] = False
        self.last_drawn_choices[CPU_PLAYER_ID] = []

        # CPU immediately drafts its full team (silent, no UI interruption)
        self._cpu_complete_draft()

        # Start draft for human
        self.state = GameState.IN_PROGRESS
        self.current_player_idx = 0  # Human always goes first
        return True, f"Solo mode started! Draft your team of {self.max_team_size} characters."

    def _cpu_complete_draft(self):
        """CPU silently drafts max_team_size characters and picks the top 3 as its active team."""
        from jjk_bot.characters import get_random_character
        cpu_id = CPU_PLAYER_ID
        if cpu_id not in self.seen_chars:
            self.seen_chars[cpu_id] = []
        if cpu_id not in self.teams:
            self.teams[cpu_id] = []
        
        while len(self.teams[cpu_id]) < self.max_team_size:
            exclude_list = self.seen_chars[cpu_id] + self.drafted_names
            char = get_random_character(exclude=exclude_list)
            self.seen_chars[cpu_id].append(char.name)
            self.teams[cpu_id].append(char)
            self.drafted_names.append(char.name)

        # Pick top 3 by synergy-weighted brawler power (evaluating all combinations of size 3)
        import itertools
        from jjk_bot.synergies import check_synergies

        def char_power(char):
            total = 0
            for skill in char.skills:
                for e in skill.effects:
                    if e.kind.name in ('DAMAGE', 'PIERCE', 'AFFLICT'):
                        total += e.value
            return total

        drafted = list(self.teams[cpu_id])
        best_score = -1
        best_active = drafted[:3]

        for combo in itertools.combinations(drafted, 3):
            combo = list(combo)
            raw_power = sum(char_power(c) for c in combo)
            synergies = check_synergies([c.name for c in combo])
            score = raw_power + len(synergies) * 100
            if score > best_score:
                best_score = score
                best_active = combo

        self.active_teams[cpu_id] = best_active
        self.bench_teams[cpu_id] = []

    def get_current_player_id(self) -> int:
        if not self.players:
            return -1
        return self.players[self.current_player_idx]

    def get_current_player_name(self) -> str:
        player_id = self.get_current_player_id()
        return self.player_names.get(player_id, "Unknown")

    def draw_three(self, player_id: int) -> Tuple[bool, str, List[Character]]:
        if player_id != self.get_current_player_id():
            return False, f"It's not your turn! It's {self.get_current_player_name()}'s turn.", []

        if self.state != GameState.IN_PROGRESS:
            if self.state == GameState.DECIDING:
                return False, "You already drew! Choose a character to add to your team.", self.last_drawn_choices.get(player_id, [])
            return False, "The game is not in progress.", []

        from jjk_bot.characters import get_random_character
        choices = []
        base_exclude = list(self.seen_chars.get(player_id, [])) + self.drafted_names
        for _ in range(3):
            exclude_list = base_exclude + [c.name for c in choices]
            char = get_random_character(exclude=exclude_list)
            choices.append(char)
            if char.name not in self.seen_chars[player_id]:
                self.seen_chars[player_id].append(char.name)

        self.last_drawn_choices[player_id] = choices
        self.state = GameState.DECIDING
        msg = f"{self.player_names[player_id]} drew 3 characters. Pick 1 to add to your team!"
        return True, msg, choices

    def choose_card(self, player_id: int, choice_index: int) -> Tuple[bool, str]:
        if self.state != GameState.DECIDING:
            return False, "There's nothing to choose right now."
        if player_id != self.get_current_player_id():
            return False, "It's not your turn!"

        choices = self.last_drawn_choices.get(player_id, [])
        if not choices or choice_index < 0 or choice_index >= len(choices):
            return False, "Invalid choice index."

        char = choices[choice_index]
        self.teams[player_id].append(char)
        self.drafted_names.append(char.name)
        self.last_drawn_choices[player_id] = []
        msg = f"{self.player_names[player_id]} kept {char.name}!"

        self._next_turn()
        if self.state == GameState.TEAM_SELECTION:
            msg += "\n\nAll players have 5 characters! Please select your 3 fighters."
        elif self.state == GameState.FINISHED:
            msg += "\n\nAll players have 5 characters! Use /result to see the winner."
        else:
            msg += f"\n\nIt's now {self.get_current_player_name()}'s turn."
        return True, msg

    def _next_turn(self):
        num_players = len(self.players)

        # Check if everyone is done before advancing
        all_done = all(len(self.teams[p]) == self.max_team_size for p in self.players)
        if all_done:
            self.state = GameState.TEAM_SELECTION
            return

        # Advance to the next player who still needs cards (iterative, not recursive)
        for _ in range(num_players):
            self.current_player_idx = (self.current_player_idx + 1) % num_players
            if len(self.teams[self.get_current_player_id()]) < self.max_team_size:
                self.state = GameState.IN_PROGRESS
                return

        # If we looped all players and everyone is full, transition
        self.state = GameState.TEAM_SELECTION

    def submit_team(self, player_id: int, selected_names: List[str]) -> Tuple[bool, str]:
        if self.state != GameState.TEAM_SELECTION:
            return False, "Not currently in team selection phase."

        if len(selected_names) != self.battle_team_size:
            return False, f"You must select exactly {self.battle_team_size} characters."

        drafted = self.teams.get(player_id, [])
        drafted_names = [c.name for c in drafted]

        # Verify they actually drafted these characters
        if not all(name in drafted_names for name in selected_names):
            return False, "You selected characters you did not draft!"

        # Build the active and bench teams
        active = []
        bench = []
        for char in drafted:
            if char.name in selected_names:
                active.append(char)
            else:
                bench.append(char)

        self.active_teams[player_id] = active
        self.bench_teams[player_id] = []

        # Check if all players have submitted
        all_submitted = all(len(self.active_teams.get(p, [])) == self.battle_team_size for p in self.players)
        if all_submitted:
            self.start_battle()
            return True, "All teams locked in! Let the battle begin!"

        # Solo: if this is the only player, start immediately
        if len(self.players) == 1:
            self.start_battle()
            return True, "Team locked in! Battle begins!"

        return True, f"{self.player_names[player_id]} has locked in their 3v3 team!"

    def start_battle(self):
        """Initialize the BattleEngine and transition to BATTLE state."""
        self.battle = BattleEngine(
            player_ids=self.players,
            active_teams=self.active_teams,
            bench_teams=self.bench_teams
        )
        self.state = GameState.BATTLE

    def battle_action(self, player_id: int, char_slot: int, skill_name: str,
                      target_player_id: int, target_slot: int, wildcard_pays: List[str] = None) -> Tuple[bool, List[str]]:
        """Execute a battle action. Returns (success, list_of_log_messages)."""
        if self.state != GameState.BATTLE:
            return False, ["Not currently in battle."]
        if self.battle is None:
            return False, ["Battle engine not initialized."]

        ok, err = self.battle.validate_action(
            player_id, char_slot, skill_name, target_player_id, target_slot, wildcard_pays
        )
        if not ok:
            return False, [err]

        msgs = self.battle.apply_action(
            player_id, char_slot, skill_name, target_player_id, target_slot, wildcard_pays
        )

        if self.battle.is_battle_over():
            self.state = GameState.FINISHED
            return True, msgs

        # If playing vs CPU, take CPU turns until it's the human's turn again
        if self.cpu_player_id is not None and self.state == GameState.BATTLE:
            max_cpu_turns = 10  # safety cap against infinite loops
            turns_taken = 0
            while (self.battle.current_player_id == self.cpu_player_id
                   and not self.battle.is_battle_over()
                   and turns_taken < max_cpu_turns):
                cpu_msgs = self.battle.cpu_take_turn(self.cpu_player_id)
                msgs.extend(cpu_msgs)
                turns_taken += 1

            if self.battle.is_battle_over():
                self.state = GameState.FINISHED

        return True, msgs

    def battle_end_turn(self, player_id: int) -> Tuple[bool, List[str]]:
        """Voluntarily end turn and trigger CPU turns if in vs-CPU mode."""
        if self.state != GameState.BATTLE:
            return False, ["Not currently in battle."]
        if self.battle is None:
            return False, ["Battle engine not initialized."]

        ok, msgs = self.battle.end_turn(player_id)
        if not ok:
            return False, msgs

        if self.battle.is_battle_over():
            self.state = GameState.FINISHED
            return True, msgs

        # If playing vs CPU, take CPU turns until it's the human's turn again
        if self.cpu_player_id is not None and self.state == GameState.BATTLE:
            max_cpu_turns = 10  # safety cap against infinite loops
            turns_taken = 0
            while (self.battle.current_player_id == self.cpu_player_id
                   and not self.battle.is_battle_over()
                   and turns_taken < max_cpu_turns):
                cpu_msgs = self.battle.cpu_take_turn(self.cpu_player_id)
                msgs.extend(cpu_msgs)
                turns_taken += 1

            if self.battle.is_battle_over():
                self.state = GameState.FINISHED

        return True, msgs

    def battle_swap_in(self, player_id: int, active_slot: int, bench_slot: int) -> Tuple[bool, List[str]]:
        """Swap character and trigger CPU turns if in vs-CPU mode."""
        if self.state != GameState.BATTLE:
            return False, ["Not currently in battle."]
        if self.battle is None:
            return False, ["Battle engine not initialized."]

        ok, msgs = self.battle.swap_in(player_id, active_slot, bench_slot)
        if not ok:
            return False, msgs

        if self.battle.is_battle_over():
            self.state = GameState.FINISHED
            return True, msgs

        # If playing vs CPU, take CPU turns until it's the human's turn again
        if self.cpu_player_id is not None and self.state == GameState.BATTLE:
            max_cpu_turns = 10  # safety cap against infinite loops
            turns_taken = 0
            while (self.battle.current_player_id == self.cpu_player_id
                   and not self.battle.is_battle_over()
                   and turns_taken < max_cpu_turns):
                cpu_msgs = self.battle.cpu_take_turn(self.cpu_player_id)
                msgs.extend(cpu_msgs)
                turns_taken += 1

            if self.battle.is_battle_over():
                self.state = GameState.FINISHED

        return True, msgs

    def resolve_battle(self) -> List[Tuple[int, str, List[str]]]:
        """
        For results display after a battle. Returns sorted standings.
        If battle completed, ranks by survival (more living chars = better).
        Falls back to energy scoring for non-battle games.
        """
        results = []
        if self.battle is not None:
            for p_id in self.players:
                living = self.battle.living_count(p_id)
                total_hp = sum(cs.current_hp for cs in self.battle.char_states[p_id])
                # Score = living chars * 1000 + remaining HP (so more living always wins)
                score = living * 1000 + total_hp
                team_names = [c.name for c in self.active_teams.get(p_id, [])]
                results.append((score, self.player_names[p_id], team_names))
        else:
            for p_id in self.players:
                team = self.teams[p_id]
                score = sum(len(skill.energy) for char in team for skill in char.skills)
                team_names = [c.name for c in team]
                results.append((score, self.player_names[p_id], team_names))

        results.sort(key=lambda x: (x[0], random.random()), reverse=True)
        return results

    def get_results(self) -> Tuple[bool, str]:
        if not self.players:
            return False, "No players in the game."

        results = self.resolve_battle()

        msg_parts = ["🏆 *Game Results* 🏆\n\n"]
        for i, (score, name, team) in enumerate(results):
            medal = "🥇" if i == 0 else "🥈" if i == 1 else "🥉" if i == 2 else "👤"
            team_str = ", ".join(team) if team else "Empty"
            msg_parts.append(f"{medal} *{name}* — {score} pts\nTeam: {team_str}\n\n")

        if self.state == GameState.FINISHED:
            winner = results[0][1]
            msg_parts.append(f"The winner is *{winner}*! Congratulations! 🎉")
        else:
            msg_parts.append("Draft is still in progress!")

        return True, "".join(msg_parts)


class GameManager:
    def __init__(self):
        self.games: Dict[int, Game] = {}

    def get_game(self, chat_id: int) -> Game:
        if chat_id not in self.games:
            self.games[chat_id] = Game(chat_id)
        return self.games[chat_id]

    def reset_game(self, chat_id: int):
        self.games[chat_id] = Game(chat_id)
