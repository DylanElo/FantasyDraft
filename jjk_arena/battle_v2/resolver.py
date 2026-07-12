"""Queue validation and resolution for Battle System v2."""

from __future__ import annotations

from collections import Counter
from collections.abc import Mapping
from dataclasses import replace
import random

from .conditions import evaluate_conditions, has_status, is_stunned_for_class, skill_is_harmful
from .effects import apply_damage, apply_effect, apply_status, apply_turn_end_statuses, should_tick_status, tick_cooldowns, tick_statuses
from .energy import EnergyValidationError, can_afford_specific, normalize_energy, spend_skill_energy, split_cost, validate_wildcard_payments
from .models import BattleEvent, BattlePhase, BattleState, CharacterState, DamageType, DurationClock, EffectContext, EffectSpec, EnergyType, PendingAction, SkillClass, SkillSpec, StatusEffect, StatusFamily
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
        if is_stunned_for_class(caster, skill.classes, skill):
            raise ResolverError("caster is stunned for this skill class")
        if skill.target_rule.kind in {"ally", "ally_team"} and any(
            status.duration != 0 and status.payload.get("cannot_target_allies", False)
            for status in caster.statuses
        ):
            raise ResolverError("caster cannot use skills that target allies")
        if any(status.duration != 0 and status.payload.get("block_non_damaging_skills") for status in caster.statuses) and not any(effect.type in {"damage", "health_steal"} and effect.target != "self" for effect in skill.effects):
            raise ResolverError("caster cannot use non-damaging skills")
        if any(status.duration != 0 and status.payload.get("block_counters") for status in caster.statuses) and any(effect.payload.get("counter") for effect in skill.effects):
            raise ResolverError("caster cannot use counters")
        if not can_afford_specific(player, cost_skill):
            raise ResolverError("cannot afford specific skill costs")
        validate_wildcard_payments(player, cost_skill, action.wildcard_pays)

        if any(effect.payload.get("controlled_redirect") for effect in skill.effects):
            if action.alternate_target_player_id is None or action.alternate_target_slot is None:
                raise ResolverError("controlled redirect requires an alternate target")
            alternate_player = get_player(state, action.alternate_target_player_id)
            alternate = get_character(alternate_player, action.alternate_target_slot)
            if not alternate.alive:
                raise ResolverError("alternate redirect target is dead")
            if action.alternate_target_player_id == action.target_player_id and action.alternate_target_slot == action.target_slot:
                raise ResolverError("alternate redirect target must differ from watched target")

        if any(effect.payload.get("conditional_targeting") == "venom_bloom" for effect in skill.effects):
            enemy = get_player(state, action.target_player_id)
            poisoned_slots = [slot for slot in enemy.active_slots if has_status(enemy.team[slot], "poison")]
            selected_slots = action.target_slots or ([action.target_slot] if action.target_slot is not None else [])
            if poisoned_slots:
                primary_slot = action.target_slot if action.target_slot is not None else (selected_slots[0] if selected_slots else None)
                if primary_slot not in poisoned_slots:
                    raise ResolverError("Venom Bloom primary target must be poisoned")
                if action.secondary_target_slot is None or action.secondary_target_slot == primary_slot:
                    raise ResolverError("Venom Bloom requires a distinct secondary spread target")
                secondary = get_character(enemy, action.secondary_target_slot)
                if not secondary.alive:
                    raise ResolverError("Venom Bloom secondary target is dead")
            elif set(selected_slots) != set(enemy.active_slots):
                raise ResolverError("Venom Bloom without poison must target the enemy team")

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
    return skill_is_harmful(skill)


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
        if counter == "first_harmful_melee" and SkillClass.PHYSICAL not in skill.classes:
            continue
        if counter in {"first_harmful", "first_harmful_non_domain", "first_counterable_skill", "first_harmful_melee"}:
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




def _append_energy_gain(state: BattleState, events: list[BattleEvent], player_id: str, amount: int, reason: str, source_status: StatusEffect | None = None) -> None:
    core_energy = [EnergyType.GREEN, EnergyType.RED, EnergyType.BLUE, EnergyType.WHITE]
    if amount <= 0:
        return
    rng = random.Random(f"{state.rng_seed}:{state.turn_number}:{len(state.event_log)}:{player_id}:{reason}")
    gained = [rng.choice(core_energy) for _ in range(amount)]
    for energy in gained:
        state.players[player_id].energy[energy] += 1
    _append_event(events, state, BattleEvent(
        type="energy_gained",
        message=f"{reason} generated {amount} energy",
        turn_number=state.turn_number,
        payload={"player_id": player_id, "energy": gained[0].value, "energies": [energy.value for energy in gained], "amount": amount, "status": source_status.id if source_status else None},
    ))


def _trigger_watch_statuses(state: BattleState, events: list[BattleEvent], action: PendingAction, skill: SkillSpec) -> None:
    """Resolve simple first-creation read/scout statuses after a skill is declared."""

    for watcher_player in state.players.values():
        for watcher in watcher_player.team:
            for status in list(watcher.statuses):
                payload = status.payload
                if status.duration == 0 or payload.get("watch_target_player_id") != action.player_id:
                    continue
                if payload.get("watch_target_slot") is not None and int(payload["watch_target_slot"]) != action.caster_slot:
                    continue
                watched_classes = payload.get("watch_skill_classes") or []
                if watched_classes and not any(skill_class.value in watched_classes or skill_class in watched_classes for skill_class in skill.classes):
                    continue
                if payload.get("watch_harmful") and not _is_harmful_skill(skill):
                    continue
                _append_energy_gain(state, events, watcher_player.id, int(payload.get("reward_energy", 1)), status.name, status)
                reward_buff = payload.get("reward_buff") or {}
                if reward_buff:
                    watcher.statuses.append(StatusEffect(
                        id=str(reward_buff.get("id", f"{status.id}_reward")),
                        name=str(reward_buff.get("name", "Watcher Reward")),
                        source_player_id=watcher_player.id,
                        source_slot=watcher_player.team.index(watcher),
                        target_player_id=watcher_player.id,
                        target_slot=watcher_player.team.index(watcher),
                        duration=int(reward_buff.get("duration", 1)),
                        payload={key: value for key, value in reward_buff.items() if key not in {"id", "name", "duration"}},
                        duration_clock=DurationClock.SOURCE_TURN,
                        families=[StatusFamily.BUFF],
                    ))
                if payload.get("consume_on_trigger", True):
                    _consume_status(watcher, status)


def _maybe_redirect_action(state: BattleState, events: list[BattleEvent], action: PendingAction, skill: SkillSpec, target_player_id: str, target_slots: list[int]) -> tuple[str, list[int]]:
    if not _is_harmful_skill(skill) or skill.target_rule.kind not in {"enemy", "ally"}:
        return target_player_id, target_slots
    caster = state.players[action.player_id].team[action.caster_slot]
    for status in list(caster.statuses):
        if status.duration == 0 or not status.payload.get("redirect_next_harmful_direct"):
            continue
        redirect_player_id = str(status.payload.get("redirect_to_player_id") or status.source_player_id)
        redirect_slot = int(status.payload.get("redirect_to_slot", status.source_slot))
        if redirect_player_id in state.players and 0 <= redirect_slot < len(state.players[redirect_player_id].team):
            _consume_status(caster, status)
            _append_event(events, state, BattleEvent(
                type="skill_redirected",
                message=f"{status.name} redirected {skill.name}",
                turn_number=state.turn_number,
                payload={
                    "action_id": action.id,
                    "skill_id": skill.id,
                    "status": status.id,
                    "from_player_id": target_player_id,
                    "from_slots": list(target_slots),
                    "target_player_id": redirect_player_id,
                    "target_slot": redirect_slot,
                },
            ))
            return redirect_player_id, [redirect_slot]
    return target_player_id, target_slots


def _consume_statuses_by_payload(character: CharacterState, key: str) -> None:
    character.statuses = [status for status in character.statuses if status.duration == 0 or not status.payload.get(key)]


def _consume_statuses_for_skill(character: CharacterState, skill_id: str) -> None:
    character.statuses = [
        status for status in character.statuses
        if status.duration == 0 or status.payload.get("consume_on_skill_id") != skill_id
    ]


def _apply_melee_punishments(state: BattleState, events: list[BattleEvent], action: PendingAction, skill: SkillSpec, target_player_id: str, target_slots: list[int]) -> None:
    if SkillClass.PHYSICAL not in skill.classes:
        return
    caster = state.players[action.player_id].team[action.caster_slot]
    for slot in target_slots:
        target = state.players[target_player_id].team[slot]
        for guard in list(target.statuses):
            punish_status = guard.payload.get("punish_melee_status") if guard.duration != 0 else None
            if not punish_status:
                continue
            caster.statuses.append(StatusEffect(
                id=str(punish_status), name=str(punish_status).replace("_", " ").title(),
                source_player_id=target_player_id, source_slot=slot,
                target_player_id=action.player_id, target_slot=action.caster_slot, duration=2,
            ))
            _append_event(events, state, BattleEvent(
                type="status_applied", message=f"{target.name} punished {caster.name} with {str(punish_status).replace('_', ' ').title()}",
                turn_number=state.turn_number,
                payload={"action_id": action.id, "status": str(punish_status), "target_player_id": action.player_id, "target_slot": action.caster_slot},
            ))
            break

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
        preexisting_one_shots = {id(status) for status in caster.statuses if status.duration != 0 and status.payload.get("consume_on_next_skill")}
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

        _trigger_watch_statuses(state, events, action, skill)
        target_slots = action.target_slots or ([action.target_slot] if action.target_slot is not None else [])
        if not target_slots and targets:
            target_slots = list(state.players[target_player_id].active_slots)
        target_player_id, target_slots = _maybe_redirect_action(state, events, action, skill, target_player_id, target_slots)

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

        countered = False
        for slot in target_slots:
            target = state.players[target_player_id].team[slot]
            counter = _counter_status(target, skill)
            if counter is None:
                continue
            if SkillClass.PHYSICAL in skill.classes and counter.payload.get("punish_melee_status"):
                _apply_melee_punishments(state, events, action, skill, target_player_id, [slot])
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

        original_target = targets[0] if targets else None
        resolved_targets = [state.players[target_player_id].team[slot] for slot in target_slots]
        primary_target = resolved_targets[0] if resolved_targets else None
        secondary_target = None
        if action.secondary_target_slot is not None and action.secondary_target_slot in target_slots:
            secondary_target = state.players[target_player_id].team[action.secondary_target_slot]
        elif len(resolved_targets) > 1:
            secondary_target = resolved_targets[1]
        original_status_ids = frozenset(status.id for status in original_target.statuses if status.duration != 0) if original_target else frozenset()
        recipient_statuses = {id(target): frozenset(status.id for status in target.statuses if status.duration != 0) for target in resolved_targets}

        def effect_context(recipient: CharacterState | None) -> EffectContext:
            return EffectContext(caster, recipient, original_target, primary_target, secondary_target, resolved_targets, original_status_ids, recipient_statuses.get(id(recipient), frozenset()))

        for effect in skill.effects:
            target_scope = effect.payload.get("target_scope")
            if target_scope == "primary" or effect.payload.get("selected_target_only"):
                effect_slots = target_slots[:1]
            elif target_scope == "secondary":
                effect_slots = [action.secondary_target_slot] if action.secondary_target_slot is not None else []
            else:
                effect_slots = target_slots
            if effect.target == "self":
                event = apply_effect(state, action, effect, action.player_id, action.caster_slot, skill.name, condition_target=original_target, selected_target_count=len(target_slots), selected_targets=resolved_targets, skill_id=skill.id, skill_classes=skill.classes, context=effect_context(caster))
                _append_event(events, state, event)
                continue
            if not targets:
                event = apply_effect(state, action, effect, target_player_id, None, skill.name, condition_target=original_target, selected_target_count=len(target_slots), selected_targets=resolved_targets, skill_id=skill.id, skill_classes=skill.classes, context=effect_context(None))
                _append_event(events, state, event)
                continue
            for slot in effect_slots:
                effect_target_player_id = target_player_id
                effect_target_slot = slot
                if slot in reflected_slots and _is_harmful_effect(effect):
                    effect_target_player_id = action.player_id
                    effect_target_slot = action.caster_slot
                recipient = state.players[effect_target_player_id].team[effect_target_slot]
                event = apply_effect(state, action, effect, effect_target_player_id, effect_target_slot, skill.name, condition_target=original_target, selected_target_count=len(target_slots), selected_targets=resolved_targets, skill_id=skill.id, skill_classes=skill.classes, context=effect_context(recipient))
                _append_event(events, state, event)
                if event.type == "damage" and event.payload.get("amount", 0) > 0 and effect.target != "self":
                    recipient.statuses = [status for status in recipient.statuses if status.id != "damaged_last_turn"]
                    recipient.statuses.append(StatusEffect("damaged_last_turn", "Damaged Last Turn", action.player_id, action.caster_slot, effect_target_player_id, effect_target_slot, 2, payload={"duration_clock": "target_turn"}))
                    for guard in list(recipient.statuses):
                        retaliation = int(guard.payload.get("retaliate_damage", 0))
                        if guard.duration == 0 or retaliation <= 0:
                            continue
                        actual = apply_damage(caster, retaliation, DamageType.SOUL)
                        retaliate_status = guard.payload.get("retaliate_status")
                        if retaliate_status:
                            apply_status(state, action, action.player_id, action.caster_slot, EffectSpec(type="apply_status", status=str(retaliate_status), duration=2, payload={"name": str(retaliate_status).title(), "turn_end_damage": retaliation, "turn_end_damage_type": DamageType.SOUL.value}))
                        _append_event(events, state, BattleEvent("retaliation", f"{guard.name} retaliated for {actual}", state.turn_number, {"action_id": action.id, "amount": actual, "status": guard.id}))
                        break
        if any(effect.type == "damage" and effect.target != "self" for effect in skill.effects):
            _consume_statuses_by_payload(caster, "consume_after_damage")
            _apply_melee_punishments(state, events, action, skill, target_player_id, target_slots)
        _consume_statuses_for_skill(caster, skill.id)
        caster.statuses = [status for status in caster.statuses if id(status) not in preexisting_one_shots]
        for status in list(caster.statuses):
            if status.duration == 0 or not status.payload.get("expose_if_targets_source"):
                continue
            if target_player_id == status.source_player_id and status.source_slot in target_slots:
                caster.statuses.append(StatusEffect("exposed", "Exposed", status.source_player_id, status.source_slot, action.player_id, action.caster_slot, 2))
        _apply_post_skill_punish(state, events, action, caster, skill)

    events.extend(finish_turn(state, player_id))
    events.extend(check_winner(state))
    return events


def finish_turn(state: BattleState, player_id: str) -> list[BattleEvent]:
    """Apply turn-end cleanup for the acting player."""

    events: list[BattleEvent] = []
    round_ending = player_id == list(state.players)[-1]
    for player in state.players.values():
        for slot, character in enumerate(player.team):
            for status in list(character.statuses):
                if status.duration == 1 and status.payload.get("redirect_next_harmful_direct") and should_tick_status(status, player_id, round_ending=round_ending, turn_number=state.turn_number):
                    source = state.players.get(status.source_player_id)
                    if source and 0 <= status.source_slot < len(source.team) and source.team[status.source_slot].alive:
                        source.team[status.source_slot].statuses.append(StatusEffect("boogie_woogie_guard", "Boogie Woogie Guard", status.source_player_id, status.source_slot, status.source_player_id, status.source_slot, 2, payload={"destructible_defense": 15}))
                        _append_event(events, state, BattleEvent("status_applied", "Boogie Woogie granted 15 defense after no redirect", state.turn_number, {"status": "boogie_woogie_guard", "target_player_id": status.source_player_id, "target_slot": status.source_slot}))
                if status.payload.get("ends_if_source_dies"):
                    source = state.players.get(status.source_player_id)
                    if not source or not (0 <= status.source_slot < len(source.team)) or not source.team[status.source_slot].alive:
                        status.duration = 0
                drain_amount = int(status.payload.get("turn_end_drain_energy", 0))
                if drain_amount > 0 and status.target_player_id == player_id and should_tick_status(status, player_id, round_ending=round_ending, turn_number=state.turn_number):
                    available = [energy for energy, amount in player.energy.items() if energy != EnergyType.BLACK and amount > 0]
                    rng = random.Random(f"{state.rng_seed}:{state.turn_number}:{status.id}:{status.source_player_id}:{status.source_slot}")
                    drained = rng.sample(available, k=min(drain_amount, len(available)))
                    for energy in drained:
                        player.energy[energy] -= 1
                        _append_event(events, state, BattleEvent("energy_drained", f"{status.name} drained energy at turn end", state.turn_number, {"status": status.id, "target_player_id": player_id, "energy": energy.value, "amount": 1}))
                    status.duration = 0
            for event in apply_turn_end_statuses(character, player.id, slot, state.turn_number, player_id, round_ending):
                _append_event(events, state, event)
            tick_statuses(character, player_id, round_ending=round_ending, turn_number=state.turn_number)
            if player.id == player_id:
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
