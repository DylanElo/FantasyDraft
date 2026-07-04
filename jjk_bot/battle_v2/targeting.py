"""Target validation helpers for Battle System v2."""

from __future__ import annotations

from .conditions import has_status
from .models import BattleState, CharacterState, PendingAction, PlayerState, SkillSpec, TargetRule


class TargetingError(ValueError):
    """Raised when an action references an illegal target."""


def resolve_player_id(state: BattleState, acting_player_id: str, target_player_id: str) -> str:
    """Resolve explicit ids plus convenience aliases like enemy/self."""

    if target_player_id == "self":
        return acting_player_id
    if target_player_id == "enemy":
        enemies = [pid for pid in state.players if pid != acting_player_id]
        if len(enemies) != 1:
            raise TargetingError("enemy alias requires exactly one opponent")
        return enemies[0]
    return target_player_id


def get_player(state: BattleState, player_id: str) -> PlayerState:
    """Return a player or raise a targeting error."""

    if player_id not in state.players:
        raise TargetingError(f"unknown player: {player_id}")
    return state.players[player_id]


def get_character(player: PlayerState, slot: int) -> CharacterState:
    """Return a character by slot or raise a targeting error."""

    if slot < 0 or slot >= len(player.team):
        raise TargetingError(f"invalid character slot: {slot}")
    return player.team[slot]


def action_target_slots(action: PendingAction) -> list[int]:
    """Return target slots declared by an action."""

    if action.target_slots:
        return list(action.target_slots)
    if action.target_slot is not None:
        return [action.target_slot]
    return []


def validate_target_rule(
    state: BattleState,
    action: PendingAction,
    skill: SkillSpec,
) -> tuple[str, list[CharacterState]]:
    """Validate an action's target rule and return resolved targets."""

    rule = skill.target_rule
    target_player_id = resolve_player_id(state, action.player_id, action.target_player_id)
    target_player = get_player(state, target_player_id)
    acting_player = get_player(state, action.player_id)

    if rule.kind == "field":
        return target_player_id, []

    slots = action_target_slots(action)
    if rule.kind in {"enemy_team", "ally_team", "team"} and not slots:
        slots = list(target_player.active_slots)

    if len(slots) < rule.min_targets or len(slots) > rule.max_targets:
        raise TargetingError(
            f"{skill.id} requires {rule.min_targets}-{rule.max_targets} target(s); got {len(slots)}"
        )

    if rule.kind in {"enemy", "enemy_team"} and target_player_id == action.player_id:
        raise TargetingError("skill must target an enemy")
    if rule.kind in {"ally", "ally_team"} and target_player_id != action.player_id:
        raise TargetingError("skill must target an ally")
    if rule.kind == "self" and target_player_id != action.player_id:
        raise TargetingError("self-targeted skill must target the acting player")

    targets: list[CharacterState] = []
    for slot in slots:
        target = get_character(target_player, slot)
        if rule.kind == "self" and slot != action.caster_slot:
            raise TargetingError("self-targeted skill must target the caster")
        if not rule.allow_self and target_player_id == action.player_id and slot == action.caster_slot and rule.kind != "self":
            raise TargetingError("skill cannot target its caster")
        if slot not in target_player.active_slots and rule.kind != "self":
            raise TargetingError("target must be active")
        if not rule.allow_dead and not target.alive:
            raise TargetingError("target is dead")
        if rule.required_status and not has_status(target, rule.required_status):
            raise TargetingError(f"target lacks required status: {rule.required_status}")
        targets.append(target)

    if rule.kind == "self":
        caster = get_character(acting_player, action.caster_slot)
        if targets and targets[0] is not caster:
            raise TargetingError("self-targeted skill must target the caster")

    return target_player_id, targets
