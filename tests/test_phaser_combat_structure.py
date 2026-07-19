import json
import shutil
import subprocess
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
COMBAT_SCENE = ROOT / "web/static/phaser/scenes/combat-scene.js"


def test_combat_scene_is_a_battlefield_composition_not_the_old_dashboard():
    source = COMBAT_SCENE.read_text(encoding="utf-8")

    assert "const cardW = (contentW - gap * 2) / 3;" in source
    assert "(team || []).slice(0, 3).forEach" in source
    assert "const identityW = clamp(Math.round(frame.width * 0.245), 86, 106);" in source
    assert "const skillW = (skillRight - skillX - skillGap * 3) / 4;" in source
    assert "this.store.skillsFor(selected).slice(0, 4)" in source
    assert "renderFighterLane(foe && foe.team, 'enemy'" in source
    assert "renderFighterLane(me && me.team, 'mine'" in source
    assert "renderBattlefield(frame, layout, prompt)" in source
    assert "renderIdentityStrip(frame, layout, selected)" in source
    assert "renderBottomActions(frame, layout)" in source
    assert "REVIEW ${this.store.actions.length}/3" in source
    assert "identityArtH = layout.identityH + layout.skillH" in source
    assert "context: 'hero'" in source
    assert "'SELECTED FIGHTER'" in source
    assert "'ORDER / WILD / CONFIRM'" in source

    # Regression guards for removed dashboard/dock traces. Fighter art and the
    # open targeting lane carry hierarchy without lane-header prompt panels.
    assert "index % 2" not in source
    assert "Math.floor(index / 2)" not in source
    assert "CLEAR QUEUE" not in source
    assert "gridY" not in source
    assert "'ENEMY TEAM'" not in source
    assert "'YOUR FIELD'" not in source


def test_combat_scene_preserves_authoritative_state_affordances():
    source = COMBAT_SCENE.read_text(encoding="utf-8")

    assert "store.canTarget(character, slot, side)" in source
    assert "store.targetBlocksSkill(character, selectedSkill)" in source
    assert "this.store.pendingPrimaryTarget" in source
    assert "secondary_target_slot" in source
    assert "alternate_target_player_id" in source
    assert "action.target_slots" in source
    assert "this.store.adjustedCost(caster, skill)" in source
    assert "ENERGY_LABELS[color] || 'X'" in source
    assert "skill.effective_skill_id" in source
    assert "status.revealed" in source
    assert "status.invisible" in source
    assert "this.store.openSkillDetail(skill.id)" in source
    assert "this.store.openQueueReview()" in source
    assert "this.store.cancelQueue()" in source
    assert "this.store.endTurn()" in source
    assert "this.store.convertEnergy()" in source
    assert "state.phase_seconds_remaining" in source

    # X remains a cost mark. Only T/J/S/B are rendered in the stored pool,
    # and the meter must inherit the centralized vocabulary instead of
    # hard-coding a second label map.
    assert "CORE_ENERGY.map((color) => ({ color, label: ENERGY_LABELS[color] }))" in source
    assert "{ color: 'green', label: 'B' }" not in source
    assert "{ color: 'blue', label: 'T' }" not in source
    assert "{ color: 'white', label: 'F' }" not in source
    assert "{ color: 'red', label: 'C' }" not in source
    assert "{ color: 'black', label: 'X' }" not in source


def test_combat_skill_hand_uses_the_shipping_season_three_art():
    source = COMBAT_SCENE.read_text(encoding="utf-8")

    assert "green: 's3-skill-body'" in source
    assert "blue: 's3-skill-technique'" in source
    assert "white: 's3-skill-focus'" in source
    assert "red: 's3-skill-curse'" in source
    assert "this.coverImage(textureKey" in source
    assert "context: 'hero'" in source
    assert "skill.description || this.store.effectLine(skill)" in source
    assert "const classTag = (skill.classes || [])" not in source
    assert "const compactSummary = this.store.effectLine(skill)" not in source
    assert "if (state.disabled)" in source
    assert "state.reason" in source
    assert "TAP AGAIN / INFO" in source
    assert "this.renderIntegratedSkillArtwork(skill" in source
    assert "layer.skillVisualFor(skill" in source
    assert "'planning-card'" in source
    assert "`QUEUED Q${state.queuedIndex + 1}`" in source
    assert "if (selected || state.disabled) this.store.openSkillDetail(skill.id);" in source


@pytest.mark.parametrize(
    ("width", "height"),
    ((360, 800), (390, 844), (430, 932)),
)
def test_combat_layout_regions_fit_target_phones(width, height):
    node = shutil.which("node")
    if not node:
        pytest.skip("Node.js is required for Phaser layout verification.")

    script = f"""
globalThis.Phaser = {{ Scene: class {{ constructor() {{}} }} }};
const {{ CombatScene }} = await import('./web/static/phaser/scenes/combat-scene.js');
const scene = new CombatScene();
const frame = {{ x: 0, width: {width}, height: {height}, top: 10, bottom: {height - 14} }};
const layout = scene.combatLayout(frame);
console.log(JSON.stringify({{ frame, layout }}));
"""
    result = subprocess.run(
        [node, "--input-type=module", "-e", script],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    data = json.loads(result.stdout)
    frame = data["frame"]
    layout = data["layout"]

    enemy_bottom = layout["enemyY"] + layout["cardH"]
    ally_bottom = layout["allyY"] + layout["cardH"]
    identity_bottom = layout["identityY"] + layout["identityH"]
    skills_bottom = layout["skillY"] + layout["skillH"]
    review_bottom = layout["reviewY"] + layout["reviewH"]
    cards_right = layout["contentX"] + layout["cardW"] * 3 + layout["gap"] * 2
    skills_right = layout["skillX"] + layout["skillW"] * 4 + layout["skillGap"] * 3

    assert frame["top"] + layout["topH"] < layout["enemyY"]
    assert enemy_bottom < layout["allyY"]
    assert layout["fieldTop"] < layout["fieldBottom"]
    assert layout["fieldH"] >= 96
    assert ally_bottom < layout["identityY"]
    assert identity_bottom == layout["skillY"]
    assert skills_bottom < layout["reviewY"]
    assert review_bottom <= frame["bottom"]

    # The six fighters and four illustrated techniques are presentation cards,
    # not token-sized legacy dashboard controls.
    assert layout["cardW"] >= 107
    assert layout["cardH"] >= 118
    assert layout["skillW"] >= 64
    assert layout["skillH"] >= 158
    assert 86 <= layout["identityW"] <= 106
    assert layout["identityH"] >= 48
    assert layout["reviewH"] >= 44
    assert cards_right <= frame["width"] - 10 + 0.01
    assert skills_right <= frame["width"] - 8 + 0.01


def test_combat_layout_survives_large_safe_area_insets():
    node = shutil.which("node")
    if not node:
        pytest.skip("Node.js is required for Phaser layout verification.")

    script = """
globalThis.Phaser = { Scene: class { constructor() {} } };
const { CombatScene } = await import('./web/static/phaser/scenes/combat-scene.js');
const scene = new CombatScene();
const cases = [[360, 800], [390, 844], [430, 932]].map(([width, height]) => {
  const frame = { x: 0, width, height, top: 57, bottom: height - 44 };
  return { frame, layout: scene.combatLayout(frame) };
});
console.log(JSON.stringify(cases));
"""
    result = subprocess.run(
        [node, "--input-type=module", "-e", script],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    for entry in json.loads(result.stdout):
        frame = entry["frame"]
        layout = entry["layout"]
        assert layout["enemyY"] >= frame["top"] + layout["topH"]
        assert layout["enemyY"] + layout["cardH"] < layout["allyY"]
        assert layout["allyY"] + layout["cardH"] < layout["identityY"]
        assert layout["identityY"] + layout["identityH"] == layout["skillY"]
        assert layout["skillY"] + layout["skillH"] < layout["reviewY"]
        assert layout["reviewY"] + layout["reviewH"] <= frame["bottom"]
