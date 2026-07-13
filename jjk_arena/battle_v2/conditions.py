"""Condition evaluation for Battle System v2."""

from __future__ import annotations

from .models import BattleState, CharacterState, ConditionSpec, PendingAction, SkillClass


def skill_is_harmful(skill) -> bool:
    """Return whether a skill meaningfully harms an enemy."""

    hostile_types = {"damage", "health_steal", "drain_energy", "remove_status", "counter"}
    if skill.target_rule.kind in {"enemy", "enemy_team"}:
        return any(effect.target != "self" for effect in skill.effects) or SkillClass.CONTROL in skill.classes
    return any(effect.target != "self" and effect.type in hostile_types for effect in skill.effects)


def has_status(character: CharacterState, status_id: str | None) -> bool:
    """Return whether a character has an active status with the given id/name."""

    if not status_id:
        return False
    if status_id == "stunned" and any(
        status.duration != 0 and (status.payload.get("stun_harmful") or status.payload.get("stun_classes"))
        for status in character.statuses
    ):
        return True
    return any(
        status.duration != 0 and (status.id == status_id or status.name == status_id)
        for status in character.statuses
    )


def status_stacks(character: CharacterState, status_id: str | None) -> int:
    """Return total active stacks for a status id/name."""

    if not status_id:
        return 0
    return sum(
        status.stacks
        for status in character.statuses
        if status.duration != 0 and (status.id == status_id or status.name == status_id)
    )


def get_status_payload(character: CharacterState, status_id: str) -> dict | None:
    """Return the first matching active status payload, if any."""

    for status in character.statuses:
        if status.duration != 0 and (status.id == status_id or status.name == status_id):
            return status.payload
    return None


def is_stunned_for_class(character: CharacterState, skill_classes: list[SkillClass], skill=None) -> bool:
    """Return whether any active status stuns one of the supplied skill classes."""

    if any(
        status.duration != 0 and status.payload.get("ignore_stun", False)
        for status in character.statuses
    ):
        return False
    for status in character.statuses:
        if status.duration == 0:
            continue
        if status.payload.get("stun_harmful", False) and skill is not None and skill_is_harmful(skill):
            return True
        stunned_classes = status.payload.get("stun_classes", [])
        if "all" in stunned_classes:
            return True
        if any(skill_class in stunned_classes or skill_class.value in stunned_classes for skill_class in skill_classes):
            return True
    return False


def evaluate_condition(
    condition: ConditionSpec,
    state: BattleState,
    action: PendingAction,
    user: CharacterState,
    target: CharacterState | None,
    skill_classes: list[SkillClass],
) -> bool:
    """Evaluate a single condition without mutating state."""

    result = False
    if condition.type == "user_has":
        result = has_status(user, condition.status)
    elif condition.type == "target_has":
        result = target is not None and has_status(target, condition.status)
    elif condition.type == "target_stacks":
        result = target is not None and status_stacks(target, condition.status) >= (condition.amount or 1)
    elif condition.type == "target_hp_below":
        result = target is not None and target.hp < (condition.amount or 0)
    elif condition.type == "not_stunned_for_class":
        result = not is_stunned_for_class(user, skill_classes)
    elif condition.type == "domain_active":
        result = any(
            has_status(character, condition.status or "domain")
            for player in state.players.values()
            for character in player.team
        )
    elif condition.type == "user_damaged_enemy_last_turn":
        result = has_status(user, "damaged_enemy_last_turn")
    elif condition.type == "skill_class_used":
        used = condition.payload.get("class")
        result = any(
            event.type == "skill_resolved"
            and event.payload.get("player_id") == action.player_id
            and used in event.payload.get("classes", [])
            for event in state.event_log
        )
    else:
        result = bool(condition.payload.get("default", False))

    return not result if condition.negate else result


def evaluate_conditions(
    conditions: list[ConditionSpec],
    state: BattleState,
    action: PendingAction,
    user: CharacterState,
    target: CharacterState | None,
    skill_classes: list[SkillClass],
) -> bool:
    """Return True when all conditions pass."""

    return all(
        evaluate_condition(condition, state, action, user, target, skill_classes)
        for condition in conditions
    )
