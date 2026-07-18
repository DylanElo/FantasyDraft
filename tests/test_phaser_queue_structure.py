import json
import shutil
import subprocess
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
QUEUE_SCENE = ROOT / "web/static/phaser/scenes/combat-queue-review-scene.js"


def test_queue_review_is_an_illustrated_command_deck_on_the_battlefield():
    source = QUEUE_SCENE.read_text(encoding="utf-8")
    combat = (ROOT / "web" / "static" / "phaser" / "scenes" / "combat-scene.js").read_text(encoding="utf-8")

    # Queue Review keeps the spatial battle context and replaces only the
    # lower command dock with the final left-to-right action deck.
    assert "this.renderBattlefield(frame, layout.battle" in source
    assert "this.renderFighterLane(me && me.team, 'mine'" in source
    assert "const actions = this.store.actions.slice(0, 3);" in source
    assert "this.renderQueueActionCard(action, index, actions.length" in source
    assert "const cardW = (cardsW - cardGap * Math.max(0, actions.length - 1)) / actions.length;" in source
    assert "'Queue Review Battlefield Lock'" in source
    assert "fillRect(0, 0, frame.fullWidth" not in source

    assert "'FINAL ORDER'" in source
    assert "'LEFT > RIGHT / READY'" in source
    assert "SKILL_ART_BY_ENERGY" in source
    assert "this.coverImage(artKey" in source
    assert "this.renderIntegratedSkillArtwork(meta.skill" in source
    assert "this.renderEnergyCommitment(frame, layout, queueFit)" in source
    assert "this.renderCostOrbs" in source
    assert "this.renderWildPayments" in source
    assert "drawCurrentPanel(this, layout.sheetX" not in source
    assert "one\n      // torn paper plane" in source
    assert "renderTargetLane', { selectedSkill: null }" in combat
    assert "renderSelectedFighter', { character: null }" in combat


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


@pytest.mark.parametrize(
    ("width", "height"),
    ((360, 800), (390, 844), (430, 932)),
)
def test_queue_command_deck_fits_below_six_large_fighter_cards(width, height):
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

    ally_bottom = battle["allyY"] + battle["cardH"]
    three_card_width = (queue["sheetW"] - 16 - 12) / 3

    assert battle["cardW"] >= 107
    assert battle["cardH"] >= 118
    assert ally_bottom < queue["sheetY"] <= battle["dockY"]
    assert queue["cardsY"] < queue["cardsBottom"]
    assert queue["cardH"] >= 132
    assert three_card_width >= 110
    assert queue["footerH"] >= 44
    assert queue["footerY"] + queue["footerH"] == frame["bottom"]
