from pathlib import Path


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
