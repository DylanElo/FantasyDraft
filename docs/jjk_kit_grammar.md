# JJK Kit Grammar

## Purpose

Battle v2 kits use a Naruto Arena-inspired grammar so character mechanics are readable, testable, and mostly data-driven. A skill should describe what it costs, who it targets, what classes it belongs to, what it does, what conditions gate or modify it, and what counterplay exists.

## Canonical Skill Shape

```python
SkillSpec(
    id="resonance",
    name="Resonance",
    cost=[EnergyType.RED, EnergyType.BLACK],
    cooldown=1,
    target_rule=TargetRule(kind="enemy", required_status="nail_mark"),
    classes=[SkillClass.SOUL, SkillClass.INNATE, SkillClass.INSTANT],
    text="Deal 30 soul damage to a marked enemy.",
    effects=[
        EffectSpec(type="damage", amount=30, damage_type=DamageType.SOUL),
    ],
    conditions=[
        ConditionSpec(type="target_has", status="nail_mark"),
    ],
)
```

## Required Four-Skill Layout

Every first-pass character should use this structure:

1. Basic pressure.
2. Signature technique.
3. Setup, defense, counter, or utility.
4. Payoff, Domain, Vow, or transformation.

Allowed extras:

- Zero to two replacement skills.
- Zero to one achievement or passive skill.

## Design Limits

For the first v2 roster:

- Use one major named state per character.
- Use one payoff condition per character.
- Avoid full-canon simulation.
- Avoid requiring players to read many hidden flags.
- Do not allow a one-shot from full HP without at least one prior setup turn.

## Condition Vocabulary

Initial condition types should include:

- `user_has`
- `target_has`
- `target_stacks`
- `user_damaged_enemy_last_turn`
- `target_hp_below`
- `skill_class_used`
- `domain_active`
- `not_stunned_for_class`

Conditions may gate legality or provide payoff bonuses. The effect or resolver that consumes the condition should make that distinction explicit.

## Effect Vocabulary

Initial effect types should include:

- `damage`
- `heal`
- `health_steal`
- `apply_status`
- `remove_status`
- `damage_reduction`
- `destructible_defense`
- `invulnerability`
- `stun_classes`
- `counter`
- `reflect`
- `cooldown_increase`
- `cost_modifier`
- `damage_modifier`
- `domain`
- `skill_replacement`

## Transformation and Replacement Rules

Skill replacements are slot-based and stored on `CharacterState.skill_replacements`:

```python
{"straw_doll_setup": "resonance_detonation"}
```

Replacement duration should be controlled by statuses or transformations, not by checking character names. Examples for future kits include:

- Nobara: Straw Doll Setup to Resonance Detonation.
- Megumi: Ten Shadows Setup to Mahoraga Adaptation.
- Sukuna: Shrine Setup to Cleave.
- Higuruma: Trial to Executioner’s Sword.

## Starter Roster Order

First six:

- Yuji Itadori
- Nobara Kugisaki
- Megumi Fushiguro
- Satoru Gojo
- Ryomen Sukuna
- Mahito

Next four:

- Aoi Todo
- Maki Zenin
- Yuta Okkotsu
- Hiromi Higuruma
