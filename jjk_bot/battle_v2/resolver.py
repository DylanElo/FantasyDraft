"""Queue validation and resolution for Battle System v2."""

from __future__ import annotations

from collections import Counter
from collections.abc import Mapping

from .conditions import evaluate_conditions, is_stunned_for_class
from .effects import apply_effect, tick_cooldowns, tick_statuses
from .energy import EnergyValidationError, can_afford_specific, normalize_energy, spend_skill_energy, split_cost, validate_wildcard_payments
from .models import BattleEvent, BattlePhase, BattleState, PendingAction, SkillSpec
from .targeting import TargetingError, get_character, get_player, validate_target_rule


class ResolverError(ValueError):
    """Raised when queue validation or resolution fails."""


def effective_skill_id(caster, skill_id: str) -> str:
    """Resolve slot-based skill replacements."""

    return caster.skill_replacements.get(skill_id, skill_id)


def get_skill_for_action(skills: Mapping[str, SkillSpec], caster, action: PendingAction) -> SkillSpec:
    """Return the skill used by an action after applying replacements."""

    resolved_id = effective_skill_id(caster, action.skill_id)
    if resolved_id not in skills:
        raise ResolverError(f"unknown skill: {resolved_id}")
    return skills[resolved_id]


def validate_action(
    state: BattleState,
    action: PendingAction,
    skills: Mapping[str, SkillSpec],
) -> None:
    """Validate a pending action without mutating battle state."""

    try:
        player = get_player(state, action.player_id)
        caster = get_character(player, action.caster_slot)
        if action.caster_slot not in player.active_slots:
            raise ResolverError("caster is not active")
        if not caster.alive:
            raise ResolverError("caster is dead")
        if caster.acted_this_turn:
            raise ResolverError("caster has already acted this turn")

        skill = get_skill_for_action(skills, caster, action)
        if caster.cooldowns.get(skill.id, 0) > 0:
            raise ResolverError("skill is on cooldown")
        if is_stunned_for_class(caster, skill.classes):
            raise ResolverError("caster is stunned for this skill class")
        if not can_afford_specific(player, skill):
            raise ResolverError("cannot afford specific skill costs")
        validate_wildcard_payments(player, skill, action.wildcard_pays)

        _, targets = validate_target_rule(state, action, skill)
        primary_target = targets[0] if targets else None
        if not evaluate_conditions(skill.conditions, state, action, caster, primary_target, skill.classes):
            raise ResolverError("skill conditions are not met")
    except (TargetingError, EnergyValidationError) as exc:
        raise ResolverError(str(exc)) from exc



def validate_queue_energy(
    state: BattleState,
    player_id: str,
    skills: Mapping[str, SkillSpec],
) -> None:
    """Validate aggregate queue cost without mutating player energy."""

    player = state.players[player_id]
    required: Counter = Counter()
    for action in state.pending_actions.get(player_id, []):
        caster = player.team[action.caster_slot]
        skill = get_skill_for_action(skills, caster, action)
        specific, wildcard_count = split_cost(skill.cost)
        wildcard_pays = [normalize_energy(energy) for energy in action.wildcard_pays]
        if len(wildcard_pays) != wildcard_count:
            raise ResolverError(
                f"{skill.id} requires {wildcard_count} wildcard payment(s); got {len(wildcard_pays)}"
            )
        if any(energy.value == "black" for energy in wildcard_pays):
            raise ResolverError("black energy cannot pay wildcard costs")
        required.update(specific)
        required.update(wildcard_pays)

    for energy, amount in required.items():
        if player.energy.get(energy, 0) < amount:
            raise ResolverError(f"not enough {energy.value} energy for queued actions")

def validate_queue(
    state: BattleState,
    player_id: str,
    skills: Mapping[str, SkillSpec],
) -> None:
    """Validate all queued actions for a player without mutating state."""

    actions = list(state.pending_actions.get(player_id, []))
    ordered_ids = state.queue_order.get(player_id) or [action.id for action in sorted(actions, key=lambda item: item.queue_index)]
    if set(ordered_ids) != {action.id for action in actions}:
        raise ResolverError("queue order must include exactly the pending action ids")

    seen_casters: set[int] = set()
    for action in actions:
        if action.caster_slot in seen_casters:
            raise ResolverError("each caster may queue only one skill")
        seen_casters.add(action.caster_slot)
        validate_action(state, action, skills)
    validate_queue_energy(state, player_id, skills)


def confirm_queue(
    state: BattleState,
    player_id: str,
    skills: Mapping[str, SkillSpec],
) -> None:
    """Validate, spend energy, and mark a player's queue confirmed."""

    validate_queue(state, player_id, skills)
    player = state.players[player_id]
    for action in state.pending_actions.get(player_id, []):
        caster = player.team[action.caster_slot]
        skill = get_skill_for_action(skills, caster, action)
        spend_skill_energy(player, skill, action.wildcard_pays)
    player.queue_confirmed = True
    state.phase = BattlePhase.RESOLVING


def ordered_actions(state: BattleState, player_id: str) -> list[PendingAction]:
    """Return queued actions in the player's requested queue order."""

    actions_by_id = {action.id: action for action in state.pending_actions.get(player_id, [])}
    order = state.queue_order.get(player_id) or [
        action.id for action in sorted(actions_by_id.values(), key=lambda item: item.queue_index)
    ]
    return [actions_by_id[action_id] for action_id in order]


def resolve_queue(
    state: BattleState,
    player_id: str,
    skills: Mapping[str, SkillSpec],
) -> list[BattleEvent]:
    """Resolve a confirmed queue left-to-right and advance turn state."""

    if not state.players[player_id].queue_confirmed:
        confirm_queue(state, player_id, skills)

    events: list[BattleEvent] = []
    for action in ordered_actions(state, player_id):
        player = state.players[action.player_id]
        caster = player.team[action.caster_slot]
        if not caster.alive:
            continue
        skill = get_skill_for_action(skills, caster, action)
        try:
            target_player_id, targets = validate_target_rule(state, action, skill)
        except TargetingError as exc:
            event = BattleEvent(
                type="action_fizzled",
                message=f"{skill.id} fizzled: {exc}",
                turn_number=state.turn_number,
                payload={"action_id": action.id, "skill_id": skill.id},
            )
            events.append(event)
            state.event_log.append(event)
            continue

        caster.acted_this_turn = True
        if skill.cooldown > 0:
            caster.cooldowns[skill.id] = skill.cooldown + 1
        resolved = BattleEvent(
            type="skill_resolved",
            message=f"{caster.name} used {skill.name}",
            turn_number=state.turn_number,
            payload={
                "action_id": action.id,
                "player_id": action.player_id,
                "caster_slot": action.caster_slot,
                "skill_id": skill.id,
                "classes": [skill_class.value for skill_class in skill.classes],
            },
        )
        events.append(resolved)
        state.event_log.append(resolved)

        target_slots = action.target_slots or ([action.target_slot] if action.target_slot is not None else [])
        if not target_slots and targets:
            target_slots = list(state.players[target_player_id].active_slots)
        for effect in skill.effects:
            if effect.target == "self":
                event = apply_effect(state, action, effect, action.player_id, action.caster_slot)
                events.append(event)
                state.event_log.append(event)
                continue
            if not targets:
                event = apply_effect(state, action, effect, target_player_id, None)
                events.append(event)
                state.event_log.append(event)
                continue
            for slot in target_slots:
                event = apply_effect(state, action, effect, target_player_id, slot)
                events.append(event)
                state.event_log.append(event)

    finish_turn(state, player_id)
    events.extend(check_winner(state))
    return events


def finish_turn(state: BattleState, player_id: str) -> None:
    """Apply turn-end cleanup for the acting player."""

    for player in state.players.values():
        for character in player.team:
            tick_statuses(character)
            tick_cooldowns(character)
            character.acted_this_turn = False
        player.queue_confirmed = False
    state.pending_actions[player_id] = []
    state.queue_order[player_id] = []
    if state.phase != BattlePhase.FINISHED:
        state.phase = BattlePhase.PLANNING
        state.turn_number += 1
        opponent_ids = [pid for pid in state.players if pid != player_id]
        if opponent_ids:
            state.turn_player_id = opponent_ids[0]


def check_winner(state: BattleState) -> list[BattleEvent]:
    """Set winner when all active characters for an opponent are defeated."""

    living_by_player = {
        pid: any(
            0 <= slot < len(player.team) and player.team[slot].alive
            for slot in player.active_slots
        )
        for pid, player in state.players.items()
    }
    alive_players = [pid for pid, has_living in living_by_player.items() if has_living]
    if len(alive_players) == 1:
        state.winner_id = alive_players[0]
        state.phase = BattlePhase.FINISHED
        event = BattleEvent(
            type="battle_finished",
            message=f"{state.winner_id} wins",
            turn_number=state.turn_number,
            payload={"winner_id": state.winner_id},
        )
        state.event_log.append(event)
        return [event]
    return []
