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

    if _has_invulnerability(target) and not bypass_invulnerability:
        if damage_type != DamageType.SURE_HIT or _has_anti_domain(target):
            return 0

    defense = _status_amount(target, "destructible_defense")
    reduction = _status_amount(target, "damage_reduction")
    incoming = amount

    if damage_type == DamageType.NORMAL:
        incoming = max(0, incoming - reduction)
    elif damage_type in {DamageType.SOUL, DamageType.HEALTH_STEAL}:
        defense = 0
    elif damage_type == DamageType.SURE_HIT:
        if not _has_anti_domain(target):
            defense = 0
            reduction = 0

    if defense > 0 and damage_type in {DamageType.NORMAL, DamageType.PIERCING}:
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
        payload=dict(effect.payload),
    )
    state.players[target_player_id].team[target_slot].statuses.append(status)
    return status


def apply_effect(
    state: BattleState,
    action: PendingAction,
    effect: EffectSpec,
    target_player_id: str,
    target_slot: int | None,
) -> BattleEvent:
    """Apply one effect and return an event-log entry."""

    if effect.type == "damage":
        if target_slot is None:
            raise EffectError("damage effect requires a target slot")
        target = state.players[target_player_id].team[target_slot]
        damage_type = effect.damage_type or DamageType.NORMAL
        amount = (effect.amount or 0) + _damage_bonus(target, effect)
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
        return BattleEvent(
            type="damage",
            message=f"{action.skill_id} dealt {actual} damage",
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
    if effect.type == "health_steal":
        if target_slot is None:
            raise EffectError("health steal requires a target slot")
        target = state.players[target_player_id].team[target_slot]
        caster = state.players[action.player_id].team[action.caster_slot]
        actual = apply_damage(target, effect.amount or 0, DamageType.HEALTH_STEAL)
        caster.hp = min(caster.max_hp, caster.hp + actual)
        return BattleEvent(
            type="health_steal",
            message=f"{action.skill_id} stole {actual} health",
            turn_number=state.turn_number,
            payload={"action_id": action.id, "amount": actual},
        )
    if effect.type == "apply_status":
        if target_slot is None:
            raise EffectError("status effect requires a target slot")
        target = state.players[target_player_id].team[target_slot]
        condition_status = effect.payload.get("condition_status")
        if condition_status and not has_status(target, str(condition_status)):
            return BattleEvent(
                type="status_skipped",
                message=f"{effect.status} condition was not met",
                turn_number=state.turn_number,
                payload={"action_id": action.id, "status": effect.status},
            )
        status = apply_status(state, action, target_player_id, target_slot, effect)
        return BattleEvent(
            type="status_applied",
            message=f"{status.name} applied",
            turn_number=state.turn_number,
            payload={
                "action_id": action.id,
                "status": status.id,
                "target_player_id": target_player_id,
                "target_slot": target_slot,
            },
        )
    if effect.type == "remove_status":
        if target_slot is None:
            raise EffectError("remove status effect requires a target slot")
        target = state.players[target_player_id].team[target_slot]
        before = len(target.statuses)
        target.statuses = [
            status
            for status in target.statuses
            if status.duration == 0 or (status.id != effect.status and status.name != effect.status)
        ]
        removed = before - len(target.statuses)
        return BattleEvent(
            type="status_removed",
            message=f"{effect.status} removed",
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


def tick_statuses(character: CharacterState) -> None:
    """Tick finite-duration statuses and remove expired ones."""

    kept: list[StatusEffect] = []
    for status in character.statuses:
        if status.duration > 0:
            status.duration -= 1
        if status.duration != 0:
            kept.append(status)
    character.statuses = kept


def tick_cooldowns(character: CharacterState) -> None:
    """Reduce all cooldowns by one turn and remove expired entries."""

    character.cooldowns = {
        skill_id: turns - 1
        for skill_id, turns in character.cooldowns.items()
        if turns - 1 > 0
    }
