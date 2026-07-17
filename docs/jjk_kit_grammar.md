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
        EffectSpec(
            type="damage",
            amount=30,
            damage_type=DamageType.SOUL,
            payload={"condition_status": "nail_mark"},
        ),
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

## Canonical First Creation condition vocabulary

Shipping First Creation kits use the typed `EffectSpec.payload` grammar in
`jjk_arena/battle_v2/effect_payload.py`. A condition belongs to the exact
effect it gates or modifies; `SkillSpec.conditions`/`ConditionSpec` remains a
legacy engine capability used by core tests, but it is not a second canonical
authoring model for new First Creation content.

Supported gates are `condition_status`, `condition_statuses`,
`condition_missing_status`, `condition_user_status`, `condition_user_stacks`,
`condition_target_hp_below`, `condition_original_has_status`,
`condition_original_missing_status`, `condition_recipient_has_status`,
`condition_recipient_missing_status`,
`condition_ally_damaged_target_this_turn`, `condition_scope="original_target"`,
and the registered `conditional_targeting="venom_bloom"` contract.

Supported payoff keys are `bonus_status`, `bonus_user_status`,
`bonus_user_missing_status`, `bonus_amount`, and `damage_bonus`.

Every First Creation skill is schema-validated by `skill_audit.py`; unknown
conditional/bonus keys, invalid value types, and unregistered scopes or
targeting contracts fail the structural audit.

**Implementation note (updated 2026-07-17):** the legacy
`ConditionSpec`/`SkillSpec.conditions` mechanism is used by **zero of the 78
First Creation skills** — an
automated audit (`jjk_arena/battle_v2/skill_audit.py`) confirmed
`total_condition_spec_entries == 0` across the entire roster. All shipped
conditional behavior uses the canonical typed payload keys directly on the `EffectSpec`
that the condition gates or modifies, evaluated inline by the resolver/effects
layer rather than by `conditions.py::evaluate_condition`. The keys actually in
use (see `prepare_conditions` in
`tests/test_first_creation_skill_execution.py` for the full contract):

- `condition_status` / `condition_statuses` — target must have this status (id or one of these ids).
- `condition_missing_status` — target must *not* have this status.
- `condition_user_status` — the caster must have this status.
- `condition_user_stacks` — a `(status_id, minimum_stacks)` pair the caster must meet.
- `condition_target_hp_below` — target's HP must be below this value.
- `condition_original_has_status` / `condition_original_missing_status` — gates against the skill's original (pre-redirect) target.
- `condition_recipient_has_status` / `condition_recipient_missing_status` — gates against the specific effect recipient in a multi-target skill.
- `condition_ally_damaged_target_this_turn` — an ally must have damaged this target already this turn.
- `condition_scope` — narrows which of the above checks against (e.g. `"original_target"`).
- `bonus_status` / `bonus_user_status` / `bonus_user_missing_status` / `bonus_amount` — payoff-only variants that add `bonus_amount` to an effect (typically `damage`) rather than gating legality.
- `conditional_targeting` — a named special-case targeting rule (e.g. `"venom_bloom"`) implemented directly in `resolver.py`, not a generic condition.

This payload-key system is the canonical First Creation grammar. It is fully
implemented, exercised by every conditional shipping skill, covered by the
blanket parametrized cold/warm comparison, and validated against the typed
schema before roster expansion.

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

**Implementation note (2026-07-13):** cross-checked against the actual First
Creation roster. `damage`, `heal`, `apply_status`, `remove_status` are used as
literal `EffectSpec.type` values, as documented. `damage_reduction`,
`destructible_defense`, `stun_classes`, and `counter` are used, but as
**payload keys** on an `apply_status` effect's status (e.g.
`status_effect(..., damage_reduction=10)`), not as their own `EffectSpec.type`.
`invulnerability` and `skill_replacement` are used, but under the
implementation names `invulnerable` and `skill_replacements` (plural) — the
same payload-key pattern with a different spelling than documented here.
`cost_modifier` and `damage_modifier` do not exist anywhere in the engine, not
just unused by First Creation — the closest analogues are the `black_cost_delta`
and `damage_bonus`/`damage_output_delta` payload keys, which are narrower and
differently named. `domain`, `health_steal`, `reflect`, and `cooldown_increase`
exist as real engine mechanisms (see `effects.py`, `resolver.py`) but are
genuinely unused by any First Creation skill — consistent with
`docs/decisions/battle_v2_anti_domain.md`, which notes no First Creation
character has a real Domain yet. Four effect types are used by First
Creation but weren't in this original list: `apply_team_status`, `cleanse`,
`consume_status_stacks`, and `extend_status`.

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
