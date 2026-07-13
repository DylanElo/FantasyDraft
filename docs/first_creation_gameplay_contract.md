# First Creation gameplay contract

## Shipping contract

- The First Creation roster contains 19 characters and 78 skills.
- Every shipping skill supplies an explicit, non-empty `SkillSpec.effects` contract. Runtime text inference is not used.
- Harmful-skill restrictions use semantic skill evaluation rather than the invalid `stun_classes=["harmful"]` placeholder.
- Effect conditions have access to the caster, original selected target, actual recipient, and selected target set.
- One-shot modifiers identify the exact skill they empower and are consumed only by that skill.

## Completed mechanics

- Explicit cleanse effects, delayed damage, conditional target/caster branches, stack consumption, selected-target effects, turn-end energy drain, controlled redirects, no-redirect defense, class-scoped damage modifiers, retaliation, and replacement-skill interactions.
- Completed the formerly empty Flowing Red Scale, Remote Puppet Net, Rainbow Dragon Guard, and Cleanse Protocol skills.
- Completed the requested Yuji, Megumi, Maki, Panda, Todo, Momo, Mai, Miwa, Mechamaru, Junpei, Young Gojo, Young Geto, Utahime, Young Shoko, Kamo, and Yuta contract gaps.

## Test contract

- `test_first_creation_skill_execution.py` parameterizes all 78 skills through authoritative queue validation and resolution.
- Each case checks cost payment, targeting legality, cooldown, meaningful state mutation, and status duration.
- Skills with conditional payloads execute both prepared and unprepared branches and must produce different outcomes.
- `test_first_creation_contract_branches.py` provides named regressions for cross-effect context and high-risk multi-step mechanics.

## Scope boundary

- This is gameplay PR 1 only. It does not change Phaser layout, add screens, add characters, add progression, or begin the separate mobile UI/UX redesign requested for PR 2.

## Verification

- Contract audit: 19 characters, 78 explicit non-empty skills.
- Forbidden placeholders: no shipping text inference, `stun_classes=["harmful"]`, or `combo_bonus` remains.
- `python -m pytest -q -rs`: 221 passed, 1 browser-visual test skipped because `JJK_RUN_VISUAL_TESTS` was not enabled.
- Python compilation, Phaser JavaScript syntax checks, and `git diff --check`: passed.
