import json
import shutil
import subprocess
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
QUEUE_SCENE = ROOT / "web/static/phaser/scenes/combat-queue-review-scene.js"


def test_queue_review_is_a_dedicated_touch_first_order_editor():
    source = QUEUE_SCENE.read_text(encoding="utf-8")
    combat = (ROOT / "web" / "static" / "phaser" / "scenes" / "combat-scene.js").read_text(encoding="utf-8")

    # Queue Review expands the storyboard over the lower 35% and leaves the
    # authoritative battlefield visible behind it.
    assert "const sheetY = frame.bottom - sheetH;" in source
    assert "this.graphics.fillRect(layout.sheetX, layout.sheetY, layout.sheetW, layout.sheetH);" in source
    assert "const actions = this.store.actions.slice(0, 3);" in source
    assert "this.renderQueueActionCard(action, index, actions.length" in source
    assert "x: cardsX + index * (cardW + cardGap)" in source
    assert "'Queue Review Battlefield Lock'" in source

    assert "'FINAL ORDER'" in source
    assert "actions.map((_, index) => index + 1).join(' > ')" in source
    assert "if (count > 1) drawCurrentButton" in source
    assert "'ENERGY  NOW > AFTER'" in source
    assert "SKILL_ART_BY_ENERGY" in source
    assert "this.coverImage(artKey" in source
    assert "this.renderIntegratedSkillArtwork(meta.skill" in source
    assert "this.renderEnergyCommitment(frame, layout, queueFit)" in source
    assert "this.renderCostOrbs" in source
    assert "this.renderWildPayments" in source
    assert "const textW = Math.max(96, controlsX - textX - 6);" in source
    assert "renderTargetLane', { selectedSkill: null }" in combat
    assert "renderSelectedFighter', { character: null }" in combat
    assert "if (!resolutionPlayback)" in combat


def test_queue_command_deck_preserves_order_payment_and_validation_controls():
    source = QUEUE_SCENE.read_text(encoding="utf-8")

    assert "queueFit.actionId === action.id" in source
    assert "this.store.cycleWildcardPay(action.id, wildIndex)" in source
    assert "this.store.moveQueuedAction(action.id, -1)" in source
    assert "this.store.moveQueuedAction(action.id, 1)" in source
    assert "meta.secondaryRoute" in source
    assert "meta.alternateRoute" in source
    assert "meta.classes.slice(0, 2)" in source
    assert "meta.cooldown" in source
    assert "meta.targetLabel" in source
    assert "meta.summary" in source
    assert "this.store.closeQueueReview()" in source
    assert "this.store.cancelQueue()" in source
    assert "this.store.confirmQueue()" in source
    assert "'CONFIRM QUEUE'" in source
    assert "subtitle: 'SERVER VALIDATES'" in source
    assert "disabled: this.store.queueSubmitting || !queueFit.ok" in source


def test_empty_combat_timeline_accepts_the_store_state_snapshot():
    node = shutil.which("node")
    if not node:
        pytest.skip("Node.js is required for Phaser runtime verification.")

    script = """
globalThis.Phaser = { Scene: class {} };
const { renderMiniTimeline } = await import('./web/static/phaser/scenes/combat-skill-deck.js');
const chain = { setOrigin() { return this; } };
renderMiniTimeline.call({
  store: { state: { phase: 'planning' }, actions: [], me() { return null; }, foe() { return null; } },
  graphics: {
    fillStyle() {}, fillPoints() {}, lineStyle() {}, strokePoints() {},
  },
  mono() { return chain; },
}, {}, { contentX: 8, contentW: 344, timelineY: 72, timelineH: 48 });
"""
    subprocess.run(
        [node, "--input-type=module", "-e", script],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )


def test_combat_fighter_plate_uses_the_store_caster_selection_api():
    source = (ROOT / "web/static/phaser/scenes/combat-fighter-field.js").read_text(encoding="utf-8")
    assert "store.selectCaster(slot)" in source
    assert "store.selectFighter(slot)" not in source


def test_combat_skill_card_selects_the_authoritative_skill_id():
    source = (ROOT / "web/static/phaser/scenes/combat-skill-deck.js").read_text(encoding="utf-8")
    assert "this.store.selectSkill(skill.id)" in source
    assert "this.store.selectSkill(index)" not in source


@pytest.mark.parametrize(
    ("width", "height"),
    ((360, 800), (390, 844), (430, 932)),
)
def test_queue_order_editor_uses_full_phone_width_and_safe_footer(width, height):
    node = shutil.which("node")
    if not node:
        pytest.skip("Node.js is required for Phaser layout verification.")

    script = f"""
globalThis.Phaser = {{ Scene: class {{ constructor() {{}} }} }};
const {{ CombatScene }} = await import('./web/static/phaser/scenes/combat-scene.js');
const scene = new CombatScene();
const frame = {{ x: 0, width: {width}, height: {height}, top: 10, bottom: {height - 14} }};
const battle = scene.combatLayout(frame);
const queue = scene.queueReviewLayout(frame);
console.log(JSON.stringify({{ frame, battle, queue }}));
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
    battle = data["battle"]
    queue = data["queue"]

    assert battle["cardW"] >= 105
    assert 118 <= battle["cardH"] <= 126
    assert queue["sheetY"] == frame["bottom"] - queue["sheetH"]
    assert queue["sheetH"] <= (frame["bottom"] - frame["top"]) * 0.35 + 1
    assert queue["sheetW"] == frame["width"]
    assert queue["cardsY"] < queue["cardsBottom"]
    three_panel_width = (queue["sheetW"] - 16 - 10) / 3
    assert three_panel_width >= 105
    assert queue["cardsBottom"] - queue["cardsY"] >= 150
    assert queue["footerH"] >= 52
    assert queue["footerY"] + queue["footerH"] == frame["bottom"]
