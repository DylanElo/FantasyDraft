import json
import subprocess
from pathlib import Path

import pytest

from jjk_arena.battle_v2.manager import payload_to_action
from jjk_arena.battle_v2.models import BattleState, CharacterState, EffectSpec, EnergyType, PendingAction, PlayerState, SkillClass, SkillSpec, StatusEffect, TargetRule
from jjk_arena.battle_v2.resolver import ResolverError, _adjusted_cost_skill, effective_skill_id, validate_action
from jjk_arena.battle_v2.serialization import serialize_action


ROOT = Path(__file__).resolve().parents[1]


def node_parity_probe():
    script = r"""
globalThis.window = { JJK_BOOT: {}, setTimeout: () => {}, __phaserShellDebug: null };
globalThis.document = { getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const { GameStore } = await import('./web/static/phaser/store/game-store.js');
const proto = GameStore.prototype;
const fighter = { character_id: 'todo', alive: true, cooldowns: {}, statuses: [{ duration: 1, name: 'Infinity Tax', payload: { black_cost_delta: 1 } }], skill_replacements: { source: 'replacement' } };
const replacement = { id: 'replacement', name: 'Replacement', cost: ['blue'], classes: ['Control'], target_rule: { kind: 'enemy' }, effects: [{ type: 'apply_status', target: 'target', payload: {} }] };
const base = { id: 'source', name: 'Source', cost: ['blue'], classes: [], target_rule: { kind: 'enemy' }, effects: [{ type: 'damage', target: 'target', payload: {} }] };
const store = Object.create(proto);
store.state = { skill_catalog: { todo: { skills: [base, replacement] } } };
store.character = () => null;
store.me = () => ({ id: 'p1', energy: { green: 0, red: 0, blue: 1, white: 0 }, team: [fighter, { alive: true, statuses: [] }, { alive: true, statuses: [] }] });
store.foe = () => ({ id: 'p2', team: [{ alive: true, statuses: [] }, { alive: true, statuses: [{ id: 'poison', duration: 1 }] }, { alive: true, statuses: [] }] });
store.mineId = () => 'p1'; store.enemyId = () => 'p2'; store.controlsLocked = () => false;
store.queuedSlots = () => new Set(); store.actions = []; store.actionWildPays = {}; store.selectedCasterSlot = 0;
store.showToast = () => {}; store.notify = () => {}; store.ensureSelectedCaster = () => {}; store.ensureWildcardPayments = () => {};
store.pendingActionPayloads = () => store.actions; store.socketClient = { emit: () => {} }; store.targetBlocksSkill = () => false;
const effective = store.skillFor(fighter, 'source');
const adjusted = store.adjustedCost(fighter, effective);
const energyFit = store.skillFit(effective, fighter);
const harmfulSkill = { id: 'harm', cost: [], classes: ['Physical'], target_rule: { kind: 'enemy' }, effects: [{ type: 'damage', target: 'target', payload: {} }] };
const classSkill = { id: 'class', cost: [], classes: ['Physical'], target_rule: { kind: 'enemy' }, effects: [{ type: 'damage', target: 'target', payload: {} }] };
const harmfulBlocked = store.statusBlocksSkill({ statuses: [{ duration: 1, name: 'Stop', payload: { stun_harmful: true } }] }, harmfulSkill);
const classBlocked = store.statusBlocksSkill({ statuses: [{ duration: 1, name: 'Body Stun', payload: { stun_classes: ['Physical'] } }] }, classSkill);

const todoSkill = { id: 'todo_redirect', cost: [], classes: [], target_rule: { kind: 'enemy' }, effects: [{ type: 'apply_status', target: 'target', payload: { controlled_redirect: true } }] };
store.selectedSkillId = todoSkill.id; store.selectedSkill = () => todoSkill; store.targetingStage = null; store.pendingPrimaryTarget = null;
store.target('enemy', 0); store.target('mine', 2);
const todoAction = store.actions[0];

store.actions = [];
const venom = { id: 'venom', cost: [], classes: [], target_rule: { kind: 'enemy_team' }, effects: [{ type: 'damage', target: 'target', payload: { conditional_targeting: 'venom_bloom' } }] };
store.selectedSkillId = venom.id; store.selectedSkill = () => venom; store.targetingStage = 'venom_primary'; store.pendingPrimaryTarget = null;
store.target('enemy', 1); store.target('enemy', 2);
const venomAction = store.actions[0];
console.log(JSON.stringify({ effectiveId: effective.effective_skill_id, originalId: effective.id, adjusted, energyFit, harmfulBlocked, classBlocked, todoAction, venomAction }));
"""
    result = subprocess.run(
        ["node", "--experimental-default-type=module", "-"],
        input=script,
        text=True,
        capture_output=True,
        cwd=ROOT,
        check=True,
    )
    return json.loads(result.stdout)


def test_phaser_matches_server_for_adjusted_cost_replacement_stuns_and_disabled_reasons():
    probe = node_parity_probe()
    caster = CharacterState("todo", "Todo")
    caster.skill_replacements["source"] = "replacement"
    caster.statuses.append(StatusEffect("tax", "Infinity Tax", "p1", 0, "p1", 0, 1, payload={"black_cost_delta": 1}))
    skill = SkillSpec("replacement", "Replacement", "", [EnergyType.BLUE], 0, TargetRule("enemy"), [SkillClass.CONTROL], [EffectSpec("apply_status", status="lock", duration=1)])

    assert probe["effectiveId"] == effective_skill_id(caster, "source") == "replacement"
    assert probe["originalId"] == "source"
    assert probe["adjusted"] == [energy.value for energy in _adjusted_cost_skill(caster, skill).cost]
    assert probe["energyFit"]["ok"] is False and "wildcard" in probe["energyFit"]["reason"].lower()
    assert "Harmful skills blocked" in probe["harmfulBlocked"]
    assert "Body Stun" in probe["classBlocked"]

    state = BattleState({"p1": PlayerState("p1", "P1", team=[caster]), "p2": PlayerState("p2", "P2", team=[CharacterState("enemy", "Enemy")])}, "p1")
    state.players["p1"].energy[EnergyType.BLUE] = 1
    state.players["p1"].energy[EnergyType.GREEN] = 1
    caster.statuses.append(StatusEffect("stop", "Stop", "p2", 0, "p1", 0, 1, payload={"stun_harmful": True}))
    with pytest.raises(ResolverError, match="stunned"):
        validate_action(state, PendingAction("a", "p1", 0, "source", "p2", 0, wildcard_pays=[EnergyType.GREEN]), {"replacement": skill})


def test_phaser_and_server_preserve_primary_secondary_and_alternate_target_payloads():
    probe = node_parity_probe()
    todo_payload = probe["todoAction"]
    assert todo_payload["target_player_id"] == "p2" and todo_payload["target_slot"] == 0
    assert todo_payload["alternate_target_player_id"] == "p1" and todo_payload["alternate_target_slot"] == 2
    venom_payload = probe["venomAction"]
    assert venom_payload["target_slot"] == 1
    assert venom_payload["target_slots"] == [1, 2]
    assert venom_payload["secondary_target_slot"] == 2

    action = payload_to_action("p1", 0, {**todo_payload, "caster_slot": 0, "skill_id": "todo_redirect"})
    serialized = serialize_action(action)
    assert serialized["target_slot"] == 0
    assert serialized["alternate_target_player_id"] == "p1"
    assert serialized["alternate_target_slot"] == 2


def test_phaser_queue_review_blocks_missing_or_overdrawn_wild_payments():
    script = r"""
globalThis.window = { JJK_BOOT: {}, setTimeout: () => {}, __phaserShellDebug: null };
globalThis.document = { getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const { GameStore } = await import('./web/static/phaser/store/game-store.js');
const store = Object.create(GameStore.prototype);
const skill = { id: 'wild_skill', name: 'Wild Skill', cost: ['black'], classes: [], target_rule: { kind: 'enemy' }, effects: [] };
const fighter = { character_id: 'tester', alive: true, cooldowns: {}, statuses: [], skill_replacements: {} };
store.actions = [{ id: 'a1', caster_slot: 0, skill_id: 'wild_skill', target_player_id: 'p2', target_slot: 0 }];
store.actionWildPays = {};
store.me = () => ({ id: 'p1', energy: { green: 1, red: 0, blue: 0, white: 0 }, team: [fighter] });
store.skillFor = () => skill;
store.adjustedCost = () => ['black'];
const missing = store.queueReviewFit();
store.actionWildPays = { a1: ['green'] };
const valid = store.queueReviewFit();
store.actionWildPays = { a1: ['red'] };
const overdrawn = store.queueReviewFit();
console.log(JSON.stringify({ missing, valid, overdrawn }));
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
    assert probe["missing"] == {"ok": False, "reason": "Assign every Wild payment."}
    assert probe["valid"] == {"ok": True, "reason": ""}
    assert probe["overdrawn"]["ok"] is False


def test_phaser_second_skill_tap_opens_detail_without_mutating_queue():
    script = r"""
globalThis.window = { JJK_BOOT: {}, setTimeout: () => {}, __phaserShellDebug: null };
globalThis.document = { getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const { GameStore } = await import('./web/static/phaser/store/game-store.js');
const store = Object.create(GameStore.prototype);
store.selectedSkillId = 'skill'; store.detailSkillId = null; store.actions = [];
store.notify = () => {}; store.openSkillDetail = GameStore.prototype.openSkillDetail;
store.selectSkill('skill');
console.log(JSON.stringify({ detailSkillId: store.detailSkillId, actions: store.actions }));
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
    assert probe == {"detailSkillId": "skill", "actions": []}


def test_leaving_active_match_surrenders_and_ignores_late_room_updates():
    script = r"""
globalThis.window = { JJK_BOOT: {}, setTimeout: () => {}, __phaserShellDebug: null };
globalThis.document = { getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { GameStore } = await import('./web/static/phaser/store/game-store.js');
const emitted = [];
const store = Object.create(GameStore.prototype);
store.state = { winner_id: null, state_revision: 7 };
store.lobbyStatus = null; store.actions = []; store.actionWildPays = {}; store.selectedCasterSlot = 0;
store.selectedSkillId = 'skill'; store.queueSubmitting = false; store.queueReviewOpen = false;
store.detailCharacterId = null; store.eventCursor = 2; store.playbackEvents = []; store.recentEvents = [];
store.playerId = 'p1'; store.commandNonceCounter = 0; store.resumeSession = null; store.ignoreBattleUpdates = false;
store.socketClient = { emit: (event, payload) => emitted.push({ event, payload }) };
store.changeScene = (scene) => { store.scene = scene; };
store.clearResumeSession = () => {};
store.resetToLobby();
store.receiveBattleState({ winner_id: 'p2', players: {}, event_log: [], pending_actions: {}, phase: 'finished' });
console.log(JSON.stringify({ emitted, scene: store.scene, state: store.state, ignored: store.ignoreBattleUpdates }));
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
    assert probe["emitted"][0]["event"] == "battle_v2_surrender"
    assert probe["scene"] == "LobbyScene"
    assert probe["state"] is None
    assert probe["ignored"] is True
