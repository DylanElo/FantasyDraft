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
missing skill classes, a negative cooldown, or an invalid conditional payload
key/value — things the base dataclasses don't catch. Current result: 0 flagged
across all 78 skills.

## 2. Special-mechanic test coverage

Detects which skills grant `counter`, `reflect`, or `skill_replacements`
behavior, or use non-trivial targeting (anything other than plain single
`enemy`/`self`), and reports whether that skill has a *dedicated* test beyond
the blanket parametrized one. Current result: 0 flagged — the initial pass
found 11 skills using `ally`/`ally_team`/`enemy_team` targeting with no
dedicated test; `tests/test_first_creation_targeting_contracts.py` now covers
all of them. Writing those tests also caught a real bug: Utahime's
`fc_utahime_iori_young_curtain_step` applied its destructible-defense status
to Utahime herself (`target="self"`) instead of the chosen ally, contradicting
its own flavor text ("gives an ally 10 destructible defense") — fixed in
`starter_roster.py`.

## 3. Kit-grammar vocabulary drift

Compares the effect/condition vocabulary `docs/jjk_kit_grammar.md` documents
against what the roster actually uses. First Creation canonically authors
conditions on the exact `EffectSpec.payload` entry they gate. The complete
typed vocabulary and runtime validator live in
`jjk_arena/battle_v2/effect_payload.py`; all 78 skills are checked by the
structural audit. `ConditionSpec` remains a legacy engine capability but is
not a parallel authoring model for new First Creation content.

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

`tests/test_first_creation_skill_audit.py` pins both structural completeness
and special-mechanic coverage at 0 flagged, so an invalid condition key/value
or a newly added skill with an untested
counter/reflect/replacement/non-trivial-targeting mechanic fails loudly.

## Limitations

This is contract/coverage mechanics, not balance or design review — it
cannot judge whether a skill is fun, whether its numbers are right, or
whether its UI text reads well. It does not test AI behavior (CPU skill
selection is emergent/heuristic, not scripted per skill id) or human
playtesting, both of which remain separate, non-automatable work per the
project roadmap's Milestone B.
