import pytest

from jjk_arena.battle_v2.models import BattleEvent, BattleState, CharacterState, DurationClock, EnergyType, PendingAction, PlayerState, StatusEffect
from jjk_arena.battle_v2.resolver import finish_turn, resolve_queue
from jjk_arena.battle_v2.starter_roster import FIRST_CREATION_ROSTER, FIRST_CREATION_SKILLS_BY_ID


ALL_SKILLS = [
    (character_id, skill)
    for character_id, character in FIRST_CREATION_ROSTER.items()
    for skill in character.skills
]


def active_status(status_id, player_id, slot=0, stacks=1):
    return StatusEffect(status_id, status_id.replace("_", " ").title(), player_id, slot, player_id, slot, 4, stacks=stacks)


def execution_state(character_id):
    caster = CharacterState(character_id, FIRST_CREATION_ROSTER[character_id].name)
    allies = [CharacterState("ally_one", "Ally One", hp=60), CharacterState("ally_two", "Ally Two", hp=60)]
    enemies = [CharacterState(f"enemy_{index}", f"Enemy {index}", hp=100) for index in range(3)]
    p1 = PlayerState("p1", "P1", team=[caster, *allies])
    p2 = PlayerState("p2", "P2", team=enemies)
    for player in (p1, p2):
        for energy in player.energy:
            player.energy[energy] = 20
    return BattleState({"p1": p1, "p2": p2}, "p1", rng_seed=17)


def action_for(skill):
    kind = skill.target_rule.kind
    if kind == "self":
        return PendingAction("execute", "p1", 0, skill.id, "p1", 0, wildcard_pays=[EnergyType.GREEN for energy in skill.cost if energy == EnergyType.BLACK])
    if kind == "ally":
        return PendingAction("execute", "p1", 0, skill.id, "p1", 1, wildcard_pays=[EnergyType.GREEN for energy in skill.cost if energy == EnergyType.BLACK])
    if kind == "ally_team":
        return PendingAction("execute", "p1", 0, skill.id, "p1", target_slots=[0, 1, 2], wildcard_pays=[EnergyType.GREEN for energy in skill.cost if energy == EnergyType.BLACK])
    if kind == "enemy_team":
        return PendingAction("execute", "p1", 0, skill.id, "p2", target_slots=[0, 1, 2], wildcard_pays=[EnergyType.GREEN for energy in skill.cost if energy == EnergyType.BLACK])
    action = PendingAction("execute", "p1", 0, skill.id, "p2", 0, wildcard_pays=[EnergyType.GREEN for energy in skill.cost if energy == EnergyType.BLACK])
    if any(effect.payload.get("controlled_redirect") for effect in skill.effects):
        action.alternate_target_player_id = "p1"
        action.alternate_target_slot = 1
    if any(effect.payload.get("conditional_targeting") == "venom_bloom" for effect in skill.effects):
        action.target_slot = None
        action.target_slots = [0, 1, 2]
    return action


def prepare_conditions(state, skill, action):
    caster = state.players["p1"].team[0]
    target_player = state.players[action.target_player_id]
    target_slots = action.target_slots or [action.target_slot]
    for effect in skill.effects:
        payload = effect.payload
        if payload.get("condition_user_status"):
            caster.statuses.append(active_status(str(payload["condition_user_status"]), "p1"))
        if payload.get("condition_user_stacks"):
            status_id, stacks = payload["condition_user_stacks"]
            caster.statuses.append(active_status(str(status_id), "p1", stacks=int(stacks)))
        if payload.get("bonus_user_status"):
            caster.statuses.append(active_status(str(payload["bonus_user_status"]), "p1"))
        if payload.get("bonus_user_missing_status"):
            caster.statuses.append(active_status(str(payload["bonus_user_missing_status"]), "p1"))
        condition_ids = ([payload["condition_status"]] if payload.get("condition_status") else []) + list(payload.get("condition_statuses") or [])
        for slot in target_slots[:1]:
            if slot is None:
                continue
            for status_id in condition_ids:
                if not any(status.id == status_id for status in target_player.team[slot].statuses):
                    target_player.team[slot].statuses.append(active_status(str(status_id), action.target_player_id, slot))
            for status_id in [payload.get("condition_missing_status"), payload.get("bonus_status")]:
                if status_id and not any(status.id == status_id for status in target_player.team[slot].statuses):
                    target_player.team[slot].statuses.append(active_status(str(status_id), action.target_player_id, slot))
            if payload.get("condition_target_hp_below") is not None:
                target_player.team[slot].hp = int(payload["condition_target_hp_below"]) - 1
        if payload.get("condition_ally_damaged_target_this_turn"):
            slot = target_slots[0]
            state.event_log.append(BattleEvent("damage", "Ally hit", state.turn_number, {"source_player_id": "p1", "source_slot": 1, "target_player_id": action.target_player_id, "target_slot": slot, "amount": 1}))
    if skill.target_rule.required_status:
        for slot in target_slots:
            target_player.team[slot].statuses.append(active_status(skill.target_rule.required_status, action.target_player_id, slot))


@pytest.mark.parametrize("character_id,skill", ALL_SKILLS, ids=[skill.id for _, skill in ALL_SKILLS])
def test_every_first_creation_skill_executes_its_explicit_contract(character_id, skill):
    state = execution_state(character_id)
    action = action_for(skill)
    prepare_conditions(state, skill, action)
    before_energy = sum(state.players["p1"].energy.values())
    before_hp = {pid: [character.hp for character in player.team] for pid, player in state.players.items()}
    before_statuses = sum(len(character.statuses) for player in state.players.values() for character in player.team)
    state.pending_actions["p1"] = [action]
    state.queue_order["p1"] = [action.id]

    events = resolve_queue(state, "p1", FIRST_CREATION_SKILLS_BY_ID)

    assert sum(state.players["p1"].energy.values()) == before_energy - len(skill.cost)
    assert state.players["p1"].team[0].cooldowns.get(skill.id, 0) == skill.cooldown
    meaningful = [event for event in events if event.payload.get("action_id") == action.id and event.type not in {"skill_resolved", "damage_skipped", "status_skipped", "energy_drain_skipped"}]
    assert meaningful, f"{skill.id} entered cooldown but produced no meaningful state-changing event"
    after_hp = {pid: [character.hp for character in player.team] for pid, player in state.players.items()}
    after_statuses = sum(len(character.statuses) for player in state.players.values() for character in player.team)
    assert after_hp != before_hp or after_statuses != before_statuses or any(event.type in {"energy_drained", "energy_gained", "status_consumed", "status_extended"} for event in meaningful)
    for effect in skill.effects:
        if effect.type in {"apply_status", "apply_team_status"} and effect.duration:
            matching = [status for player in state.players.values() for character in player.team for status in character.statuses if status.id == effect.status and status.source_player_id == action.player_id]
            if matching:
                assert all(0 < status.duration <= effect.duration for status in matching)

    condition_keys = {
        "condition_status", "condition_statuses", "condition_missing_status", "condition_user_status",
        "condition_user_stacks", "condition_target_hp_below", "condition_ally_damaged_target_this_turn",
        "bonus_status", "bonus_user_status", "bonus_user_missing_status",
    }
    if any(condition_keys.intersection(effect.payload) for effect in skill.effects):
        cold = execution_state(character_id)
        cold_action = action_for(skill)
        if skill.target_rule.required_status:
            prepare_conditions(cold, skill, cold_action)
        cold.pending_actions["p1"] = [cold_action]
        cold.queue_order["p1"] = [cold_action.id]
        cold_events = resolve_queue(cold, "p1", FIRST_CREATION_SKILLS_BY_ID)
        warm_projection = [(event.type, event.payload.get("amount"), event.payload.get("status")) for event in events if event.payload.get("action_id") == action.id]
        cold_projection = [(event.type, event.payload.get("amount"), event.payload.get("status")) for event in cold_events if event.payload.get("action_id") == cold_action.id]
        assert warm_projection != cold_projection, f"{skill.id} conditional setup did not change execution"

    tracked = [
        (status, status.duration)
        for player in state.players.values()
        for character in player.team
        for status in character.statuses
        if status.payload.get("_applied_turn_number") == 1 and status.duration > 0
    ]
    finish_turn(state, "p2")
    for status, initial_duration in tracked:
        if status.duration_clock == DurationClock.SOURCE_TURN and status.source_player_id != "p2":
            assert status.duration == initial_duration
        if status.duration_clock == DurationClock.TARGET_TURN and status.target_player_id == "p2":
            expected = 0 if status.payload.get("turn_end_drain_energy") else max(0, initial_duration - 1)
            assert status.duration == expected
        if status.duration_clock == DurationClock.ROUND:
            assert status.duration == max(0, initial_duration - 1)
    finish_turn(state, "p1")
    for status, initial_duration in tracked:
        if status.duration_clock == DurationClock.SOURCE_TURN and status.source_player_id == "p1":
            assert status.duration == max(0, initial_duration - 1)
