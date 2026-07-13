"""Public/private serializers for Battle System v2."""

from __future__ import annotations

from .models import (
    BattleEvent,
    BattleState,
    CharacterState,
    EnergyType,
    PendingAction,
    PlayerState,
    SkillClass,
    StatusEffect,
)


def _energy_dict(energy: dict[EnergyType, int]) -> dict[str, int]:
    return {energy_type.value: amount for energy_type, amount in energy.items()}


def _class_values(classes: list[SkillClass]) -> list[str]:
    return [skill_class.value for skill_class in classes]


def serialize_status(status: StatusEffect, viewer_id: str) -> dict | None:
    """Serialize a status, hiding invisible unrevealed statuses from opponents."""

    if status.invisible and not status.revealed and viewer_id != status.source_player_id:
        return None
    return {
        "id": status.id,
        "name": status.name,
        "source_player_id": status.source_player_id,
        "source_slot": status.source_slot,
        "target_player_id": status.target_player_id,
        "target_slot": status.target_slot,
        "duration": status.duration,
        "duration_clock": status.duration_clock.value,
        "families": [family.value for family in status.families],
        "classes": _class_values(status.classes),
        "invisible": status.invisible,
        "soulbound": status.soulbound,
        "stacks": status.stacks,
        "payload": dict(status.payload),
        "revealed": status.revealed,
    }


def serialize_character(character: CharacterState, viewer_id: str) -> dict:
    statuses = [
        serialized
        for status in character.statuses
        if (serialized := serialize_status(status, viewer_id)) is not None
    ]
    return {
        "character_id": character.character_id,
        "name": character.name,
        "max_hp": character.max_hp,
        "hp": character.hp,
        "alive": character.alive,
        "cooldowns": dict(character.cooldowns),
        "statuses": statuses,
        "skill_replacements": dict(character.skill_replacements),
        "acted_this_turn": character.acted_this_turn,
    }


def serialize_action(action: PendingAction) -> dict:
    return {
        "id": action.id,
        "player_id": action.player_id,
        "caster_slot": action.caster_slot,
        "skill_id": action.skill_id,
        "target_player_id": action.target_player_id,
        "target_slot": action.target_slot,
        "target_slots": list(action.target_slots),
        "secondary_target_slot": action.secondary_target_slot,
        "alternate_target_player_id": action.alternate_target_player_id,
        "alternate_target_slot": action.alternate_target_slot,
        "wildcard_pays": [energy.value for energy in action.wildcard_pays],
        "queue_index": action.queue_index,
    }


def serialize_player(player: PlayerState, viewer_id: str) -> dict:
    return {
        "id": player.id,
        "name": player.name,
        "energy": _energy_dict(player.energy),
        "team": [serialize_character(character, viewer_id) for character in player.team],
        "active_slots": list(player.active_slots),
        "queue_confirmed": player.queue_confirmed,
        "energy_converted_this_turn": player.energy_converted_this_turn,
    }


def serialize_event(event: BattleEvent, viewer_id: str) -> dict | None:
    if event.private_to is not None and event.private_to != viewer_id:
        return None
    return {
        "type": event.type,
        "message": event.message,
        "turn_number": event.turn_number,
        "payload": dict(event.payload),
        "private_to": event.private_to,
    }


def serialize_battle_state(state: BattleState, viewer_id: str) -> dict:
    events = [
        serialized
        for event in state.event_log
        if (serialized := serialize_event(event, viewer_id)) is not None
    ]
    pending_actions = {
        pid: [serialize_action(action) for action in actions]
        for pid, actions in state.pending_actions.items()
        if pid == viewer_id
    }
    return {
        "turn_player_id": state.turn_player_id,
        "phase": state.phase.value,
        "turn_number": state.turn_number,
        "players": {
            pid: serialize_player(player, viewer_id)
            for pid, player in state.players.items()
        },
        "pending_actions": pending_actions,
        "queue_order": {
            pid: list(order)
            for pid, order in state.queue_order.items()
            if pid == viewer_id
        },
        "event_log": events,
        "winner_id": state.winner_id,
        "result_type": state.result_type,
        "finish_reason": state.finish_reason,
        "paused": state.paused,
        "paused_phase": state.paused_phase.value if state.paused_phase else None,
        "paused_seconds_remaining": state.paused_seconds_remaining,
        "timeout_total": dict(state.timeout_total),
        "timeout_consecutive": dict(state.timeout_consecutive),
        "no_progress_turns": state.no_progress_turns,
        "player_turns_completed": state.player_turns_completed,
        "phase_deadline": state.phase_deadline,
        "state_revision": state.state_revision,
    }
