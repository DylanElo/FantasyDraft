"""Unlock registry for first-character-creation mission rewards."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class FirstCreationUnlock:
    """Design-time metadata for a reward unlocked by first-creation missions."""

    id: str
    title: str
    kind: str
    description: str
    unlocks_after: str
    status: str = "planned"

    def to_payload(self, owned: bool = False) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "kind": self.kind,
            "description": self.description,
            "unlocks_after": self.unlocks_after,
            "status": "owned" if owned else self.status,
            "owned": owned,
        }


FIRST_CREATION_UNLOCKS: tuple[FirstCreationUnlock, ...] = (
    FirstCreationUnlock(
        id="mission_board",
        title="Mission Board",
        kind="system",
        description="Opens the full onboarding mission board after the Story Tutorial clear.",
        unlocks_after="welcome_to_jujutsu_high",
        status="implemented",
    ),
    FirstCreationUnlock(
        id="gojo_adult",
        title="Satoru Gojo (Adult)",
        kind="character_variant",
        description="Mentor-era Gojo variant placeholder; playable kit comes in the next variant wave.",
        unlocks_after="hidden_inventory_echoes",
    ),
    FirstCreationUnlock(
        id="geto_jjk0",
        title="Suguru Geto (JJK0)",
        kind="character_variant",
        description="JJK0 antagonist route placeholder unlocked by Hidden Inventory Echoes.",
        unlocks_after="hidden_inventory_echoes",
    ),
    FirstCreationUnlock(
        id="jjk0_geto_route",
        title="JJK0 Geto Route",
        kind="mission_route",
        description="Unlocks the first JJK0 mission branch after proving Yuta/Rika fundamentals.",
        unlocks_after="cursed_child_bond",
        status="implemented",
    ),
    FirstCreationUnlock(
        id="rika_mastery_badge",
        title="Rika Mastery Badge",
        kind="badge",
        description="Marks completion of the JJK0 Yuta starter route.",
        unlocks_after="cursed_child_bond",
        status="implemented",
    ),
    FirstCreationUnlock(
        id="mahito_intro_mission",
        title="Mahito Intro Mission",
        kind="mission_route",
        description="Begins the curse-affliction route after Junpei's outsider path.",
        unlocks_after="outsider_poison_path",
        status="implemented",
    ),
)

UNLOCKS_BY_ID: dict[str, FirstCreationUnlock] = {unlock.id: unlock for unlock in FIRST_CREATION_UNLOCKS}


def first_creation_unlocks_payload(owned_unlocks: set[str] | list[str] | tuple[str, ...] | None = None) -> list[dict[str, Any]]:
    """Return unlock metadata, marking rewards already owned by the player."""

    owned = set(owned_unlocks or [])
    return [unlock.to_payload(unlock.id in owned) for unlock in FIRST_CREATION_UNLOCKS]


def unknown_first_creation_unlocks(unlock_ids: list[str] | tuple[str, ...] | set[str]) -> list[str]:
    """Return unlock ids that are not registered as first-creation rewards."""

    return sorted(str(unlock_id) for unlock_id in unlock_ids if str(unlock_id) not in UNLOCKS_BY_ID)
