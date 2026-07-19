"""Canonical attribution for authoritative enemy HP-damage events."""

from __future__ import annotations

from collections.abc import Collection

from .models import BattleEvent


HP_DAMAGE_EVENT_TYPES = frozenset({
    "damage",
    "status_damage",
    "retaliation",
    "health_steal",
})


def enemy_hp_damage_attribution(
    event: BattleEvent,
    player_ids: Collection[str],
) -> tuple[str, str, int] | None:
    """Return credited source, target, and actual enemy HP loss.

    Damage accounting is intentionally strict: nominal ``amount`` values are
    never accepted as HP loss. Emitters must provide ``actual_hp_damage`` so
    shields, reduction, invulnerability, and overkill cannot inflate progress
    or diagnostics. Self/friendly damage is not enemy damage. A reflected
    payload is credited to the reflector while retaining the original skill
    source in the event itself.
    """

    if event.type not in HP_DAMAGE_EVENT_TYPES:
        return None
    payload = event.payload
    source = payload.get("source_player_id")
    target = payload.get("target_player_id")
    if payload.get("is_reflected"):
        source = payload.get("reflected_by_player_id")
    if source not in player_ids or target not in player_ids or source == target:
        return None
    raw_amount = payload.get("actual_hp_damage")
    if isinstance(raw_amount, bool):
        return None
    try:
        amount = int(raw_amount)
    except (TypeError, ValueError):
        return None
    if amount <= 0:
        return None
    return str(source), str(target), amount
