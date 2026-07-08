"""Runtime mission progress tracking for first-character-creation matches."""

from __future__ import annotations

from typing import Any

from .first_creation_missions import first_creation_missions_payload
from .models import BattleEvent, BattleState

MISSION_STORY = "welcome_to_jujutsu_high"
MISSION_HIDDEN = "hidden_inventory_echoes"
MISSION_YUTA = "cursed_child_bond"
MISSION_OUTSIDER = "outsider_poison_path"


def _team_ids(state: BattleState, player_id: str) -> list[str]:
    return [character.character_id for character in state.players[player_id].team]


def _team_matches(team: list[str], recommended: list[str]) -> bool:
    return set(team[:3]) == set(recommended)


def _event_payload(event: BattleEvent | dict[str, Any]) -> dict[str, Any]:
    payload = event.payload if isinstance(event, BattleEvent) else event.get("payload", {})
    return dict(payload or {})


def _event_type(event: BattleEvent | dict[str, Any]) -> str:
    return event.type if isinstance(event, BattleEvent) else str(event.get("type", ""))


def _skill_uses(events: list[BattleEvent], player_id: str) -> list[str]:
    skills: list[str] = []
    for event in events:
        payload = _event_payload(event)
        if _event_type(event) == "skill_resolved" and payload.get("player_id") == player_id:
            skills.append(str(payload.get("skill_id", "")))
    return skills


def _status_applications(events: list[BattleEvent], status: str) -> int:
    total = 0
    for event in events:
        payload = _event_payload(event)
        if _event_type(event) == "status_applied" and payload.get("status") == status:
            total += 1
    return total


def _objective(label: str, complete: bool, current: int = 0, target: int = 1) -> dict[str, Any]:
    return {
        "label": label,
        "complete": bool(complete),
        "current": min(current, target),
        "target": target,
    }


def _mission_entry(mission: dict[str, Any], eligible: bool, objectives: list[dict[str, Any]]) -> dict[str, Any]:
    completed = all(objective["complete"] for objective in objectives)
    return {
        "id": mission["id"],
        "title": mission["title"],
        "eligible": eligible,
        "status": "complete" if completed else ("active" if eligible else "available"),
        "complete": completed,
        "objectives": objectives,
        "unlocks": list(mission.get("unlocks", [])),
    }


def evaluate_first_creation_progress(
    state: BattleState,
    player_id: str,
    prior_progress: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Return cumulative first-creation mission progress for a player in a room."""

    if player_id not in state.players:
        return prior_progress or {"missions": [], "completed_ids": [], "unlocked": [], "last_completed": []}

    prior_completed = set((prior_progress or {}).get("completed_ids", []))
    team = _team_ids(state, player_id)
    events = list(state.event_log)
    skills_used = _skill_uses(events, player_id)
    winner_is_player = state.winner_id == player_id
    missions = first_creation_missions_payload()
    by_id = {str(mission["id"]): mission for mission in missions}
    entries: list[dict[str, Any]] = []

    story_team = list(by_id[MISSION_STORY]["recommended_team"])
    story_eligible = _team_matches(team, story_team)
    story_skill_count = len(skills_used)
    entries.append(_mission_entry(by_id[MISSION_STORY], story_eligible, [
        _objective("Win one first-creation match", story_eligible and winner_is_player, 1 if winner_is_player else 0),
        _objective("Resolve at least three queued skills", story_eligible and story_skill_count >= 3, story_skill_count, 3),
    ]))

    hidden_team = list(by_id[MISSION_HIDDEN]["recommended_team"])
    hidden_eligible = _team_matches(team, hidden_team)
    hidden_payoff = any(
        _event_type(event) == "energy_gained" and _event_payload(event).get("player_id") == player_id
        for event in events
    ) or any(skill_id.endswith("compressed_uzumaki") for skill_id in skills_used)
    low_ally_alive = any(character.alive and 0 < character.hp < 50 for character in state.players[player_id].team)
    entries.append(_mission_entry(by_id[MISSION_HIDDEN], hidden_eligible, [
        _objective("Trigger a read or stock payoff", hidden_eligible and hidden_payoff, 1 if hidden_payoff else 0),
        _objective("Keep one ally alive below 50 HP", hidden_eligible and low_ally_alive, 1 if low_ally_alive else 0),
    ]))

    yuta_team = list(by_id[MISSION_YUTA]["recommended_team"])
    yuta_eligible = _team_matches(team, yuta_team)
    rika_activated = any(
        _event_type(event) == "status_applied"
        and _event_payload(event).get("status") == "rikas_curse"
        for event in events
    )
    replacement_used = any("cursed_speech_megaphone" in skill_id for skill_id in skills_used)
    entries.append(_mission_entry(by_id[MISSION_YUTA], yuta_eligible, [
        _objective("Activate Rika's Curse", yuta_eligible and rika_activated, 1 if rika_activated else 0),
        _objective("Use a replacement skill", yuta_eligible and replacement_used, 1 if replacement_used else 0),
    ]))

    outsider_team = list(by_id[MISSION_OUTSIDER]["recommended_team"])
    outsider_eligible = _team_matches(team, outsider_team)
    poison_count = _status_applications(events, "poison")
    junpei_alive = any(character.character_id == "junpei_yoshino" and character.alive for character in state.players[player_id].team)
    entries.append(_mission_entry(by_id[MISSION_OUTSIDER], outsider_eligible, [
        _objective("Apply poison twice", outsider_eligible and poison_count >= 2, poison_count, 2),
        _objective("Win with Junpei alive", outsider_eligible and winner_is_player and junpei_alive, 1 if winner_is_player and junpei_alive else 0),
    ]))

    completed_ids = [entry["id"] for entry in entries if entry["complete"]]
    completed_set = set(completed_ids)
    unlocked: list[str] = []
    for entry in entries:
        if entry["id"] in completed_set:
            unlocked.extend(entry["unlocks"])
    return {
        "team": team,
        "missions": entries,
        "completed_ids": completed_ids,
        "unlocked": sorted(set(unlocked)),
        "last_completed": [mission_id for mission_id in completed_ids if mission_id not in prior_completed],
    }


def initial_first_creation_progress(state: BattleState) -> dict[str, dict[str, Any]]:
    """Create initial per-player progress snapshots for a first-creation room."""

    return {
        player_id: evaluate_first_creation_progress(state, player_id)
        for player_id in state.players
    }
