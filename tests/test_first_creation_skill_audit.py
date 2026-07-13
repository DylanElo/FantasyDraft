from jjk_arena.battle_v2.skill_audit import run_audit


def test_all_78_first_creation_skills_pass_structural_completeness():
    result = run_audit()
    assert result["total_skills"] == 78
    assert result["total_characters"] == 19
    assert result["structural_completeness"]["flagged_count"] == 0, result["structural_completeness"]["findings"]


def test_counter_and_replacement_mechanics_have_dedicated_test_coverage():
    result = run_audit()
    gaps = result["special_mechanic_coverage"]["findings"]
    uncovered_mechanic_kinds = {
        mechanic
        for finding in gaps
        for mechanic in finding["mechanics"]
        if mechanic in {"counter", "reflect", "skill_replacement"}
    }
    assert not uncovered_mechanic_kinds, gaps
