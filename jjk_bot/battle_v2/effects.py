"""Pure effect application helpers for Battle System v2."""

from __future__ import annotations

from .conditions import has_status
from .models import (
    BattleEvent,
    BattleState,
    CharacterState,
    DamageType,
    EffectSpec,
    PendingAction,
    SkillClass,
    StatusEffect,
)


class EffectError(ValueError):
    """Raised when an effect cannot be applied."""


def _label_identifier(value: str | None) -> str:
    return str(value or "status").replace("_", " ").title()


def _status_amount(character: CharacterState, payload_key: str) -> int:
    return sum(
        int(status.payload.get(payload_key, 0))
        for status in character.statuses
        if status.duration != 0
    )


def _has_invulnerability(character: CharacterState) -> bool:
    return any(
        status.duration != 0 and status.payload.get("invulnerable", False)
        for status in character.statuses
    )


def has_invulnerability(character: CharacterState) -> bool:
    """Return whether a character currently has active invulnerability."""

    return _has_invulnerability(character)


def _has_anti_domain(character: CharacterState) -> bool:
    return has_status(character, "anti_domain") or any(
        status.duration != 0 and status.payload.get("anti_domain", False)
        for status in character.statuses
    )


def _damage_bonus(target: CharacterState, effect: EffectSpec) -> int:
    bonus = 0
    payload = effect.payload
    bonus_amount = int(payload.get("bonus_amount", 0))
    bonus_status = payload.get("bonus_status")
    if bonus_status and has_status(target, str(bonus_status)):
        bonus += bonus_amount
    bonus_statuses = payload.get("bonus_statuses") or []
    if bonus_statuses and any(has_status(target, str(status_id)) for status_id in bonus_statuses):
        bonus += bonus_amount
    missing_hp_step = payload.get("scaling")
    if missing_hp_step == "missing_hp_25":
        bonus += ((target.max_hp - target.hp) // 25) * 10
    execute_threshold = payload.get("execute_threshold")
    if execute_threshold is not None and target.hp < int(execute_threshold):
        bonus += int(payload.get("execute_bonus", 0))
    return bonus


def _payload_condition_met(target: CharacterState, effect: EffectSpec, caster: CharacterState | None = None) -> bool:
    condition_status = effect.payload.get("condition_status")
    if condition_status and not has_status(target, str(condition_status)):
        return False
    missing_status = effect.payload.get("condition_missing_status")
    if missing_status and has_status(target, str(missing_status)):
        return False
    user_status = effect.payload.get("condition_user_status")
    if user_status and (caster is None or not has_status(caster, str(user_status))):
        return False
    user_missing_status = effect.payload.get("condition_user_missing_status")
    if user_missing_status and caster is not None and has_status(caster, str(user_missing_status)):
        return False
    return True


def _apply_damage_payload_side_effects(target: CharacterState, effect: EffectSpec) -> None:
    cooldown_increase = int(effect.payload.get("cooldown_increase", 0))
    if cooldown_increase <= 0 or not _payload_condition_met(target, effect):
        return
    target.cooldowns = {
        skill_id: turns + cooldown_increase
        for skill_id, turns in target.cooldowns.items()
    }


def _outgoing_damage_delta(caster: CharacterState) -> int:
    return sum(
        int(status.payload.get("damage_output_delta", 0)) + int(status.payload.get("damage_bonus", 0))
        for status in caster.statuses
        if status.duration != 0
    )


def _consume_damage_bonus_statuses(caster: CharacterState) -> None:
    kept: list[StatusEffect] = []
    for status in caster.statuses:
        if status.duration != 0 and "damage_bonus" in status.payload:
            _remove_status_side_effects(caster, status)
            continue
        kept.append(status)
    caster.statuses = kept


def apply_damage(
    target: CharacterState,
    amount: int,
    damage_type: DamageType = DamageType.NORMAL,
    *,
    bypass_invulnerability: bool = False,
) -> int:
    """Apply damage according to v2 damage-family rules.

    Returns actual HP damage dealt.
    """

    if amount <= 0 or not target.alive:
        return 0

    if damage_type == DamageType.SURE_HIT and _has_anti_domain(target):
        damage_type = DamageType.NORMAL
        bypass_invulnerability = False

    if _has_invulnerability(target) and not bypass_invulnerability:
        if damage_type != DamageType.SURE_HIT:
            return 0

    defense = _status_amount(target, "destructible_defense")
    reduction = _status_amount(target, "damage_reduction")
    incoming = amount

    if damage_type == DamageType.NORMAL:
        incoming = max(0, incoming - reduction)
    elif damage_type == DamageType.SOUL:
        defense = 0
    elif damage_type == DamageType.SURE_HIT:
        defense = 0
        reduction = 0

    if defense > 0 and damage_type in {DamageType.NORMAL, DamageType.PIERCING, DamageType.HEALTH_STEAL}:
        absorbed = min(incoming, defense)
        incoming -= absorbed
        _consume_destructible_defense(target, absorbed)

    actual = min(target.hp, max(0, incoming))
    target.hp -= actual
    if target.hp <= 0:
        target.hp = 0
        target.alive = False
    return actual


def _consume_destructible_defense(target: CharacterState, amount: int) -> None:
    remaining = amount
    for status in target.statuses:
        if remaining <= 0:
            break
        current = int(status.payload.get("destructible_defense", 0))
        if status.duration == 0 or current <= 0:
            continue
        consumed = min(current, remaining)
        status.payload["destructible_defense"] = current - consumed
        remaining -= consumed


def _status_replacements(status: StatusEffect) -> dict[str, str]:
    raw = status.payload.get("skill_replacements") or {}
    if not isinstance(raw, dict):
        return {}
    return {str(source): str(replacement) for source, replacement in raw.items()}


def _apply_status_side_effects(character: CharacterState, status: StatusEffect) -> None:
    unlock_at = int(status.payload.get("unlock_replacements_at_stacks", 0))
    if unlock_at and status.stacks < unlock_at:
        return
    character.skill_replacements.update(_status_replacements(status))


def _remove_status_side_effects(character: CharacterState, status: StatusEffect) -> None:
    for source, replacement in _status_replacements(status).items():
        if character.skill_replacements.get(source) == replacement:
            character.skill_replacements.pop(source, None)


def apply_status(
    state: BattleState,
    action: PendingAction,
    target_player_id: str,
    target_slot: int,
    effect: EffectSpec,
) -> StatusEffect:
    """Apply a status effect to a target slot."""

    if not effect.status:
        raise EffectError("status effect requires a status id")
    payload = dict(effect.payload)
    if payload.get("watch_target_player_id") == "target":
        payload["watch_target_player_id"] = target_player_id
    status = StatusEffect(
        id=effect.status,
        name=str(effect.payload.get("name", effect.status)),
        source_player_id=action.player_id,
        source_slot=action.caster_slot,
        target_player_id=target_player_id,
        target_slot=target_slot,
        duration=effect.duration if effect.duration is not None else 1,
        classes=list(effect.classes),
        invisible=SkillClass.INVISIBLE in effect.classes or bool(effect.payload.get("invisible", False)),
        soulbound=SkillClass.SOULBOUND in effect.classes or bool(effect.payload.get("soulbound", False)),
        stacks=effect.stacks,
        payload=payload,
    )
    target = state.players[target_player_id].team[target_slot]
    max_stacks = int(payload.get("max_stacks", 0))
    if max_stacks > 0:
        for active in target.statuses:
            if active.duration != 0 and active.id == status.id:
                active.stacks = min(max_stacks, active.stacks + status.stacks)
                active.duration = max(active.duration, status.duration)
                active.payload.update(payload)
                _apply_status_side_effects(target, active)
                return active
    target.statuses.append(status)
    _apply_status_side_effects(target, status)
    return status


def apply_effect(
    state: BattleState,
    action: PendingAction,
    effect: EffectSpec,
    target_player_id: str,
    target_slot: int | None,
    skill_name: str | None = None,
) -> BattleEvent:
    """Apply one effect and return an event-log entry."""

    display_name = skill_name or action.skill_id

    if effect.type == "damage":
        if target_slot is None:
            raise EffectError("damage effect requires a target slot")
        target = state.players[target_player_id].team[target_slot]
        caster = state.players[action.player_id].team[action.caster_slot]
        if not _payload_condition_met(target, effect, caster):
            return BattleEvent(
                type="damage_skipped",
                message=f"{display_name} condition was not met",
                turn_number=state.turn_number,
                payload={"action_id": action.id, "target_player_id": target_player_id, "target_slot": target_slot},
            )
        damage_type = effect.damage_type or DamageType.NORMAL
        amount = (effect.amount or 0) + _damage_bonus(target, effect)
        if effect.target != "self":
            amount = max(0, amount + _outgoing_damage_delta(caster))
        bypass_invulnerability = bool(
            effect.payload.get("bypass_invulnerability")
            or damage_type == DamageType.SURE_HIT
        )
        actual = apply_damage(
            target,
            amount,
            damage_type,
            bypass_invulnerability=bypass_invulnerability,
        )
        _apply_damage_payload_side_effects(target, effect)
        event = BattleEvent(
            type="damage",
            message=f"{display_name} dealt {actual} damage to {target.name}",
            turn_number=state.turn_number,
            payload={
                "action_id": action.id,
                "target_player_id": target_player_id,
                "target_slot": target_slot,
                "amount": actual,
                "attempted_amount": amount,
                "damage_type": damage_type.value,
            },
        )
        if effect.target != "self":
            _consume_damage_bonus_statuses(caster)
        return event
    if effect.type == "health_steal":
        if target_slot is None:
            raise EffectError("health steal requires a target slot")
        target = state.players[target_player_id].team[target_slot]
        caster = state.players[action.player_id].team[action.caster_slot]
        actual = apply_damage(target, effect.amount or 0, DamageType.HEALTH_STEAL)
        caster.hp = min(caster.max_hp, caster.hp + actual)
        return BattleEvent(
            type="health_steal",
            message=f"{display_name} stole {actual} health from {target.name}",
            turn_number=state.turn_number,
            payload={"action_id": action.id, "amount": actual},
        )
    if effect.type == "heal":
        if target_slot is None:
            raise EffectError("heal effect requires a target slot")
        target = state.players[target_player_id].team[target_slot]
        amount = max(0, effect.amount or 0)
        healing_delta = _status_amount(target, "healing_received_delta")
        actual = min(target.max_hp - target.hp, max(0, amount + healing_delta))
        target.hp += actual
        if target.hp > 0:
            target.alive = True
        return BattleEvent(
            type="heal",
            message=f"{display_name} healed {target.name} for {actual} HP",
            turn_number=state.turn_number,
            payload={
                "action_id": action.id,
                "target_player_id": target_player_id,
                "target_slot": target_slot,
                "amount": actual,
                "attempted_amount": amount,
            },
        )
    if effect.type == "apply_status":
        if target_slot is None:
            raise EffectError("status effect requires a target slot")
        target = state.players[target_player_id].team[target_slot]
        condition_status = effect.payload.get("condition_status")
        missing_status = effect.payload.get("condition_missing_status")
        if (condition_status and not has_status(target, str(condition_status))) or (missing_status and has_status(target, str(missing_status))):
            return BattleEvent(
                type="status_skipped",
                message=f"{display_name} did not meet the {_label_identifier(effect.status)} condition",
                turn_number=state.turn_number,
                payload={"action_id": action.id, "status": effect.status},
            )
        status = apply_status(state, action, target_player_id, target_slot, effect)
        private_to = action.player_id if status.invisible and not status.revealed else None
        return BattleEvent(
            type="status_applied",
            message=f"{status.name} applied",
            turn_number=state.turn_number,
            private_to=private_to,
            payload={
                "action_id": action.id,
                "status": status.id,
                "target_player_id": target_player_id,
                "target_slot": target_slot,
            },
        )
    if effect.type == "drain_energy":
        if target_slot is not None:
            target = state.players[target_player_id].team[target_slot]
            if not _payload_condition_met(target, effect):
                return BattleEvent(
                    type="energy_drain_skipped",
                    message=f"{display_name} condition was not met",
                    turn_number=state.turn_number,
                    payload={"action_id": action.id, "target_player_id": target_player_id, "target_slot": target_slot},
                )
        target_player = state.players[target_player_id]
        removed = None
        for energy, amount in target_player.energy.items():
            if amount > 0:
                target_player.energy[energy] -= 1
                removed = energy.value
                break
        return BattleEvent(
            type="energy_drained",
            message=f"{display_name} drained energy" if removed else f"{display_name} found no energy to drain",
            turn_number=state.turn_number,
            payload={"action_id": action.id, "target_player_id": target_player_id, "energy": removed, "amount": 1 if removed else 0},
        )
    if effect.type == "gain_energy":
        target_player = state.players[target_player_id]
        preferred = str(effect.payload.get("energy", "green"))
        energy = next((item for item in target_player.energy if item.value == preferred), next(iter(target_player.energy)))
        target_player.energy[energy] += effect.amount or 1
        return BattleEvent(
            type="energy_gained",
            message=f"{display_name} generated energy",
            turn_number=state.turn_number,
            payload={"action_id": action.id, "target_player_id": target_player_id, "energy": energy.value, "amount": effect.amount or 1},
        )
    if effect.type == "extend_status":
        if target_slot is None:
            raise EffectError("extend status effect requires a target slot")
        target = state.players[target_player_id].team[target_slot]
        status_filter = effect.status
        amount = effect.amount or 1
        extended = 0
        for status in target.statuses:
            if status.duration != 0 and (status_filter is None or status.id == status_filter or status.name == status_filter):
                status.duration += amount
                extended += 1
        return BattleEvent(
            type="status_extended",
            message=f"{display_name} extended statuses",
            turn_number=state.turn_number,
            payload={"action_id": action.id, "target_player_id": target_player_id, "target_slot": target_slot, "status": status_filter, "extended": extended},
        )
    if effect.type == "apply_team_status":
        target_player = state.players[target_player_id]
        status_id = str(effect.status or effect.payload.get("status") or "team_status")
        status_name = str(effect.payload.get("name", status_id))
        applied = 0
        for slot in target_player.active_slots:
            if slot < 0 or slot >= len(target_player.team) or not target_player.team[slot].alive:
                continue
            team_effect = EffectSpec(
                type="apply_status",
                status=status_id,
                duration=effect.duration,
                stacks=effect.stacks,
                classes=list(effect.classes),
                payload={**effect.payload, "name": status_name},
            )
            apply_status(state, action, target_player_id, slot, team_effect)
            applied += 1
        return BattleEvent(
            type="team_status_applied",
            message=f"{display_name} empowered the team",
            turn_number=state.turn_number,
            payload={"action_id": action.id, "target_player_id": target_player_id, "status": status_id, "applied": applied},
        )
    if effect.type == "remove_status":
        if target_slot is None:
            raise EffectError("remove status effect requires a target slot")
        target = state.players[target_player_id].team[target_slot]
        kept: list[StatusEffect] = []
        removed = 0
        for status in target.statuses:
            if status.duration != 0 and (status.id == effect.status or status.name == effect.status):
                removed += 1
                _remove_status_side_effects(target, status)
            else:
                kept.append(status)
        target.statuses = kept
        return BattleEvent(
            type="status_removed",
            message=f"{display_name} removed {_label_identifier(effect.status)}",
            turn_number=state.turn_number,
            payload={
                "action_id": action.id,
                "status": effect.status,
                "target_player_id": target_player_id,
                "target_slot": target_slot,
                "removed": removed,
            },
        )
    raise EffectError(f"unsupported effect type: {effect.type}")


def should_tick_status(status: StatusEffect, acting_player_id: str | None = None) -> bool:
    """Return whether a status duration advances on this cleanup pass."""

    clock = str(status.payload.get("duration_clock", "global_turn"))
    if clock == "source_turn":
        return acting_player_id is None or status.source_player_id == acting_player_id
    if clock in {"target_turn", "round"}:
        return acting_player_id is None or status.target_player_id == acting_player_id
    return True


def apply_turn_end_statuses(
    character: CharacterState,
    player_id: str,
    slot: int,
    turn_number: int,
    acting_player_id: str | None = None,
) -> list[BattleEvent]:
    """Apply recurring turn-end payloads from active statuses."""

    events: list[BattleEvent] = []
    for status in list(character.statuses):
        if status.duration == 0 or not should_tick_status(status, acting_player_id):
            continue
        amount = int(status.payload.get("turn_end_damage", 0))
        if amount > 0:
            damage_type = DamageType(status.payload.get("turn_end_damage_type", DamageType.NORMAL.value))
            actual = apply_damage(
                character,
                amount,
                damage_type,
                bypass_invulnerability=damage_type == DamageType.SURE_HIT,
            )
            events.append(
                BattleEvent(
                    type="status_damage",
                    message=f"{status.name} dealt {actual} turn-end damage",
                    turn_number=turn_number,
                    payload={
                        "status": status.id,
                        "target_player_id": player_id,
                        "target_slot": slot,
                        "amount": actual,
                        "damage_type": damage_type.value,
                    },
                )
            )
    return events


def tick_statuses(character: CharacterState, acting_player_id: str | None = None) -> None:
    """Tick finite-duration statuses and remove expired ones."""

    kept: list[StatusEffect] = []
    for status in character.statuses:
        if status.duration > 0 and should_tick_status(status, acting_player_id):
            status.duration -= 1
        if status.duration != 0:
            kept.append(status)
        else:
            _remove_status_side_effects(character, status)
    character.statuses = kept


def tick_cooldowns(character: CharacterState) -> None:
    """Reduce all cooldowns by one turn and remove expired entries."""

    character.cooldowns = {
        skill_id: turns - 1
        for skill_id, turns in character.cooldowns.items()
        if turns - 1 > 0
    }
