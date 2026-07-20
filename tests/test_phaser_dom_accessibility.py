import json
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _run_node(script: str) -> dict:
    result = subprocess.run(
        ["node", "--experimental-default-type=module", "-"],
        input=script,
        text=True,
        capture_output=True,
        cwd=ROOT,
        check=True,
    )
    return json.loads(result.stdout)


def test_dom_action_descriptors_are_stable_and_filter_canvas_blockers():
    probe = _run_node(
        r"""
const {
  buildAccessibleActions,
  isBlockingHitTarget,
  sceneHeadingFor,
  stableActionDomId,
} = await import('./web/static/phaser/core/dom-ui-bridge.js');
const bounds = { width: 390, height: 844 };
const actions = buildAccessibleActions('CombatScene', [
  { key: 'review', label: 'Review queue', x: 12, y: 760, w: 366, h: 56, activate() {} },
  { key: 'overlay', label: 'Transmutation overlay', x: 0, y: 0, w: 390, h: 844, activate() {} },
  { key: 'confirm', label: 'Confirm queue', x: 12, y: 700, w: 366, h: 48, disabled: true, disabledReason: 'Assign every Wild payment.', activate() {} },
], bounds);
const relabelledId = buildAccessibleActions('CombatScene', [
  { key: 'review', label: 'Review 2 of 3', x: 12, y: 760, w: 366, h: 56, activate() {} },
], bounds)[0].id;
console.log(JSON.stringify({
  count: actions.length,
  ids: actions.map((action) => action.id),
  reviewStable: actions[0].id === relabelledId,
  disabledReason: actions[1].disabledReason,
  blocker: isBlockingHitTarget({ x: 0, y: 0, w: 390, h: 844 }, bounds),
  explicitHidden: isBlockingHitTarget({ mirror: false }, bounds),
  queueHeading: sceneHeadingFor('CombatScene', { queueReviewOpen: true }),
  planningHeading: sceneHeadingFor('CombatScene'),
  deterministicId: stableActionDomId('LobbyScene', 'identity-name') === stableActionDomId('LobbyScene', 'identity-name'),
}));
"""
    )

    assert probe == {
        "count": 2,
        "ids": probe["ids"],
        "reviewStable": True,
        "disabledReason": "Assign every Wild payment.",
        "blocker": True,
        "explicitHidden": True,
        "queueHeading": "Queue Review",
        "planningHeading": "Combat Planning",
        "deterministicId": True,
    }
    assert len(set(probe["ids"])) == 2
    assert all(value.startswith("jjk-action-combatscene-") for value in probe["ids"])


def test_dom_bridge_reuses_focused_nodes_and_blocks_disabled_activation():
    probe = _run_node(
        r"""
const { DomUiBridge } = await import('./web/static/phaser/core/dom-ui-bridge.js');

class FakeNode {
  constructor(documentRef, id = '') {
    this.documentRef = documentRef;
    this.attributes = new Map();
    this.children = [];
    this.listeners = new Map();
    this.dataset = {};
    this.textContent = '';
    this.hidden = false;
    this.isConnected = true;
    this._id = '';
    if (id) this.id = id;
  }
  set id(value) {
    if (this._id) this.documentRef.nodes.delete(this._id);
    this._id = value;
    if (value) this.documentRef.nodes.set(value, this);
  }
  get id() { return this._id; }
  addEventListener(type, callback) { this.listeners.set(type, callback); }
  removeEventListener(type) { this.listeners.delete(type); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  appendChild(child) {
    this.children = this.children.filter((entry) => entry !== child);
    this.children.push(child);
    child.isConnected = true;
    return child;
  }
  remove() {
    this.isConnected = false;
    if (this._id) this.documentRef.nodes.delete(this._id);
  }
  focus() { this.documentRef.activeElement = this; }
}

class FakeDocument {
  constructor() {
    this.nodes = new Map();
    this.body = new FakeNode(this, 'body');
    this.documentElement = new FakeNode(this, 'html');
    this.activeElement = this.body;
    this.defaultView = { queueMicrotask: (callback) => callback() };
    ['jjk-scene-heading', 'jjk-action-mirror', 'jjk-scene-live', 'toast'].forEach((id) => new FakeNode(this, id));
  }
  getElementById(id) { return this.nodes.get(id) || null; }
  createElement() { return new FakeNode(this); }
  addEventListener() {}
  removeEventListener() {}
}

const documentRef = new FakeDocument();
const bridge = new DomUiBridge(documentRef);
let activations = 0;
const snapshot = (label, disabled = false) => ({
  sceneKey: 'LobbyScene',
  bounds: { width: 390, height: 844 },
  actions: [{
    key: 'identity-name',
    label,
    x: 8,
    y: 8,
    w: 180,
    h: 52,
    disabled,
    disabledReason: disabled ? 'Wait for the current action.' : '',
    activate() { activations += 1; },
  }],
});
bridge.reconcileScene(snapshot('Edit player name'));
const firstButton = [...bridge.actionNodes.values()][0].button;
firstButton.focus();
bridge.reconcileScene(snapshot('Edit player name Dylan'));
const secondButton = [...bridge.actionNodes.values()][0].button;
let keyPrevented = false;
secondButton.listeners.get('keydown')({
  key: 'Enter',
  preventDefault() { keyPrevented = true; },
  stopPropagation() {},
});
bridge.reconcileScene(snapshot('Edit player name Dylan', true));
secondButton.listeners.get('click')({ stopPropagation() {} });
console.log(JSON.stringify({
  reused: firstButton === secondButton,
  focusPreserved: documentRef.activeElement === secondButton,
  activations,
  keyPrevented,
  disabledAnnouncement: documentRef.getElementById('jjk-scene-live').textContent,
  ariaDisabled: secondButton.attributes.get('aria-disabled'),
  describedBy: secondButton.attributes.get('aria-describedby'),
}));
"""
    )

    assert probe["reused"] is True
    assert probe["focusPreserved"] is True
    assert probe["activations"] == 1
    assert probe["keyPrevented"] is True
    assert probe["disabledAnnouncement"] == "Wait for the current action."
    assert probe["ariaDisabled"] == "true"
    assert probe["describedBy"].endswith("-reason")


def test_combat_dom_mirror_exposes_viewer_safe_tactical_state_in_queue_order():
    probe = _run_node(
        r"""
const { DomUiBridge, buildCombatAccessibilityState } = await import('./web/static/phaser/core/dom-ui-bridge.js');

class FakeNode {
  constructor(documentRef, id = '') {
    this.documentRef = documentRef;
    this.attributes = new Map();
    this.children = [];
    this.listeners = new Map();
    this.dataset = {};
    this.textContent = '';
    this.hidden = false;
    this.isConnected = true;
    this._id = '';
    if (id) this.id = id;
  }
  set id(value) { this._id = value; if (value) this.documentRef.nodes.set(value, this); }
  get id() { return this._id; }
  addEventListener(type, callback) { this.listeners.set(type, callback); }
  removeEventListener(type) { this.listeners.delete(type); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  appendChild(child) { this.children.push(child); child.isConnected = true; return child; }
  replaceChildren() { this.children = []; }
  remove() { this.isConnected = false; }
  focus() { this.documentRef.activeElement = this; }
}

class FakeDocument {
  constructor() {
    this.nodes = new Map();
    this.body = new FakeNode(this, 'body');
    this.documentElement = new FakeNode(this, 'html');
    this.activeElement = this.body;
    this.defaultView = { queueMicrotask: (callback) => callback() };
    [
      'jjk-scene-heading', 'jjk-action-mirror', 'jjk-scene-live', 'toast',
      'jjk-combat-state', 'jjk-combat-phase', 'jjk-combat-connection',
      'jjk-combat-energy', 'jjk-combat-allies', 'jjk-combat-enemies',
      'jjk-combat-queue',
    ].forEach((id) => new FakeNode(this, id));
  }
  getElementById(id) { return this.nodes.get(id) || null; }
  createElement() { return new FakeNode(this); }
  addEventListener() {}
  removeEventListener() {}
}

const fighter = (side, slot, name, hp, statuses = []) => ({
  side, slot, name, hp, maxHp: 100, alive: hp > 0, statuses,
});
const raw = {
  interactionStage: 'orders_open',
  interactionStageLabel: 'Orders Open',
  interactionHeading: 'Combat Orders Open',
  interactionDescription: 'Add another fighter action or open Queue Review.',
  interactionTimerLabel: 'ORDER TIME',
  authoritativePhase: 'queue_review',
  authoritativePhaseSecondsRemaining: 27.2,
  connection: { key: 'paused_for_reconnect', label: 'Battle paused for reconnect; 44 seconds remain.' },
  energy: [
    { label: 'T', name: 'Taijutsu', count: 2 },
    { label: 'J', name: 'Jujutsu', count: 1 },
    { label: 'S', name: 'Strategic', count: 3 },
    { label: 'B', name: 'Bloodline', count: 0 },
  ],
  allies: [
    fighter('ally', 1, 'Yuji Itadori', 82, [{ name: 'Momentum', duration: 1, clock: 'source turn', visibility: 'visible' }]),
    fighter('ally', 2, 'Megumi Fushiguro', 0),
    fighter('ally', 3, 'Nobara Kugisaki', 65),
  ],
  enemies: [
    fighter('enemy', 1, 'Yuta Okkotsu (JJK 0)', 90, [{ name: 'Rika Protects', duration: 2, clock: 'target turn', visibility: 'revealed' }]),
    fighter('enemy', 2, 'Maki Zenin', 70),
    fighter('enemy', 3, 'Toge Inumaki', 55),
  ],
  queue: [
    { order: 1, caster: 'Nobara Kugisaki', skill: 'Nail Barrage', target: 'Enemy 2, Maki Zenin', cost: ['S'], wildcardPays: [] },
    { order: 2, caster: 'Yuji Itadori', skill: 'Divergent Fist', target: 'Enemy 1, Yuta Okkotsu (JJK 0)', cost: ['T', 'X'], wildcardPays: ['J'] },
  ],
  // These fields model data that must never be copied into the whitelisted
  // mirror even if a caller accidentally carries adjacent private objects.
  opponentQueue: [{ skill: 'PRIVATE ENEMY ACTION' }],
  privateEnemyStatuses: [{ name: 'UNREVEALED ENEMY TRAP' }],
};
const normalized = buildCombatAccessibilityState(raw);
const documentRef = new FakeDocument();
const bridge = new DomUiBridge(documentRef);
bridge.setCombatState(raw);
bridge.reconcileScene({ sceneKey: 'CombatScene', bounds: { width: 360, height: 800 }, actions: [] });
const nodeText = (id) => documentRef.getElementById(id).textContent;
const listText = (id) => documentRef.getElementById(id).children.map((node) => node.textContent);
const rendered = [
  nodeText('jjk-scene-heading'), nodeText('jjk-combat-phase'),
  nodeText('jjk-combat-connection'), nodeText('jjk-combat-energy'),
  ...listText('jjk-combat-allies'), ...listText('jjk-combat-enemies'),
  ...listText('jjk-combat-queue'),
].join(' | ');
console.log(JSON.stringify({
  heading: nodeText('jjk-scene-heading'),
  phase: nodeText('jjk-combat-phase'),
  connection: nodeText('jjk-combat-connection'),
  energy: nodeText('jjk-combat-energy'),
  allies: listText('jjk-combat-allies'),
  enemies: listText('jjk-combat-enemies'),
  queue: listText('jjk-combat-queue'),
  ariaHidden: documentRef.getElementById('jjk-combat-state').attributes.get('aria-hidden'),
  leaksRawPhase: rendered.includes('queue_review'),
  leaksPrivateAction: rendered.includes('PRIVATE ENEMY ACTION') || JSON.stringify(normalized).includes('PRIVATE ENEMY ACTION'),
  leaksPrivateStatus: rendered.includes('UNREVEALED ENEMY TRAP') || JSON.stringify(normalized).includes('UNREVEALED ENEMY TRAP'),
}));
"""
    )

    assert probe["heading"] == "Combat Orders Open"
    assert probe["phase"] == (
        "Orders Open. Add another fighter action or open Queue Review. "
        "ORDER TIME: 28 seconds remaining."
    )
    assert probe["connection"] == "Battle paused for reconnect; 44 seconds remain."
    assert probe["energy"] == "Available energy. T Taijutsu: 2; J Jujutsu: 1; S Strategic: 3; B Bloodline: 0."
    assert len(probe["allies"]) == 3
    assert "82 of 100 HP" in probe["allies"][0]
    assert "Momentum, 1 source turn" in probe["allies"][0]
    assert "down, 0 of 100 HP" in probe["allies"][1]
    assert len(probe["enemies"]) == 3
    assert "revealed, Rika Protects, 2 target turns" in probe["enemies"][0]
    assert probe["queue"][0].startswith("Order 1: Nobara Kugisaki uses Nail Barrage")
    assert probe["queue"][1].startswith("Order 2: Yuji Itadori uses Divergent Fist")
    assert "Wild paid with J" in probe["queue"][1]
    assert probe["ariaHidden"] == "false"
    assert probe["leaksRawPhase"] is False
    assert probe["leaksPrivateAction"] is False
    assert probe["leaksPrivateStatus"] is False


def test_identity_dialog_saves_cancels_validates_and_restores_focus():
    probe = _run_node(
        r"""
const { DomUiBridge, stableActionDomId } = await import('./web/static/phaser/core/dom-ui-bridge.js');

class FakeNode {
  constructor(documentRef, id = '') {
    this.documentRef = documentRef;
    this.attributes = new Map();
    this.listeners = new Map();
    this.dataset = {};
    this.textContent = '';
    this.value = '';
    this.hidden = id === 'jjk-identity-dialog';
    this.isConnected = true;
    this.disabled = false;
    this._id = '';
    if (id) this.id = id;
  }
  set id(value) { this._id = value; if (value) this.documentRef.nodes.set(value, this); }
  get id() { return this._id; }
  addEventListener(type, callback) { this.listeners.set(type, callback); }
  removeEventListener(type) { this.listeners.delete(type); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  appendChild() {}
  focus() { this.documentRef.activeElement = this; }
  select() { this.selected = true; }
}

class FakeDocument {
  constructor() {
    this.nodes = new Map();
    this.body = new FakeNode(this, 'body');
    this.documentElement = new FakeNode(this, 'html');
    this.activeElement = this.body;
    this.defaultView = { queueMicrotask: (callback) => callback() };
    [
      'jjk-scene-heading', 'jjk-action-mirror', 'jjk-scene-live', 'toast',
      'jjk-identity-dialog', 'jjk-identity-title', 'jjk-identity-label',
      'jjk-identity-hint', 'jjk-identity-error', 'jjk-identity-form',
      'jjk-identity-input', 'jjk-identity-cancel', 'jjk-identity-save',
    ].forEach((id) => new FakeNode(this, id));
  }
  getElementById(id) { return this.nodes.get(id) || null; }
  createElement() { return new FakeNode(this); }
  addEventListener() {}
  removeEventListener() {}
}

const documentRef = new FakeDocument();
const bridge = new DomUiBridge(documentRef);
bridge.currentSceneKey = 'LobbyScene';
const opener = new FakeNode(documentRef, stableActionDomId('LobbyScene', 'identity-name'));
opener.focus();
let savedValue = null;
bridge.openIdentityEditor({
  type: 'name',
  label: 'Player name',
  value: 'Player',
  maxLength: 24,
  restoreActionId: 'identity-name',
  onSave(value) { savedValue = value; },
});
const input = documentRef.getElementById('jjk-identity-input');
const focusedOnOpen = documentRef.activeElement === input && input.selected;
input.value = '  Dylan  ';
bridge.submitIdentity({ preventDefault() {} });
const dialog = documentRef.getElementById('jjk-identity-dialog');
const savedAndRestored = savedValue === 'Dylan' && dialog.hidden && documentRef.activeElement === opener;

opener.focus();
bridge.openIdentityEditor({
  type: 'room',
  label: 'Private room code',
  value: 'lobby',
  maxLength: 32,
  restoreActionId: 'identity-name',
});
input.value = '   ';
bridge.submitIdentity({ preventDefault() {} });
const rejectedEmpty = !dialog.hidden
  && input.attributes.get('aria-invalid') === 'true'
  && documentRef.getElementById('jjk-identity-error').textContent.includes('cannot be empty');
let escapePrevented = false;
bridge.handleDocumentKeydown({ key: 'Escape', preventDefault() { escapePrevented = true; } });
console.log(JSON.stringify({
  focusedOnOpen,
  savedAndRestored,
  rejectedEmpty,
  escapePrevented,
  cancelledAndRestored: dialog.hidden && documentRef.activeElement === opener,
  maxLength: input.maxLength,
}));
"""
    )

    assert probe == {
        "focusedOnOpen": True,
        "savedAndRestored": True,
        "rejectedEmpty": True,
        "escapePrevented": True,
        "cancelledAndRestored": True,
        "maxLength": 32,
    }


def test_identity_editor_is_native_focus_managed_and_mobile_sized():
    lobby = (ROOT / "web/static/phaser/scenes/lobby-scene.js").read_text(encoding="utf-8")
    bridge = (ROOT / "web/static/phaser/core/dom-ui-bridge.js").read_text(encoding="utf-8")
    base = (ROOT / "web/static/phaser/scenes/base-scene.js").read_text(encoding="utf-8")
    legacy = (ROOT / "web/static/phaser/legacy-shell.js").read_text(encoding="utf-8")
    html = (ROOT / "web/templates/index.html").read_text(encoding="utf-8")
    css = (ROOT / "web/static/phaser-shell.css").read_text(encoding="utf-8")

    assert "window.prompt" not in lobby
    assert "openIdentityEditor" in lobby
    assert "maxLength: isName ? 24 : 32" in lobby
    assert "restoreActionId" in lobby
    assert 'id="jjk-identity-dialog"' in html
    assert 'role="dialog"' in html
    assert 'aria-modal="true"' in html
    assert 'id="jjk-identity-input"' in html
    assert 'type="text"' in html
    assert 'role="status" aria-live="polite"' in html
    for combat_id in (
        "jjk-combat-state",
        "jjk-combat-phase",
        "jjk-combat-connection",
        "jjk-combat-energy",
        "jjk-combat-allies",
        "jjk-combat-enemies",
        "jjk-combat-queue",
    ):
        assert f'id="{combat_id}"' in html
    assert "event.key === 'Escape'" in bridge
    assert "button.type = 'button'" in bridge
    assert "button.addEventListener('click'" in bridge
    assert "button.addEventListener('keydown'" in bridge
    assert "event.preventDefault();" in bridge
    assert "this.dialogInput.focus" in bridge
    assert "this.restoreFocusNode" in bridge
    assert "this.domUI.queueSceneActions" in base
    assert "heading: this.accessibilityHeading || ''" in base
    assert "disabledReason" in base
    assert "accessibilityLabel: options.backLabel || 'Back'" in (ROOT / "web/static/phaser/ui/season-three-ui.js").read_text(encoding="utf-8")
    assert "new DomUiBridge(document)" in legacy
    assert re.search(r"\.jjk-identity-actions button\s*\{[^}]*min-height:\s*48px", css, re.S)
    assert re.search(r"#jjk-identity-input\s*\{[^}]*min-height:\s*48px", css, re.S)
    assert ".jjk-a11y-action:focus-visible" in css


def test_lobby_has_no_meaningful_literal_text_below_ten_pixels():
    lobby = (ROOT / "web/static/phaser/scenes/lobby-scene.js").read_text(encoding="utf-8")
    literal_sizes = [int(value) for value in re.findall(r"fontSize:\s*['\"](\d+)px", lobby)]
    assert literal_sizes
    assert min(literal_sizes) >= 10


def test_queue_review_exposes_semantic_reorder_wild_and_confirmation_controls():
    queue = (ROOT / "web/static/phaser/scenes/combat-queue-review-scene.js").read_text(encoding="utf-8")

    assert "Move ${meta.skill ? meta.skill.name : 'queued action'} earlier in the queue" in queue
    assert "Move ${meta.skill ? meta.skill.name : 'queued action'} later in the queue" in queue
    assert "This action is already first in the queue." in queue
    assert "This action is already last in the queue." in queue
    assert "Assign Wild payment ${wildIndex + 1}" in queue
    assert "ENERGY_NAMES[pay]" in queue
    assert "accessibilityId: 'queue-review-confirm'" in queue
    assert "queueFit.reason || 'The queue cannot be confirmed yet.'" in queue
