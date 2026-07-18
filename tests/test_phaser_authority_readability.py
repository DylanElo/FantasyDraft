import json
import shutil
import subprocess
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
QUEUE_SCENE = ROOT / "web/static/phaser/scenes/combat-queue-review-scene.js"


def _run_node(script: str) -> dict:
    node = shutil.which("node")
    if not node:
        pytest.skip("Node.js is required for Phaser authority regression tests.")
    result = subprocess.run(
        [node, "--input-type=module", "-e", script],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)


def test_action_target_marks_do_not_treat_null_slots_as_slot_zero():
    probe = _run_node(
        r"""
globalThis.Phaser = { Scene: class { constructor() {} } };
const { CombatScene } = await import('./web/static/phaser/scenes/combat-scene.js');
const scene = new CombatScene();
scene.store = {
  actions: [],
  pendingPrimaryTarget: { playerId: 'enemy-player', slot: null },
  mineId: () => 'mine-player',
  enemyId: () => 'enemy-player',
};

const mark = (action, pending = null) => {
  scene.store.actions = action ? [action] : [];
  scene.store.pendingPrimaryTarget = pending;
  return scene.actionTargetMark('enemy', 0);
};
const nullSlots = mark({
  target_player_id: 'enemy-player',
  target_slot: null,
  secondary_target_slot: null,
  alternate_target_player_id: 'enemy-player',
  alternate_target_slot: null,
  target_slots: [],
}, { playerId: 'enemy-player', slot: null });
const primary = mark({
  target_player_id: 'enemy-player',
  target_slot: 0,
  secondary_target_slot: null,
  alternate_target_slot: null,
  target_slots: [],
});
const secondary = mark({
  target_player_id: 'enemy-player',
  target_slot: null,
  secondary_target_slot: 0,
  alternate_target_slot: null,
  target_slots: [],
});
const alternate = mark({
  target_player_id: 'mine-player',
  target_slot: 2,
  secondary_target_slot: null,
  alternate_target_player_id: 'enemy-player',
  alternate_target_slot: 0,
  target_slots: [],
});
const pending = mark(null, { playerId: 'enemy-player', slot: 0 });
console.log(JSON.stringify({ nullSlots, primary, secondary, alternate, pending }));
"""
    )

    assert probe == {
        "nullSlots": "",
        "primary": "Q1 PRI",
        "secondary": "Q1 SEC",
        "alternate": "Q1 ALT",
        "pending": "PRIMARY",
    }


def test_visible_hidden_and_revealed_statuses_keep_the_authoritative_name():
    probe = _run_node(
        r"""
globalThis.Phaser = { Scene: class { constructor() {} } };
const { CombatScene } = await import('./web/static/phaser/scenes/combat-scene.js');
const scene = new CombatScene();
const labels = scene.visibleStatusLabels({
  statuses: [
    { id: 'resonance_mark', name: 'Resonance Mark', invisible: true, revealed: false },
    { id: 'cursed_bud', name: 'Cursed Energy Bud', invisible: false, revealed: true },
  ],
});
console.log(JSON.stringify({ labels }));
"""
    )

    assert set(probe["labels"]) == {
        "HIDDEN RESONANCE MARK",
        "REVEALED CURSED ENERGY BUD",
    }


def test_queue_review_routes_disambiguate_team_slot_and_name_for_every_target_kind():
    probe = _run_node(
        r"""
globalThis.Phaser = { Scene: class { constructor() {} } };
const { CombatQueueReviewScene } = await import('./web/static/phaser/scenes/combat-queue-review-scene.js');
const scene = new CombatQueueReviewScene();
const mirrorTeam = [
  { name: 'Yuji Itadori' },
  { name: 'Megumi Fushiguro' },
  { name: 'Nobara Kugisaki' },
];
const me = { team: mirrorTeam.map((fighter) => ({ ...fighter })) };
const foe = { team: mirrorTeam.map((fighter) => ({ ...fighter })) };
scene.store = {
  me: () => me,
  foe: () => foe,
  mineId: () => 'mine-player',
  enemyId: () => 'enemy-player',
  skillFor: () => ({ id: 'test_skill', name: 'Test Skill', cost: [] }),
  adjustedCost: () => [],
};

const routed = scene.actionMeta({
  caster_slot: 0,
  skill_id: 'test_skill',
  target_player_id: 'enemy-player',
  target_slot: 0,
  secondary_target_slot: 1,
  alternate_target_player_id: 'mine-player',
  alternate_target_slot: 2,
  target_slots: [],
});
const allyList = scene.actionMeta({
  caster_slot: 0,
  skill_id: 'test_skill',
  target_player_id: 'mine-player',
  target_slot: null,
  secondary_target_slot: null,
  alternate_target_slot: null,
  target_slots: [0, 2],
});
const enemyList = scene.actionMeta({
  caster_slot: 0,
  skill_id: 'test_skill',
  target_player_id: 'enemy-player',
  target_slot: null,
  secondary_target_slot: null,
  alternate_target_slot: null,
  target_slots: [1, 2],
});
console.log(JSON.stringify({
  primary: routed.targetRoute,
  secondary: routed.secondaryRoute,
  alternate: routed.alternateRoute,
  allyList: allyList.targetRoute,
  enemyList: enemyList.targetRoute,
}));
"""
    )

    assert probe == {
        "primary": "ENEMY #1 Yuji Itadori",
        "secondary": "ENEMY #2 Megumi Fushiguro",
        "alternate": "ALLY #3 Nobara Kugisaki",
        "allyList": "ALLY #1 Yuji Itadori, #3 Nobara Kugisaki",
        "enemyList": "ENEMY #2 Megumi Fushiguro, #3 Nobara Kugisaki",
    }

    source = QUEUE_SCENE.read_text(encoding="utf-8")
    assert "meta.targetRoute" in source
    assert "meta.secondaryRoute" in source
    assert "meta.alternateRoute" in source
