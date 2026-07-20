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
store.connectionState = 'connected';
store.resumeInFlight = false;
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


def test_disconnect_and_resume_hold_the_confirmed_timer_and_lock_controls():
    probe = _run_node(
        r"""
globalThis.window = { JJK_BOOT: {} };
globalThis.document = { getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const { GameStore } = await import('./web/static/phaser/store/game-store.js');
const store = Object.create(GameStore.prototype);
Object.assign(store, {
  state: {
    phase: 'planning', paused: false, result_type: null, turn_player_id: 'mine',
    players: { mine: { queue_confirmed: false }, enemy: { queue_confirmed: false } },
  },
  playerId: 'mine', connectionState: 'connected', resumeInFlight: false,
  phaseTimerSnapshotSeconds: 20, phaseTimerSnapshotAt: 1000,
  pendingCommand: null, queueSubmitting: false,
});
store.mineId = () => 'mine';
const originalNow = Date.now;
Date.now = () => 6000;
store.freezePhaseTimer();
store.connectionState = 'disconnected';
const disconnected = {
  seconds: store.phaseSecondsRemaining(),
  locked: store.controlsLocked(),
  connection: store.combatConnectionStatus(),
};
Date.now = () => 16000;
store.connectionState = 'connected';
store.resumeInFlight = true;
const resuming = {
  seconds: store.phaseSecondsRemaining(),
  locked: store.controlsLocked(),
  connection: store.combatConnectionStatus(),
};
const pausedStore = Object.create(GameStore.prototype);
Object.assign(pausedStore, {
  state: { phase: 'planning', paused: true },
  connectionState: 'connected', resumeInFlight: false,
  phaseTimerSnapshotSeconds: 20, phaseTimerSnapshotAt: 1000,
});
pausedStore.freezePhaseTimer();
const pausedBeforeDisconnect = pausedStore.phaseSecondsRemaining();
Date.now = originalNow;
console.log(JSON.stringify({ disconnected, resuming, pausedBeforeDisconnect }));
"""
    )

    assert probe["disconnected"]["seconds"] == 15
    assert probe["disconnected"]["locked"] is True
    assert probe["disconnected"]["connection"]["key"] == "reconnecting"
    assert "held at the last confirmed value" in probe["disconnected"]["connection"]["label"]
    assert probe["resuming"]["seconds"] == 15
    assert probe["resuming"]["locked"] is True
    assert probe["resuming"]["connection"]["key"] == "resuming"
    assert "viewer-safe battle state" in probe["resuming"]["connection"]["label"]
    assert probe["pausedBeforeDisconnect"] == 20


def test_resume_rejection_discards_cached_battle_without_surrendering():
    probe = _run_node(
        r"""
globalThis.window = {
  JJK_BOOT: {}, JJKPhaserShell: null,
  setTimeout: () => 1, clearTimeout: () => {},
};
globalThis.document = { getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const { GameStore } = await import('./web/static/phaser/store/game-store.js');
const handlers = {};
const emitted = [];
const store = Object.create(GameStore.prototype);
Object.assign(store, {
  socketClient: {
    on: (name, handler) => { handlers[name] = handler; },
    emit: (name, payload) => emitted.push({ name, payload }),
  },
  listeners: new Set(), playerId: 'mine', connectionState: 'connected',
  state: { match_id: 'expired-match', result_type: null },
  pendingCommand: null, resumeInFlight: true, resumeSession: { room_id: 'room', player_id: 'mine', resume_token: 'token' },
  disconnectDeadline: null, lobbyStatus: null, actions: [{ id: 'cached' }], actionWildPays: {},
  selectedCasterSlot: 0, selectedSkillId: 'cached', queueSubmitting: false,
  matchLaunchPending: false, matchLaunchError: '', matchLaunchTimer: null, matchLaunchAttempt: 0,
  queueReviewOpen: true, transmuteOpen: false, transmuteSources: [], transmuteTarget: null,
  detailCharacterId: null, detailSkillId: null, inspectedFighter: null,
  eventCursor: 0, playbackEvents: [], recentEvents: [], visiblePublicAction: null, visiblePublicActionUntil: 0,
  phaseTimerSnapshotSeconds: 20, phaseTimerSnapshotAt: 1000, retiredMatchIds: new Set(), toast: '', toastSerial: 0,
});
store.bindSocket();
handlers.battle_v2_resume_rejected({ message: 'Battle session could not be resumed.' });
console.log(JSON.stringify({
  scene: store.scene,
  hasState: !!store.state,
  actionCount: store.actions.length,
  resumeSession: store.resumeSession,
  resumeInFlight: store.resumeInFlight,
  toast: store.toast,
  surrendered: emitted.some((entry) => entry.name === 'battle_v2_surrender'),
}));
"""
    )

    assert probe == {
        "scene": "LobbyScene",
        "hasState": False,
        "actionCount": 0,
        "resumeSession": None,
        "resumeInFlight": False,
        "toast": "Battle session could not be resumed.",
        "surrendered": False,
    }


def test_long_status_reasons_have_compact_scannable_skill_card_copy():
    probe = _run_node(
        r"""
globalThis.Phaser = { Scene: class { constructor() {} } };
const { compactSkillCardDisabledReason } = await import('./web/static/phaser/scenes/combat-scene.js');
console.log(JSON.stringify({
  puppet: compactSkillCardDisabledReason('Remote Puppet Net: non-damaging skills are disabled.'),
  hookworm: compactSkillCardDisabledReason('Hookworm Strategic Stun: this skill class is disabled.'),
  energy: compactSkillCardDisabledReason('Short on Taijutsu, Strategic.'),
}));
"""
    )

    assert probe == {
        "puppet": "Non-damaging skills disabled.",
        "hookworm": "Skill class disabled.",
        "energy": "Short on Taijutsu, Strategic.",
    }


def test_user_facing_interaction_stage_distinguishes_planning_orders_and_review():
    probe = _run_node(
        r"""
globalThis.window = { JJK_BOOT: {} };
globalThis.document = { getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const { combatInteractionStageFor } = await import('./web/static/phaser/store/game-store.js');
const stage = (context) => {
  const value = combatInteractionStageFor(context);
  return { key: value.key, label: value.label, heading: value.heading, timer: value.timerLabel };
};
const validating = (kind, queueCount) => {
  const value = combatInteractionStageFor({
    authoritativePhase: 'planning', isMyTurn: true, queueCount,
    pendingCommandKind: kind, queueSubmitting: false,
  });
  return { key: value.key, hud: value.hudLabel, description: value.description };
};
console.log(JSON.stringify({
  planning: stage({ authoritativePhase: 'planning', isMyTurn: true, queueCount: 0 }),
  ordersFromPlanning: stage({ authoritativePhase: 'planning', isMyTurn: true, queueCount: 1, queueReviewOpen: false }),
  ordersFromRawReview: stage({ authoritativePhase: 'queue_review', isMyTurn: true, queueCount: 2, queueReviewOpen: false }),
  review: stage({ authoritativePhase: 'queue_review', isMyTurn: true, queueCount: 2, queueReviewOpen: true }),
  opponentPrivateReview: stage({ authoritativePhase: 'queue_review', isMyTurn: false, queueCount: 0, queueReviewOpen: false }),
  passing: stage({ authoritativePhase: 'planning', isMyTurn: true, queueCount: 0, queueSubmitting: true, pendingCommandKind: 'end_turn' }),
  resolving: stage({ authoritativePhase: 'resolving', isMyTurn: true, queueCount: 2 }),
  validatingSubmit: validating('submit_plan', 1),
  validatingCancel: validating('cancel_queue', 0),
  validatingConvert: validating('convert_energy', 0),
}));
"""
    )

    assert probe == {
        "planning": {"key": "planning", "label": "Planning", "heading": "Combat Planning", "timer": "PLAN TIME"},
        "ordersFromPlanning": {"key": "orders_open", "label": "Orders Open", "heading": "Combat Orders Open", "timer": "ORDER TIME"},
        "ordersFromRawReview": {"key": "orders_open", "label": "Orders Open", "heading": "Combat Orders Open", "timer": "ORDER TIME"},
        "review": {"key": "queue_review", "label": "Queue Review", "heading": "Queue Review", "timer": "REVIEW TIME"},
        "opponentPrivateReview": {"key": "opponent_turn", "label": "Opponent Turn", "heading": "Opponent Turn", "timer": "TURN TIME"},
        "passing": {"key": "planning", "label": "Planning", "heading": "Combat Planning", "timer": "PLAN TIME"},
        "resolving": {"key": "resolution", "label": "Resolution", "heading": "Resolution Playback", "timer": "SERVER"},
        "validatingSubmit": {
            "key": "orders_open",
            "hud": "VALIDATING",
            "description": "The server is validating the latest battle command.",
        },
        "validatingCancel": {
            "key": "planning",
            "hud": "VALIDATING",
            "description": "The server is validating the latest battle command.",
        },
        "validatingConvert": {
            "key": "planning",
            "hud": "VALIDATING",
            "description": "The server is validating the latest battle command.",
        },
    }


def test_resume_with_authoritative_pending_queue_returns_to_orders_open():
    probe = _run_node(
        r"""
globalThis.window = { JJK_BOOT: {} };
globalThis.document = { getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const { GameStore } = await import('./web/static/phaser/store/game-store.js');
const store = Object.create(GameStore.prototype);
Object.assign(store, {
  state: null,
  pendingCommand: null,
  resumeInFlight: true,
  queueReviewOpen: true,
  queueSubmitting: false,
  actions: [],
  actionWildPays: {},
  eventCursor: 0,
  playbackEvents: [],
  recentEvents: [],
  visiblePublicAction: null,
  visiblePublicActionUntil: 0,
  inspectedFighter: null,
  transmuteOpen: false,
  firstCreationAccount: null,
  lobbyStatus: null,
  matchLaunchPending: false,
  connectionState: 'connected',
});
store.clearMatchLaunchTimeout = () => {};
store.isRetiredMatchId = () => false;
store.mineId = () => 'mine';
store.enemyId = () => 'enemy';
store.ensureWildcardPayments = () => {};
store.ensureSelectedCaster = () => {};
store.changeScene = () => {};
store.notify = () => {};
store.receiveBattleState({
  match_id: 'resume-room',
  state_revision: 7,
  phase: 'queue_review',
  phase_seconds_remaining: 31,
  turn_player_id: 'mine',
  paused: false,
  event_log: [],
  players: {
    mine: { team: [], queue_confirmed: false },
    enemy: { team: [], queue_confirmed: false },
  },
  pending_actions: {
    mine: [{ id: 'a1', caster_slot: 0, skill_id: 'skill', wildcard_pays: [] }],
  },
  queue_order: { mine: ['a1'] },
});
const stage = store.interactionStage();
console.log(JSON.stringify({
  actionCount: store.actions.length,
  queueReviewOpen: store.queueReviewOpen,
  resumeInFlight: store.resumeInFlight,
  stage: stage.key,
  label: stage.label,
  seconds: store.phaseSecondsRemaining(),
}));
"""
    )

    assert probe == {
        "actionCount": 1,
        "queueReviewOpen": False,
        "resumeInFlight": False,
        "stage": "orders_open",
        "label": "Orders Open",
        "seconds": 31,
    }


def test_store_combat_accessibility_snapshot_whitelists_viewer_state_and_own_queue():
    probe = _run_node(
        r"""
globalThis.window = { JJK_BOOT: {} };
globalThis.document = { getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const { GameStore } = await import('./web/static/phaser/store/game-store.js');
const store = Object.create(GameStore.prototype);
const fighter = (name, hp, statuses = []) => ({ name, character_id: name.toLowerCase(), hp, max_hp: 100, alive: hp > 0, statuses });
store.state = {
  phase: 'queue_review', turn_player_id: 'mine', paused: false,
  players: {
    mine: {
      energy: { green: 2, blue: 1, white: 0, red: 3 },
      team: [fighter('Yuji', 80, [{ name: 'Soul Bruise', duration: 1, duration_clock: 'target_turn' }])],
    },
    enemy: {
      team: [Object.assign(fighter('Yuta', 60, []), { private_statuses: [{ name: 'PRIVATE TRAP' }] })],
    },
  },
  pending_actions: { enemy: [{ skill_id: 'PRIVATE ENEMY ACTION' }] },
  event_log: [{ message: 'PRIVATE EVENT' }],
};
store.actions = [{
  id: 'a1', caster_slot: 0, skill_id: 'divergent_fist',
  target_player_id: 'enemy', target_slot: 0, target_slots: [],
}];
store.actionWildPays = { a1: ['blue'] };
store.queueReviewOpen = false;
store.queueSubmitting = false;
store.connectionState = 'connected';
store.disconnectDeadline = null;
store.phaseTimerSnapshotSeconds = 25;
store.phaseTimerSnapshotAt = Date.now();
store.mineId = () => 'mine';
store.enemyId = () => 'enemy';
store.skillFor = () => ({ id: 'divergent_fist', name: 'Divergent Fist', cost: ['green', 'black'], effects: [] });
store.adjustedCost = (_caster, skill) => skill.cost.slice();
const snapshot = store.combatAccessibilitySnapshot();
const serialized = JSON.stringify(snapshot);
console.log(JSON.stringify({
  stage: snapshot.interactionStage,
  energy: snapshot.energy.map(({ label, count }) => [label, count]),
  allies: snapshot.allies,
  enemies: snapshot.enemies,
  queue: snapshot.queue,
  leaksPrivateTrap: serialized.includes('PRIVATE TRAP'),
  leaksEnemyAction: serialized.includes('PRIVATE ENEMY ACTION'),
  leaksPrivateEvent: serialized.includes('PRIVATE EVENT'),
}));
"""
    )

    assert probe["stage"] == "orders_open"
    assert probe["energy"] == [["T", 2], ["J", 1], ["S", 0], ["B", 3]]
    assert probe["allies"][0]["statuses"][0]["name"] == "Soul Bruise"
    assert probe["enemies"][0]["statuses"] == []
    assert probe["queue"] == [
        {
            "order": 1,
            "caster": "Yuji",
            "skill": "Divergent Fist",
            "target": "Enemy 1, Yuta",
            "cost": ["T", "X"],
            "wildcardPays": ["J"],
        }
    ]
    assert probe["leaksPrivateTrap"] is False
    assert probe["leaksEnemyAction"] is False
    assert probe["leaksPrivateEvent"] is False


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
    assert "${detailStage.timerLabel} ${clockLabel(detailSeconds)}" in combat
    assert "${sheetStage.timerLabel} ${clockLabel(sheetSeconds)}" in combat
    assert "safeText(event && event.type) === 'skill_resolved'" in store
    assert "currentVisibleAction()" in store
    assert "interactionStage: this.interactionStage().key" in store
    assert "interactionStageHudLabel: this.interactionStage().hudLabel" in store
    assert "interactionStageDescription: this.interactionStage().description" in store
    assert "authoritativePhase: safeText(this.state && this.state.phase)" in store
    assert "authoritativePhaseSecondsRemaining: this.phaseSecondsRemaining()" in store
    assert "combatConnection: this.combatConnectionStatus().key" in store
    assert "HOSTILE ACTION IN PROGRESS" not in combat
    assert "RESTORING BATTLE SESSION" in combat
    assert "PASSING TURN" in combat
    assert "SERVER VALIDATING QUEUE" in combat
    prompt_block = combat[combat.index("const prompt =") : combat.index("if (this.store.queueReviewOpen)")]
    assert prompt_block.index("this.store.controlsLocked()") < prompt_block.index("this.store.queueReviewOpen")
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
