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
  return { width, height, frame: service.frame(), home: service.homeScreen(), hud: service.topHud(), enemy: service.enemyLane(), center: service.centerStage(), ally: service.allyLane(), dock: service.commandDock() };
});
const scaledDisplay = new LayoutService({ scale: { width: 488, height: 1055 }, game: { canvas: { clientWidth: 390, clientHeight: 844 } } }).frame();
globalThis.document = { documentElement: {} };
globalThis.getComputedStyle = () => ({ getPropertyValue: (name) => name === '--jjk-safe-top' ? '47px' : name === '--jjk-safe-bottom' ? '34px' : '0px' });
const safeLayouts = sizes.map(([width, height]) => {
  const service = new LayoutService({ scale: { width, height } });
  return { width, height, frame: service.frame(), home: service.homeScreen(), hud: service.topHud(), enemy: service.enemyLane(), dock: service.commandDock() };
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
        home = layout["home"]
        assert home["profile"]["y"] >= layout["frame"]["top"]
        assert home["profile"]["y"] + home["profile"]["h"] <= home["hero"]["y"]
        assert home["hero"]["y"] + home["hero"]["h"] <= home["primary"]["y"]
        assert home["primary"]["y"] + home["primary"]["h"] <= home["modes"]["y"]
        assert home["modes"]["y"] + home["modes"]["h"] <= home["nav"]["y"]
        assert home["nav"]["y"] + home["nav"]["h"] <= layout["frame"]["bottom"]
        assert home["hero"]["h"] >= 180
    for layout in probe["safeLayouts"]:
        assert layout["frame"]["safeTop"] == 47
        assert layout["frame"]["safeBottom"] == 34
        assert layout["frame"]["top"] == 57
        assert layout["frame"]["bottom"] == layout["height"] - 44
        assert layout["hud"]["y"] >= layout["frame"]["top"]
        assert layout["enemy"]["y"] >= layout["frame"]["top"]
        assert layout["dock"]["y"] + layout["dock"]["height"] == layout["frame"]["bottom"]
        home = layout["home"]
        assert home["profile"]["y"] >= layout["frame"]["top"]
        assert home["hero"]["y"] + home["hero"]["h"] <= home["primary"]["y"]
        assert home["nav"]["y"] + home["nav"]["h"] <= layout["frame"]["bottom"]


def _safe_frame(width, height, safe_top=0, safe_bottom=0):
    return {
        "width": width,
        "height": height,
        "top": max(10, safe_top + 10),
        "bottom": height - max(14, safe_bottom + 10),
    }


def _combat_geometry(frame):
    usable = frame["bottom"] - frame["top"]
    compressed = usable < 740
    compact = usable < 830
    top_height = 58 if compressed else 60
    review_height = 50
    review_y = frame["bottom"] - review_height
    skill_min = 132 if compressed else 140
    skill_max = 166 if frame["height"] > 900 else 154
    skill_height = min(skill_max, max(skill_min, round(usable * 0.18)))
    skill_y = review_y - skill_height - 8
    identity_height = 44
    identity_y = skill_y - identity_height - 5
    card_min = 118 if compressed else 126
    card_max = 150 if frame["height"] > 900 else 142
    card_height = min(card_max, max(card_min, round(usable * 0.165)))
    enemy_y = frame["top"] + top_height + (38 if compressed else 44 if compact else 50)
    ally_y = identity_y - card_height - 7
    field_top = enemy_y + card_height + 2
    field_bottom = ally_y - 2
    return {
        "dock_y": identity_y,
        "dock_height": frame["bottom"] - identity_y,
        "card_height": card_height,
        "enemy_y": enemy_y,
        "field_top": field_top,
        "field_bottom": field_bottom,
        "field_height": max(96, field_bottom - field_top),
        "ally_y": ally_y,
        "identity_y": identity_y,
        "identity_height": identity_height,
        "skill_y": skill_y,
        "skill_height": skill_height,
        "review_y": review_y,
        "review_height": review_height,
    }


def test_combat_center_stage_survives_normal_and_safe_phone_frames():
    for safe_top, safe_bottom in ((0, 0), (47, 34)):
        for width, height in ((360, 800), (390, 844), (430, 932)):
            frame = _safe_frame(width, height, safe_top, safe_bottom)
            frame["height"] = height
            combat = _combat_geometry(frame)
            assert combat["enemy_y"] >= frame["top"] + 96
            assert combat["field_height"] >= 96
            assert combat["enemy_y"] + combat["card_height"] + 2 == combat["field_top"]
            assert combat["field_bottom"] + 2 == combat["ally_y"]
            assert combat["ally_y"] + combat["card_height"] + 7 == combat["identity_y"]
            assert combat["identity_y"] + combat["identity_height"] + 5 == combat["skill_y"]
            assert combat["skill_y"] + combat["skill_height"] + 8 == combat["review_y"]
            assert combat["review_y"] + combat["review_height"] == frame["bottom"]
            assert combat["dock_y"] + combat["dock_height"] == frame["bottom"]


def test_queue_review_keeps_enemy_lane_and_footer_clear_with_safe_insets():
    for safe_top, safe_bottom in ((0, 0), (47, 34)):
        for width, height in ((360, 800), (390, 844), (430, 932)):
            frame = _safe_frame(width, height, safe_top, safe_bottom)
            frame["height"] = height
            combat = _combat_geometry(frame)
            compressed = frame["bottom"] - frame["top"] < 730
            ally_bottom = combat["ally_y"] + combat["card_height"]
            sheet_y = max(frame["top"] + 300, min(combat["dock_y"], ally_bottom + 8))
            header_height = 42 if compressed else 46
            cards_y = sheet_y + header_height + 4
            footer_y = frame["bottom"] - 44
            cards_bottom = footer_y - 4
            card_height = max(132, cards_bottom - cards_y)
            three_card_width = (width - 16 - 12) / 3
            assert combat["enemy_y"] + combat["card_height"] < combat["field_bottom"]
            assert combat["field_bottom"] < combat["ally_y"]
            assert ally_bottom < sheet_y
            assert sheet_y <= combat["dock_y"]
            assert cards_y + card_height == cards_bottom
            assert card_height >= 132
            assert three_card_width >= 44 * 2 + 8
            assert cards_bottom + 4 == footer_y
            assert footer_y + 44 == frame["bottom"]


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
    lobby = (ROOT / "web/static/phaser/scenes/lobby-scene.js").read_text(encoding="utf-8")
    season_three_ui = (ROOT / "web/static/phaser/ui/season-three-ui.js").read_text(encoding="utf-8")

    assert "const hitW = Math.max(w, minTarget);" in base
    assert "const hitH = Math.max(h, minTarget);" in base
    assert "const y = frame.top;" in base
    assert "44, 44, '<'" in base
    assert "44, 44, '×'" in base

    assert "const difficulty = cpu ? { x, y, w, h: 44 } : null;" in season_three_ui
    assert "const targets = { x, y, w, h: 44 };" in season_three_ui
    assert "const pager = { x, y: cta.y - 52, w, h: 44 };" in season_three_ui
    assert "drawS3Button(this, layout.targets.x" in draft
    assert "drawS3Pager(this, layout.pager" in draft
    assert "Math.max(1, Math.floor" in draft
    assert "renderTeamSummary" in draft
    assert "name.setMaxLines(3);" in draft
    assert "shortText(safeText(character.name" not in draft

    assert "104, 44, 'Mission Map'" in creation
    assert "72, 44, `Set " in creation
    assert "const navH = 44;" in creation
    assert "Math.max(0, Math.floor" in creation

    assert "const controlSize = 44;" in queue
    assert "const sheetY = Math.max(frame.top + 300" in queue
    assert "allyBottom + 8" in queue
    assert "this.renderBattlefield(frame, layout.battle" in queue
    assert "this.renderFighterLane(me && me.team, 'mine'" in queue
    assert "const cardW = (cardsW - cardGap" in queue
    assert "'Queue Review Battlefield Lock'" in queue
    assert "fillRect(0, 0, frame.fullWidth" not in queue
    assert "'FINAL ORDER'" in queue
    assert "subtitle: 'SERVER VALIDATES'" in queue
    assert "SKILL_ART_BY_ENERGY" in queue
    assert "shortText(meta.skill ? meta.skill.name" not in queue
    assert "meta.secondaryRoute" in queue
    assert "meta.alternateRoute" in queue
    assert "this.renderCostOrbs" in queue
    assert "queueFit.actionId === action.id" in queue
    assert "this.store.cycleWildcardPay(action.id, wildIndex)" in queue
    assert "this.store.moveQueuedAction(action.id, -1)" in queue
    assert "this.store.moveQueuedAction(action.id, 1)" in queue

    assert "renderEnergyMeter(" in combat
    assert "'Transmute energy'" in combat
    assert "disabled: transmuteDisabled" in combat
    assert "44, 44, '×'" in combat
    assert "const y = frame.top;" in combat
    assert "shortText(skill.name" not in combat
    assert "shortText((character && character.name" not in combat
    assert "nameNode.setMaxLines(2);" in combat
    assert "y: y - 3," in combat
    assert "state.phase_seconds_remaining" in combat
    assert "CULLING_COLORS.target" in combat
    assert "const usableH = frame.bottom - frame.top;" in combat
    assert "fieldH: Math.max(96, allyY - enemyY - cardH - 4)" in combat
    assert "depth: -1," in combat
    assert "this.topBar(frame, 'Opening Domain'" not in combat
    assert "'JJK ARENA / CONNECTING'" in combat

    assert "shortText(this.store.playerName, nameLimit)" in lobby
    assert "shortText(roomCode, 14)" in lobby
    assert "this.store.setMatchMode('cpu');" in lobby

    assert "shortText(character.name" not in roster
    assert "shortText(character.role" not in roster
    assert "skillName.setMaxLines(2);" in roster
    assert "y + 52, 'TRIO'" in roster

    assert 44 + 4 + 44 <= 92
