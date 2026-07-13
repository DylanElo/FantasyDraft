"""Automated contract-completeness and test-coverage audit for First Creation skills.

Every First Creation skill already gets a strong blanket regression test via
`tests/test_first_creation_skill_execution.py::test_every_first_creation_skill_executes_its_explicit_contract`,
which parametrizes over all 78 skills and verifies: energy cost is spent,
cooldown is set, a meaningful state change occurs (positive test), conditional
skills behave differently with/without their trigger status (a cold/warm
negative-vs-positive comparison), and status duration ticks correctly on the
right clock. This tool does NOT re-verify any of that.

Instead it does the two things a human audit pass would otherwise spend most
of its time on mechanically:

1. Structural contract completeness -- flags skills with suspicious/empty
   fields the type system doesn't catch (e.g. placeholder UI text, a skill
   with no effects and no conditions).
2. Special-mechanic coverage -- detects which skills grant counter, reflect,
   or skill-replacement behavior, or use non-trivial targeting, and reports
   whether that skill has any test coverage *beyond* the blanket parametrized
   test (i.e. a dedicated test that actually exercises the mechanic, not just
   "it produced a meaningful event").
3. Kit-grammar vocabulary drift -- compares the effect/condition type strings
   actually used in the roster against the vocabulary documented in
   docs/jjk_kit_grammar.md.

Usage:
    python -m jjk_arena.battle_v2.skill_audit
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

from .starter_roster import FIRST_CREATION_ROSTER, FIRST_CREATION_SKILLS_BY_ID

SCHEMA_VERSION = 1

REPO_ROOT = Path(__file__).resolve().parents[2]
TESTS_DIR = REPO_ROOT / "tests"
KIT_GRAMMAR_DOC = REPO_ROOT / "docs" / "jjk_kit_grammar.md"

# The blanket per-skill parametrized test -- every skill id "appears" here by
# construction (ALL_SKILLS iterates the whole roster), so a plain grep would
# claim 100% coverage. Excluded from the "dedicated test" search.
BLANKET_TEST_FILE = "test_first_creation_skill_execution.py"

DOCUMENTED_EFFECT_VOCABULARY = {
    "damage", "heal", "health_steal", "apply_status", "remove_status",
    "damage_reduction", "destructible_defense", "invulnerability",
    "stun_classes", "counter", "reflect", "cooldown_increase",
    "cost_modifier", "damage_modifier", "domain", "skill_replacement",
}
DOCUMENTED_CONDITION_VOCABULARY = {
    "user_has", "target_has", "target_stacks", "user_damaged_enemy_last_turn",
    "target_hp_below", "skill_class_used", "domain_active", "not_stunned_for_class",
}
# A documented vocabulary word can be implemented either as an EffectSpec.type
# or as a payload key on a different effect (usually apply_status), and
# sometimes under a slightly different name than the doc uses. This maps each
# documented word to every actual key/type that satisfies it, so the audit
# doesn't misreport "unused" for mechanics that are genuinely used under a
# different spelling.
EFFECT_VOCABULARY_ALIASES: dict[str, set[str]] = {
    "invulnerability": {"invulnerable"},
    "skill_replacement": {"skill_replacements"},
}

SKILL_ID_RE = re.compile(r'"(fc_[a-z0-9_]+)"')


def _test_file_texts() -> dict[str, str]:
    return {
        path.name: path.read_text(encoding="utf-8")
        for path in TESTS_DIR.glob("test_*.py")
    }


def _dedicated_test_files_for(skill_id: str, file_texts: dict[str, str]) -> list[str]:
    return sorted(
        name for name, text in file_texts.items()
        if name != BLANKET_TEST_FILE and f'"{skill_id}"' in text
    )


def _has_mechanic(skill, payload_key: str) -> bool:
    return any(payload_key in effect.payload for effect in skill.effects)


def _classify_targeting(skill) -> str | None:
    kind = skill.target_rule.kind
    if kind not in {"enemy", "self"}:
        return f"target_rule.kind={kind}"
    for effect in skill.effects:
        if effect.payload.get("controlled_redirect"):
            return "controlled_redirect"
        if effect.payload.get("conditional_targeting"):
            return f"conditional_targeting={effect.payload['conditional_targeting']}"
        if effect.payload.get("secondary_target_slot") is not None or effect.type in {"apply_team_status"}:
            return "multi-target"
    return None


def audit_structural_completeness() -> list[dict[str, Any]]:
    findings = []
    for character_id, character in FIRST_CREATION_ROSTER.items():
        for skill in character.skills:
            issues = []
            if not skill.text or not skill.text.strip():
                issues.append("empty UI text")
            elif skill.text.strip() == skill.name.strip():
                issues.append("UI text is just the skill name, not a description")
            if not skill.effects and not skill.conditions:
                issues.append("no effects and no conditions -- does this skill do anything?")
            if not skill.classes:
                issues.append("no skill classes assigned")
            if skill.cooldown < 0:
                issues.append(f"negative cooldown ({skill.cooldown})")
            if issues:
                findings.append({"character_id": character_id, "skill_id": skill.id, "issues": issues})
    return findings


def audit_special_mechanic_coverage() -> list[dict[str, Any]]:
    file_texts = _test_file_texts()
    findings = []
    for character_id, character in FIRST_CREATION_ROSTER.items():
        for skill in character.skills:
            mechanics = []
            if _has_mechanic(skill, "counter"):
                mechanics.append("counter")
            if _has_mechanic(skill, "reflect"):
                mechanics.append("reflect")
            if any(effect.payload.get("skill_replacements") for effect in skill.effects):
                mechanics.append("skill_replacement")
            targeting_note = _classify_targeting(skill)
            if targeting_note:
                mechanics.append(f"non-trivial targeting ({targeting_note})")
            if not mechanics:
                continue
            dedicated = _dedicated_test_files_for(skill.id, file_texts)
            if not dedicated:
                findings.append({
                    "character_id": character_id,
                    "skill_id": skill.id,
                    "mechanics": mechanics,
                    "dedicated_test_files": [],
                })
    return findings


def audit_grammar_vocabulary_drift() -> dict[str, Any]:
    used_effect_types = set()
    used_payload_keys = set()
    used_condition_types = set()
    total_condition_spec_entries = 0
    for character in FIRST_CREATION_ROSTER.values():
        for skill in character.skills:
            for effect in skill.effects:
                used_effect_types.add(effect.type)
                used_payload_keys.update(effect.payload.keys())
            total_condition_spec_entries += len(skill.conditions)
            for condition in skill.conditions:
                used_condition_types.add(condition.type)

    actual_condition_payload_vocabulary = sorted(
        key for key in used_payload_keys if "condition" in key or "bonus" in key
    )

    documented_but_unused = []
    used_under_different_name = []
    for word in sorted(DOCUMENTED_EFFECT_VOCABULARY):
        if word in used_effect_types or word in used_payload_keys:
            continue
        aliases = EFFECT_VOCABULARY_ALIASES.get(word, set())
        matched_aliases = aliases & (used_effect_types | used_payload_keys)
        if matched_aliases:
            used_under_different_name.append(f"{word} (implemented as {', '.join(sorted(matched_aliases))})")
        else:
            documented_but_unused.append(word)

    return {
        "effect_types_used_but_undocumented": sorted(used_effect_types - DOCUMENTED_EFFECT_VOCABULARY),
        "effect_vocabulary_used_under_a_different_name": used_under_different_name,
        "effect_vocabulary_genuinely_unused_in_first_creation": documented_but_unused,
        "condition_spec_mechanism_total_uses_across_all_78_skills": total_condition_spec_entries,
        "condition_types_used_but_undocumented": sorted(used_condition_types - DOCUMENTED_CONDITION_VOCABULARY),
        "condition_types_documented_but_unused": sorted(DOCUMENTED_CONDITION_VOCABULARY - used_condition_types),
        "actual_undocumented_condition_payload_vocabulary_in_use": actual_condition_payload_vocabulary,
    }


def run_audit() -> dict[str, Any]:
    total_skills = sum(len(character.skills) for character in FIRST_CREATION_ROSTER.values())
    total_characters = len(FIRST_CREATION_ROSTER)
    structural = audit_structural_completeness()
    mechanic_gaps = audit_special_mechanic_coverage()
    vocabulary = audit_grammar_vocabulary_drift()
    return {
        "schema_version": SCHEMA_VERSION,
        "total_characters": total_characters,
        "total_skills": total_skills,
        "structural_completeness": {
            "flagged_count": len(structural),
            "findings": structural,
        },
        "special_mechanic_coverage": {
            "flagged_count": len(mechanic_gaps),
            "findings": mechanic_gaps,
        },
        "grammar_vocabulary_drift": vocabulary,
        "known_uncovered_dimensions": [
            "UI text player-facing correctness/tone (only emptiness/placeholder is checked here)",
            "AI behavior per skill (CPU skill choice is emergent/heuristic, not scripted per skill id)",
            "human balance judgment (positive/negative/cost/cooldown/duration/condition math is already "
            "covered by the blanket parametrized test; this tool does not re-judge whether the numbers are fun)",
        ],
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Audit First Creation skill contracts and test coverage")
    parser.add_argument("--json", action="store_true", help="print machine-readable JSON instead of a summary")
    args = parser.parse_args(argv)
    result = run_audit()
    if args.json:
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0

    print(f"Audited {result['total_skills']} skills across {result['total_characters']} characters.\n")

    struct = result["structural_completeness"]
    print(f"Structural completeness: {struct['flagged_count']} flagged")
    for finding in struct["findings"]:
        print(f"  - {finding['skill_id']} ({finding['character_id']}): {'; '.join(finding['issues'])}")

    mech = result["special_mechanic_coverage"]
    print(f"\nSpecial-mechanic coverage gaps: {mech['flagged_count']} flagged")
    for finding in mech["findings"]:
        print(f"  - {finding['skill_id']} ({finding['character_id']}): {', '.join(finding['mechanics'])} -- no dedicated test")

    vocab = result["grammar_vocabulary_drift"]
    if vocab["condition_spec_mechanism_total_uses_across_all_78_skills"] == 0:
        print(
            "\n*** The documented ConditionSpec/`SkillSpec.conditions` mechanism "
            "(docs/jjk_kit_grammar.md 'Condition Vocabulary') is used by ZERO of "
            "the 78 First Creation skills. All conditional skill behavior is "
            "implemented via an undocumented, parallel payload-key convention "
            "on EffectSpec instead (condition_status, condition_user_status, "
            "condition_target_hp_below, etc. -- see "
            "tests/test_first_creation_skill_execution.py::prepare_conditions "
            "for the full key vocabulary actually in use). ***"
        )
    print("\nKit-grammar vocabulary drift:")
    for key, values in vocab.items():
        if key == "condition_spec_mechanism_total_uses_across_all_78_skills":
            continue
        if values:
            print(f"  - {key}: {', '.join(values)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
