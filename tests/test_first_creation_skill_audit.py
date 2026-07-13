from jjk_arena.battle_v2.skill_audit import run_audit


def test_all_78_first_creation_skills_pass_structural_completeness():
    result = run_audit()
    assert result["total_skills"] == 78
    assert result["total_characters"] == 19
    assert result["structural_completeness"]["flagged_count"] == 0, result["structural_completeness"]["findings"]


def test_every_special_mechanic_skill_has_dedicated_test_coverage():
    # Every counter/reflect/skill-replacement/non-trivial-targeting skill now
    # has a dedicated test (tests/test_first_creation_targeting_contracts.py
    # closed the last 11 targeting gaps). Pinned at 0 rather than left open,
    # so a newly added skill with one of these mechanics fails loudly here
    # instead of silently shipping without a dedicated test.
    result = run_audit()
    gaps = result["special_mechanic_coverage"]["findings"]
    assert gaps == [], gaps
