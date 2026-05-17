"""
effects.py — JJK Battle Engine Effect Model
Mirrors the Naruto Unison / Naruto Arena programmatic effect structure.
Replaces the old NLP regex parser with explicit, strongly-typed effect objects.
"""
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import List, Optional


# ─── Target Types ────────────────────────────────────────────────────────────
class Target(Enum):
    ENEMY   = "enemy"    # One enemy
    SELF    = "self"     # The caster
    ALLY    = "ally"     # One ally (not self)
    ENEMIES = "enemies"  # All enemies (AoE)
    ALLIES  = "allies"   # All allies (AoE)
    XALLIES = "xallies"  # All allies except self


# ─── Duration Constant ───────────────────────────────────────────────────────
PERMANENT = 999


# ─── Effect Kinds ────────────────────────────────────────────────────────────
class EffectKind(Enum):
    # Damage types (Naruto Arena 3-tier hierarchy)
    DAMAGE    = auto()   # Normal — reduced by DR, blocked by Shield
    PIERCE    = auto()   # Piercing — ignores DR, blocked by Shield
    AFFLICT   = auto()   # Affliction — bypasses all defenses
    # Support
    HEAL      = auto()
    # Status effects
    STUN      = auto()   # Cannot act
    INVULN    = auto()   # Invulnerable to non-affliction attacks
    # Modifiers (apply to target for N turns)
    REDUCE    = auto()   # Damage reduction (flat)
    STRENGTHEN = auto()  # Flat damage bonus for the target when they attack
    WEAKEN    = auto()   # Flat damage penalty for the target when they attack
    DEFEND    = auto()   # Destructible defense (shield HP)
    DOT       = auto()   # Damage-over-time (affliction damage per turn)
    # Advanced Unison mechanics
    TRAP      = auto()   # Counter-attack triggered by an event
    CHANNEL   = auto()   # Multi-turn channeled skill


# ─── Core Effect Dataclass ───────────────────────────────────────────────────
@dataclass
class Effect:
    kind: EffectKind
    value: int = 0          # Damage / heal / reduction amount
    turns: int = 1          # Duration (-1 or PERMANENT = indefinite)
    target: Target = Target.ENEMY
    is_soulbound: bool = False  # Removed if caster dies

    # Trap-specific fields
    trap_trigger: str = ''      # 'ON_HARM', 'ON_ACTION'
    trap_value: int = 0         # Damage the trap deals


# ─── Convenience Constructors (mirrors Haskell DSL) ──────────────────────────
def damage(n: int) -> Effect:
    return Effect(EffectKind.DAMAGE, value=n, target=Target.ENEMY)

def pierce(n: int) -> Effect:
    return Effect(EffectKind.PIERCE, value=n, target=Target.ENEMY)

def afflict(n: int) -> Effect:
    return Effect(EffectKind.AFFLICT, value=n, target=Target.ENEMY)

def heal(n: int, target: Target = Target.SELF) -> Effect:
    return Effect(EffectKind.HEAL, value=n, target=target)

def stun(turns: int) -> Effect:
    return Effect(EffectKind.STUN, turns=turns, target=Target.ENEMY)

def invuln(turns: int, target: Target = Target.SELF) -> Effect:
    return Effect(EffectKind.INVULN, turns=turns, target=target)

def reduce(n: int, turns: int) -> Effect:
    """Damage reduction buff applied to the target."""
    return Effect(EffectKind.REDUCE, value=n, turns=turns, target=Target.SELF)

def ally_reduce(n: int, turns: int) -> Effect:
    return Effect(EffectKind.REDUCE, value=n, turns=turns, target=Target.ALLY)

def all_ally_reduce(n: int, turns: int) -> Effect:
    return Effect(EffectKind.REDUCE, value=n, turns=turns, target=Target.ALLIES)

def strengthen(n: int, turns: int, target: Target = Target.SELF) -> Effect:
    """Flat damage bonus for the target when attacking."""
    return Effect(EffectKind.STRENGTHEN, value=n, turns=turns, target=target)

def weaken(n: int, turns: int) -> Effect:
    """Flat damage penalty applied to the target's attacks."""
    return Effect(EffectKind.WEAKEN, value=n, turns=turns, target=Target.ENEMY)

def defend(n: int, turns: int = PERMANENT, target: Target = Target.SELF) -> Effect:
    """Destructible defense (shield)."""
    return Effect(EffectKind.DEFEND, value=n, turns=turns, target=target)

def dot(n: int, turns: int) -> Effect:
    """Damage over time — affliction damage applied each turn."""
    return Effect(EffectKind.DOT, value=n, turns=turns, target=Target.ENEMY)

def trap(trigger: str, dmg: int, soulbound: bool = True) -> Effect:
    """Counter-attack trap. Fires when trigger condition is met."""
    return Effect(EffectKind.TRAP, turns=PERMANENT, target=Target.SELF,
                  trap_trigger=trigger, trap_value=dmg, is_soulbound=soulbound)
