"""Pure data models for the Naruto Arena-inspired JJK battle engine v2.

This module deliberately contains no resolver logic and does not import the v1
battle engine.  It gives later v2 PRs a stable, typed contract for conditions,
effects, queue entries, hidden statuses, transformations, and serialized battle
state while keeping the production v1 game untouched by default.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


def use_battle_v2() -> bool:
    """Return whether the v2 battle system is enabled for integration code."""

    return os.getenv("JJK_BATTLE_SYSTEM", "v1").lower() == "v2"


class BattlePhase(StrEnum):
    """Lifecycle phases for a single v2 turn or match."""

    PLANNING = "planning"
    QUEUE_REVIEW = "queue_review"
    RESOLVING = "resolving"
    TURN_END = "turn_end"
    FINISHED = "finished"


class EnergyType(StrEnum):
    """JJK-flavored Naruto Arena energy colors."""

    GREEN = "green"
    RED = "red"
    BLUE = "blue"
    WHITE = "white"
    BLACK = "black"


class DamageType(StrEnum):
    """Damage rule families supported by the v2 resolver."""

    NORMAL = "normal"
    PIERCING = "piercing"
    SOUL = "soul"
    SURE_HIT = "sure_hit"
    HEALTH_STEAL = "health_steal"


class SkillClass(StrEnum):
    """Skill tags used for targeting, stun gates, counters, and persistence."""

    PHYSICAL = "Physical"
    CURSED_ENERGY = "CursedEnergy"
    INNATE = "Innate"
    SOUL = "Soul"
    BARRIER = "Barrier"
    STRATEGIC = "Strategic"
    DOMAIN = "Domain"
    VOW = "Vow"
    ACHIEVEMENT = "Achievement"
    INSTANT = "Instant"
    ACTION = "Action"
    CONTROL = "Control"
    INVISIBLE = "Invisible"
    UNCOUNTERABLE = "Uncounterable"
    UNREFLECTABLE = "Unreflectable"
    UNREMOVABLE = "Unremovable"
    BYPASSING = "Bypassing"
    SOULBOUND = "Soulbound"
    NONSTACKING = "Nonstacking"


@dataclass(slots=True)
class TargetRule:
    """Declarative targeting contract for a skill."""

    kind: str
    min_targets: int = 1
    max_targets: int = 1
    allow_self: bool = False
    allow_dead: bool = False
    required_status: str | None = None
    notes: str = ""


@dataclass(slots=True)
class EffectSpec:
    """Data-only effect description consumed by the future resolver."""

    type: str
    amount: int | None = None
    damage_type: DamageType | None = None
    status: str | None = None
    duration: int | None = None
    stacks: int = 1
    classes: list[SkillClass] = field(default_factory=list)
    target: str = "target"
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ConditionSpec:
    """Data-only condition gate or payoff check for skill legality/effects."""

    type: str
    status: str | None = None
    amount: int | None = None
    scope: str = "target"
    negate: bool = False
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class TransformationSpec:
    """Skill replacement or form-change metadata controlled by statuses."""

    type: str
    source_skill_id: str | None = None
    replacement_skill_id: str | None = None
    duration: int | None = None
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class SkillSpec:
    """Naruto Arena-style skill kit entry."""

    id: str
    name: str
    text: str
    cost: list[EnergyType]
    cooldown: int
    target_rule: TargetRule
    classes: list[SkillClass]
    effects: list[EffectSpec] = field(default_factory=list)
    conditions: list[ConditionSpec] = field(default_factory=list)
    transformations: list[TransformationSpec] = field(default_factory=list)


@dataclass(slots=True)
class StatusEffect:
    """Runtime status, including hidden traps and soulbound effects."""

    id: str
    name: str
    source_player_id: str
    source_slot: int
    target_player_id: str
    target_slot: int
    duration: int
    classes: list[SkillClass] = field(default_factory=list)
    invisible: bool = False
    soulbound: bool = False
    stacks: int = 1
    payload: dict[str, Any] = field(default_factory=dict)
    revealed: bool = False


@dataclass(slots=True)
class CharacterState:
    """Runtime state for one character slot in a v2 team."""

    character_id: str
    name: str
    max_hp: int = 100
    hp: int = 100
    alive: bool = True
    cooldowns: dict[str, int] = field(default_factory=dict)
    statuses: list[StatusEffect] = field(default_factory=list)
    skill_replacements: dict[str, str] = field(default_factory=dict)
    acted_this_turn: bool = False


@dataclass(slots=True)
class PlayerState:
    """Runtime state for one player in a v2 match."""

    id: str
    name: str
    energy: dict[EnergyType, int] = field(
        default_factory=lambda: {energy: 0 for energy in EnergyType}
    )
    team: list[CharacterState] = field(default_factory=list)
    active_slots: list[int] = field(default_factory=lambda: [0, 1, 2])
    queue_confirmed: bool = False
    energy_converted_this_turn: bool = False


@dataclass(slots=True)
class PendingAction:
    """A queued player intent awaiting validation/payment/resolution."""

    id: str
    player_id: str
    caster_slot: int
    skill_id: str
    target_player_id: str
    target_slot: int | None = None
    target_slots: list[int] = field(default_factory=list)
    wildcard_pays: list[EnergyType] = field(default_factory=list)
    queue_index: int = 0


@dataclass(slots=True)
class BattleEvent:
    """Public or private event-log entry emitted by the resolver/session."""

    type: str
    message: str
    turn_number: int
    payload: dict[str, Any] = field(default_factory=dict)
    private_to: str | None = None


@dataclass(slots=True)
class BattleState:
    """Top-level authoritative v2 battle state."""

    players: dict[str, PlayerState]
    turn_player_id: str
    phase: BattlePhase = BattlePhase.PLANNING
    turn_number: int = 1
    pending_actions: dict[str, list[PendingAction]] = field(default_factory=dict)
    queue_order: dict[str, list[str]] = field(default_factory=dict)
    event_log: list[BattleEvent] = field(default_factory=list)
    winner_id: str | None = None
    rng_seed: int | None = None
