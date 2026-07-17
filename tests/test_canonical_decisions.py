from pathlib import Path

from jjk_arena.battle_v2.starter_roster import first_creation_catalog


ROOT = Path(__file__).resolve().parents[1]


def test_locked_damage_and_anti_domain_decisions_do_not_regress_to_open_markers():
    canonical = [
        ROOT / "AGENTS.md",
        ROOT / "jjk_arena" / "battle_v2" / "AGENTS.md",
        ROOT / "docs" / "CODEX_PROJECT_MEMORY.md",
        ROOT / "docs" / "decisions" / "battle_v2_damage_reduction.md",
        ROOT / "docs" / "decisions" / "battle_v2_anti_domain.md",
    ]
    combined = "\n".join(path.read_text(encoding="utf-8").lower() for path in canonical)
    forbidden = (
        "exact choice between per-hit and turn-aggregate fixed damage reduction remains an open",
        "open damage-reduction decision",
        "this remains an explicit open design decision",
    )
    assert not any(marker in combined for marker in forbidden)
    assert "turn-aggregate budget" in combined
    assert "universal automatic conversion rule" in combined


def test_kit_grammar_matches_locked_first_creation_roster_and_skill_count():
    expected_ids = [
        "yuji_itadori", "megumi_fushiguro", "nobara_kugisaki", "maki_zenin",
        "toge_inumaki", "panda", "aoi_todo", "noritoshi_kamo",
        "momo_nishimiya", "mai_zenin", "kasumi_miwa", "kokichi_muta_mechamaru",
        "junpei_yoshino", "satoru_gojo_young", "suguru_geto_young",
        "shoko_ieiri_young", "utahime_iori_young", "mei_mei_young",
        "yuta_okkotsu_jjk0",
    ]
    catalog = first_creation_catalog()
    grammar = (ROOT / "docs" / "jjk_kit_grammar.md").read_text(encoding="utf-8")

    assert list(catalog) == expected_ids
    assert sum(len(character["skills"]) for character in catalog.values()) == 78
    assert "exactly 19 starter characters and 78 skills" in grammar
    for character in catalog.values():
        assert character["name"] in grammar
    assert "First six:\n\n- Yuji Itadori" not in grammar
