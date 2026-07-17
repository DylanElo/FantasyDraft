"""Typed and validated condition/payoff grammar for ``EffectSpec.payload``."""

from __future__ import annotations

from typing import Literal, TypedDict

from .models import EffectSpec, SkillSpec


class ConditionalEffectPayload(TypedDict, total=False):
    condition_status: str
    condition_statuses: list[str]
    condition_missing_status: str
    condition_user_status: str
    condition_user_stacks: tuple[str, int]
    condition_target_hp_below: int
    condition_original_has_status: str
    condition_original_missing_status: str
    condition_recipient_has_status: str
    condition_recipient_missing_status: str
    condition_ally_damaged_target_this_turn: bool
    condition_scope: Literal["original_target"]
    bonus_status: str
    bonus_user_status: str
    bonus_user_missing_status: str
    bonus_amount: int
    damage_bonus: int
    conditional_targeting: Literal["venom_bloom"]


CONDITIONAL_PAYLOAD_KEYS = frozenset(ConditionalEffectPayload.__annotations__)
STRING_KEYS = CONDITIONAL_PAYLOAD_KEYS - {
    "condition_statuses",
    "condition_user_stacks",
    "condition_target_hp_below",
    "condition_ally_damaged_target_this_turn",
    "bonus_amount",
    "damage_bonus",
}


def validate_conditional_effect_payload(effect: EffectSpec) -> list[str]:
    """Return schema errors for the conditional subset of one effect payload."""

    payload = effect.payload
    errors: list[str] = []
    conditional_keys = {key for key in payload if "condition" in key or "bonus" in key}
    unknown = conditional_keys - CONDITIONAL_PAYLOAD_KEYS
    if unknown:
        errors.append(f"unknown conditional payload keys: {', '.join(sorted(unknown))}")
    for key in STRING_KEYS & payload.keys():
        if not isinstance(payload[key], str) or not payload[key]:
            errors.append(f"{key} must be a non-empty string")
    if "condition_statuses" in payload:
        value = payload["condition_statuses"]
        if not isinstance(value, list) or not value or not all(isinstance(item, str) and item for item in value):
            errors.append("condition_statuses must be a non-empty list of status ids")
    if "condition_user_stacks" in payload:
        value = payload["condition_user_stacks"]
        if not (
            isinstance(value, (tuple, list)) and len(value) == 2
            and isinstance(value[0], str) and value[0]
            and isinstance(value[1], int) and not isinstance(value[1], bool) and value[1] > 0
        ):
            errors.append("condition_user_stacks must be (status_id, positive minimum)")
    for key in ("condition_target_hp_below", "bonus_amount", "damage_bonus"):
        if key in payload and (
            not isinstance(payload[key], int) or isinstance(payload[key], bool) or int(payload[key]) < 0
        ):
            errors.append(f"{key} must be a non-negative integer")
    if "condition_ally_damaged_target_this_turn" in payload and payload["condition_ally_damaged_target_this_turn"] is not True:
        errors.append("condition_ally_damaged_target_this_turn must be true when present")
    if payload.get("condition_scope") not in {None, "original_target"}:
        errors.append("condition_scope must be original_target")
    if payload.get("conditional_targeting") not in {None, "venom_bloom"}:
        errors.append("conditional_targeting must name a registered targeting contract")
    return errors


def validate_skill_conditional_payloads(skill: SkillSpec) -> list[str]:
    errors: list[str] = []
    for index, effect in enumerate(skill.effects):
        for error in validate_conditional_effect_payload(effect):
            errors.append(f"effect[{index}]: {error}")
    return errors
