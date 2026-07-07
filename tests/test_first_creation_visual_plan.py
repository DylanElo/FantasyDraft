from pathlib import Path


def test_first_creation_visual_qa_plan_lists_required_surfaces():
    plan = Path("docs/first_creation_visual_qa.md").read_text(encoding="utf-8")

    assert "Battle v2 lobby" in plan
    assert "First creation setup" in plan
    assert "Character details" in plan
    assert "Battle HUD" in plan
    assert "Playwright" in plan
