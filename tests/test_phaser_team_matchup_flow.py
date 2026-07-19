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


def test_fresh_cpu_and_pvp_matches_review_matchup_before_authoritative_combat():
    probe = _run_node(
        r"""
globalThis.JJK_BOOTSTRAP = { battleV2Enabled: true, firstCreation: { roster: {} } };
globalThis.JJK_MOBILE_TOKENS = {};
globalThis.window = { JJKPhaserShell: null, setTimeout: () => {}, setInterval: () => {} };
globalThis.document = { getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const { GameStore } = await import('./web/static/phaser/store/game-store.js');

function freshStore(mode) {
  const emitted = [];
  const store = Object.create(GameStore.prototype);
  Object.assign(store, {
    matchMode: mode,
    difficulty: 'hard',
    scene: 'DraftScene',
    playerId: 'player',
    playerName: 'Player',
    roomId: 'friends',
    playerTeam: ['yuji', 'megumi', 'nobara'],
    enemyTeam: ['yuta', 'maki', 'toge'],
    detailCharacterId: null,
    lobbyStatus: null,
    matchLaunchPending: false,
    state: null,
    disconnectDeadline: null,
    actions: [],
    actionWildPays: {},
    queueReviewOpen: false,
    selectedCasterSlot: null,
    selectedSkillId: null,
    queueSubmitting: false,
    eventCursor: 0,
    playbackEvents: [],
    recentEvents: [],
    ignoreBattleUpdates: false,
    resumeSession: null,
    firstCreationAccount: null,
    socketClient: { emit: (name, payload) => emitted.push({ name, payload }) },
    changeScene(scene) { this.scene = scene; },
    notify() {},
    showToast(message) { this.toast = message; },
    clearResumeSession() { this.resumeSession = null; },
    mineId() { return 'player'; },
    me() { return { queue_confirmed: false }; },
    ensureSelectedCaster() {},
    ensureWildcardPayments() {},
    rememberResult() {},
  });
  return { store, emitted };
}

const cpu = freshStore('cpu');
cpu.store.startMatch();
const cpuReview = {
  scene: cpu.store.scene,
  returnScene: cpu.store.matchupReturnScene,
  emitted: cpu.emitted.length,
};
cpu.store.returnFromMatchup();
const cpuBack = { scene: cpu.store.scene, emitted: cpu.emitted.length };
cpu.store.startMatch();
cpu.store.startMatch();
const cpuLaunch = {
  scene: cpu.store.scene,
  pending: cpu.store.matchLaunchPending,
  event: cpu.emitted[0].name,
  enemyTeam: cpu.emitted[0].payload.enemy_team,
  difficulty: cpu.emitted[0].payload.difficulty,
};
cpu.store.receiveBattleState({
  phase: 'planning',
  turn_player_id: 'player',
  event_log: [],
  pending_actions: {},
  players: { player: { queue_confirmed: false } },
});
const cpuAccepted = { scene: cpu.store.scene, pending: cpu.store.matchLaunchPending };

const firstCreation = freshStore('cpu');
firstCreation.store.scene = 'FirstCreationScene';
firstCreation.store.startMatch();
const firstCreationReview = {
  scene: firstCreation.store.scene,
  returnScene: firstCreation.store.matchupReturnScene,
  emitted: firstCreation.emitted.length,
};
firstCreation.store.returnFromMatchup();
const firstCreationBack = {
  scene: firstCreation.store.scene,
  emitted: firstCreation.emitted.length,
};

const pendingBack = freshStore('cpu');
pendingBack.store.scene = 'MatchupScene';
pendingBack.store.matchupReturnScene = 'FirstCreationScene';
pendingBack.store.matchLaunchPending = true;
pendingBack.store.returnFromMatchup();

const pvp = freshStore('pvp');
pvp.store.startMatch();
pvp.store.startMatch();
const pvpLaunch = {
  scene: pvp.store.scene,
  pending: pvp.store.matchLaunchPending,
  event: pvp.emitted[0].name,
  hasEnemyTeam: Object.hasOwn(pvp.emitted[0].payload, 'enemy_team'),
};
pvp.store.receiveLobbyState({ status: 'waiting', room_id: 'friends' });
const pvpWaiting = { scene: pvp.store.scene, pending: pvp.store.matchLaunchPending };
pvp.store.returnFromMatchup();
const pvpCancelled = {
  scene: pvp.store.scene,
  leaveEvent: pvp.emitted[pvp.emitted.length - 1].name,
};
pvp.store.receiveLobbyState({ status: 'cancelled', room_id: 'friends' });
const pvpAck = { scene: pvp.store.scene, lobbyStatus: pvp.store.lobbyStatus };

const joinFailed = freshStore('pvp');
joinFailed.store.scene = 'MatchupScene';
joinFailed.store.lobbyStatus = { status: 'join_failed', room_id: 'friends' };
joinFailed.store.resetToLobby();

const resumed = freshStore('pvp');
resumed.store.scene = 'LobbyScene';
resumed.store.matchLaunchPending = true;
resumed.store.receiveBattleState({
  phase: 'planning',
  turn_player_id: 'player',
  event_log: [],
  pending_actions: {},
  players: { player: { queue_confirmed: false } },
});

console.log(JSON.stringify({
  cpuReview,
  cpuBack,
  cpuLaunch,
  cpuAccepted,
  firstCreationReview,
  firstCreationBack,
  pendingBack: { scene: pendingBack.store.scene, pending: pendingBack.store.matchLaunchPending },
  pvpLaunch,
  pvpWaiting,
  pvpCancelled,
  pvpAck,
  joinFailed: {
    scene: joinFailed.store.scene,
    leaveEvent: joinFailed.emitted[joinFailed.emitted.length - 1].name,
  },
  resumed: { scene: resumed.store.scene, pending: resumed.store.matchLaunchPending },
}));
"""
    )

    assert probe["cpuReview"] == {
        "scene": "MatchupScene",
        "returnScene": "DraftScene",
        "emitted": 0,
    }
    assert probe["cpuBack"] == {"scene": "DraftScene", "emitted": 0}
    assert probe["cpuLaunch"] == {
        "scene": "MatchupScene",
        "pending": True,
        "event": "battle_v2_start_classic",
        "enemyTeam": ["yuta", "maki", "toge"],
        "difficulty": "hard",
    }
    assert probe["cpuAccepted"] == {"scene": "CombatScene", "pending": False}
    assert probe["firstCreationReview"] == {
        "scene": "MatchupScene",
        "returnScene": "FirstCreationScene",
        "emitted": 0,
    }
    assert probe["firstCreationBack"] == {
        "scene": "FirstCreationScene",
        "emitted": 0,
    }
    assert probe["pendingBack"] == {"scene": "MatchupScene", "pending": True}
    assert probe["pvpLaunch"] == {
        "scene": "MatchupScene",
        "pending": True,
        "event": "battle_v2_join_pvp",
        "hasEnemyTeam": False,
    }
    assert probe["pvpWaiting"] == {"scene": "MatchupScene", "pending": False}
    assert probe["pvpCancelled"] == {
        "scene": "LobbyScene",
        "leaveEvent": "battle_v2_leave_pvp",
    }
    assert probe["pvpAck"] == {"scene": "LobbyScene", "lobbyStatus": None}
    assert probe["joinFailed"] == {
        "scene": "LobbyScene",
        "leaveEvent": "battle_v2_leave_pvp",
    }
    assert probe["resumed"] == {"scene": "CombatScene", "pending": False}


def test_private_matchup_never_renders_the_local_cpu_roster_as_the_opponent():
    source = (ROOT / "web/static/phaser/scenes/matchup-scene.js").read_text(encoding="utf-8")

    assert "const enemyIds = isCpu ? this.store.enemyTeam.slice(0, 3) : [];" in source
    assert "hidden: !isCpu" in source
    assert "OPPONENT ROSTER HIDDEN" in source
    assert "this.store.returnFromMatchup()" in source
    assert "else this.store.changeScene('DraftScene')" not in source
