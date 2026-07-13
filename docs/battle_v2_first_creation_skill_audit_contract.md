# First Creation skill audit contract

`jjk_arena/battle_v2/skill_audit.py` is a mechanical audit over all 78 First
Creation skills. It does not re-verify what
`tests/test_first_creation_skill_execution.py::test_every_first_creation_skill_executes_its_explicit_contract`
already covers for every skill via parametrization: energy cost spent,
cooldown set, a meaningful positive state change, a cold-vs-warm comparison
proving conditional setup actually changes execution, and status duration
ticking on the correct clock.

Instead it checks three things a human audit pass would otherwise spend most
of its time on:

## 1. Structural completeness

Flags empty/placeholder UI text, a skill with no effects and no conditions,
missing skill classes, or a negative cooldown — things the type system
doesn't catch. Current result: 0 flagged across all 78 skills.

## 2. Special-mechanic test coverage

Detects which skills grant `counter`, `reflect`, or `skill_replacements`
behavior, or use non-trivial targeting (anything other than plain single
`enemy`/`self`), and reports whether that skill has a *dedicated* test beyond
the blanket parametrized one. Current result: counter and both
skill-replacement mechanics (Suguru Geto Young, Yuta Okkotsu JJK0) already
have dedicated coverage; 11 skills using `ally`/`ally_team`/`enemy_team`
targeting do not have a test beyond the blanket one (they are still exercised
by it, just not with a targeting-specific assertion).

## 3. Kit-grammar vocabulary drift

Compares the effect/condition vocabulary `docs/jjk_kit_grammar.md` documents
against what the roster actually uses. The most significant finding: **the
documented `ConditionSpec`/`SkillSpec.conditions` mechanism
(`conditions.py::evaluate_condition`, the "Condition Vocabulary" section) is
used by zero of the 78 First Creation skills.** All conditional skill
behavior instead uses an undocumented, parallel payload-key convention on
`EffectSpec` (`condition_status`, `condition_user_status`,
`condition_target_hp_below`, etc. — see `prepare_conditions` in
`tests/test_first_creation_skill_execution.py` for the full vocabulary
actually in use). This is a documentation gap, not an engine bug — the
payload-key system is fully implemented, tested, and working; the doc
describes a different, unused mechanism.

Other vocabulary findings: `cost_modifier` and `damage_modifier` don't exist
anywhere in the engine, not just unused by First Creation. `domain`,
`health_steal`, `reflect`, and `cooldown_increase` exist as engine mechanisms
but are genuinely unused by any First Creation skill (consistent with the
anti-domain decision record — no First Creation character has a real Domain
yet). `invulnerability`/`skill_replacement` are used, just under the
implementation names `invulnerable`/`skill_replacements`.

## CLI

```bash
python -m jjk_arena.battle_v2.skill_audit          # human-readable summary
python -m jjk_arena.battle_v2.skill_audit --json   # machine-readable
```

`tests/test_first_creation_skill_audit.py` pins the structural-completeness
result at 0 and guards that counter/reflect/skill-replacement mechanics keep
their dedicated coverage, so both stay regression-checked. It deliberately
does not assert the targeting-coverage gap count is 0, since that's an
open, reportable finding rather than a bug this tool should silently paper
over by asserting it away.

## Limitations

This is contract/coverage mechanics, not balance or design review — it
cannot judge whether a skill is fun, whether its numbers are right, or
whether its UI text reads well. It does not test AI behavior (CPU skill
selection is emergent/heuristic, not scripted per skill id) or human
playtesting, both of which remain separate, non-automatable work per the
project roadmap's Milestone B.
