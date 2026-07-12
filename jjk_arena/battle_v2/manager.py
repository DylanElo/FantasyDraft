"""Public room-level manager facade for Battle System v2."""

from __future__ import annotations

import random
from collections import Counter
from collections import OrderedDict
from itertools import product
from copy import deepcopy
from dataclasses import dataclass
import json
from threading import RLock
from typing import Any, Callable

from .energy import CORE_ENERGY, gain_turn_energy, normalize_energy, split_cost
from .conditions import has_status
from .models import BattleEvent, BattlePhase, BattleState, CharacterState, DamageType, PendingAction, PlayerState, SkillSpec, use_battle_v2
from .first_creation_progression import evaluate_first_creation_progress, initial_first_creation_progress
from .resolver import ResolverError, check_winner, finish_turn, get_skill_for_action, resolve_queue, validate_action_identity, validate_queue, validate_queue_identity
from .serialization import serialize_battle_state
from .targeting import invulnerability_blocks_skill
from .starter_roster import (
    FIRST_CREATION_ROSTER,
    FIRST_CREATION_SKILLS_BY_ID,
    SKILLS_BY_ID,
    STARTER_ROSTER,
    CharacterSpec,
    first_creation_catalog,
    validate_first_creation_team,
)
from .timers import BattleTimerPolicy, arm_phase_timer, phase_seconds_remaining, phase_timer_expired, system_clock


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
    replacement_ids = {
        transformation.replacement_skill_id
        for skill in spec.skills
        for transformation in skill.transformations
        if transformation.replacement_skill_id
    }
    replacement_ids.update(
        str(replacement)
        for skill in spec.skills
        for effect in skill.effects
        for replacement in (effect.payload.get("skill_replacements") or {}).values()
    )
    base_skill_ids = [skill.id for skill in spec.skills if skill.id not in replacement_ids]
    return CharacterState(
        character_id=spec.id,
        name=spec.name,
        base_skill_ids=base_skill_ids,
    )


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
        id=str(payload.get("id", "")).strip(),
        player_id=player_id,
        caster_slot=int(payload["caster_slot"]),
        skill_id=str(payload["skill_id"]),
        target_player_id=str(payload["target_player_id"]),
        target_slot=(
            None if payload.get("target_slot") is None else int(payload.get("target_slot"))
        ),
        target_slots=[int(slot) for slot in payload.get("target_slots", [])],
        secondary_target_slot=(None if payload.get("secondary_target_slot") is None else int(payload["secondary_target_slot"])),
        alternate_target_player_id=(None if payload.get("alternate_target_player_id") is None else str(payload["alternate_target_player_id"])),
        alternate_target_slot=(None if payload.get("alternate_target_slot") is None else int(payload["alternate_target_slot"])),
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


def _is_legal_cpu_target(
    state: BattleState,
    player_id: str,
    skill: SkillSpec,
    target_player_id: str,
    slot: int,
) -> bool:
    player = state.players[target_player_id]
    if slot < 0 or slot >= len(player.team):
        return False
    target = player.team[slot]
    if not target.alive:
        return False
    action = PendingAction(
        id="cpu-target-probe",
        player_id=player_id,
        caster_slot=0,
        skill_id=skill.id,
        target_player_id=target_player_id,
        target_slot=slot,
    )
    return not invulnerability_blocks_skill(target, skill, action, target_player_id)


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
        if _is_legal_cpu_target(state, player_id, skill, opponent_id, slot)
    ]
    living_enemy_slots.sort(key=lambda slot: opponent.team[slot].hp)
    player = state.players[player_id]
    living_ally_slots = [
        slot for slot in player.active_slots
        if _is_legal_cpu_target(state, player_id, skill, player_id, slot)
    ]
    living_ally_slots.sort(key=lambda slot: player.team[slot].hp / max(1, player.team[slot].max_hp))
    if any(effect.payload.get("controlled_redirect") for effect in skill.effects):
        alternate_slot = living_ally_slots[0] if living_ally_slots else caster_slot
        return [
            {"target_player_id": opponent_id, "target_slot": slot, "alternate_target_player_id": player_id, "alternate_target_slot": alternate_slot}
            for slot in living_enemy_slots
        ]
    if any(effect.payload.get("conditional_targeting") == "venom_bloom" for effect in skill.effects):
        poisoned = [slot for slot in living_enemy_slots if has_status(opponent.team[slot], "poison")]
        if not poisoned:
            return [{"target_player_id": opponent_id, "target_slot": None, "target_slots": living_enemy_slots}]
        return [
            {"target_player_id": opponent_id, "target_slot": primary, "target_slots": [primary, secondary], "secondary_target_slot": secondary}
            for primary in poisoned for secondary in living_enemy_slots if secondary != primary
        ]
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

    def __init__(
        self,
        rng_seed: int | None = None,
        *,
        timer_policy: BattleTimerPolicy | None = None,
        clock: Callable[[], float] = system_clock,
        capture_replays: bool = False,
    ):
        self.rooms: dict[str, BattleState] = {}
        self.rngs: dict[str, random.Random] = {}
        self.rng_seed = rng_seed
        self.room_rosters: dict[str, dict[str, CharacterSpec]] = {}
        self.room_skill_maps: dict[str, dict[str, SkillSpec]] = {}
        self.room_catalogs: dict[str, dict[str, Any]] = {}
        self.room_roster_modes: dict[str, str] = {}
        self.room_first_creation_progress: dict[str, dict[str, dict[str, Any]]] = {}
        self.command_receipts: dict[str, dict[str, OrderedDict[str, str]]] = {}
        self.room_locks: dict[str, RLock] = {}
        self.room_replays: dict[str, dict[str, Any]] = {}
        self.capture_replays = capture_replays
        self.timer_policy = timer_policy or BattleTimerPolicy()
        self.clock = clock

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
        self.command_receipts[room_id] = {}
        self.room_locks[room_id] = RLock()
        arm_phase_timer(state, self.timer_policy, self.clock)
        self.room_rosters[room_id] = roster
        self.room_skill_maps[room_id] = skills
        self.room_catalogs[room_id] = catalog
        self.room_roster_modes[room_id] = "classic"
        self.room_first_creation_progress.pop(room_id, None)
        if self.capture_replays:
            from .replay import REPLAY_FORMAT_VERSION, RULES_VERSION, authoritative_state_hash
            self.room_replays[room_id] = {
                "format_version": REPLAY_FORMAT_VERSION,
                "rules_version": RULES_VERSION,
                "match_id": room_id,
                "roster_mode": "classic",
                "rng_seed": self.rng_seed,
                "players": [
                    {"id": config.id, "name": config.name, "team": list(config.team)}
                    for config in configs
                ],
                "commands": [],
                "initial_state_hash": authoritative_state_hash(state),
                "final_state_hash": authoritative_state_hash(state),
            }
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
        self.start_classic_match(
            room_id,
            configs,
            roster=FIRST_CREATION_ROSTER,
            skills=FIRST_CREATION_SKILLS_BY_ID,
            catalog=first_creation_catalog(),
        )
        self.room_roster_modes[room_id] = "first_creation"
        if room_id in self.room_replays:
            self.room_replays[room_id]["roster_mode"] = "first_creation"
        self.room_first_creation_progress[room_id] = initial_first_creation_progress(self.get_state(room_id))
        return self.serialize_for_player(room_id, configs[0].id)

    def _skills_for_room(self, room_id: str) -> dict[str, SkillSpec]:
        return self.room_skill_maps.get(room_id, SKILLS_BY_ID)

    def _roster_for_room(self, room_id: str) -> dict[str, CharacterSpec]:
        return self.room_rosters.get(room_id, STARTER_ROSTER)

    def get_state(self, room_id: str) -> BattleState:
        try:
            return self.rooms[room_id]
        except KeyError as exc:
            raise BattleV2Error(f"unknown room: {room_id}") from exc

    def execute_player_command(
        self,
        room_id: str,
        player_id: str,
        command: str,
        state_revision: int,
        client_action_nonce: str,
        payload: dict[str, Any] | None = None,
    ) -> bool:
        """Execute one versioned command atomically; return True for a safe retry."""

        with self.room_locks.setdefault(room_id, RLock()):
            return self._execute_player_command(
                room_id,
                player_id,
                command,
                state_revision,
                client_action_nonce,
                payload,
            )

    def _execute_player_command(
        self,
        room_id: str,
        player_id: str,
        command: str,
        state_revision: int,
        client_action_nonce: str,
        payload: dict[str, Any] | None = None,
    ) -> bool:

        payload = payload or {}
        nonce = str(client_action_nonce).strip()
        if not nonce:
            raise BattleV2Error("client_action_nonce is required")
        if len(nonce) > 64:
            raise BattleV2Error("client_action_nonce is too long")
        state = self.get_state(room_id)
        self.expire_phase_if_needed(room_id)

        fingerprint = json.dumps(
            {"command": command, "payload": payload},
            sort_keys=True,
            separators=(",", ":"),
        )
        player_receipts = self.command_receipts.setdefault(room_id, {}).setdefault(
            player_id, OrderedDict()
        )
        previous = player_receipts.get(nonce)
        if previous is not None:
            if previous != fingerprint:
                raise BattleV2Error("client_action_nonce was already used for a different command")
            player_receipts.move_to_end(nonce)
            return True
        if isinstance(state_revision, bool) or not isinstance(state_revision, int) or state_revision < 0:
            raise BattleV2Error("state_revision must be a non-negative integer")
        if state_revision != state.state_revision:
            raise BattleV2Error(
                f"stale state revision: expected {state.state_revision}, got {state_revision}"
            )

        state_snapshot = deepcopy(state)
        progress_snapshot = deepcopy(self.room_first_creation_progress.get(room_id))
        rng = self.rngs.get(room_id)
        rng_snapshot = rng.getstate() if rng is not None else None
        try:
            if command == "submit_plan":
                self.submit_plan(room_id, player_id, list(payload.get("actions", [])))
            elif command == "update_queue":
                self.update_queue(
                    room_id,
                    player_id,
                    list(payload.get("queue_order", [])),
                    dict(payload.get("wildcard_pays", {})),
                )
            elif command == "confirm_queue":
                self.confirm_queue(room_id, player_id)
            elif command == "cancel_queue":
                self.cancel_queue(room_id, player_id)
            elif command == "convert_energy":
                self.convert_energy(room_id, player_id, str(payload.get("source", "")), str(payload.get("target", "")))
            elif command == "end_turn":
                self.end_turn(room_id, player_id)
            elif command == "surrender":
                self.surrender(room_id, player_id)
            elif command == "cpu_turn":
                self.take_cpu_turn(room_id, player_id)
            else:
                raise BattleV2Error(f"unknown battle command: {command}")
        except Exception as exc:
            self.rooms[room_id] = state_snapshot
            if progress_snapshot is None:
                self.room_first_creation_progress.pop(room_id, None)
            else:
                self.room_first_creation_progress[room_id] = progress_snapshot
            if rng is not None and rng_snapshot is not None:
                rng.setstate(rng_snapshot)
            if isinstance(exc, BattleV2Error):
                raise
            if isinstance(exc, (IndexError, KeyError, TypeError, ValueError)):
                raise BattleV2Error("invalid command payload") from exc
            raise

        self.rooms[room_id].state_revision += 1
        if self.capture_replays and room_id in self.room_replays:
            from .replay import authoritative_state_hash
            state_hash = authoritative_state_hash(self.rooms[room_id])
            self.room_replays[room_id]["commands"].append({
                "player_id": player_id,
                "command": command,
                "state_revision": state_revision,
                "client_action_nonce": nonce,
                "payload": deepcopy(payload),
                "expected_state_hash": state_hash,
            })
            self.room_replays[room_id]["final_state_hash"] = state_hash
        player_receipts[nonce] = fingerprint
        player_receipts.move_to_end(nonce)
        while len(player_receipts) > 128:
            player_receipts.popitem(last=False)
        return False

    def replay_document(self, room_id: str) -> dict[str, Any]:
        if room_id not in self.room_replays:
            raise BattleV2Error("replay capture is not enabled for this room")
        return deepcopy(self.room_replays[room_id])

    def surrender(self, room_id: str, player_id: str) -> dict:
        """Finish a match by authoritative player surrender."""

        state = self.get_state(room_id)
        if player_id not in state.players:
            raise BattleV2Error(f"unknown player: {player_id}")
        winners = [pid for pid in state.players if pid != player_id]
        if not winners:
            raise BattleV2Error("no opponent to award surrender")
        state.winner_id = winners[0]
        state.phase = BattlePhase.FINISHED
        state.event_log.append(BattleEvent(
            type="battle_finished",
            message=f"{state.winner_id} wins by surrender",
            turn_number=state.turn_number,
            payload={"winner_id": state.winner_id, "surrendered_id": player_id},
        ))
        return self.serialize_for_player(room_id, player_id)

    def submit_plan(self, room_id: str, player_id: str, actions: list[dict[str, Any]]) -> dict:
        """Store pending actions for queue review without spending energy."""

        self.expire_phase_if_needed(room_id)
        state = self.get_state(room_id)
        self._ensure_turn_player(state, player_id)
        previous_actions = deepcopy(state.pending_actions.get(player_id, []))
        previous_order = list(state.queue_order.get(player_id, []))
        parsed = [payload_to_action(player_id, index, payload) for index, payload in enumerate(actions)]
        state.pending_actions[player_id] = parsed
        state.queue_order[player_id] = [action.id for action in sorted(parsed, key=lambda item: item.queue_index)]
        state.phase = BattlePhase.QUEUE_REVIEW
        arm_phase_timer(state, self.timer_policy, self.clock)
        try:
            if all(not action.wildcard_pays for action in parsed):
                self._validate_non_wildcard_plan(room_id, state, player_id)
            else:
                validate_queue(state, player_id, self._skills_for_room(room_id))
        except ResolverError as exc:
            state.pending_actions[player_id] = previous_actions
            state.queue_order[player_id] = previous_order
            state.phase = BattlePhase.PLANNING
            arm_phase_timer(state, self.timer_policy, self.clock)
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

        self.expire_phase_if_needed(room_id)
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

        self.expire_phase_if_needed(room_id)
        state = self.get_state(room_id)
        self._ensure_turn_player(state, player_id)
        resolve_queue(state, player_id, self._skills_for_room(room_id))
        self._refresh_first_creation_progress(room_id)
        self._grant_next_turn_energy(room_id, player_id)
        return self.serialize_for_player(room_id, player_id)

    def cancel_queue(self, room_id: str, player_id: str) -> dict:
        """Clear a player's pending queue and return to planning."""

        self.expire_phase_if_needed(room_id)
        state = self.get_state(room_id)
        self._ensure_turn_player(state, player_id)
        state.pending_actions[player_id] = []
        state.queue_order[player_id] = []
        state.phase = BattlePhase.PLANNING
        arm_phase_timer(state, self.timer_policy, self.clock)
        return self.serialize_for_player(room_id, player_id)

    def convert_energy(self, room_id: str, player_id: str, source: str, target: str) -> dict:
        """Convert two core energy of one color into one other core color once this turn."""

        self.expire_phase_if_needed(room_id)
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

        self.expire_phase_if_needed(room_id)
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
        self._refresh_first_creation_progress(room_id)
        self._grant_next_turn_energy(room_id, player_id)
        return self.serialize_for_player(room_id, player_id)

    def take_cpu_turn(self, room_id: str, player_id: str) -> dict:
        """Submit and resolve a simple first-legal CPU queue for the active turn."""

        self.expire_phase_if_needed(room_id)
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
            for base_skill_id in caster.base_skill_ids:
                resolved_skill_id = caster.skill_replacements.get(base_skill_id, base_skill_id)
                resolved_skill = self._skills_for_room(room_id)[resolved_skill_id]
                for target_payload in _cpu_target_payloads(
                    state, player_id, resolved_skill_id, slot, self._skills_for_room(room_id)
                ):
                    for wildcard_pays in _wildcard_payment_options(player, resolved_skill_id, self._skills_for_room(room_id)):
                        candidate = PendingAction(
                            id=f"{player_id}:cpu:{slot}:{base_skill_id}",
                            player_id=player_id,
                            caster_slot=slot,
                            skill_id=base_skill_id,
                            target_player_id=target_payload["target_player_id"],
                            target_slot=target_payload.get("target_slot"),
                            target_slots=list(target_payload.get("target_slots", [])),
                            wildcard_pays=wildcard_pays,
                            secondary_target_slot=target_payload.get("secondary_target_slot"),
                            alternate_target_player_id=target_payload.get("alternate_target_player_id"),
                            alternate_target_slot=target_payload.get("alternate_target_slot"),
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
                        score = _cpu_action_score(state, player_id, candidate, resolved_skill)
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
        self._refresh_first_creation_progress(room_id)
        self._grant_next_turn_energy(room_id, player_id)
        return self.serialize_for_player(room_id, player_id)

    def expire_phase_if_needed(self, room_id: str) -> bool:
        """Apply the authoritative timeout transition once a deadline passes."""

        with self.room_locks.setdefault(room_id, RLock()):
            return self._expire_phase_if_needed(room_id)

    def _expire_phase_if_needed(self, room_id: str) -> bool:
        """Locked implementation for authoritative timeout transitions."""

        state = self.get_state(room_id)
        if not phase_timer_expired(state, self.clock) or state.phase == BattlePhase.FINISHED:
            return False
        timed_out_player_id = state.turn_player_id
        if state.phase == BattlePhase.QUEUE_REVIEW and state.pending_actions.get(timed_out_player_id):
            try:
                resolve_queue(state, timed_out_player_id, self._skills_for_room(room_id))
            except ResolverError:
                state.pending_actions[timed_out_player_id] = []
                state.queue_order[timed_out_player_id] = []
                finish_turn(state, timed_out_player_id)
                check_winner(state)
        else:
            state.pending_actions[timed_out_player_id] = []
            state.queue_order[timed_out_player_id] = []
            finish_turn(state, timed_out_player_id)
            check_winner(state)
        state.event_log.append(BattleEvent(
            type="phase_timeout",
            message=f"{state.players[timed_out_player_id].name} ran out of time",
            turn_number=state.turn_number,
            payload={"player_id": timed_out_player_id},
        ))
        self._refresh_first_creation_progress(room_id)
        self._grant_next_turn_energy(room_id, timed_out_player_id)
        arm_phase_timer(state, self.timer_policy, self.clock)
        state.state_revision += 1
        return True

    def serialize_for_player(self, room_id: str, viewer_id: str) -> dict:
        with self.room_locks.setdefault(room_id, RLock()):
            return self._serialize_for_player(room_id, viewer_id)

    def _serialize_for_player(self, room_id: str, viewer_id: str) -> dict:
        self.expire_phase_if_needed(room_id)
        state = self.get_state(room_id)
        if viewer_id not in state.players:
            raise BattleV2Error(f"unknown viewer: {viewer_id}")
        payload = battle_state_to_dict(state, viewer_id)
        payload["phase_seconds_remaining"] = phase_seconds_remaining(state, self.clock)
        payload["skill_catalog"] = self.room_catalogs.get(room_id, skill_catalog())
        payload["roster_mode"] = self.room_roster_modes.get(room_id, "classic")
        if self.room_roster_modes.get(room_id) == "first_creation":
            self._refresh_first_creation_progress(room_id)
            payload["first_creation_progress"] = self.room_first_creation_progress.get(room_id, {}).get(viewer_id)
        return payload


    def _refresh_first_creation_progress(self, room_id: str) -> None:
        if self.room_roster_modes.get(room_id) != "first_creation":
            return
        state = self.get_state(room_id)
        existing = self.room_first_creation_progress.setdefault(room_id, {})
        for player_id in state.players:
            existing[player_id] = evaluate_first_creation_progress(state, player_id, existing.get(player_id))

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
            arm_phase_timer(state, self.timer_policy, self.clock)
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
        arm_phase_timer(state, self.timer_policy, self.clock)

    def _validate_non_wildcard_plan(self, room_id: str, state: BattleState, player_id: str) -> None:
        skills = self._skills_for_room(room_id)
        validate_queue_identity(state, player_id)
        for action in state.pending_actions.get(player_id, []):
            caster = state.players[player_id].team[action.caster_slot]
            skill = get_skill_for_action(skills, caster, action)
            validate_action_identity(state, action, skills)
            if any(energy.value == "black" for energy in skill.cost):
                return
        validate_queue(state, player_id, skills)
