from jjk_arena.battle_v2.skill_audit import run_audit
from jjk_arena.battle_v2.starter_roster import FIRST_CREATION_ROSTER, FIRST_CREATION_SKILLS_BY_ID


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


def test_all_first_creation_condition_payload_keys_are_registered():
    result = run_audit()["grammar_vocabulary_drift"]
    assert result["condition_spec_mechanism_total_uses_across_all_78_skills"] == 0
    assert result["conditional_payload_keys_used_but_unregistered"] == []
    assert set(result["canonical_condition_payload_vocabulary_in_use"]) == set(
        result["conditional_payload_schema_keys"]
    )


def test_audited_first_creation_descriptions_match_authoritative_effects_exactly():
    expected_text = {
        "fc_yuji_itadori_black_flash_attempt": (
            "Deal 35 damage. Against a Stunned, Exposed, or Soul Bruised target, "
            "also deal 10 piercing damage and gain Momentum for First Creation mission progress."
        ),
        "fc_mai_zenin_revolver_shot": (
            "Deal 20 normal damage. Hidden Bullet adds 20 piercing damage, then is consumed."
        ),
        "fc_mai_zenin_rubber_round_feint": (
            "For 2 turns, reduce one enemy's Taijutsu damage by 20. "
            "If they target Mai while affected, they become Exposed."
        ),
        "fc_mai_zenin_construction_hidden_bullet": (
            "Mai gains Hidden Bullet for 3 turns. Her next Revolver Shot deals an additional "
            "20 piercing damage, then consumes Hidden Bullet. Mai takes 5 soul damage."
        ),
        "fc_kasumi_miwa_simple_domain_batto_stance": (
            "Until Miwa's next turn, she gains 20 damage reduction, counters the first harmful "
            "melee skill targeting her, and marks its caster with Quick Draw Wound."
        ),
        "fc_kokichi_muta_mechamaru_withdraw_signal": (
            "For 2 turns, Mechamaru cannot be targeted by harmful enemy skills and has "
            "10 destructible defense."
        ),
        "fc_junpei_yoshino_moon_dregs_sting": (
            "Deal 15 soul damage and apply Poison, which deals 10 soul damage at the end of "
            "each of the target's next 2 turns."
        ),
        "fc_satoru_gojo_young_six_eyes_read": (
            "Choose one enemy. If they use a harmful Jujutsu-class skill on their next turn, "
            "Gojo gains 1 random core energy and his next damaging skill deals +10 damage."
        ),
    }

    assert {
        skill_id: FIRST_CREATION_SKILLS_BY_ID[skill_id].text
        for skill_id in expected_text
    } == expected_text
    assert FIRST_CREATION_ROSTER["yuji_itadori"].state == "Soul Bruise / Momentum milestone"


def test_every_first_creation_effect_type_is_in_the_documented_vocabulary():
    result = run_audit()["grammar_vocabulary_drift"]
    assert result["effect_types_used_but_undocumented"] == []
