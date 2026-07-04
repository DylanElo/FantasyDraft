"""Queue validation and resolution for Battle System v2."""

from __future__ import annotations

from collections import Counter
from collections.abc import Mapping
from dataclasses import replace

from .conditions import evaluate_conditions, is_stunned_for_class
from .effects import apply_effect, apply_turn_end_statuses, tick_cooldowns, tick_statuses
from .energy import EnergyValidationError, can_afford_specific, normalize_energy, spend_skill_energy, split_cost, validate_wildcard_payments
from .models import BattleEvent, BattlePhase, BattleState, CharacterState, EffectSpec, EnergyType, PendingAction, SkillClass, SkillSpec, StatusEffect
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


def _adjusted_cost_skill(caster: CharacterState, skill: SkillSpec) -> SkillSpec:
    """Return a skill copy with cost modifiers from caster statuses applied."""

    black_delta = sum(
        int(status.payload.get("black_cost_delta", 0))
        for status in caster.statuses
        if status.duration != 0
    )
    if black_delta == 0:
        return skill
    cost = list(skill.cost)
    if black_delta < 0:
        remaining_discount = abs(black_delta)
        adjusted: list[EnergyType] = []
        for energy in cost:
            if energy == EnergyType.BLACK and remaining_discount > 0:
                remaining_discount -= 1
                continue
            adjusted.append(energy)
        cost = adjusted
    else:
        cost.extend([EnergyType.BLACK] * black_delta)
    return replace(skill, cost=cost)


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
        cost_skill = _adjusted_cost_skill(caster, skill)
        if caster.cooldowns.get(skill.id, 0) > 0:
            raise ResolverError("skill is on cooldown")
        if is_stunned_for_class(caster, skill.classes):
            raise ResolverError("caster is stunned for this skill class")
        if not can_afford_specific(player, cost_skill):
            raise ResolverError("cannot afford specific skill costs")
        validate_wildcard_payments(player, cost_skill, action.wildcard_pays)

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
        skill = _adjusted_cost_skill(caster, get_skill_for_action(skills, caster, action))
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
        skill = _adjusted_cost_skill(caster, get_skill_for_action(skills, caster, action))
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


def _has_class(skill: SkillSpec, skill_class: SkillClass) -> bool:
    return skill_class in skill.classes


def _is_harmful_effect(effect: EffectSpec) -> bool:
    return effect.target != "self" and effect.type in {
        "damage",
        "health_steal",
        "apply_status",
        "remove_status",
    }


def _is_harmful_skill(skill: SkillSpec) -> bool:
    return any(_is_harmful_effect(effect) for effect in skill.effects)


def _consume_status(character: CharacterState, status: StatusEffect) -> None:
    status.revealed = True
    character.statuses = [
        active
        for active in character.statuses
        if active is not status
    ]


def _counter_status(character: CharacterState, skill: SkillSpec) -> StatusEffect | None:
    if not _is_harmful_skill(skill) or _has_class(skill, SkillClass.UNCOUNTERABLE):
        return None
    for status in character.statuses:
        counter = status.payload.get("counter")
        if status.duration == 0 or not counter:
            continue
        if counter == "first_harmful_non_domain" and _has_class(skill, SkillClass.DOMAIN):
            continue
        if counter in {"first_harmful", "first_harmful_non_domain", "first_counterable_skill"}:
            return status
    return None


def _reflect_status(character: CharacterState, skill: SkillSpec) -> StatusEffect | None:
    if not _is_harmful_skill(skill) or _has_class(skill, SkillClass.UNREFLECTABLE):
        return None
    for status in character.statuses:
        reflect = status.payload.get("reflect")
        if status.duration == 0 or not reflect:
            continue
        if reflect == "first_harmful_non_domain" and _has_class(skill, SkillClass.DOMAIN):
            continue
        if reflect in {"user", "source", "caster", "first_harmful", "first_harmful_non_domain"}:
            return status
    return None


def _append_event(events: list[BattleEvent], state: BattleState, event: BattleEvent) -> None:
    events.append(event)
    state.event_log.append(event)


def _is_invisible_skill(skill: SkillSpec) -> bool:
    if _has_class(skill, SkillClass.INVISIBLE):
        return True
    return any(
        SkillClass.INVISIBLE in effect.classes or bool(effect.payload.get("invisible", False))
        for effect in skill.effects
    )


def _apply_post_skill_punish(
    state: BattleState,
    events: list[BattleEvent],
    action: PendingAction,
    caster: CharacterState,
    skill: SkillSpec,
) -> None:
    if _has_class(skill, SkillClass.DOMAIN):
        return
    for status in caster.statuses:
        if status.duration == 0 or not status.payload.get("punish_non_domain", False):
            continue
        punishment = StatusEffect(
            id="domain_stun",
            name="Domain Stun",
            source_player_id=status.source_player_id,
            source_slot=status.source_slot,
            target_player_id=action.player_id,
            target_slot=action.caster_slot,
            duration=2,
            payload={"stun_classes": ["all"]},
        )
        caster.statuses.append(punishment)
        event = BattleEvent(
            type="status_applied",
            message=f"{caster.name} is stunned by {status.name}",
            turn_number=state.turn_number,
            payload={
                "action_id": action.id,
                "status": punishment.id,
                "target_player_id": action.player_id,
                "target_slot": action.caster_slot,
            },
        )
        _append_event(events, state, event)
        return


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
            private_to=action.player_id if _is_invisible_skill(skill) else None,
            payload={
                "action_id": action.id,
                "player_id": action.player_id,
                "caster_slot": action.caster_slot,
                "skill_id": skill.id,
                "classes": [skill_class.value for skill_class in skill.classes],
            },
        )
        _append_event(events, state, resolved)

        target_slots = action.target_slots or ([action.target_slot] if action.target_slot is not None else [])
        if not target_slots and targets:
            target_slots = list(state.players[target_player_id].active_slots)

        countered = False
        for slot in target_slots:
            target = state.players[target_player_id].team[slot]
            counter = _counter_status(target, skill)
            if counter is None:
                continue
            _consume_status(target, counter)
            event = BattleEvent(
                type="skill_countered",
                message=f"{target.name} countered {skill.name}",
                turn_number=state.turn_number,
                payload={
                    "action_id": action.id,
                    "skill_id": skill.id,
                    "status": counter.id,
                    "target_player_id": target_player_id,
                    "target_slot": slot,
                },
            )
            _append_event(events, state, event)
            countered = True
            break
        if countered:
            continue

        reflected_slots: dict[int, StatusEffect] = {}
        for slot in target_slots:
            target = state.players[target_player_id].team[slot]
            reflect = _reflect_status(target, skill)
            if reflect is None:
                continue
            _consume_status(target, reflect)
            reflected_slots[slot] = reflect
            reflected = BattleEvent(
                type="skill_reflected",
                message=f"{target.name} reflected {skill.name}",
                turn_number=state.turn_number,
                payload={
                    "action_id": action.id,
                    "skill_id": skill.id,
                    "status": reflect.id,
                    "target_player_id": target_player_id,
                    "target_slot": slot,
                    "reflected_to_player_id": action.player_id,
                    "reflected_to_slot": action.caster_slot,
                },
            )
            _append_event(events, state, reflected)

        for effect in skill.effects:
            if effect.target == "self":
                event = apply_effect(state, action, effect, action.player_id, action.caster_slot)
                _append_event(events, state, event)
                continue
            if not targets:
                event = apply_effect(state, action, effect, target_player_id, None)
                _append_event(events, state, event)
                continue
            for slot in target_slots:
                effect_target_player_id = target_player_id
                effect_target_slot = slot
                if slot in reflected_slots and _is_harmful_effect(effect):
                    effect_target_player_id = action.player_id
                    effect_target_slot = action.caster_slot
                event = apply_effect(state, action, effect, effect_target_player_id, effect_target_slot)
                _append_event(events, state, event)
        _apply_post_skill_punish(state, events, action, caster, skill)

    events.extend(finish_turn(state, player_id))
    events.extend(check_winner(state))
    return events


def finish_turn(state: BattleState, player_id: str) -> list[BattleEvent]:
    """Apply turn-end cleanup for the acting player."""

    events: list[BattleEvent] = []
    for player in state.players.values():
        for slot, character in enumerate(player.team):
            for event in apply_turn_end_statuses(character, player.id, slot, state.turn_number):
                _append_event(events, state, event)
            tick_statuses(character)
            tick_cooldowns(character)
            character.acted_this_turn = False
        player.queue_confirmed = False
        player.energy_converted_this_turn = False
    state.pending_actions[player_id] = []
    state.queue_order[player_id] = []
    if state.phase != BattlePhase.FINISHED:
        state.phase = BattlePhase.PLANNING
        state.turn_number += 1
        opponent_ids = [pid for pid in state.players if pid != player_id]
        if opponent_ids:
            state.turn_player_id = opponent_ids[0]
    return events


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
