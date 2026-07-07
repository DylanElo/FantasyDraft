"""Public room-level manager facade for Battle System v2."""

from __future__ import annotations

import random
from collections import Counter
from itertools import product
from copy import deepcopy
from dataclasses import dataclass
from typing import Any

from .energy import CORE_ENERGY, gain_turn_energy, normalize_energy, split_cost
from .models import BattleEvent, BattlePhase, BattleState, CharacterState, DamageType, PendingAction, PlayerState, SkillSpec, use_battle_v2
from .resolver import ResolverError, check_winner, finish_turn, resolve_queue, validate_queue
from .serialization import serialize_battle_state
from .starter_roster import (
    FIRST_CREATION_ROSTER,
    FIRST_CREATION_SKILLS_BY_ID,
    SKILLS_BY_ID,
    STARTER_ROSTER,
    CharacterSpec,
    first_creation_catalog,
    validate_first_creation_team,
)


class BattleV2Error(ValueError):
    """Raised when a v2 manager operation is invalid."""


def battle_v2_enabled() -> bool:
    """Return whether Battle v2 should be used by integration code."""

    return use_battle_v2()


def battle_state_to_dict(state: BattleState, viewer_id: str) -> dict:
    """Return a viewer-specific serialized Battle v2 state."""

    return serialize_battle_state(state, viewer_id)


@dataclass(frozen=True, slots=True)
class BattlePlayerConfig:
    """Configuration needed to start a Classic Arena v2 player."""

    id: str
    name: str
    team: list[str]


def _character_state(spec: CharacterSpec) -> CharacterState:
    return CharacterState(character_id=spec.id, name=spec.name)


def _coerce_player_config(raw: BattlePlayerConfig | dict[str, Any]) -> BattlePlayerConfig:
    if isinstance(raw, BattlePlayerConfig):
        return raw
    return BattlePlayerConfig(
        id=str(raw["id"]),
        name=str(raw.get("name", raw["id"])),
        team=[str(character_id) for character_id in raw["team"]],
    )


def payload_to_action(player_id: str, index: int, payload: dict[str, Any]) -> PendingAction:
    wildcard_pays = [
        normalize_energy(energy)
        for energy in payload.get("wildcard_pays", [])
    ]
    return PendingAction(
        id=str(payload.get("id") or f"{player_id}:action:{index}"),
        player_id=player_id,
        caster_slot=int(payload["caster_slot"]),
        skill_id=str(payload["skill_id"]),
        target_player_id=str(payload["target_player_id"]),
        target_slot=(
            None if payload.get("target_slot") is None else int(payload.get("target_slot"))
        ),
        target_slots=[int(slot) for slot in payload.get("target_slots", [])],
        wildcard_pays=wildcard_pays,
        queue_index=int(payload.get("queue_index", index)),
    )


def _serialize_roster_catalog(roster: dict[str, CharacterSpec]) -> dict[str, dict[str, Any]]:
    return {
        character_id: {
            "id": spec.id,
            "name": spec.name,
            "role": spec.role,
            "state": spec.state,
            "skills": [
                {
                    "id": skill.id,
                    "name": skill.name,
                    "text": skill.text,
                    "cost": [energy.value for energy in skill.cost],
                    "cooldown": skill.cooldown,
                    "target_rule": {
                        "kind": skill.target_rule.kind,
                        "min_targets": skill.target_rule.min_targets,
                        "max_targets": skill.target_rule.max_targets,
                        "allow_self": skill.target_rule.allow_self,
                        "allow_dead": skill.target_rule.allow_dead,
                        "required_status": skill.target_rule.required_status,
                    },
                    "classes": [skill_class.value for skill_class in skill.classes],
                    "effects": [
                        {
                            "type": effect.type,
                            "amount": effect.amount,
                            "damage_type": effect.damage_type.value if effect.damage_type else None,
                            "status": effect.status,
                            "duration": effect.duration,
                            "stacks": effect.stacks,
                            "classes": [skill_class.value for skill_class in effect.classes],
                            "target": effect.target,
                            "payload": dict(effect.payload),
                        }
                        for effect in skill.effects
                    ],
                    "conditions": [
                        {
                            "type": condition.type,
                            "status": condition.status,
                            "amount": condition.amount,
                            "scope": condition.scope,
                            "negate": condition.negate,
                        }
                        for condition in skill.conditions
                    ],
                }
                for skill in spec.skills
            ],
        }
        for character_id, spec in roster.items()
    }


def skill_catalog() -> dict[str, dict[str, Any]]:
    return _serialize_roster_catalog(STARTER_ROSTER)


def _wildcard_payment_options(
    player: PlayerState,
    skill_id: str,
    skills: dict[str, SkillSpec] | None = None,
) -> list[list[EnergyType]]:
    skill = (skills or SKILLS_BY_ID)[skill_id]
    specific, wildcard_count = split_cost(skill.cost)
    if wildcard_count == 0:
        return [[]]
    available = {
        energy: player.energy.get(energy, 0) - specific.get(energy, 0)
        for energy in CORE_ENERGY
    }
    options: list[list[EnergyType]] = []
    for pays in product(CORE_ENERGY, repeat=wildcard_count):
        required = Counter(pays)
        if all(available.get(energy, 0) >= amount for energy, amount in required.items()):
            options.append(list(pays))
    return options


def _cpu_target_payloads(
    state: BattleState,
    player_id: str,
    skill_id: str,
    caster_slot: int,
    skills: dict[str, SkillSpec] | None = None,
) -> list[dict[str, Any]]:
    skill = (skills or SKILLS_BY_ID)[skill_id]
    opponent_ids = [pid for pid in state.players if pid != player_id]
    if not opponent_ids:
        return []
    opponent_id = opponent_ids[0]
    opponent = state.players[opponent_id]
    living_enemy_slots = [
        slot for slot in opponent.active_slots
        if 0 <= slot < len(opponent.team) and opponent.team[slot].alive
    ]
    living_enemy_slots.sort(key=lambda slot: opponent.team[slot].hp)
    player = state.players[player_id]
    living_ally_slots = [
        slot for slot in player.active_slots
        if 0 <= slot < len(player.team) and player.team[slot].alive
    ]
    living_ally_slots.sort(key=lambda slot: player.team[slot].hp / max(1, player.team[slot].max_hp))
    if skill.target_rule.kind == "self":
        return [{"target_player_id": player_id, "target_slot": caster_slot}]
    if skill.target_rule.kind == "ally":
        return [
            {"target_player_id": player_id, "target_slot": slot}
            for slot in living_ally_slots
        ]
    if skill.target_rule.kind == "ally_team":
        return [{"target_player_id": player_id, "target_slot": None, "target_slots": living_ally_slots}]
    if skill.target_rule.kind == "enemy_team":
        return [{"target_player_id": opponent_id, "target_slot": None, "target_slots": living_enemy_slots}]
    if skill.target_rule.kind == "enemy":
        return [
            {"target_player_id": opponent_id, "target_slot": slot}
            for slot in living_enemy_slots
        ]
    return []


def _target_slots_from_payload(target_payload: dict[str, Any]) -> list[int]:
    if target_payload.get("target_slots"):
        return list(target_payload["target_slots"])
    if target_payload.get("target_slot") is not None:
        return [int(target_payload["target_slot"])]
    return []


def _cpu_action_score(state: BattleState, player_id: str, action: PendingAction, skill: SkillSpec) -> int:
    score = 0
    target_player = state.players.get(action.target_player_id)
    target_slots = _target_slots_from_payload(
        {
            "target_slot": action.target_slot,
            "target_slots": action.target_slots,
        }
    )
    for effect in skill.effects:
        if effect.type in {"damage", "health_steal"}:
            amount = effect.amount or 0
            if effect.damage_type == DamageType.SOUL:
                amount += 10
            elif effect.damage_type in {DamageType.PIERCING, DamageType.SURE_HIT, DamageType.HEALTH_STEAL}:
                amount += 6
            score += amount
            if target_player and target_player.id != player_id:
                for slot in target_slots:
                    if 0 <= slot < len(target_player.team):
                        target = target_player.team[slot]
                        if target.alive and (effect.amount or 0) >= target.hp:
                            score += 500
                        score += max(0, target.max_hp - target.hp) // 5
        elif effect.type == "heal":
            if target_player:
                for slot in target_slots:
                    if 0 <= slot < len(target_player.team):
                        target = target_player.team[slot]
                        missing = max(0, target.max_hp - target.hp)
                        score += min(effect.amount or 0, missing) * 3
                        if target.hp <= 40:
                            score += 60
        elif effect.type == "apply_status":
            payload = effect.payload
            if payload.get("stun_classes"):
                score += 90
            if payload.get("counter") or payload.get("reflect"):
                score += 70
            if payload.get("damage_bonus"):
                score += 45
            if payload.get("damage_reduction"):
                score += 25
            if int(payload.get("damage_output_delta", 0)) < 0:
                score += 35
            if payload.get("turn_end_damage"):
                score += int(payload["turn_end_damage"]) * 2
            if effect.status:
                score += 10
        elif effect.type == "remove_status":
            score += 20
    if skill.conditions:
        score += 35
    score -= len(skill.cost) * 2
    return score


class BattleV2Manager:
    """Manage authoritative v2 battle states by room id."""

    def __init__(self, rng_seed: int | None = None):
        self.rooms: dict[str, BattleState] = {}
        self.rngs: dict[str, random.Random] = {}
        self.rng_seed = rng_seed
        self.room_rosters: dict[str, dict[str, CharacterSpec]] = {}
        self.room_skill_maps: dict[str, dict[str, SkillSpec]] = {}
        self.room_catalogs: dict[str, dict[str, Any]] = {}

    def start_classic_match(
        self,
        room_id: str,
        players: list[BattlePlayerConfig | dict[str, Any]],
        *,
        roster: dict[str, CharacterSpec] | None = None,
        skills: dict[str, SkillSpec] | None = None,
        catalog: dict[str, Any] | None = None,
    ) -> dict:
        """Start a Classic Arena match and return serialized state for player one."""

        roster = roster or STARTER_ROSTER
        skills = skills or SKILLS_BY_ID
        catalog = catalog or _serialize_roster_catalog(roster)
        configs = [_coerce_player_config(player) for player in players]
        if len(configs) != 2:
            raise BattleV2Error("classic match requires exactly two players")
        player_states: dict[str, PlayerState] = {}
        for config in configs:
            if len(config.team) != 3:
                raise BattleV2Error("classic match requires exactly three characters per player")
            if config.id in player_states:
                raise BattleV2Error(f"duplicate player id: {config.id}")
            team = []
            for character_id in config.team:
                if character_id not in roster:
                    raise BattleV2Error(f"unknown starter character: {character_id}")
                team.append(_character_state(roster[character_id]))
            player_states[config.id] = PlayerState(id=config.id, name=config.name, team=team)

        turn_player_id = configs[0].id
        state = BattleState(
            players=player_states,
            turn_player_id=turn_player_id,
            rng_seed=self.rng_seed,
        )
        rng = random.Random(self.rng_seed)
        self.rngs[room_id] = rng
        gain_turn_energy(state.players[turn_player_id], state.turn_number, True, rng)
        self.rooms[room_id] = state
        self.room_rosters[room_id] = roster
        self.room_skill_maps[room_id] = skills
        self.room_catalogs[room_id] = catalog
        return self.serialize_for_player(room_id, turn_player_id)

    def start_first_creation_match(
        self,
        room_id: str,
        players: list[BattlePlayerConfig | dict[str, Any]],
    ) -> dict:
        """Start a match restricted to the first-character-creation roster."""

        configs = [_coerce_player_config(player) for player in players]
        for config in configs:
            valid, reason = validate_first_creation_team(config.team)
            if not valid:
                raise BattleV2Error(reason)
        return self.start_classic_match(
            room_id,
            configs,
            roster=FIRST_CREATION_ROSTER,
            skills=FIRST_CREATION_SKILLS_BY_ID,
            catalog=first_creation_catalog(),
        )

    def _skills_for_room(self, room_id: str) -> dict[str, SkillSpec]:
        return self.room_skill_maps.get(room_id, SKILLS_BY_ID)

    def _roster_for_room(self, room_id: str) -> dict[str, CharacterSpec]:
        return self.room_rosters.get(room_id, STARTER_ROSTER)

    def get_state(self, room_id: str) -> BattleState:
        try:
            return self.rooms[room_id]
        except KeyError as exc:
            raise BattleV2Error(f"unknown room: {room_id}") from exc

    def submit_plan(self, room_id: str, player_id: str, actions: list[dict[str, Any]]) -> dict:
        """Store pending actions for queue review without spending energy."""

        state = self.get_state(room_id)
        self._ensure_turn_player(state, player_id)
        previous_actions = deepcopy(state.pending_actions.get(player_id, []))
        previous_order = list(state.queue_order.get(player_id, []))
        parsed = [payload_to_action(player_id, index, payload) for index, payload in enumerate(actions)]
        state.pending_actions[player_id] = parsed
        state.queue_order[player_id] = [action.id for action in sorted(parsed, key=lambda item: item.queue_index)]
        state.phase = BattlePhase.QUEUE_REVIEW
        try:
            if all(not action.wildcard_pays for action in parsed):
                self._validate_non_wildcard_plan(room_id, state, player_id)
            else:
                validate_queue(state, player_id, self._skills_for_room(room_id))
        except ResolverError as exc:
            state.pending_actions[player_id] = previous_actions
            state.queue_order[player_id] = previous_order
            state.phase = BattlePhase.PLANNING
            raise BattleV2Error(str(exc)) from exc
        return self.serialize_for_player(room_id, player_id)

    def update_queue(
        self,
        room_id: str,
        player_id: str,
        queue_order: list[str],
        wildcard_pays: dict[str, list[str]],
    ) -> dict:
        """Update queue order and wildcard payments, then validate the queue."""

        state = self.get_state(room_id)
        self._ensure_turn_player(state, player_id)
        previous_actions = deepcopy(state.pending_actions.get(player_id, []))
        previous_order = list(state.queue_order.get(player_id, []))
        action_by_id = {
            action.id: action
            for action in state.pending_actions.get(player_id, [])
        }
        for action_id, pays in wildcard_pays.items():
            if action_id not in action_by_id:
                raise BattleV2Error(f"unknown action id: {action_id}")
            action_by_id[action_id].wildcard_pays = [normalize_energy(energy) for energy in pays]
        state.queue_order[player_id] = list(queue_order)
        try:
            validate_queue(state, player_id, self._skills_for_room(room_id))
        except ResolverError as exc:
            state.pending_actions[player_id] = previous_actions
            state.queue_order[player_id] = previous_order
            raise BattleV2Error(str(exc)) from exc
        return self.serialize_for_player(room_id, player_id)

    def confirm_queue(self, room_id: str, player_id: str) -> dict:
        """Validate and resolve the current player's queue."""

        state = self.get_state(room_id)
        self._ensure_turn_player(state, player_id)
        resolve_queue(state, player_id, self._skills_for_room(room_id))
        self._grant_next_turn_energy(room_id, player_id)
        return self.serialize_for_player(room_id, player_id)

    def cancel_queue(self, room_id: str, player_id: str) -> dict:
        """Clear a player's pending queue and return to planning."""

        state = self.get_state(room_id)
        self._ensure_turn_player(state, player_id)
        state.pending_actions[player_id] = []
        state.queue_order[player_id] = []
        state.phase = BattlePhase.PLANNING
        return self.serialize_for_player(room_id, player_id)

    def convert_energy(self, room_id: str, player_id: str, source: str, target: str) -> dict:
        """Convert two core energy of one color into one other core color once this turn."""

        state = self.get_state(room_id)
        self._ensure_turn_player(state, player_id)
        player = state.players[player_id]
        if player.queue_confirmed:
            raise BattleV2Error("queue is already confirmed")
        if state.pending_actions.get(player_id):
            raise BattleV2Error("cancel the current queue before converting energy")
        if player.energy_converted_this_turn:
            raise BattleV2Error("energy conversion already used this turn")
        try:
            source_energy = normalize_energy(source)
            target_energy = normalize_energy(target)
        except ValueError as exc:
            raise BattleV2Error("unknown energy color") from exc
        if source_energy not in CORE_ENERGY or target_energy not in CORE_ENERGY:
            raise BattleV2Error("only colored energy can be converted")
        if source_energy == target_energy:
            raise BattleV2Error("choose two different energy colors")
        if player.energy.get(source_energy, 0) < 2:
            raise BattleV2Error(f"not enough {source_energy.value} energy to convert")
        player.energy[source_energy] -= 2
        player.energy[target_energy] += 1
        player.energy_converted_this_turn = True
        state.event_log.append(
            BattleEvent(
                type="energy_converted",
                message=f"{player.name} converted 2 {source_energy.value} into 1 {target_energy.value}",
                turn_number=state.turn_number,
                payload={
                    "player_id": player_id,
                    "source": source_energy.value,
                    "target": target_energy.value,
                },
            )
        )
        return self.serialize_for_player(room_id, player_id)

    def end_turn(self, room_id: str, player_id: str) -> dict:
        """End the active player's turn without resolving queued actions."""

        state = self.get_state(room_id)
        self._ensure_turn_player(state, player_id)
        player = state.players[player_id]
        state.pending_actions[player_id] = []
        state.queue_order[player_id] = []
        state.event_log.append(
            BattleEvent(
                type="turn_skipped",
                message=f"{player.name} ended their turn",
                turn_number=state.turn_number,
            )
        )
        finish_turn(state, player_id)
        check_winner(state)
        self._grant_next_turn_energy(room_id, player_id)
        return self.serialize_for_player(room_id, player_id)

    def take_cpu_turn(self, room_id: str, player_id: str) -> dict:
        """Submit and resolve a simple first-legal CPU queue for the active turn."""

        state = self.get_state(room_id)
        self._ensure_turn_player(state, player_id)
        player = state.players[player_id]
        actions: list[PendingAction] = []
        for slot in player.active_slots:
            if slot < 0 or slot >= len(player.team):
                continue
            caster = player.team[slot]
            if not caster.alive:
                continue
            character_spec = self._roster_for_room(room_id).get(caster.character_id)
            if character_spec is None:
                continue
            best: tuple[int, PendingAction] | None = None
            for skill in character_spec.skills:
                for target_payload in _cpu_target_payloads(
                    state, player_id, skill.id, slot, self._skills_for_room(room_id)
                ):
                    for wildcard_pays in _wildcard_payment_options(player, skill.id, self._skills_for_room(room_id)):
                        candidate = PendingAction(
                            id=f"{player_id}:cpu:{slot}:{skill.id}",
                            player_id=player_id,
                            caster_slot=slot,
                            skill_id=skill.id,
                            target_player_id=target_payload["target_player_id"],
                            target_slot=target_payload.get("target_slot"),
                            target_slots=list(target_payload.get("target_slots", [])),
                            wildcard_pays=wildcard_pays,
                            queue_index=len(actions),
                        )
                        trial_state = deepcopy(state)
                        trial_state.pending_actions[player_id] = actions + [candidate]
                        trial_state.queue_order[player_id] = [
                            action.id for action in trial_state.pending_actions[player_id]
                        ]
                        try:
                            validate_queue(trial_state, player_id, self._skills_for_room(room_id))
                        except ResolverError:
                            continue
                        score = _cpu_action_score(state, player_id, candidate, skill)
                        if best is None or score > best[0]:
                            best = (score, candidate)
            if best is not None:
                actions.append(best[1])
        if not actions:
            return self.end_turn(room_id, player_id)
        state.pending_actions[player_id] = actions
        state.queue_order[player_id] = [action.id for action in actions]
        state.phase = BattlePhase.QUEUE_REVIEW
        resolve_queue(state, player_id, self._skills_for_room(room_id))
        self._grant_next_turn_energy(room_id, player_id)
        return self.serialize_for_player(room_id, player_id)

    def serialize_for_player(self, room_id: str, viewer_id: str) -> dict:
        state = self.get_state(room_id)
        if viewer_id not in state.players:
            raise BattleV2Error(f"unknown viewer: {viewer_id}")
        payload = battle_state_to_dict(state, viewer_id)
        payload["skill_catalog"] = self.room_catalogs.get(room_id, skill_catalog())
        return payload

    def _ensure_turn_player(self, state: BattleState, player_id: str) -> None:
        if player_id not in state.players:
            raise BattleV2Error(f"unknown player: {player_id}")
        if state.turn_player_id != player_id:
            raise BattleV2Error("not this player's turn")
        if state.phase == BattlePhase.FINISHED:
            raise BattleV2Error("battle is finished")

    def _advance_without_action(self, room_id: str, previous_player_id: str) -> None:
        state = self.get_state(room_id)
        player_ids = list(state.players)
        current_index = player_ids.index(previous_player_id)
        next_index = (current_index + 1) % len(player_ids)
        if next_index == 0:
            state.turn_number += 1
        state.turn_player_id = player_ids[next_index]
        state.phase = BattlePhase.PLANNING
        self._grant_next_turn_energy(room_id, previous_player_id)

    def _grant_next_turn_energy(self, room_id: str, previous_player_id: str) -> None:
        state = self.get_state(room_id)
        if state.phase != BattlePhase.PLANNING or state.winner_id is not None:
            return
        next_player_id = state.turn_player_id
        if next_player_id == previous_player_id:
            return
        rng = self.rngs.setdefault(room_id, random.Random(state.rng_seed))
        gain_turn_energy(
            state.players[next_player_id],
            state.turn_number,
            False,
            rng,
        )

    def _validate_non_wildcard_plan(self, room_id: str, state: BattleState, player_id: str) -> None:
        skills = self._skills_for_room(room_id)
        for action in state.pending_actions.get(player_id, []):
            skill = skills.get(action.skill_id)
            if skill is None:
                raise BattleV2Error(f"unknown skill: {action.skill_id}")
            if any(energy.value == "black" for energy in skill.cost):
                return
        validate_queue(state, player_id, skills)
