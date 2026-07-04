"""Battle System v2 package.

The v2 engine is intentionally isolated from the current battle flow until it is
wired behind the ``JJK_BATTLE_SYSTEM`` feature flag.
"""

from .starter_roster import CharacterSpec, SKILLS_BY_ID, STARTER_ROSTER, get_character_spec, get_skill_spec
from .serialization import serialize_status
from .manager import BattleV2Manager, BattleV2Error, BattlePlayerConfig, battle_state_to_dict, battle_v2_enabled, payload_to_action
from .models import (
    BattleEvent,
    BattlePhase,
    BattleState,
    CharacterState,
    ConditionSpec,
    DamageType,
    EffectSpec,
    EnergyType,
    PendingAction,
    PlayerState,
    SkillClass,
    SkillSpec,
    StatusEffect,
    TargetRule,
    TransformationSpec,
)

__all__ = [
    "CharacterSpec",
    "SKILLS_BY_ID",
    "STARTER_ROSTER",
    "get_character_spec",
    "get_skill_spec",
    "serialize_status",
    "BattleV2Manager",
    "BattleV2Error",
    "BattlePlayerConfig",
    "battle_state_to_dict",
    "battle_v2_enabled",
    "payload_to_action",
    "BattleEvent",
    "BattlePhase",
    "BattleState",
    "CharacterState",
    "ConditionSpec",
    "DamageType",
    "EffectSpec",
    "EnergyType",
    "PendingAction",
    "PlayerState",
    "SkillClass",
    "SkillSpec",
    "StatusEffect",
    "TargetRule",
    "TransformationSpec",
]
