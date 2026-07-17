"""Public room-level manager facade for Battle System v2."""

from __future__ import annotations

import random
import secrets
from collections import Counter
from collections import OrderedDict
from itertools import permutations, product
from copy import deepcopy
from dataclasses import dataclass
import json
from threading import RLock
from typing import Any, Callable

from .energy import CORE_ENERGY, gain_turn_energy, normalize_energy, split_cost
from .conditions import has_status
from .models import BattleEvent, BattlePhase, BattleState, CharacterState, DamageType, PendingAction, PlayerState, SkillClass, SkillSpec, use_battle_v2
from .first_creation_progression import evaluate_first_creation_progress, initial_first_creation_progress
from .resolver import ResolverError, check_winner, finish_turn, get_skill_for_action, resolve_queue, resolve_queue_prefix, validate_action_identity, validate_queue, validate_queue_identity
from .serialization import serialize_battle_state
from .targeting import invulnerability_blocks_skill
from .starter_roster import (
    FIRST_CREATION_ROSTER,
    FIRST_CREATION_SKILLS_BY_ID,
    SKILLS_BY_ID,
    STARTER_ROSTER,
    CharacterSpec,
    first_creation_catalog,
    validate_first_creation_team,
)
from .timers import BattleTimerPolicy, arm_phase_timer, phase_seconds_remaining, phase_timer_expired, system_clock


class BattleV2Error(ValueError):
    """Raised when a v2 manager operation is invalid."""


def battle_v2_enabled() -> bool:
    """Return whether Battle v2 should be used by integration code."""

    return use_battle_v2()


def battle_state_to_dict(state: BattleState, viewer_id: str) -> dict:
    """Return a viewer-specific serialized Battle v2 state."""

    return serialize_battle_state(state, viewer_id)


@dataclass(frozen=True, slots=True)
class BattlePlayerConfig:
    """Configuration needed to start a Classic Arena v2 player."""

    id: str
    name: str
    team: list[str]


def _character_state(spec: CharacterSpec) -> CharacterState:
    replacement_ids = {
        transformation.replacement_skill_id
        for skill in spec.skills
        for transformation in skill.transformations
        if transformation.replacement_skill_id
    }
    replacement_ids.update(
        str(replacement)
        for skill in spec.skills
        for effect in skill.effects
        for replacement in (effect.payload.get("skill_replacements") or {}).values()
    )
    base_skill_ids = [skill.id for skill in spec.skills if skill.id not in replacement_ids]
    return CharacterState(
        character_id=spec.id,
        name=spec.name,
        base_skill_ids=base_skill_ids,
    )


def _coerce_player_config(raw: BattlePlayerConfig | dict[str, Any]) -> BattlePlayerConfig:
    if isinstance(raw, BattlePlayerConfig):
        return raw
    return BattlePlayerConfig(
        id=str(raw["id"]),
        name=str(raw.get("name", raw["id"])),
        team=[str(character_id) for character_id in raw["team"]],
    )


def payload_to_action(player_id: str, index: int, payload: dict[str, Any]) -> PendingAction:
    wildcard_pays = [
        normalize_energy(energy)
        for energy in payload.get("wildcard_pays", [])
    ]
    return PendingAction(
        id=str(payload.get("id", "")).strip(),
        player_id=player_id,
        caster_slot=int(payload["caster_slot"]),
        skill_id=str(payload["skill_id"]),
        target_player_id=str(payload["target_player_id"]),
        target_slot=(
            None if payload.get("target_slot") is None else int(payload.get("target_slot"))
        ),
        target_slots=[int(slot) for slot in payload.get("target_slots", [])],
        secondary_target_slot=(None if payload.get("secondary_target_slot") is None else int(payload["secondary_target_slot"])),
        alternate_target_player_id=(None if payload.get("alternate_target_player_id") is None else str(payload["alternate_target_player_id"])),
        alternate_target_slot=(None if payload.get("alternate_target_slot") is None else int(payload["alternate_target_slot"])),
        wildcard_pays=wildcard_pays,
        queue_index=int(payload.get("queue_index", index)),
    )


def _serialize_roster_catalog(roster: dict[str, CharacterSpec]) -> dict[str, dict[str, Any]]:
    return {
        character_id: {
            "id": spec.id,
            "name": spec.name,
            "role": spec.role,
            "state": spec.state,
            "skills": [
                {
                    "id": skill.id,
                    "name": skill.name,
                    "text": skill.text,
                    "cost": [energy.value for energy in skill.cost],
                    "cooldown": skill.cooldown,
                    "target_rule": {
                        "kind": skill.target_rule.kind,
                        "min_targets": skill.target_rule.min_targets,
                        "max_targets": skill.target_rule.max_targets,
                        "allow_self": skill.target_rule.allow_self,
                        "allow_dead": skill.target_rule.allow_dead,
                        "required_status": skill.target_rule.required_status,
                    },
                    "classes": [skill_class.value for skill_class in skill.classes],
                    "effects": [
                        {
                            "type": effect.type,
                            "amount": effect.amount,
                            "damage_type": effect.damage_type.value if effect.damage_type else None,
                            "status": effect.status,
                            "duration": effect.duration,
                            "stacks": effect.stacks,
                            "classes": [skill_class.value for skill_class in effect.classes],
                            "target": effect.target,
                            "payload": dict(effect.payload),
                        }
                        for effect in skill.effects
                    ],
                    "conditions": [
                        {
                            "type": condition.type,
                            "status": condition.status,
                            "amount": condition.amount,
                            "scope": condition.scope,
                            "negate": condition.negate,
                        }
                        for condition in skill.conditions
                    ],
                }
                for skill in spec.skills
            ],
        }
        for character_id, spec in roster.items()
    }


def skill_catalog() -> dict[str, dict[str, Any]]:
    return _serialize_roster_catalog(STARTER_ROSTER)


def _wildcard_payment_options(
    player: PlayerState,
    skill_id: str,
    skills: dict[str, SkillSpec] | None = None,
) -> list[list[EnergyType]]:
    skill = (skills or SKILLS_BY_ID)[skill_id]
    specific, wildcard_count = split_cost(skill.cost)
    if wildcard_count == 0:
        return [[]]
    available = {
        energy: player.energy.get(energy, 0) - specific.get(energy, 0)
        for energy in CORE_ENERGY
    }
    options: list[list[EnergyType]] = []
    for pays in product(CORE_ENERGY, repeat=wildcard_count):
        required = Counter(pays)
        if all(available.get(energy, 0) >= amount for energy, amount in required.items()):
            options.append(list(pays))
    return options


def _is_legal_cpu_target(
    state: BattleState,
    player_id: str,
    skill: SkillSpec,
    target_player_id: str,
    slot: int,
) -> bool:
    player = state.players[target_player_id]
    if slot < 0 or slot >= len(player.team):
        return False
    target = player.team[slot]
    if not target.alive:
        return False
    action = PendingAction(
        id="cpu-target-probe",
        player_id=player_id,
        caster_slot=0,
        skill_id=skill.id,
        target_player_id=target_player_id,
        target_slot=slot,
    )
    return not invulnerability_blocks_skill(target, skill, action, target_player_id)


def _cpu_target_payloads(
    state: BattleState,
    player_id: str,
    skill_id: str,
    caster_slot: int,
    skills: dict[str, SkillSpec] | None = None,
) -> list[dict[str, Any]]:
    skill = (skills or SKILLS_BY_ID)[skill_id]
    opponent_ids = [pid for pid in state.players if pid != player_id]
    if not opponent_ids:
        return []
    opponent_id = opponent_ids[0]
    opponent = state.players[opponent_id]
    living_enemy_slots = [
        slot for slot in opponent.active_slots
        if _is_legal_cpu_target(state, player_id, skill, opponent_id, slot)
    ]
    living_enemy_slots.sort(key=lambda slot: opponent.team[slot].hp)
    player = state.players[player_id]
    living_ally_slots = [
        slot for slot in player.active_slots
        if _is_legal_cpu_target(state, player_id, skill, player_id, slot)
    ]
    living_ally_slots.sort(key=lambda slot: player.team[slot].hp / max(1, player.team[slot].max_hp))
    if any(effect.payload.get("controlled_redirect") for effect in skill.effects):
        alternate_slot = living_ally_slots[0] if living_ally_slots else caster_slot
        return [
            {"target_player_id": opponent_id, "target_slot": slot, "alternate_target_player_id": player_id, "alternate_target_slot": alternate_slot}
            for slot in living_enemy_slots
        ]
    if any(effect.payload.get("conditional_targeting") == "venom_bloom" for effect in skill.effects):
        poisoned = [slot for slot in living_enemy_slots if has_status(opponent.team[slot], "poison")]
        if not poisoned:
            return [{"target_player_id": opponent_id, "target_slot": None, "target_slots": living_enemy_slots}]
        return [
            {"target_player_id": opponent_id, "target_slot": primary, "target_slots": [primary, secondary], "secondary_target_slot": secondary}
            for primary in poisoned for secondary in living_enemy_slots if secondary != primary
        ]
    if skill.target_rule.kind == "self":
        return [{"target_player_id": player_id, "target_slot": caster_slot}]
    if skill.target_rule.kind == "ally":
        return [
            {"target_player_id": player_id, "target_slot": slot}
            for slot in living_ally_slots
        ]
    if skill.target_rule.kind == "ally_team":
        return [{"target_player_id": player_id, "target_slot": None, "target_slots": living_ally_slots}]
    if skill.target_rule.kind == "enemy_team":
        return [{"target_player_id": opponent_id, "target_slot": None, "target_slots": living_enemy_slots}]
    if skill.target_rule.kind == "enemy":
        return [
            {"target_player_id": opponent_id, "target_slot": slot}
            for slot in living_enemy_slots
        ]
    return []


def _target_slots_from_payload(target_payload: dict[str, Any]) -> list[int]:
    if target_payload.get("target_slots"):
        return list(target_payload["target_slots"])
    if target_payload.get("target_slot") is not None:
        return [int(target_payload["target_slot"])]
    return []


def _cpu_viewer_safe_clone(state: BattleState, player_id: str) -> BattleState:
    """Return a clone containing only information visible to the CPU player."""

    trial = deepcopy(state)
    for owner in trial.players.values():
        for character in owner.team:
            character.statuses = [
                status
                for status in character.statuses
                if not (
                    status.invisible
                    and not status.revealed
                    and status.source_player_id != player_id
                )
            ]
    return trial


def _cpu_resolve_trial(
    trial: BattleState,
    player_id: str,
    actions: list[PendingAction],
    skills: dict[str, SkillSpec],
    *,
    finish_player_turn: bool,
) -> BattleState | None:
    """Resolve actions on an already viewer-safe trial state."""

    trial.pending_actions[player_id] = deepcopy(actions)
    trial.queue_order[player_id] = [action.id for action in actions]
    trial.players[player_id].queue_confirmed = True
    try:
        if finish_player_turn:
            resolve_queue(trial, player_id, skills)
        else:
            resolve_queue_prefix(trial, player_id, skills)
    except (ResolverError, KeyError, ValueError):
        return None
    return trial


def _cpu_simulate_queue(
    state: BattleState,
    player_id: str,
    actions: list[PendingAction],
    skills: dict[str, SkillSpec],
    *,
    finish_player_turn: bool = False,
) -> BattleState | None:
    """Resolve a viewer-safe queue clone and return its predicted state.

    Prefix planning deliberately leaves the current turn open. Whole-queue
    scoring opts into authoritative turn cleanup with ``finish_player_turn``.
    """

    baseline = _cpu_viewer_safe_clone(state, player_id)
    return _cpu_resolve_trial(
        baseline,
        player_id,
        actions,
        skills,
        finish_player_turn=finish_player_turn,
    )


def _cpu_effective_outcome(
    state: BattleState,
    player_id: str,
    action: PendingAction | list[PendingAction],
    skill: SkillSpec | dict[str, SkillSpec],
) -> dict[str, int]:
    """Dry-run a partial queue through the authoritative resolver for Hard CPU.

    The clone contains only information the acting viewer may know. This makes
    prior queued damage, deaths, marks, stuns, healing and defenses part of the
    next decision without exposing an opponent's unrevealed invisible state.
    """

    actions = action if isinstance(action, list) else [action]
    skills = skill if isinstance(skill, dict) else {skill.id: skill}

    def defense(character: CharacterState) -> int:
        return sum(
            max(0, int(status.payload.get("destructible_defense", 0)))
            for status in character.statuses
            if status.duration != 0
        )

    baseline = _cpu_viewer_safe_clone(state, player_id)
    before = {
        (owner.id, slot): (character.hp, defense(character), character.alive)
        for owner in baseline.players.values()
        for slot, character in enumerate(owner.team)
    }
    before_statuses = Counter(
        (owner.id, slot, status.id)
        for owner in baseline.players.values()
        for slot, character in enumerate(owner.team)
        for status in character.statuses
        if status.duration != 0
    )
    trial = _cpu_resolve_trial(
        deepcopy(baseline),
        player_id,
        actions,
        skills,
        finish_player_turn=True,
    )
    empty = {
        "hp_damage": 0, "defense_damage": 0, "kills": 0,
        "statuses_applied": 0, "control_statuses": 0,
        "friendly_hp_damage": 0, "caster_hp_damage": 0,
        "friendly_deaths": 0, "caster_deaths": 0,
        "friendly_healing": 0, "enemy_healing": 0,
        "friendly_defense_gain": 0, "semantic_status_utility": 0,
        "energy_spent": 0,
    }
    if trial is None:
        return empty

    hp_damage = 0
    defense_damage = 0
    kills = 0
    statuses_applied = 0
    control_statuses = 0
    friendly_hp_damage = 0
    caster_hp_damage = 0
    friendly_deaths = 0
    caster_deaths = 0
    friendly_healing = 0
    enemy_healing = 0
    friendly_defense_gain = 0
    semantic_status_utility = 0
    caster_slots = {queued.caster_slot for queued in actions}
    for owner in trial.players.values():
        for slot, character in enumerate(owner.team):
            old_hp, old_defense, was_alive = before[(owner.id, slot)]
            if owner.id != player_id:
                hp_damage += max(0, old_hp - character.hp)
                enemy_healing += max(0, character.hp - old_hp)
                defense_damage += max(0, old_defense - defense(character))
                if was_alive and not character.alive:
                    kills += 1
            else:
                lost = max(0, old_hp - character.hp)
                friendly_hp_damage += lost
                friendly_healing += max(0, character.hp - old_hp)
                friendly_defense_gain += max(0, defense(character) - old_defense)
                if slot in caster_slots:
                    caster_hp_damage += lost
                if was_alive and not character.alive:
                    friendly_deaths += 1
                    if slot in caster_slots:
                        caster_deaths += 1
            remaining_preexisting = Counter({
                status_id: before_statuses[(owner.id, slot, status_id)]
                for status_id in {
                    status.id for status in character.statuses if status.duration != 0
                }
            })
            for status in character.statuses:
                if status.duration == 0 or status.id == "damaged_last_turn":
                    continue
                if remaining_preexisting[status.id] > 0:
                    remaining_preexisting[status.id] -= 1
                    continue
                statuses_applied += 1
                if owner.id != player_id and (
                    status.payload.get("stun_classes")
                    or int(status.payload.get("damage_output_delta", 0)) < 0
                    or int(status.payload.get("turn_end_damage", 0)) > 0
                ):
                    control_statuses += 1
                if owner.id == player_id:
                    if status.payload.get("counter") or status.payload.get("reflect"):
                        semantic_status_utility += 70
                    if status.payload.get("damage_bonus"):
                        semantic_status_utility += 45
                    if status.payload.get("damage_reduction"):
                        semantic_status_utility += 25
    return {
        "hp_damage": hp_damage,
        "defense_damage": defense_damage,
        "kills": kills,
        "statuses_applied": statuses_applied,
        "control_statuses": control_statuses,
        "friendly_hp_damage": friendly_hp_damage,
        "caster_hp_damage": caster_hp_damage,
        "friendly_deaths": friendly_deaths,
        "caster_deaths": caster_deaths,
        "friendly_healing": friendly_healing,
        "enemy_healing": enemy_healing,
        "friendly_defense_gain": friendly_defense_gain,
        "semantic_status_utility": semantic_status_utility,
        "energy_spent": sum(
            len(get_skill_for_action(skills, state.players[player_id].team[queued.caster_slot], queued).cost)
            for queued in actions
            if 0 <= queued.caster_slot < len(state.players[player_id].team)
        ),
    }


def _cpu_action_score(
    state: BattleState,
    player_id: str,
    action: PendingAction,
    skill: SkillSpec,
    *,
    difficulty: str = "normal",
    remaining_teammates: int = 0,
    partial_actions: list[PendingAction] | None = None,
    skills: dict[str, SkillSpec] | None = None,
    planned_actions: list[PendingAction] | None = None,
) -> int:
    """Heuristic value of a candidate CPU action.

    `difficulty` only scales the "smart" tactical bonuses (kill-securing,
    status control, heal urgency) and the cost aversion, not the raw
    damage/heal numbers — Hard leans harder into kills/control and is less
    cost-averse, Easy leans closer to "always basic-attack".

    Hard and Normal must not collapse to the same ranking whenever a lethal
    opportunity happens to be absent. Beyond scaling the same bonuses harder,
    Hard alone evaluates three qualitatively different signals Normal never
    looks at:

    - **Setup/payoff awareness**: a conditional damage effect's real value
      depends on whether its `condition_status`/`condition_missing_status`
      is actually true of the live target right now, not the raw listed
      `amount` (which may not fire, or may be the smaller of two branches).
      Normal/Easy still just sum every effect's listed amount, matching
      their "doesn't read the board that closely" identity.
    - **Counter/reflect risk**: a harmful effect against a target currently
      holding an active counter/reflect status is penalized, since it risks
      feeding the caster's own payload back at them.
    - **Future energy reservation**: non-lethal, non-control actions are
      discounted further when other living teammates still need to act
      this turn and would draw from the same shared energy pool.
    """

    if difficulty not in {"easy", "normal", "hard"}:
        difficulty = "normal"
    is_hard = difficulty == "hard"
    score = 0
    smart_bonus = 0
    lethal_secured = False
    lethal_bonus_amount = 650 if is_hard else 500
    smart_bonus_weight = {"easy": 0.5, "normal": 1.0, "hard": 1.35}[difficulty]
    condition_weight = {"easy": 1.0, "normal": 1.0, "hard": 1.6}[difficulty]
    target_player = state.players.get(action.target_player_id)
    target_slots = _target_slots_from_payload(
        {
            "target_slot": action.target_slot,
            "target_slots": action.target_slots,
        }
    )
    harmful_to_enemy = bool(target_player and target_player.id != player_id)
    effective_outcome = None
    if is_hard:
        effective_outcome = _cpu_effective_outcome(
            state,
            player_id,
            planned_actions or [*(partial_actions or []), action],
            skills or {skill.id: skill},
        )
    if is_hard and harmful_to_enemy:
        skill_is_uncounterable = SkillClass.UNCOUNTERABLE in skill.classes
        skill_is_unreflectable = SkillClass.UNREFLECTABLE in skill.classes
        for slot in target_slots:
            if 0 <= slot < len(target_player.team):
                target = target_player.team[slot]
                if any(
                    status.duration != 0
                    # Hard only reacts to traps it could actually know about: its own,
                    # or ones already revealed. An unrevealed opponent trap is invisible
                    # to a player and must stay invisible to the CPU too.
                    and not (status.invisible and not status.revealed and player_id != status.source_player_id)
                    and (
                        (status.payload.get("counter") and not skill_is_uncounterable)
                        or (status.payload.get("reflect") and not skill_is_unreflectable)
                    )
                    for status in target.statuses
                ):
                    smart_bonus -= 80
    for effect in skill.effects:
        if effect.type in {"damage", "health_steal"}:
            amount = effect.amount or 0
            condition_unmet_for_hard = False
            if is_hard and harmful_to_enemy and target_slots:
                # Read the board: a conditional amount only counts toward Hard's
                # valuation if its condition is actually true of the real target.
                sample_slot = next((s for s in target_slots if 0 <= s < len(target_player.team)), None)
                sample_target = target_player.team[sample_slot] if sample_slot is not None else None
                condition_status = effect.payload.get("condition_status")
                condition_missing = effect.payload.get("condition_missing_status")
                if sample_target is not None:
                    if condition_status and not has_status(sample_target, str(condition_status)):
                        condition_unmet_for_hard = True
                    elif condition_missing and has_status(sample_target, str(condition_missing)):
                        condition_unmet_for_hard = True
            if condition_unmet_for_hard:
                amount = 0
            else:
                if effect.damage_type == DamageType.SOUL:
                    amount += 10
                elif effect.damage_type in {DamageType.PIERCING, DamageType.SURE_HIT, DamageType.HEALTH_STEAL}:
                    amount += 6
            # Easy and Normal must never mistake target=self damage for
            # offensive value. Hard uses the authoritative dry-run below.
            if not is_hard and effect.target != "self" and harmful_to_enemy:
                score += amount
            if target_player and target_player.id != player_id and not is_hard and effect.target != "self":
                for slot in target_slots:
                    if 0 <= slot < len(target_player.team):
                        target = target_player.team[slot]
                        if target.alive and amount >= target.hp:
                            smart_bonus += lethal_bonus_amount
                            lethal_secured = True
                        score += max(0, target.max_hp - target.hp) // 5
        elif effect.type == "heal":
            heal_urgency_threshold = 55 if is_hard else 40
            if target_player:
                for slot in target_slots:
                    if 0 <= slot < len(target_player.team):
                        target = target_player.team[slot]
                        missing = max(0, target.max_hp - target.hp)
                        if effective_outcome is None:
                            score += min(effect.amount or 0, missing) * 3
                        if target.hp <= heal_urgency_threshold:
                            smart_bonus += 60
        elif effect.type == "apply_status":
            payload = effect.payload
            if effective_outcome is None:
                if payload.get("stun_classes"):
                    smart_bonus += 90
                if payload.get("counter") or payload.get("reflect"):
                    smart_bonus += 70
                if payload.get("damage_bonus"):
                    smart_bonus += 45
                if payload.get("damage_reduction"):
                    smart_bonus += 25
                if int(payload.get("damage_output_delta", 0)) < 0:
                    smart_bonus += 35
                if payload.get("turn_end_damage"):
                    smart_bonus += int(payload["turn_end_damage"]) * 2
                if effect.status:
                    score += 10
        elif effect.type == "remove_status":
            score += 20
    if effective_outcome is not None:
        score += effective_outcome["hp_damage"]
        score += effective_outcome["defense_damage"] // 2
        if effective_outcome["kills"]:
            smart_bonus += lethal_bonus_amount * effective_outcome["kills"]
            lethal_secured = True
        score += effective_outcome["statuses_applied"] * 10
        smart_bonus += effective_outcome["control_statuses"] * 90
        smart_bonus += effective_outcome["semantic_status_utility"]
        score += effective_outcome["friendly_healing"] * 3
        score += effective_outcome["friendly_defense_gain"]
        score -= effective_outcome["enemy_healing"] * 3
        score -= effective_outcome["friendly_hp_damage"] * 3
        score -= effective_outcome["caster_hp_damage"] * 2
        score -= effective_outcome["friendly_deaths"] * 450
        score -= effective_outcome["caster_deaths"] * 300
        score -= effective_outcome["energy_spent"] * max(1, remaining_teammates)
        if target_player:
            for slot in target_slots:
                if 0 <= slot < len(target_player.team):
                    target = target_player.team[slot]
                    score += max(0, target.max_hp - target.hp) // 5
    if skill.conditions:
        score += int(35 * condition_weight)
    score += int(smart_bonus * smart_bonus_weight)
    score -= len(skill.cost) * (1 if is_hard else 2)
    if is_hard and not lethal_secured and smart_bonus <= 0 and remaining_teammates > 0:
        score -= len(skill.cost) * remaining_teammates
    return score


def _cpu_queue_targets_survive_prefixes(
    state: BattleState,
    player_id: str,
    actions: list[PendingAction],
    skills: dict[str, SkillSpec],
) -> bool:
    """Reject a queue whose later action already points at a predicted corpse."""

    predicted = state
    for index, action in enumerate(actions):
        target_player = predicted.players.get(action.target_player_id)
        target_slots = _target_slots_from_payload({
            "target_slot": action.target_slot,
            "target_slots": action.target_slots,
        })
        if target_player is not None and action.target_player_id != player_id:
            if any(
                slot < 0 or slot >= len(target_player.team) or not target_player.team[slot].alive
                for slot in target_slots
            ):
                return False
        if index + 1 < len(actions):
            predicted = _cpu_simulate_queue(state, player_id, actions[: index + 1], skills)
            if predicted is None:
                return False
    return True


def _cpu_outcome_utility(outcome: dict[str, int]) -> int:
    """Comparable whole-queue value used only for final Hard ordering."""

    return (
        outcome["hp_damage"]
        + outcome["defense_damage"] // 2
        + outcome["kills"] * 900
        + outcome["control_statuses"] * 120
        + outcome["statuses_applied"] * 10
        + outcome["semantic_status_utility"]
        + outcome["friendly_healing"] * 3
        + outcome["friendly_defense_gain"]
        - outcome["enemy_healing"] * 3
        - outcome["friendly_hp_damage"] * 3
        - outcome["caster_hp_damage"] * 2
        - outcome["friendly_deaths"] * 450
        - outcome["caster_deaths"] * 300
        - outcome["energy_spent"]
    )


class BattleV2Manager:
    """Manage authoritative v2 battle states by room id."""

    def __init__(
        self,
        rng_seed: int | None = None,
        *,
        timer_policy: BattleTimerPolicy | None = None,
        clock: Callable[[], float] = system_clock,
        capture_replays: bool = False,
    ):
        self.rooms: dict[str, BattleState] = {}
        self.room_aliases: dict[str, str] = {}
        self.rngs: dict[str, random.Random] = {}
        self.rng_seed = rng_seed
        self.room_rosters: dict[str, dict[str, CharacterSpec]] = {}
        self.room_skill_maps: dict[str, dict[str, SkillSpec]] = {}
        self.room_catalogs: dict[str, dict[str, Any]] = {}
        self.room_roster_modes: dict[str, str] = {}
        self.room_cpu_difficulty: dict[str, str] = {}
        self.room_first_creation_progress: dict[str, dict[str, dict[str, Any]]] = {}
        self.command_receipts: dict[str, dict[str, OrderedDict[str, str]]] = {}
        self.room_locks: dict[str, RLock] = {}
        self.room_replays: dict[str, dict[str, Any]] = {}
        self.capture_replays = capture_replays
        self.timer_policy = timer_policy or BattleTimerPolicy()
        self.clock = clock
        # Optional hook invoked exactly once, at the authoritative terminal
        # state transition in `_finish_match` — not from any broadcast path.
        # Lets callers (e.g. web/app.py) record match-finished analytics at
        # the true source of truth instead of a viewer-serialization side effect.
        self.on_match_finished: Callable[[str], None] | None = None

    def start_classic_match(
        self,
        room_id: str,
        players: list[BattlePlayerConfig | dict[str, Any]],
        *,
        roster: dict[str, CharacterSpec] | None = None,
        skills: dict[str, SkillSpec] | None = None,
        catalog: dict[str, Any] | None = None,
        difficulty: str = "normal",
    ) -> dict:
        """Start a Classic Arena match and return serialized state for player one."""

        if room_id in self.rooms:
            raise BattleV2Error("active match already exists")

        roster = roster or STARTER_ROSTER
        skills = skills or SKILLS_BY_ID
        catalog = catalog or _serialize_roster_catalog(roster)
        configs = [_coerce_player_config(player) for player in players]
        if len(configs) != 2:
            raise BattleV2Error("classic match requires exactly two players")
        player_states: dict[str, PlayerState] = {}
        for config in configs:
            if len(config.team) != 3:
                raise BattleV2Error("classic match requires exactly three characters per player")
            if config.id in player_states:
                raise BattleV2Error(f"duplicate player id: {config.id}")
            team = []
            for character_id in config.team:
                if character_id not in roster:
                    raise BattleV2Error(f"unknown starter character: {character_id}")
                team.append(_character_state(roster[character_id]))
            player_states[config.id] = PlayerState(id=config.id, name=config.name, team=team)

        turn_player_id = configs[0].id
        seed = self.rng_seed if isinstance(self.rng_seed, int) and not isinstance(self.rng_seed, bool) else secrets.randbits(63)
        state = BattleState(
            players=player_states,
            turn_player_id=turn_player_id,
            rng_seed=seed,
            room_id=room_id,
            disconnect_seconds_used={config.id: 0 for config in configs},
            timeout_total={config.id: 0 for config in configs},
            timeout_consecutive={config.id: 0 for config in configs},
            damage_to_hp={config.id: 0 for config in configs},
        )
        rng = random.Random(seed)
        self.rngs[room_id] = rng
        gain_turn_energy(state.players[turn_player_id], state.turn_number, True, rng)
        self.rooms[room_id] = state
        self.command_receipts[room_id] = {}
        self.room_locks[room_id] = RLock()
        arm_phase_timer(state, self.timer_policy, self.clock)
        self.room_rosters[room_id] = roster
        self.room_skill_maps[room_id] = skills
        self.room_catalogs[room_id] = catalog
        self.room_roster_modes[room_id] = "classic"
        self.room_cpu_difficulty[room_id] = difficulty if difficulty in {"easy", "normal", "hard"} else "normal"
        self.room_first_creation_progress.pop(room_id, None)
        if self.capture_replays:
            from .replay import REPLAY_FORMAT_VERSION, RULES_VERSION, authoritative_state_hash
            self.room_replays[room_id] = {
                "format_version": REPLAY_FORMAT_VERSION,
                "rules_version": RULES_VERSION,
                "match_id": room_id,
                "roster_mode": "classic",
                "rng_seed": seed,
                "cpu_difficulty": self.room_cpu_difficulty[room_id],
                "timer_policy": {"planning_seconds": self.timer_policy.planning_seconds, "queue_review_seconds": self.timer_policy.queue_review_seconds},
                "players": [
                    {"id": config.id, "name": config.name, "team": list(config.team)}
                    for config in configs
                ],
                "commands": [],
                "events": [],
                "initial_state_hash": authoritative_state_hash(state),
                "final_state_hash": authoritative_state_hash(state),
            }
        return self.serialize_for_player(room_id, turn_player_id)

    def start_first_creation_match(
        self,
        room_id: str,
        players: list[BattlePlayerConfig | dict[str, Any]],
        difficulty: str = "normal",
    ) -> dict:
        """Start a match restricted to the first-character-creation roster."""

        configs = [_coerce_player_config(player) for player in players]
        for config in configs:
            valid, reason = validate_first_creation_team(config.team)
            if not valid:
                raise BattleV2Error(reason)
        self.start_classic_match(
            room_id,
            configs,
            roster=FIRST_CREATION_ROSTER,
            skills=FIRST_CREATION_SKILLS_BY_ID,
            catalog=first_creation_catalog(),
            difficulty=difficulty,
        )
        self.room_roster_modes[room_id] = "first_creation"
        if room_id in self.room_replays:
            self.room_replays[room_id]["roster_mode"] = "first_creation"
        self.room_first_creation_progress[room_id] = initial_first_creation_progress(self.get_state(room_id))
        return self.serialize_for_player(room_id, configs[0].id)

    def _skills_for_room(self, room_id: str) -> dict[str, SkillSpec]:
        return self.room_skill_maps.get(room_id, SKILLS_BY_ID)

    def _roster_for_room(self, room_id: str) -> dict[str, CharacterSpec]:
        return self.room_rosters.get(room_id, STARTER_ROSTER)

    def _cpu_difficulty_for_room(self, room_id: str) -> str:
        return self.room_cpu_difficulty.get(room_id, "normal")

    def get_state(self, room_id: str) -> BattleState:
        room_id = self.room_aliases.get(room_id, room_id)
        try:
            return self.rooms[room_id]
        except KeyError as exc:
            raise BattleV2Error(f"unknown room: {room_id}") from exc

    def execute_player_command(
        self,
        room_id: str,
        player_id: str,
        command: str,
        state_revision: int,
        client_action_nonce: str,
        payload: dict[str, Any] | None = None,
    ) -> bool:
        """Execute one versioned command atomically; return True for a safe retry."""

        with self.room_locks.setdefault(room_id, RLock()):
            return self._execute_player_command(
                room_id,
                player_id,
                command,
                state_revision,
                client_action_nonce,
                payload,
            )

    def _execute_player_command(
        self,
        room_id: str,
        player_id: str,
        command: str,
        state_revision: int,
        client_action_nonce: str,
        payload: dict[str, Any] | None = None,
    ) -> bool:

        payload = payload or {}
        nonce = str(client_action_nonce).strip()
        if not nonce:
            raise BattleV2Error("client_action_nonce is required")
        if len(nonce) > 64:
            raise BattleV2Error("client_action_nonce is too long")
        state = self.get_state(room_id)
        self.expire_phase_if_needed(room_id)

        fingerprint = json.dumps(
            {"command": command, "payload": payload},
            sort_keys=True,
            separators=(",", ":"),
        )
        player_receipts = self.command_receipts.setdefault(room_id, {}).setdefault(
            player_id, OrderedDict()
        )
        previous = player_receipts.get(nonce)
        if previous is not None:
            if previous != fingerprint:
                raise BattleV2Error("client_action_nonce was already used for a different command")
            player_receipts.move_to_end(nonce)
            return True
        if state.phase == BattlePhase.FINISHED:
            raise BattleV2Error("battle already finished")
        if state.paused:
            raise BattleV2Error("battle is paused for reconnect")
        if isinstance(state_revision, bool) or not isinstance(state_revision, int) or state_revision < 0:
            raise BattleV2Error("state_revision must be a non-negative integer")
        if state_revision != state.state_revision:
            raise BattleV2Error(
                f"stale state revision: expected {state.state_revision}, got {state_revision}"
            )

        state_snapshot = deepcopy(state)
        progress_snapshot = deepcopy(self.room_first_creation_progress.get(room_id))
        rng = self.rngs.get(room_id)
        rng_snapshot = rng.getstate() if rng is not None else None
        try:
            if command == "submit_plan":
                self.submit_plan(room_id, player_id, list(payload.get("actions", [])))
            elif command == "update_queue":
                self.update_queue(
                    room_id,
                    player_id,
                    list(payload.get("queue_order", [])),
                    dict(payload.get("wildcard_pays", {})),
                )
            elif command == "confirm_queue":
                self.confirm_queue(room_id, player_id)
            elif command == "cancel_queue":
                self.cancel_queue(room_id, player_id)
            elif command == "convert_energy":
                self.convert_energy(room_id, player_id, str(payload.get("source", "")), str(payload.get("target", "")))
            elif command == "end_turn":
                self.end_turn(room_id, player_id)
            elif command == "surrender":
                self.surrender(room_id, player_id)
            elif command == "cpu_turn":
                self.take_cpu_turn(room_id, player_id)
            else:
                raise BattleV2Error(f"unknown battle command: {command}")
        except Exception as exc:
            self.rooms[room_id] = state_snapshot
            if progress_snapshot is None:
                self.room_first_creation_progress.pop(room_id, None)
            else:
                self.room_first_creation_progress[room_id] = progress_snapshot
            if rng is not None and rng_snapshot is not None:
                rng.setstate(rng_snapshot)
            if isinstance(exc, BattleV2Error):
                raise
            if isinstance(exc, (IndexError, KeyError, TypeError, ValueError)):
                raise BattleV2Error("invalid command payload") from exc
            raise

        self.rooms[room_id].state_revision += 1
        if self.capture_replays and room_id in self.room_replays:
            from .replay import authoritative_state_hash
            state_hash = authoritative_state_hash(self.rooms[room_id])
            self.room_replays[room_id]["commands"].append({
                "player_id": player_id,
                "command": command,
                "state_revision": state_revision,
                "client_action_nonce": nonce,
                "payload": deepcopy(payload),
                "expected_state_hash": state_hash,
            })
            self.room_replays[room_id]["events"].append({
                "type": "command", "logical_time": self.rooms[room_id].logical_time,
                "player_id": player_id, "command": command, "state_revision": state_revision,
                "client_action_nonce": nonce, "payload": deepcopy(payload), "expected_state_hash": state_hash,
            })
            self.room_replays[room_id]["final_state_hash"] = state_hash
        player_receipts[nonce] = fingerprint
        player_receipts.move_to_end(nonce)
        while len(player_receipts) > 128:
            player_receipts.popitem(last=False)
        return False

    def _record_lifecycle(self, room_id: str, event_type: str, payload: dict[str, Any]) -> None:
        if self.capture_replays and room_id in self.room_replays:
            self.room_replays[room_id]["events"].append({
                "type": event_type,
                "logical_time": self.clock(),
                "payload": deepcopy(payload),
            })

    def replay_document(self, room_id: str) -> dict[str, Any]:
        if room_id not in self.room_replays:
            raise BattleV2Error("replay capture is not enabled for this room")
        from .replay import authoritative_state_hash
        self.room_replays[room_id]["final_state_hash"] = authoritative_state_hash(self.get_state(room_id))
        return deepcopy(self.room_replays[room_id])

    def _finish_match(self, state: BattleState, result_type: str, winner_id: str | None, reason: str, *, event_type: str = "battle_finished") -> None:
        if state.phase == BattlePhase.FINISHED and state.result_type is not None:
            return
        state.result_type = result_type
        state.winner_id = winner_id
        state.finish_reason = reason
        state.phase = BattlePhase.FINISHED
        state.paused = False
        state.paused_phase = None
        state.paused_seconds_remaining = None
        state.phase_deadline = None
        state.event_log.append(BattleEvent(
            event_type,
            f"{result_type}: {reason}",
            state.turn_number,
            {"winner_id": winner_id, "result_type": result_type, "reason": reason},
        ))
        if self.on_match_finished is not None and state.room_id is not None:
            try:
                self.on_match_finished(state.room_id)
            except Exception:
                pass

    def _finish_by_tiebreak(self, state: BattleState, reason: str) -> None:
        scores = {}
        for player_id, player in state.players.items():
            living = sum(1 for slot in player.active_slots if player.team[slot].alive)
            hp = sum(max(0, player.team[slot].hp) for slot in player.active_slots)
            scores[player_id] = (living, hp, state.damage_to_hp.get(player_id, 0), -state.timeout_total.get(player_id, 0))
        best = max(scores.values())
        winners = [player_id for player_id, score in scores.items() if score == best]
        winner = winners[0] if len(winners) == 1 else None
        self._finish_match(state, "WIN" if winner else "DRAW", winner, reason)

    def disconnect_player(self, room_id: str, player_id: str) -> None:
        with self.room_locks.setdefault(room_id, RLock()):
            state = self.get_state(room_id)
            if state.phase == BattlePhase.FINISHED or player_id not in state.players:
                return
            now = self.clock()
            if player_id in state.disconnected_at:
                return
            used = state.disconnect_seconds_used.get(player_id, 0)
            remaining_budget = max(0, 180 - used)
            state.disconnected_at[player_id] = now
            state.disconnect_deadlines[player_id] = now + min(90, remaining_budget)
            if not state.paused:
                state.paused = True
                state.paused_phase = state.phase
                state.paused_seconds_remaining = phase_seconds_remaining(state, self.clock)
                state.phase_deadline = None
            self._record_lifecycle(room_id, "disconnect", {"player_id": player_id})

    def reconnect_player(self, room_id: str, player_id: str) -> None:
        with self.room_locks.setdefault(room_id, RLock()):
            state = self.get_state(room_id)
            if state.phase == BattlePhase.FINISHED or player_id not in state.disconnected_at:
                raise BattleV2Error("reconnect rejected")
            now = self.clock()
            deadline = state.disconnect_deadlines.get(player_id, now)
            if now >= deadline:
                raise BattleV2Error("reconnect grace expired")
            elapsed = max(0, int(now - state.disconnected_at.pop(player_id)))
            state.disconnect_seconds_used[player_id] = min(180, state.disconnect_seconds_used.get(player_id, 0) + elapsed)
            state.disconnect_deadlines.pop(player_id, None)
            if not state.disconnected_at:
                state.paused = False
                state.phase = state.paused_phase or state.phase
                state.paused_phase = None
                remaining = max(15, int(state.paused_seconds_remaining or 0))
                state.paused_seconds_remaining = None
                state.phase_deadline = now + remaining
            self._record_lifecycle(room_id, "reconnect", {"player_id": player_id})

    def expire_disconnects(self, room_id: str) -> bool:
        with self.room_locks.setdefault(room_id, RLock()):
            state = self.get_state(room_id)
            if state.phase == BattlePhase.FINISHED:
                return False
            now = self.clock()
            expired = [player_id for player_id, deadline in state.disconnect_deadlines.items() if now >= deadline]
            if not expired:
                return False
            for player_id in expired:
                started = state.disconnected_at.get(player_id, now)
                state.disconnect_seconds_used[player_id] = min(180, state.disconnect_seconds_used.get(player_id, 0) + max(0, int(now - started)))
            connected = [player_id for player_id in state.players if player_id not in expired and player_id not in state.disconnected_at]
            if connected:
                self._finish_match(state, "FORFEIT", connected[0], "disconnect_budget" if any(state.disconnect_seconds_used.get(pid, 0) >= 180 for pid in expired) else "disconnect", event_type="forfeit")
            elif len(expired) == len(state.players):
                self._finish_match(state, "NO_CONTEST", None, "disconnect", event_type="no_contest")
            self._record_lifecycle(room_id, "expire_disconnects", {})
            return True

    def _disconnect_grace_seconds_remaining(self, state: BattleState) -> float | None:
        if not state.disconnect_deadlines:
            return None
        now = self.clock()
        return max(0.0, min(deadline - now for deadline in state.disconnect_deadlines.values()))

    def _capture_turn_ledger(self, state: BattleState) -> bool:
        events = state.event_log[state.progress_event_cursor:]
        state.progress_event_cursor = len(state.event_log)
        progress = False
        for event in events:
            amount = int(event.payload.get("actual_hp_damage", event.payload.get("amount", 0)) or 0)
            source = event.payload.get("source_player_id")
            target = event.payload.get("target_player_id")
            if event.type in {"damage", "status_damage"} and amount > 0 and source and target:
                credited = next((pid for pid in state.players if pid != source), source) if event.payload.get("is_reflected") else source
                if source != target or event.payload.get("is_reflected"):
                    state.damage_to_hp[credited] = state.damage_to_hp.get(credited, 0) + amount
                progress = progress or source != target
            elif event.type in {"energy_drained", "energy_stolen", "status_stack_changed", "status_consumed"}:
                progress = progress or amount > 0
            elif event.type == "status_applied":
                families = set(event.payload.get("families") or [])
                progress = progress or bool(families.intersection({"MARK", "STUN", "CONTROL", "AFFLICTION", "SOUL"})) or int(event.payload.get("stacks", 0) or 0) > 1
            elif event.type in {"domain_ended", "replacement_revoked", "hostile_status_expired"}:
                progress = True
        return progress

    def _complete_player_turn(self, state: BattleState, player_id: str, *, timeout: bool) -> None:
        if state.phase == BattlePhase.FINISHED and state.result_type is None:
            winner = state.winner_id
            state.phase = BattlePhase.TURN_END
            self._finish_match(state, "WIN" if winner else "DRAW", winner, "defeat")
        state.player_turns_completed += 1
        state.logical_time += 1
        if timeout:
            state.timeout_total[player_id] = state.timeout_total.get(player_id, 0) + 1
            state.timeout_consecutive[player_id] = state.timeout_consecutive.get(player_id, 0) + 1
        else:
            state.timeout_consecutive[player_id] = 0
        if self._capture_turn_ledger(state):
            state.no_progress_turns = 0
        else:
            state.no_progress_turns += 1
        opponents = [pid for pid in state.players if pid != player_id]
        if timeout and (state.timeout_consecutive[player_id] >= 3 or state.timeout_total[player_id] >= 5):
            self._finish_match(state, "FORFEIT", opponents[0] if opponents else None, "timeout", event_type="forfeit")
        elif state.player_turns_completed >= 72:
            self._finish_by_tiebreak(state, "hard_cap")
        elif state.no_progress_turns >= 12:
            self._finish_by_tiebreak(state, "no_progress")
        elif state.no_progress_turns == 8:
            state.event_log.append(BattleEvent("no_progress_warning", "No-progress tiebreak in four player turns", state.turn_number))

    def surrender(self, room_id: str, player_id: str) -> dict:
        """Finish a match by authoritative player surrender."""

        state = self.get_state(room_id)
        if player_id not in state.players:
            raise BattleV2Error(f"unknown player: {player_id}")
        winners = [pid for pid in state.players if pid != player_id]
        if not winners:
            raise BattleV2Error("no opponent to award surrender")
        if state.phase == BattlePhase.FINISHED:
            raise BattleV2Error("battle already finished")
        self._finish_match(state, "FORFEIT", winners[0], "surrender", event_type="forfeit")
        return self.serialize_for_player(room_id, player_id)

    def submit_plan(self, room_id: str, player_id: str, actions: list[dict[str, Any]]) -> dict:
        """Store pending actions for queue review without spending energy."""

        self.expire_phase_if_needed(room_id)
        state = self.get_state(room_id)
        self._ensure_turn_player(state, player_id)
        previous_actions = deepcopy(state.pending_actions.get(player_id, []))
        previous_order = list(state.queue_order.get(player_id, []))
        original_deadline = state.phase_deadline
        parsed = [payload_to_action(player_id, index, payload) for index, payload in enumerate(actions)]
        state.pending_actions[player_id] = parsed
        state.queue_order[player_id] = [action.id for action in sorted(parsed, key=lambda item: item.queue_index)]
        state.phase = BattlePhase.QUEUE_REVIEW
        try:
            if all(not action.wildcard_pays for action in parsed):
                self._validate_non_wildcard_plan(room_id, state, player_id)
            else:
                validate_queue(state, player_id, self._skills_for_room(room_id))
        except ResolverError as exc:
            state.pending_actions[player_id] = previous_actions
            state.queue_order[player_id] = previous_order
            state.phase = BattlePhase.PLANNING
            state.phase_deadline = original_deadline
            raise BattleV2Error(str(exc)) from exc
        return self.serialize_for_player(room_id, player_id)

    def update_queue(
        self,
        room_id: str,
        player_id: str,
        queue_order: list[str],
        wildcard_pays: dict[str, list[str]],
    ) -> dict:
        """Update queue order and wildcard payments, then validate the queue."""

        self.expire_phase_if_needed(room_id)
        state = self.get_state(room_id)
        self._ensure_turn_player(state, player_id)
        previous_actions = deepcopy(state.pending_actions.get(player_id, []))
        previous_order = list(state.queue_order.get(player_id, []))
        action_by_id = {
            action.id: action
            for action in state.pending_actions.get(player_id, [])
        }
        for action_id, pays in wildcard_pays.items():
            if action_id not in action_by_id:
                raise BattleV2Error(f"unknown action id: {action_id}")
            action_by_id[action_id].wildcard_pays = [normalize_energy(energy) for energy in pays]
        state.queue_order[player_id] = list(queue_order)
        try:
            validate_queue(state, player_id, self._skills_for_room(room_id))
        except ResolverError as exc:
            state.pending_actions[player_id] = previous_actions
            state.queue_order[player_id] = previous_order
            raise BattleV2Error(str(exc)) from exc
        return self.serialize_for_player(room_id, player_id)

    def confirm_queue(self, room_id: str, player_id: str) -> dict:
        """Validate and resolve the current player's queue."""

        self.expire_phase_if_needed(room_id)
        state = self.get_state(room_id)
        self._ensure_turn_player(state, player_id)
        resolve_queue(state, player_id, self._skills_for_room(room_id))
        self._complete_player_turn(state, player_id, timeout=False)
        self._refresh_first_creation_progress(room_id)
        self._grant_next_turn_energy(room_id, player_id)
        return self.serialize_for_player(room_id, player_id)

    def cancel_queue(self, room_id: str, player_id: str) -> dict:
        """Clear a player's pending queue and return to planning."""

        self.expire_phase_if_needed(room_id)
        state = self.get_state(room_id)
        self._ensure_turn_player(state, player_id)
        state.pending_actions[player_id] = []
        state.queue_order[player_id] = []
        state.phase = BattlePhase.PLANNING
        return self.serialize_for_player(room_id, player_id)

    def convert_energy(self, room_id: str, player_id: str, source: str, target: str) -> dict:
        """Convert two core energy of one color into one other core color once this turn."""

        self.expire_phase_if_needed(room_id)
        state = self.get_state(room_id)
        self._ensure_turn_player(state, player_id)
        player = state.players[player_id]
        if player.queue_confirmed:
            raise BattleV2Error("queue is already confirmed")
        if state.pending_actions.get(player_id):
            raise BattleV2Error("cancel the current queue before converting energy")
        if player.energy_converted_this_turn:
            raise BattleV2Error("energy conversion already used this turn")
        try:
            source_energy = normalize_energy(source)
            target_energy = normalize_energy(target)
        except ValueError as exc:
            raise BattleV2Error("unknown energy color") from exc
        if source_energy not in CORE_ENERGY or target_energy not in CORE_ENERGY:
            raise BattleV2Error("only colored energy can be converted")
        if source_energy == target_energy:
            raise BattleV2Error("choose two different energy colors")
        if player.energy.get(source_energy, 0) < 2:
            raise BattleV2Error(f"not enough {source_energy.value} energy to convert")
        player.energy[source_energy] -= 2
        player.energy[target_energy] += 1
        player.energy_converted_this_turn = True
        state.event_log.append(
            BattleEvent(
                type="energy_converted",
                message=f"{player.name} converted 2 {source_energy.value} into 1 {target_energy.value}",
                turn_number=state.turn_number,
                payload={
                    "player_id": player_id,
                    "source": source_energy.value,
                    "target": target_energy.value,
                },
            )
        )
        return self.serialize_for_player(room_id, player_id)

    def end_turn(self, room_id: str, player_id: str) -> dict:
        """End the active player's turn without resolving queued actions."""

        self.expire_phase_if_needed(room_id)
        state = self.get_state(room_id)
        self._ensure_turn_player(state, player_id)
        player = state.players[player_id]
        state.pending_actions[player_id] = []
        state.queue_order[player_id] = []
        state.event_log.append(
            BattleEvent(
                type="turn_skipped",
                message=f"{player.name} ended their turn",
                turn_number=state.turn_number,
            )
        )
        finish_turn(state, player_id)
        check_winner(state)
        self._complete_player_turn(state, player_id, timeout=False)
        self._refresh_first_creation_progress(room_id)
        self._grant_next_turn_energy(room_id, player_id)
        return self.serialize_for_player(room_id, player_id)

    def take_cpu_turn(self, room_id: str, player_id: str) -> dict:
        """Submit and resolve a simple first-legal CPU queue for the active turn."""

        self.expire_phase_if_needed(room_id)
        state = self.get_state(room_id)
        self._ensure_turn_player(state, player_id)
        player = state.players[player_id]
        difficulty = self._cpu_difficulty_for_room(room_id)
        actions: list[PendingAction] = []
        for slot_index, slot in enumerate(player.active_slots):
            if slot < 0 or slot >= len(player.team):
                continue
            caster = player.team[slot]
            if not caster.alive:
                continue
            character_spec = self._roster_for_room(room_id).get(caster.character_id)
            if character_spec is None:
                continue
            remaining_teammates = sum(
                1
                for other_slot in player.active_slots[slot_index + 1 :]
                if 0 <= other_slot < len(player.team) and player.team[other_slot].alive
            )
            best: tuple[int, list[PendingAction]] | None = None
            planning_state = state
            if difficulty == "hard" and actions:
                planning_state = _cpu_simulate_queue(
                    state, player_id, actions, self._skills_for_room(room_id)
                ) or state
            for base_skill_id in caster.base_skill_ids:
                resolved_skill_id = caster.skill_replacements.get(base_skill_id, base_skill_id)
                resolved_skill = self._skills_for_room(room_id)[resolved_skill_id]
                for target_payload in _cpu_target_payloads(
                    planning_state, player_id, resolved_skill_id, slot, self._skills_for_room(room_id)
                ):
                    for wildcard_pays in _wildcard_payment_options(player, resolved_skill_id, self._skills_for_room(room_id)):
                        candidate = PendingAction(
                            id=f"{player_id}:cpu:{slot}:{base_skill_id}",
                            player_id=player_id,
                            caster_slot=slot,
                            skill_id=base_skill_id,
                            target_player_id=target_payload["target_player_id"],
                            target_slot=target_payload.get("target_slot"),
                            target_slots=list(target_payload.get("target_slots", [])),
                            wildcard_pays=wildcard_pays,
                            secondary_target_slot=target_payload.get("secondary_target_slot"),
                            alternate_target_player_id=target_payload.get("alternate_target_player_id"),
                            alternate_target_slot=target_payload.get("alternate_target_slot"),
                            queue_index=len(actions),
                        )
                        ordered = [*actions, candidate]
                        trial_state = deepcopy(state)
                        trial_state.pending_actions[player_id] = ordered
                        trial_state.queue_order[player_id] = [queued.id for queued in ordered]
                        try:
                            validate_queue(trial_state, player_id, self._skills_for_room(room_id))
                        except ResolverError:
                            continue
                        score = _cpu_action_score(
                            planning_state, player_id, candidate, resolved_skill,
                            difficulty=difficulty, remaining_teammates=remaining_teammates,
                            skills=self._skills_for_room(room_id),
                        )
                        if best is None or score > best[0]:
                            best = (score, deepcopy(ordered))
            if best is not None:
                actions = best[1]
        if difficulty == "hard" and len(actions) > 1:
            best_order: tuple[int, list[PendingAction]] | None = None
            for ordering in permutations(actions):
                ordered = list(ordering)
                if not _cpu_queue_targets_survive_prefixes(
                    state, player_id, ordered, self._skills_for_room(room_id)
                ):
                    continue
                outcome = _cpu_effective_outcome(
                    state, player_id, ordered, self._skills_for_room(room_id)
                )
                utility = _cpu_outcome_utility(outcome)
                if best_order is None or utility > best_order[0]:
                    best_order = (utility, deepcopy(ordered))
            if best_order is not None:
                actions = best_order[1]
        for queue_index, queued in enumerate(actions):
            queued.queue_index = queue_index
        if not actions:
            return self.end_turn(room_id, player_id)
        state.pending_actions[player_id] = actions
        state.queue_order[player_id] = [action.id for action in actions]
        state.phase = BattlePhase.QUEUE_REVIEW
        resolve_queue(state, player_id, self._skills_for_room(room_id))
        self._complete_player_turn(state, player_id, timeout=False)
        self._refresh_first_creation_progress(room_id)
        self._grant_next_turn_energy(room_id, player_id)
        return self.serialize_for_player(room_id, player_id)

    def expire_phase_if_needed(self, room_id: str) -> bool:
        """Apply the authoritative timeout transition once a deadline passes."""

        with self.room_locks.setdefault(room_id, RLock()):
            return self._expire_phase_if_needed(room_id)

    def _expire_phase_if_needed(self, room_id: str) -> bool:
        """Locked implementation for authoritative timeout transitions."""

        state = self.get_state(room_id)
        if state.paused or not phase_timer_expired(state, self.clock) or state.phase == BattlePhase.FINISHED:
            return False
        timed_out_player_id = state.turn_player_id
        state.pending_actions[timed_out_player_id] = []
        state.queue_order[timed_out_player_id] = []
        finish_turn(state, timed_out_player_id)
        check_winner(state)
        state.event_log.append(BattleEvent(
            type="phase_timeout",
            message=f"{state.players[timed_out_player_id].name} ran out of time",
            turn_number=state.turn_number,
            payload={"player_id": timed_out_player_id},
        ))
        state.event_log.append(BattleEvent("auto_pass", f"{state.players[timed_out_player_id].name} auto-passed", state.turn_number, {"player_id": timed_out_player_id}))
        self._complete_player_turn(state, timed_out_player_id, timeout=True)
        self._refresh_first_creation_progress(room_id)
        self._grant_next_turn_energy(room_id, timed_out_player_id)
        arm_phase_timer(state, self.timer_policy, self.clock)
        state.state_revision += 1
        self._record_lifecycle(room_id, "expire_phase", {})
        return True

    def serialize_for_player(self, room_id: str, viewer_id: str) -> dict:
        with self.room_locks.setdefault(room_id, RLock()):
            return self._serialize_for_player(room_id, viewer_id)

    def _serialize_for_player(self, room_id: str, viewer_id: str) -> dict:
        self.expire_phase_if_needed(room_id)
        state = self.get_state(room_id)
        if viewer_id not in state.players:
            raise BattleV2Error(f"unknown viewer: {viewer_id}")
        payload = battle_state_to_dict(state, viewer_id)
        payload["phase_seconds_remaining"] = phase_seconds_remaining(state, self.clock)
        payload["disconnect_grace_seconds_remaining"] = self._disconnect_grace_seconds_remaining(state)
        payload["skill_catalog"] = self.room_catalogs.get(room_id, skill_catalog())
        payload["roster_mode"] = self.room_roster_modes.get(room_id, "classic")
        if self.room_roster_modes.get(room_id) == "first_creation":
            self._refresh_first_creation_progress(room_id)
            payload["first_creation_progress"] = self.room_first_creation_progress.get(room_id, {}).get(viewer_id)
        return payload


    def _refresh_first_creation_progress(self, room_id: str) -> None:
        if self.room_roster_modes.get(room_id) != "first_creation":
            return
        state = self.get_state(room_id)
        existing = self.room_first_creation_progress.setdefault(room_id, {})
        for player_id in state.players:
            existing[player_id] = evaluate_first_creation_progress(state, player_id, existing.get(player_id))

    def mission_progress_for_player(self, room_id: str, player_id: str) -> dict[str, Any] | None:
        """Return one player's current First Creation mission progress, refreshed.

        Safe to call once a match has reached its terminal state to settle
        mission completion authoritatively, independent of whether or when
        a viewer broadcast happens to run afterward.
        """

        if self.room_roster_modes.get(room_id) != "first_creation":
            return None
        self._refresh_first_creation_progress(room_id)
        return self.room_first_creation_progress.get(room_id, {}).get(player_id)

    def _ensure_turn_player(self, state: BattleState, player_id: str) -> None:
        if player_id not in state.players:
            raise BattleV2Error(f"unknown player: {player_id}")
        if state.phase == BattlePhase.FINISHED:
            raise BattleV2Error("battle already finished")
        if state.paused:
            raise BattleV2Error("battle is paused for reconnect")
        if state.turn_player_id != player_id:
            raise BattleV2Error("not this player's turn")

    def _advance_without_action(self, room_id: str, previous_player_id: str) -> None:
        state = self.get_state(room_id)
        player_ids = list(state.players)
        current_index = player_ids.index(previous_player_id)
        next_index = (current_index + 1) % len(player_ids)
        if next_index == 0:
            state.turn_number += 1
        state.turn_player_id = player_ids[next_index]
        state.phase = BattlePhase.PLANNING
        self._grant_next_turn_energy(room_id, previous_player_id)

    def _grant_next_turn_energy(self, room_id: str, previous_player_id: str) -> None:
        state = self.get_state(room_id)
        if state.phase != BattlePhase.PLANNING or state.winner_id is not None:
            arm_phase_timer(state, self.timer_policy, self.clock)
            return
        next_player_id = state.turn_player_id
        if next_player_id == previous_player_id:
            return
        rng = self.rngs.setdefault(room_id, random.Random(state.rng_seed))
        gain_turn_energy(
            state.players[next_player_id],
            state.turn_number,
            False,
            rng,
        )
        arm_phase_timer(state, self.timer_policy, self.clock)

    def _validate_non_wildcard_plan(self, room_id: str, state: BattleState, player_id: str) -> None:
        skills = self._skills_for_room(room_id)
        validate_queue_identity(state, player_id)
        for action in state.pending_actions.get(player_id, []):
            caster = state.players[player_id].team[action.caster_slot]
            skill = get_skill_for_action(skills, caster, action)
            validate_action_identity(state, action, skills)
            if any(energy.value == "black" for energy in skill.cost):
                return
        validate_queue(state, player_id, skills)
