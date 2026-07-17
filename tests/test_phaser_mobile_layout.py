import json
import math
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_mobile_layout_regions_remain_inside_supported_viewports():
    script = r"""
globalThis.window = globalThis;
globalThis.JJK_BOOT = {};
await import('./web/static/phaser-design-tokens.js');
const { LayoutService } = await import('./web/static/phaser/core/layout-service.js');
const { TOKEN_TOUCH } = await import('./web/static/phaser/core/runtime-config.js');
const sizes = [[360, 800], [390, 844], [430, 932]];
const layouts = sizes.map(([width, height]) => {
  const service = new LayoutService({ scale: { width, height } });
  return { width, height, frame: service.frame(), hud: service.topHud(), enemy: service.enemyLane(), center: service.centerStage(), ally: service.allyLane(), dock: service.commandDock() };
});
const scaledDisplay = new LayoutService({ scale: { width: 488, height: 1055 }, game: { canvas: { clientWidth: 390, clientHeight: 844 } } }).frame();
globalThis.document = { documentElement: {} };
globalThis.getComputedStyle = () => ({ getPropertyValue: (name) => name === '--jjk-safe-top' ? '47px' : name === '--jjk-safe-bottom' ? '34px' : '0px' });
const safeLayouts = sizes.map(([width, height]) => {
  const service = new LayoutService({ scale: { width, height } });
  return { width, height, frame: service.frame(), hud: service.topHud(), enemy: service.enemyLane(), dock: service.commandDock() };
});
console.log(JSON.stringify({ layouts, safeLayouts, scaledDisplay, minTarget: TOKEN_TOUCH.minTarget }));
"""
    result = subprocess.run(
        ["node", "--experimental-default-type=module", "-"],
        input=script,
        text=True,
        capture_output=True,
        cwd=ROOT,
        check=True,
    )
    probe = json.loads(result.stdout)
    assert probe["minTarget"] >= 44
    assert probe["scaledDisplay"]["width"] == 390
    assert probe["scaledDisplay"]["height"] == 844
    for layout in probe["layouts"]:
        assert layout["frame"]["width"] <= layout["width"]
        assert layout["frame"]["top"] == 10
        assert layout["frame"]["bottom"] == layout["height"] - 14
        assert layout["hud"]["y"] >= 0
        assert layout["enemy"]["y"] + layout["enemy"]["height"] <= layout["center"]["y"] + 55
        assert layout["center"]["height"] >= 88
        assert layout["ally"]["y"] + layout["ally"]["height"] <= layout["dock"]["y"] + 60
        assert layout["dock"]["y"] + layout["dock"]["height"] == layout["frame"]["bottom"]
    for layout in probe["safeLayouts"]:
        assert layout["frame"]["safeTop"] == 47
        assert layout["frame"]["safeBottom"] == 34
        assert layout["frame"]["top"] == 57
        assert layout["frame"]["bottom"] == layout["height"] - 44
        assert layout["hud"]["y"] >= layout["frame"]["top"]
        assert layout["enemy"]["y"] >= layout["frame"]["top"]
        assert layout["dock"]["y"] + layout["dock"]["height"] == layout["frame"]["bottom"]


def _safe_frame(width, height, safe_top=0, safe_bottom=0):
    return {
        "width": width,
        "height": height,
        "top": max(10, safe_top + 10),
        "bottom": height - max(14, safe_bottom + 10),
    }


def _first_creation_geometry(frame):
    usable = frame["bottom"] - frame["top"]
    compact = True  # all three supported phone widths are non-desktop
    y = frame["top"] + 68 + 8
    y += 118  # mission header
    y += 100  # trio slots
    if usable >= 740:
        preset_page_size = 2 if compact else 4
        y += 38 + math.ceil(preset_page_size / 2) * 100 + 8
    card_gap = 10 if compact else 12
    card_height = 132
    roster_top = y + (18 if compact else 22)
    cta_y = frame["bottom"] - 46
    nav_y = cta_y - (8 if compact else 10) - 44
    rows_that_fit = max(0, math.floor((nav_y - roster_top + card_gap) / (card_height + card_gap)))
    rows = min(2 if frame["width"] >= 430 else 1, rows_that_fit)
    return {"rows": rows, "card_top": roster_top, "card_height": card_height, "card_gap": card_gap, "nav_y": nav_y, "cta_y": cta_y}


def _draft_geometry(frame):
    usable = frame["bottom"] - frame["top"]
    compact = usable < 760
    y = frame["top"] + 68 + 8
    if usable >= 850:
        y += 96
    if usable >= 720:
        y += 198 if compact else 204
    else:
        y += 74  # compact CPU difficulty row; preset shortcuts are omitted
    y += 150 + (12 if compact else 16)
    y += 44 + (10 if compact else 14)
    card_gap = 8 if compact else 12
    card_height = 132
    roster_top = y + (20 if compact else 26)
    cta_y = frame["bottom"] - 44
    nav_y = cta_y - (8 if compact else 10) - 44
    rows = max(0, math.floor((nav_y - roster_top + card_gap) / (card_height + card_gap)))
    return {"rows": rows, "card_top": roster_top, "card_height": card_height, "card_gap": card_gap, "nav_y": nav_y}


def test_roster_cards_and_detail_cta_fit_normal_and_safe_phone_frames():
    expected_creation_entries = {360: 2, 390: 2, 430: 4}
    for safe_top, safe_bottom in ((0, 0), (47, 34)):
        for width, height in ((360, 800), (390, 844), (430, 932)):
            frame = _safe_frame(width, height, safe_top, safe_bottom)
            creation = _first_creation_geometry(frame)
            assert creation["rows"] * 2 == expected_creation_entries[width]
            creation_cards_bottom = creation["card_top"] + creation["rows"] * creation["card_height"] + max(0, creation["rows"] - 1) * creation["card_gap"]
            assert creation_cards_bottom <= creation["nav_y"]
            assert creation["nav_y"] + 44 <= creation["cta_y"]

            draft = _draft_geometry(frame)
            assert draft["rows"] >= 1
            draft_cards_bottom = draft["card_top"] + draft["rows"] * draft["card_height"] + max(0, draft["rows"] - 1) * draft["card_gap"]
            assert draft_cards_bottom <= draft["nav_y"]

            default_sheet_y = max(168, height * 0.34)
            sheet_y = max(150, min(default_sheet_y, frame["bottom"] - 504))
            fourth_skill_bottom = sheet_y + 452
            detail_cta_y = frame["bottom"] - 44
            assert fourth_skill_bottom + 8 <= detail_cta_y


def test_scoped_mobile_controls_and_copy_keep_accessibility_contracts():
    base = (ROOT / "web/static/phaser/scenes/base-scene.js").read_text(encoding="utf-8")
    draft = (ROOT / "web/static/phaser/scenes/draft-scene.js").read_text(encoding="utf-8")
    roster = (ROOT / "web/static/phaser/scenes/draft-roster-scene.js").read_text(encoding="utf-8")
    creation = (ROOT / "web/static/phaser/scenes/first-creation-scene.js").read_text(encoding="utf-8")
    queue = (ROOT / "web/static/phaser/scenes/combat-queue-review-scene.js").read_text(encoding="utf-8")
    combat = (ROOT / "web/static/phaser/scenes/combat-scene.js").read_text(encoding="utf-8")

    assert "const hitW = Math.max(w, minTarget);" in base
    assert "const hitH = Math.max(h, minTarget);" in base
    assert "const y = frame.top;" in base
    assert "44, 44, '<'" in base
    assert "44, 44, '×'" in base

    assert "const editH = 44;" in draft
    assert "small, 44" in draft
    assert "diffW, 44" in draft
    assert "const navH = 44;" in draft
    assert "Math.max(0, Math.floor" in draft
    assert "renderTeamSummary" in draft
    assert "shortText(safeText(character.name" not in draft

    assert "104, 44, 'Mission Map'" in creation
    assert "72, 44, `Set " in creation
    assert "const navH = 44;" in creation
    assert "Math.max(0, Math.floor" in creation

    assert "const controlSize = 44;" in queue
    assert "rowY + controlSize + 4" in queue
    assert "const rowH = 92;" in queue
    assert "shortText(meta.skill ? meta.skill.name" not in queue

    assert "92, 44, 'Transmute'" in combat
    assert "44, 44, '×'" in combat
    assert "const y = frame.top;" in combat
    assert "shortText(skill.name" not in combat
    assert "shortText((character && character.name" not in combat
    assert "fighterNameNode.setMaxLines(2);" in combat
    assert "y: y - 4," in combat

    assert "shortText(character.name" not in roster
    assert "shortText(character.role" not in roster
    assert "skillName.setMaxLines(2);" in roster
    assert "y + 52, 'TRIO'" in roster

    assert 44 + 4 + 44 <= 92
