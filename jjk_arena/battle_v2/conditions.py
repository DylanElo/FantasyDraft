"""Condition evaluation for Battle System v2."""

from __future__ import annotations

from .models import CharacterState, SkillClass


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


def full_stun_name(character: CharacterState) -> str | None:
    """Return the visible name of an active all-class stun, if any."""

    if any(
        status.duration != 0 and status.payload.get("ignore_stun", False)
        for status in character.statuses
    ):
        return None
    for status in character.statuses:
        if status.duration != 0 and "all" in status.payload.get("stun_classes", []):
            return status.name or status.id
    return None
