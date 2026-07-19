import json
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


def test_fast_socket_resume_during_boot_defers_manager_mutation_and_routes_once():
    probe = _run_node(
        r"""
globalThis.JJK_BOOTSTRAP = { battleV2Enabled: true, firstCreation: { roster: {} } };
globalThis.JJK_MOBILE_TOKENS = {};
globalThis.Phaser = { Scene: class {} };
globalThis.document = { getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };

const active = new Set(['BootScene']);
const managerStarts = [];
const managerStops = [];
const sceneManager = {
  isActive(key) { return active.has(key); },
  start(key) { managerStarts.push(key); active.add(key); },
  stop(key) { managerStops.push(key); active.delete(key); },
};
globalThis.window = {
  JJKPhaserShell: { bootReady: false, game: { scene: sceneManager } },
  setTimeout: () => {},
  setInterval: () => {},
};

const { GameStore } = await import('./web/static/phaser/store/game-store.js');
const { BootScene } = await import('./web/static/phaser/scenes/boot-scene.js');

let notifications = 0;
const store = Object.create(GameStore.prototype);
Object.assign(store, {
  scene: 'LobbyScene',
  playerId: 'player',
  ignoreBattleUpdates: false,
  eventCursor: 0,
  playbackEvents: [],
  recentEvents: [],
  state: null,
  disconnectDeadline: null,
  lobbyStatus: null,
  queueSubmitting: false,
  matchLaunchPending: true,
  actions: [],
  actionWildPays: {},
  queueReviewOpen: false,
  selectedCasterSlot: null,
  selectedSkillId: null,
  firstCreationAccount: null,
  listeners: new Set(),
  mineId() { return 'player'; },
  me() { return this.state && this.state.players.player; },
  ensureWildcardPayments() {},
  ensureSelectedCaster() {},
  rememberResult() {},
  notify() { notifications += 1; },
});

const resumedState = {
  phase: 'planning',
  turn_player_id: 'player',
  event_log: [],
  pending_actions: {},
  players: { player: { queue_confirmed: false, team: [] } },
};

// A resume response arrives while Boot owns the only active Phaser loader.
store.receiveBattleState(resumedState);
const beforeBootExit = {
  destination: store.scene,
  managerStarts: managerStarts.slice(),
  managerStops: managerStops.slice(),
  bootReady: window.JJKPhaserShell.bootReady,
};

let delayedTransition = null;
const bootStarts = [];
const boot = {
  hasEnteredLobby: false,
  store,
  presentationSettings: { effectiveReducedMotion: () => false },
  cameras: { main: { fadeOut() {} } },
  time: { delayedCall(_delay, callback) { delayedTransition = callback; } },
  scene: { start(key) { bootStarts.push(key); } },
};
BootScene.prototype.enterLobby.call(boot);

// A second authoritative update during the fade still must not touch Phaser's
// manager; Boot resolves the latest stored destination when its one callback runs.
store.receiveBattleState(resumedState);
const duringBootFade = {
  destination: store.scene,
  managerStarts: managerStarts.slice(),
  managerStops: managerStops.slice(),
  bootReady: window.JJKPhaserShell.bootReady,
};
delayedTransition();
BootScene.prototype.enterLobby.call(boot); // idempotence guard: no second route.

// Once Boot is inactive, later navigation keeps the normal manager behavior.
active.delete('BootScene');
active.add('CombatScene');
store.changeScene('ResultScene');

console.log(JSON.stringify({
  beforeBootExit,
  duringBootFade,
  bootStarts,
  afterBoot: {
    destination: store.scene,
    managerStarts,
    managerStops,
    notifications,
  },
}));
"""
    )

    assert probe["beforeBootExit"] == {
        "destination": "CombatScene",
        "managerStarts": [],
        "managerStops": [],
        "bootReady": False,
    }
    assert probe["duringBootFade"] == {
        "destination": "CombatScene",
        "managerStarts": [],
        "managerStops": [],
        "bootReady": True,
    }
    assert probe["bootStarts"] == ["CombatScene"]
    assert probe["afterBoot"] == {
        "destination": "ResultScene",
        "managerStarts": ["ResultScene"],
        "managerStops": ["CombatScene"],
        "notifications": 3,
    }
