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
        "primary": "Q1 TARGET",
        "secondary": "Q1 2ND",
        "alternate": "Q1 ALT",
        "pending": "1ST TARGET",
    }


def test_hidden_and_revealed_statuses_have_explicit_visibility_labels():
    probe = _run_node(
        r"""
globalThis.Phaser = { Scene: class { constructor() {} } };
const { CombatScene } = await import('./web/static/phaser/scenes/combat-scene.js');
const scene = new CombatScene();
const labels = scene.visibleStatusLabels({
  statuses: [
    { id: 'resonance_mark', name: 'Resonance Mark', duration: 2, invisible: true, revealed: false },
    { id: 'cursed_bud', name: 'Cursed Energy Bud', duration: 2, invisible: false, revealed: true },
  ],
});
console.log(JSON.stringify({ labels }));
"""
    )

    assert set(probe["labels"]) == {"HIDDEN 2", "REVEALED 2"}


def test_active_status_chips_use_meaningful_labels_instead_of_truncated_name_fragments():
    probe = _run_node(
        r"""
globalThis.Phaser = { Scene: class { constructor() {} } };
const { CombatScene } = await import('./web/static/phaser/scenes/combat-scene.js');
const scene = new CombatScene();
const labels = scene.visibleStatusLabels({
  statuses: [
    { id: 'stopped', name: 'Stop', duration: 2, families: ['Stun'], payload: { stun_harmful: true } },
    { id: 'poison', name: 'Poison', duration: 1, families: ['Affliction'], payload: { turn_end_damage: 10 } },
    { id: 'nue_fallback', name: 'Nue Fallback', duration: 0, families: ['Debuff'], payload: { damage_output_delta: -15 } },
  ],
});
console.log(JSON.stringify({ labels }));
"""
    )

    assert probe["labels"] == ["STUN 2", "POISON 1"]
    assert all("..." not in label for label in probe["labels"])


def test_client_timer_counts_down_from_authoritative_snapshot_without_ending_the_phase():
    probe = _run_node(
        r"""
globalThis.window = { JJK_BOOT: {} };
globalThis.document = { getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const { GameStore } = await import('./web/static/phaser/store/game-store.js');
const store = Object.create(GameStore.prototype);
store.state = { phase: 'planning', paused: false };
store.phaseTimerSnapshotSeconds = 17;
store.phaseTimerSnapshotAt = 1000;
const originalNow = Date.now;
Date.now = () => 7600;
const running = store.phaseSecondsRemaining();
store.state.paused = true;
const paused = store.phaseSecondsRemaining();
store.state.phase = 'finished';
const finished = store.phaseSecondsRemaining();
Date.now = originalNow;
console.log(JSON.stringify({ running, paused, finished }));
"""
    )

    assert probe == {"running": 11, "paused": 17, "finished": None}


def test_known_stun_reason_is_exposed_before_targeting_and_matches_server_semantics():
    probe = _run_node(
        r"""
globalThis.window = { JJK_BOOT: {} };
globalThis.document = { getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const { GameStore } = await import('./web/static/phaser/store/game-store.js');
const store = Object.create(GameStore.prototype);
const skill = {
  classes: ['Physical'], target_rule: { kind: 'enemy' },
  effects: [{ type: 'damage', target: 'target' }],
};
const stopped = store.statusBlocksSkill({ statuses: [
  { name: 'Stop', duration: 1, payload: { stun_classes: ['physical'] } },
] }, skill);
const ignored = store.statusBlocksSkill({ statuses: [
  { name: 'Stop', duration: 1, payload: { stun_classes: ['Physical'] } },
  { name: 'Unstoppable', duration: 1, payload: { ignore_stun: true } },
] }, skill);
console.log(JSON.stringify({ stopped, ignored }));
"""
    )

    assert probe == {
        "stopped": "Stop: this skill class is disabled.",
        "ignored": "",
    }


def test_compact_enemy_skill_cannot_mark_visible_invulnerable_target_selectable():
    probe = _run_node(
        r"""
globalThis.window = { JJK_BOOT: {} };
globalThis.document = { getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const { GameStore } = await import('./web/static/phaser/store/game-store.js');
const store = Object.create(GameStore.prototype);
const compactEnemySkill = {
  id: 'divine_dogs', classes: ['Physical'],
  target_rule: { kind: 'enemy' }, effects: [],
};
const warded = {
  alive: true,
  statuses: [{ id: 'rika_protects', duration: 2, payload: { invulnerable: true } }],
};
store.state = { phase: 'planning' };
store.selectedCasterSlot = 0;
store.selectedSkillId = compactEnemySkill.id;
store.targetingStage = null;
store.controlsLocked = () => false;
store.selectedSkill = () => compactEnemySkill;
store.enemyId = () => 'enemy';
store.mineId = () => 'mine';
console.log(JSON.stringify({
  harmful: store.skillIsHarmful(compactEnemySkill),
  blocked: store.targetBlocksSkill(warded, compactEnemySkill),
  selectable: store.canTarget(warded, 0, 'enemy'),
}));
"""
    )

    assert probe == {"harmful": True, "blocked": True, "selectable": False}


def test_visible_active_status_names_its_authoritative_source_skill_and_caster():
    probe = _run_node(
        r"""
globalThis.Phaser = { Scene: class { constructor() {} } };
const { CombatScene } = await import('./web/static/phaser/scenes/combat-scene.js');
const scene = new CombatScene();
const stopped = {
  id: 'stopped', name: 'Stop', duration: 2,
  source_player_id: 'enemy-player', source_slot: 0,
  target_player_id: 'mine-player', target_slot: 0,
  payload: { stun_harmful: true, source_skill_id: 'stop' },
};
scene.store = {
  state: {
    players: {
      'mine-player': { team: [{ character_id: 'yuji', statuses: [stopped] }] },
      'enemy-player': { team: [{ character_id: 'toge', statuses: [] }] },
    },
    skill_catalog: {
      toge: { skills: [{ id: 'stop', name: 'Stop.' }] },
    },
  },
  mineId: () => 'mine-player',
  enemyId: () => 'enemy-player',
};
console.log(JSON.stringify({
  sourceName: scene.statusSourceSkillName(stopped),
  enemyActiveSkill: scene.activeVisibleSkillForFighter('enemy', 0),
  playerActiveSkill: scene.activeVisibleSkillForFighter('mine', 0),
}));
"""
    )

    assert probe == {
        "sourceName": "Stop.",
        "enemyActiveSkill": "Stop.",
        "playerActiveSkill": "",
    }


def test_combat_source_uses_explicit_target_words_status_sheet_and_public_events_only():
    combat = (ROOT / "web/static/phaser/scenes/combat-scene.js").read_text(encoding="utf-8")
    store = (ROOT / "web/static/phaser/store/game-store.js").read_text(encoding="utf-8")

    assert "'TAP TARGET'" in combat
    assert "'BLOCKED'" in combat
    assert "'LEGAL'" not in combat
    assert "renderFighterStatusSheet" in combat
    assert "SOURCE SKILL" in combat
    assert "TIME ${clockLabel(detailSeconds)}" in combat
    assert "TIME ${clockLabel(sheetSeconds)}" in combat
    assert "safeText(event && event.type) === 'skill_resolved'" in store
    assert "currentVisibleAction()" in store
    assert "this.clearToast();\n      this.queueReviewOpen = true" in store


def test_transmutation_is_an_explicit_five_for_one_mobile_sheet():
    combat = (ROOT / "web/static/phaser/scenes/combat-scene.js").read_text(encoding="utf-8")

    assert "renderTransmuteSheet(frame)" in combat
    assert "OPTIONAL / ONCE PER TURN / BEFORE QUEUE" in combat
    assert "Sacrifice exactly 5 energy pips, in any mix" in combat
    assert "this.store.transmuteSourceCount(color)" in combat
    assert "this.store.addTransmuteSource(color)" in combat
    assert "this.store.removeTransmuteSource(color)" in combat
    assert "this.store.selectTransmuteTarget(color)" in combat
    assert "this.store.confirmTransmute()" in combat
    assert "selectedCount !== 5 || !this.store.transmuteTarget" in combat
    assert "CONFIRM 5 -> 1" in combat
    assert "ENERGY_NAMES[color]" in combat


def test_player_facing_energy_vocabulary_keeps_wire_colors_stable():
    probe = _run_node(
        r"""
const { CORE_ENERGY, ENERGY_LABELS, ENERGY_NAMES } = await import('./web/static/phaser/core/runtime-config.js');
console.log(JSON.stringify({ core: CORE_ENERGY, labels: ENERGY_LABELS, names: ENERGY_NAMES }));
"""
    )

    assert probe == {
        "core": ["green", "blue", "white", "red"],
        "labels": {"green": "T", "blue": "J", "white": "S", "red": "B", "black": "X"},
        "names": {
            "green": "Taijutsu",
            "blue": "Jujutsu",
            "white": "Strategic",
            "red": "Bloodline",
            "black": "Wild",
        },
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
