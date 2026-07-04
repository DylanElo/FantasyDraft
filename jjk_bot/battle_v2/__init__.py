"""Battle System v2 package.

The v2 engine is intentionally isolated from the current battle flow until it is
wired behind the ``JJK_BATTLE_SYSTEM`` feature flag.
"""

from .starter_roster import CharacterSpec, SKILLS_BY_ID, STARTER_ROSTER, get_character_spec, get_skill_spec
from .serialization import serialize_battle_state, serialize_status
from .session import BattleV2RoomManager, BattleV2SessionError, ClassicPlayerConfig
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
    use_battle_v2,
)

__all__ = [
    "CharacterSpec",
    "SKILLS_BY_ID",
    "STARTER_ROSTER",
    "get_character_spec",
    "get_skill_spec",
    "serialize_battle_state",
    "serialize_status",
    "BattleV2RoomManager",
    "BattleV2SessionError",
    "ClassicPlayerConfig",
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
    "use_battle_v2",
]
