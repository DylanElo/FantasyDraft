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
                    is_affliction: bool = False) -> int:
        """Apply damage using the exact Naruto Arena 3-Tier Defense System."""
        if self.invuln_turns > 0 and not is_affliction:
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
        if self.stun_turns > 0:
            self.stun_turns -= 1
        # Invuln expires at start of the protected character's OWN next turn,
        # so it persists through the opponent's full turn.
        if self.invuln_turns > 0:
            self.invuln_turns -= 1
        return msgs

    def tick_turn_end(self) -> List[str]:
        """Called at the end of a turn for this character."""
        msgs = []
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
        'green': 0, 'red': 0, 'blue': 0, 'white': 0, 'black': 0
    })

    def gain_energy_for_living(self, living_count: int, rng=None):
        """Gain 1 guaranteed 'black' energy, and 1 random energy per additional living ally."""
        if rng is None:
            rng = random
        
        # Point 2: Standardize Base Energy Generation
        if living_count > 0:
            self.energy['black'] += 1
            living_count -= 1
            
        colors = ['green', 'red', 'blue', 'white', 'black']
        for _ in range(living_count):
            self.energy[rng.choice(colors)] += 1

    def can_afford(self, cost: List[str]) -> bool:
        temp = dict(self.energy)
        for c in cost:
            if temp.get(c, 0) <= 0:
                return False
            temp[c] -= 1
        return True

    def spend(self, cost: List[str]):
        for c in cost:
            self.energy[c] = max(0, self.energy[c] - 1)


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

        # Award starting energy for turn 1 (current player only)
        first_pid = self.player_ids[0]
        self.player_states[first_pid].gain_energy_for_living(3)

    @property
    def current_player_id(self) -> int:
        return self.player_ids[self.current_player_idx]

    def get_opponent_id(self, player_id: int) -> int:
        for pid in self.player_ids:
            if pid != player_id:
                return pid
        return player_id

    def living_count(self, player_id: int) -> int:
        return sum(1 for cs in self.char_states[player_id] if cs.alive)

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
                for s in range(len(self.char_states[opp_id]))
                if self.char_states[opp_id][s].alive
            ]

        elif t == Target.SELF:
            return [(player_id, char_slot)]

        elif t == Target.ALLY:
            return [(target_player_id, target_slot)]

        elif t == Target.ALLIES:
            return [
                (player_id, s)
                for s in range(len(self.char_states[player_id]))
                if self.char_states[player_id][s].alive
            ]

        elif t == Target.XALLIES:
            return [
                (player_id, s)
                for s in range(len(self.char_states[player_id]))
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

        if kind == EffectKind.DAMAGE:
            raw = max(0, effect.value + user_cs.increase_damage + user_cs.bonus_damage - tcs.decrease_damage)
            actual = tcs.take_damage(raw, is_piercing=False, is_affliction=False)
            if actual == 0 and tcs.invuln_turns > 0:
                msgs.append(f"{tcs.char_name} is invulnerable!")
            else:
                msgs.append(f"{user_cs.char_name} dealt {actual} damage to {tcs.char_name}.")
            if actual > 0 and tcs.alive:
                self._fire_on_harm_traps(user_pid, user_slot, t_pid, t_slot, msgs)
            if not tcs.alive:
                msgs.append(f"{tcs.char_name} has been defeated!")
                self.clear_soulbound(t_pid, t_slot)

        elif kind == EffectKind.PIERCE:
            raw = max(0, effect.value + user_cs.increase_damage + user_cs.bonus_damage - tcs.decrease_damage)
            actual = tcs.take_damage(raw, is_piercing=True, is_affliction=False)
            if actual == 0 and tcs.invuln_turns > 0:
                msgs.append(f"{tcs.char_name} is invulnerable!")
            else:
                msgs.append(f"{user_cs.char_name} dealt {actual} piercing damage to {tcs.char_name}.")
            if actual > 0 and tcs.alive:
                self._fire_on_harm_traps(user_pid, user_slot, t_pid, t_slot, msgs)
            if not tcs.alive:
                msgs.append(f"{tcs.char_name} has been defeated!")
                self.clear_soulbound(t_pid, t_slot)

        elif kind == EffectKind.AFFLICT:
            actual = tcs.take_damage(effect.value, is_piercing=False, is_affliction=True)
            msgs.append(f"{user_cs.char_name} dealt {actual} affliction damage to {tcs.char_name}.")
            if not tcs.alive:
                msgs.append(f"{tcs.char_name} has been defeated!")
                self.clear_soulbound(t_pid, t_slot)

        elif kind == EffectKind.HEAL:
            healed = tcs.heal_hp(effect.value)
            msgs.append(f"{tcs.char_name} restored {healed} HP.")

        elif kind == EffectKind.STUN:
            tcs.stun_turns = max(tcs.stun_turns, effect.turns)
            msgs.append(f"{tcs.char_name} is stunned for {effect.turns} turn(s).")

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
            tcs.decrease_damage = max(tcs.decrease_damage, effect.value)
            tcs.dec_dmg_turns = max(tcs.dec_dmg_turns, effect.turns)
            msgs.append(f"{tcs.char_name} is weakened by {effect.value} damage for {effect.turns} turn(s).")

        elif kind == EffectKind.DEFEND:
            tcs.destructible_defense += effect.value
            tcs.dd_turns = max(tcs.dd_turns, effect.turns)
            msgs.append(f"{tcs.char_name} gains a shield of {effect.value} HP.")

        elif kind == EffectKind.DOT:
            tcs.dot_damage = effect.value
            tcs.dot_turns = effect.turns
            msgs.append(f"{tcs.char_name} is afflicted with {effect.value} damage/turn for {effect.turns} turn(s).")

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

    def validate_action(self, player_id: int, char_slot: int, skill_name: str,
                        target_player_id: int, target_slot: int) -> Tuple[bool, str]:
        if player_id != self.current_player_id:
            return False, "It's not your turn."

        char_states = self.char_states.get(player_id, [])
        if char_slot < 0 or char_slot >= len(char_states):
            return False, "Invalid character slot."

        cs = char_states[char_slot]
        if not cs.alive:
            return False, f"{cs.char_name} is already defeated."
        if cs.stun_turns > 0:
            return False, f"{cs.char_name} is stunned and cannot act."

        skill = self.get_skill(player_id, char_slot, skill_name)
        if skill is None:
            return False, f"Unknown skill: {skill_name}"

        remaining_cd = cs.cooldowns.get(skill_name, 0)
        if remaining_cd > 0:
            return False, f"{skill_name} is on cooldown ({remaining_cd} turn(s) remaining)."

        pstate = self.player_states[player_id]
        if not pstate.can_afford(skill.energy):
            return False, f"Not enough energy to use {skill_name}."

        # Validate target
        target_states = self.char_states.get(target_player_id, [])
        if target_slot < 0 or target_slot >= len(target_states):
            return False, "Invalid target slot."

        target_cs = target_states[target_slot]

        solo = len(self.player_ids) == 1
        if skill.target_type == 'enemy':
            if solo:
                # No opponent exists — allow the action but it will be a no-op in apply_action
                pass
            elif target_player_id == player_id:
                return False, "This skill must target an enemy."
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
                     target_player_id: int, target_slot: int) -> List[str]:
        """Execute a skill action. Returns list of log messages."""
        ok, err = self.validate_action(player_id, char_slot, skill_name,
                                       target_player_id, target_slot)
        if not ok:
            return [f"Action failed: {err}"]

        skill = self.get_skill(player_id, char_slot, skill_name)
        user_cs = self.char_states[player_id][char_slot]
        pstate = self.player_states[player_id]
        msgs: List[str] = []

        # Spend energy
        pstate.spend(skill.energy)

        # Set cooldown
        if skill.cooldown_int > 0:
            user_cs.cooldowns[skill_name] = skill.cooldown_int

        # Tick all characters for the current player at start of their turn
        # (DoT, stun, invuln all decrement on the owning player's turn)
        for slot_idx, cs in enumerate(self.char_states[player_id]):
            if cs.alive:
                tick_msgs = cs.tick_turn_start()
                msgs.extend(tick_msgs)
                if not cs.alive:
                    self.clear_soulbound(player_id, slot_idx)

        # If acting character just died from DoT, abort further effects
        if not user_cs.alive:
            self._advance_turn()
            return msgs

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

        # Tick end-of-turn effects for all current player's characters
        # (cooldowns, DR/DD/mod durations, bomb countdowns)
        for slot_idx, cs in enumerate(self.char_states[player_id]):
            if cs.alive:
                end_msgs = cs.tick_turn_end()
                msgs.extend(end_msgs)
                if not cs.alive:
                    self.clear_soulbound(player_id, slot_idx)

        # Store in action log
        self.action_log.extend(msgs)
        self.action_log = self.action_log[-20:]

        # Advance turn
        self._advance_turn()

        return msgs

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
        self.action_log.extend(msgs)
        self.action_log = self.action_log[-20:]

        # Costs the whole turn
        self._advance_turn()
        return True, msgs

    def _advance_turn(self):
        """Flip current player, increment turn counter, award energy."""
        n = len(self.player_ids)
        prev_idx = self.current_player_idx
        self.current_player_idx = (self.current_player_idx + 1) % n
        # Increment turn_number when we wrap back to player 0
        if self.current_player_idx <= prev_idx:
            self.turn_number += 1

        # Award energy to the new current player based on their living chars
        pid = self.current_player_id
        living = self.living_count(pid)
        self.player_states[pid].gain_energy_for_living(living)


# ─────────────────────────────────────────────────────────────────────────────
#  MAIN GAME CLASS
# ─────────────────────────────────────────────────────────────────────────────

class Game:
    def __init__(self, chat_id: int):
        self.chat_id = chat_id
        self.players = [] # List of player IDs
        self.player_names = {} # player_id -> name
        self.teams: Dict[int, List[Character]] = {} # player_id -> List[Character]
        self.seen_chars: Dict[int, List[str]] = {} # player_id -> all char names ever shown (kept or passed)
        self.passes_used: Dict[int, bool] = {} # player_id -> bool
        self.active_teams: Dict[int, List[Character]] = {} # player_id -> List[Character] (size 3)
        self.bench_teams: Dict[int, List[Character]] = {} # player_id -> List[Character] (size 2)
        self.state = GameState.WAITING_FOR_PLAYERS
        self.current_player_idx = 0
        self.last_drawn_character: Optional[Character] = None
        self.max_team_size = 5
        self.battle_team_size = 3
        self.battle: Optional[BattleEngine] = None

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

        char = get_random_character(exclude=self.seen_chars[player_id])
        self.seen_chars[player_id].append(char.name)
        self.last_drawn_character = char

        if self.passes_used[player_id]:
            # Already used pass, must keep
            self.teams[player_id].append(char)
            msg = f"{self.player_names[player_id]} drew {char.name}. You've already used your pass, so you keep this card!"
            self._next_turn()
            if self.state == GameState.TEAM_SELECTION:
                msg += "\n\nAll players have 5 characters! Please select your 3 fighters."
            elif self.state == GameState.FINISHED:
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
        if self.state == GameState.TEAM_SELECTION:
            msg += "\n\nAll players have 5 characters! Please select your 3 fighters."
        elif self.state == GameState.FINISHED:
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
        new_char = get_random_character(exclude=self.seen_chars[player_id])
        self.seen_chars[player_id].append(new_char.name)
        self.teams[player_id].append(new_char)
        msg = f"{self.player_names[player_id]} passed! Their new draw is {new_char.name}, which they must keep."

        self._next_turn()
        if self.state == GameState.TEAM_SELECTION:
            msg += "\n\nAll players have 5 characters! Please select your 3 fighters."
        elif self.state == GameState.BATTLE:
            msg += "\n\nGet ready for battle!"
        elif self.state == GameState.FINISHED:
            msg += "\n\nAll players have 5 characters! Use /result to see the winner."
        else:
            msg += f"\n\nIt's now {self.get_current_player_name()}'s turn."

        return True, msg, new_char

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
        self.bench_teams[player_id] = bench

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
                      target_player_id: int, target_slot: int) -> Tuple[bool, List[str]]:
        """Execute a battle action. Returns (success, list_of_log_messages)."""
        if self.state != GameState.BATTLE:
            return False, ["Not currently in battle."]
        if self.battle is None:
            return False, ["Battle engine not initialized."]

        ok, err = self.battle.validate_action(
            player_id, char_slot, skill_name, target_player_id, target_slot
        )
        if not ok:
            return False, [err]

        msgs = self.battle.apply_action(
            player_id, char_slot, skill_name, target_player_id, target_slot
        )

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
