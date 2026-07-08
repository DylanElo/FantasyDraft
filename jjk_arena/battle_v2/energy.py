"""Energy helpers for Battle System v2."""

from __future__ import annotations

import random
from collections import Counter
from collections.abc import Sequence

from .models import EnergyType, PlayerState, SkillSpec

CORE_ENERGY: tuple[EnergyType, ...] = (
    EnergyType.GREEN,
    EnergyType.RED,
    EnergyType.BLUE,
    EnergyType.WHITE,
)


class EnergyValidationError(ValueError):
    """Raised when a queued action cannot be paid for."""


def normalize_energy(value: EnergyType | str) -> EnergyType:
    """Coerce a string or enum value into an EnergyType."""

    return value if isinstance(value, EnergyType) else EnergyType(value)


def living_active_count(player: PlayerState) -> int:
    """Return the number of living active characters controlled by a player."""

    return sum(
        1
        for slot in player.active_slots
        if 0 <= slot < len(player.team) and player.team[slot].alive
    )


def gain_energy_for_living(
    player: PlayerState,
    living_count: int,
    rng: random.Random,
) -> None:
    """Grant one random core energy per living active character."""

    for _ in range(living_count):
        player.energy[rng.choice(CORE_ENERGY)] += 1


def gain_turn_energy(
    player: PlayerState,
    turn_number: int,
    is_first_player_turn: bool,
    rng: random.Random,
) -> None:
    """Apply v2 turn-start energy rules to a player."""

    count = living_active_count(player)
    if turn_number == 1 and is_first_player_turn:
        count = min(count, 1)
    gain_energy_for_living(player, count, rng)


def split_cost(cost: Sequence[EnergyType | str]) -> tuple[Counter[EnergyType], int]:
    """Return specific core costs and wildcard count for a skill cost."""

    specific: Counter[EnergyType] = Counter()
    wildcard_count = 0
    for raw_energy in cost:
        energy = normalize_energy(raw_energy)
        if energy == EnergyType.BLACK:
            wildcard_count += 1
        else:
            specific[energy] += 1
    return specific, wildcard_count


def can_afford_specific(player: PlayerState, skill: SkillSpec) -> bool:
    """Return whether a player can pay all non-wildcard costs for a skill."""

    specific, _ = split_cost(skill.cost)
    return all(player.energy.get(energy, 0) >= amount for energy, amount in specific.items())


def validate_wildcard_payments(
    player: PlayerState,
    skill: SkillSpec,
    wildcard_pays: Sequence[EnergyType | str],
) -> None:
    """Validate that wildcard payments exactly cover black costs and are affordable."""

    specific, wildcard_count = split_cost(skill.cost)
    pays = [normalize_energy(energy) for energy in wildcard_pays]
    if len(pays) != wildcard_count:
        raise EnergyValidationError(
            f"{skill.id} requires {wildcard_count} wildcard payment(s); got {len(pays)}"
        )
    if any(energy == EnergyType.BLACK for energy in pays):
        raise EnergyValidationError("black energy cannot pay wildcard costs")

    total_required = Counter(specific)
    total_required.update(pays)
    for energy, amount in total_required.items():
        if player.energy.get(energy, 0) < amount:
            raise EnergyValidationError(f"not enough {energy.value} energy")


def spend_skill_energy(
    player: PlayerState,
    skill: SkillSpec,
    wildcard_pays: Sequence[EnergyType | str],
) -> None:
    """Spend a skill's specific and wildcard payments after validation."""

    validate_wildcard_payments(player, skill, wildcard_pays)
    specific, _ = split_cost(skill.cost)
    for energy, amount in specific.items():
        player.energy[energy] -= amount
    for raw_energy in wildcard_pays:
        player.energy[normalize_energy(raw_energy)] -= 1
