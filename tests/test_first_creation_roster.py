from jjk_arena.battle_v2.models import EnergyType, SkillClass
from jjk_arena.battle_v2.starter_roster import (
    FIRST_CREATION_AVAILABILITY,
    FIRST_CREATION_CHARACTER_IDS,
    FIRST_CREATION_CHARACTER_NAMES,
    FIRST_CREATION_ERA,
    FIRST_CREATION_LOCKED_VARIANTS,
    FIRST_CREATION_PRESETS,
    FIRST_CREATION_ROSTER,
    FIRST_CREATION_SKILLS_BY_ID,
    FIRST_CREATION_TAGS,
    GENERATED_ENERGY_TYPES,
    WILDCARD_COST_TYPE,
    first_creation_catalog,
    first_creation_metadata,
    first_creation_payload,
    validate_first_creation_team,
)


def test_first_creation_roster_is_student_era_plus_hidden_inventory_and_jjk0():
    assert len(FIRST_CREATION_CHARACTER_IDS) == 19
    assert FIRST_CREATION_CHARACTER_IDS[:3] == (
        "yuji_itadori",
        "megumi_fushiguro",
        "nobara_kugisaki",
    )
    assert FIRST_CREATION_CHARACTER_NAMES["satoru_gojo_young"] == "Satoru Gojo (Young)"
    assert FIRST_CREATION_CHARACTER_NAMES["yuta_okkotsu_jjk0"] == "Yuta Okkotsu (JJK 0)"
    assert FIRST_CREATION_AVAILABILITY == "starter"
    assert FIRST_CREATION_ERA == "student_era"


def test_first_creation_roster_has_real_character_specs_and_skill_contracts():
    assert tuple(FIRST_CREATION_ROSTER) == FIRST_CREATION_CHARACTER_IDS
    assert len(FIRST_CREATION_SKILLS_BY_ID) >= 19 * 4

    replacement_skill_ids = {
        "fc_suguru_geto_young_compressed_uzumaki",
        "fc_yuta_okkotsu_jjk0_cursed_speech_megaphone",
    }
    assert replacement_skill_ids <= set(FIRST_CREATION_SKILLS_BY_ID)

    for character_id, character in FIRST_CREATION_ROSTER.items():
        assert character.availability == "starter"
        assert character.era == "student_era"
        assert character.tags == list(FIRST_CREATION_TAGS[character_id])
        assert len(character.skills) >= 4
        primary_skills = character.skills[:4]
        assert all(skill.id.startswith(f"fc_{character_id}_") for skill in character.skills)
        assert all(skill.name and skill.text for skill in primary_skills)
        assert all(skill.target_rule.kind for skill in primary_skills)
        assert all(SkillClass.DOMAIN not in skill.classes for skill in character.skills)


def test_first_creation_excludes_endgame_and_mission_unlock_variants():
    starter_ids = set(FIRST_CREATION_CHARACTER_IDS)
    assert "mahito" not in starter_ids
    assert "higuruma" not in starter_ids
    assert "ryomen_sukuna" not in starter_ids
    assert "yuta_okkotsu" not in starter_ids
    assert "gojo_adult" in FIRST_CREATION_LOCKED_VARIANTS
    assert "yuta_sendai" in FIRST_CREATION_LOCKED_VARIANTS
    assert "heian_sukuna" in FIRST_CREATION_LOCKED_VARIANTS


def test_first_creation_presets_are_three_character_starter_teams():
    starter_ids = set(FIRST_CREATION_CHARACTER_IDS)
    assert FIRST_CREATION_PRESETS["story_tutorial"] == (
        "yuji_itadori",
        "megumi_fushiguro",
        "nobara_kugisaki",
    )
    for preset in FIRST_CREATION_PRESETS.values():
        assert len(preset) == 3
        assert set(preset) <= starter_ids
        assert validate_first_creation_team(preset) == (True, "")


def test_first_creation_rejects_locked_or_invalid_teams():
    valid, reason = validate_first_creation_team(["yuji_itadori", "yuji_itadori", "nobara_kugisaki"])
    assert valid is False
    assert "duplicate" in reason

    valid, reason = validate_first_creation_team(["yuji_itadori", "megumi_fushiguro", "mahito"])
    assert valid is False
    assert "Locked or unknown" in reason

    valid, reason = validate_first_creation_team(["yuji_itadori", "megumi_fushiguro"])
    assert valid is False
    assert "exactly 3" in reason


def test_first_creation_tags_cover_required_eras_and_roles():
    all_tags = {tag for tags in FIRST_CREATION_TAGS.values() for tag in tags}
    assert {"tokyo_student", "kyoto_student", "hidden_inventory", "jjk0", "outsider"} <= all_tags
    assert {"support", "control", "bruiser", "mark", "healer", "counter"} <= all_tags
    assert set(FIRST_CREATION_TAGS) == set(FIRST_CREATION_CHARACTER_IDS)


def test_first_creation_metadata_catalog_payload_and_energy_contract():
    metadata = first_creation_metadata("junpei_yoshino")
    assert metadata["availability"] == "starter"
    assert metadata["era"] == "student_era"
    assert "outsider" in metadata["tags"]

    catalog = first_creation_catalog()
    assert catalog["junpei_yoshino"]["skills"][0]["name"] == "Moon Dregs Sting"
    assert catalog["satoru_gojo_young"]["skills"][0]["name"] == "Lapse Blue"
    assert catalog["yuta_okkotsu_jjk0"]["skills"][2]["name"] == "Rika's Curse"

    payload = first_creation_payload()
    assert payload["availability"] == "starter"
    assert payload["era"] == "student_era"
    assert payload["presets"]["story_tutorial"] == ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"]
    assert payload["wildcard_cost_type"] == EnergyType.BLACK.value
    assert payload["missions"][0]["id"] == "welcome_to_jujutsu_high"
    assert "mahito_intro_mission" in payload["missions"][-1]["unlocks"]
    assert any(unlock["id"] == "mission_board" for unlock in payload["unlock_registry"])
    assert WILDCARD_COST_TYPE == EnergyType.BLACK
    assert EnergyType.BLACK not in GENERATED_ENERGY_TYPES
