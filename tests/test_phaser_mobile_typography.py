import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCENE_PATHS = (
    ROOT / "web/static/phaser/scenes/first-creation-scene.js",
    ROOT / "web/static/phaser/scenes/combat-scene.js",
    ROOT / "web/static/phaser/scenes/combat-queue-review-scene.js",
)


def _source(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _assert_nearby_size(source: str, marker: str, minimum: int, window: int = 700) -> None:
    start = source.index(marker)
    nearby = source[start : start + window]
    sizes = [int(value) for value in re.findall(r"fontSize:[^\n]*?['\"](\d+)px['\"]", nearby)]
    assert sizes, f"No literal font size found near {marker!r}"
    assert sizes[0] >= minimum, f"{marker!r} renders at {sizes[0]}px; expected at least {minimum}px"


def test_primary_mobile_flows_have_no_seven_eight_or_nine_pixel_text() -> None:
    tiny = re.compile(r"fontSize:\s*['\"](?:7|8|9)px['\"]")
    for path in SCENE_PATHS:
        assert not tiny.search(_source(path)), f"Sub-10px player-facing text remains in {path.name}"


def test_critical_combat_and_queue_state_stays_at_readable_mobile_sizes() -> None:
    combat = _source(SCENE_PATHS[1])
    queue = _source(SCENE_PATHS[2])
    creation = _source(SCENE_PATHS[0])

    for marker in (
        "safeText(state.phase || 'PLANNING')",
        "urgent ? 'HURRY' : 'TIME'",
        "stateLabel, {",
        "fighterName, {",
        "hpLabel, {",
        "state.reason, {",
        "this.store.targetLabel(skill).toUpperCase()",
        "`1 / CHOOSE SACRIFICE",
        "ENERGY_NAMES[color].toUpperCase()",
        "`RESULT  ${selectedCount}/5 SPENT",
    ):
        _assert_nearby_size(combat, marker, 12)

    for marker in (
        "'POOL / AFTER'",
        "rowError || routeParts.join",
        "'LEFT > RIGHT / READY' : 'PAYMENT INVALID'",
        "fontSize: confirmW",
    ):
        _assert_nearby_size(queue, marker, 12)

    _assert_nearby_size(creation, "targetRule.flags", 12)


def test_character_study_tactical_identity_wraps_inside_small_phone_cards() -> None:
    creation = _source(SCENE_PATHS[0])
    marker = "const tacticalIdentity = this.mono"
    detail = creation[creation.index(marker) : creation.index(marker) + 700]

    assert "const identityH = 126;" in creation
    assert "wordWrap: { width: region.w - 28 }" in detail
    assert "tacticalIdentity.setMaxLines(2);" in detail
    _assert_nearby_size(creation, marker, 12)


def test_disabled_skill_reason_keeps_four_readable_lines_on_narrow_cards() -> None:
    combat = _source(SCENE_PATHS[1])
    marker = "if (state.disabled) {"
    reason = combat[combat.index(marker) : combat.index(marker) + 700]

    assert "fillRect(x + 2, reasonY, w - 4, 61)" in reason
    assert "reasonNode.setMaxLines(4);" in reason
    _assert_nearby_size(combat, "const reasonNode = this.text", 12)


def test_replay_ticker_uses_its_own_lane_below_the_battlefield_prompt() -> None:
    combat = _source(SCENE_PATHS[1])
    marker = "renderReplayLine(frame, layout) {"
    replay = combat[combat.index(marker) : combat.index(marker) + 1100]

    assert "layout.fieldTop + 30" in replay
    assert "fillRect(frame.x + (frame.width - replayW) / 2, replayY, replayW, 18)" in replay
    assert "this.mono(frame.x + frame.width / 2, layout.fieldTop + 3," not in replay


def test_queue_order_marks_clear_the_ally_state_chip_band() -> None:
    combat = _source(SCENE_PATHS[1])

    assert "this.renderQueueMarks(frame, layout, layout.fieldBottom - 42);" in combat
    assert "this.renderQueueMarks(frame, layout, layout.fieldBottom - 13);" not in combat
