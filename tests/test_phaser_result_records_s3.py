import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _node_probe():
    script = r"""
globalThis.window = globalThis;
globalThis.JJK_BOOTSTRAP = {};
await import('./web/static/phaser-design-tokens.js');
const {
  S3_COLORS,
  drawS3World,
  missionRewardModel,
  outcomeVisual,
  recordsLayout,
  recordsModel,
  resultLayout,
  resultModel,
} = await import('./web/static/phaser/ui/season3-master-ui.js');
const { damageEventAmount } = await import('./web/static/phaser/fx/event-metrics.js');
const { GameStore } = await import('./web/static/phaser/store/game-store.js');

const state = {
  winner_id: 'p1',
  result_type: 'WIN',
  turn_number: 8,
  players: {
    p1: {
      name: 'Player One',
      team: [
        { name: 'Yuji Itadori' },
        { name: 'Megumi Fushiguro' },
        { name: 'Nobara Kugisaki' },
      ],
    },
  },
  event_log: [
    { type: 'damage', message: 'Divergent Fist dealt 18 damage', payload: { amount: 18 } },
    { type: 'damage', message: 'Black Flash dealt 44 damage', payload: { amount: 44 } },
    { type: 'damage', message: 'Nail Barrage dealt 7 damage', payload: { amount: 7 } },
  ],
  first_creation_progress: {
    last_completed: ['welcome_to_jujutsu_high'],
    unlocked: ['mission_board'],
  },
};
const profile = {
  completed_missions: ['welcome_to_jujutsu_high'],
  unlocked: ['mission_board', 'future_reward'],
  unlock_details: [
    { id: 'mission_board', title: 'Mission Board', kind: 'system', description: 'Opens missions.', unlocks_after: 'welcome_to_jujutsu_high', owned: true, status: 'owned' },
    { id: 'future_reward', title: 'Future Reward', kind: 'badge', description: 'Not this match.', unlocks_after: 'next_mission', owned: true, status: 'owned' },
  ],
};
const missions = [
  { id: 'welcome_to_jujutsu_high', title: 'Welcome to Jujutsu High' },
  { id: 'next_mission', title: 'The Next Route' },
];

function frame(width, height, safeTop = 0, safeBottom = 0) {
  return {
    x: 0,
    width,
    height,
    gutter: 16,
    safeTop,
    safeBottom,
    top: Math.max(10, safeTop + 10),
    bottom: height - Math.max(14, safeBottom + 10),
  };
}
const sizes = [[360, 800], [390, 844], [430, 932]];
const layouts = [];
for (const safe of [[0, 0], [47, 34]]) {
  for (const [width, height] of sizes) {
    const current = frame(width, height, safe[0], safe[1]);
    layouts.push({ width, height, safe, current, result: resultLayout(current), records: recordsLayout(current) });
  }
}

const worldGradients = [];
const worldGraphics = {
  fillGradientStyle(...args) { worldGradients.push(args); },
  fillRect() {},
  fillStyle() {},
  fillPoints() {},
  lineStyle() {},
  beginPath() {},
  moveTo() {},
  lineTo() {},
  strokePath() {},
  fillTriangle() {},
};
drawS3World({ graphics: worldGraphics, coverImage: () => ({}) }, frame(390, 844), 'world', {
  topAlpha: 0.4,
  bottomAlpha: 0.82,
});

const recordSummary = recordsModel([
  { result: 'Victory', turns: 7, damage: 30, biggest: [{ amount: 30 }] },
  { result: 'Defeat', turns: 11, damage: 12, biggest: [{ amount: 12 }] },
  { result: 'Draw', turns: 19, damage: 20, biggest: [{ amount: 20 }] },
  { result: 'No Contest', turns: 1, damage: 0, biggest: [] },
]);

const metricEvents = [
  { type: 'damage', message: 'Direct damage', payload: { amount: 18 } },
  { type: 'damage', message: 'Partially shielded damage', payload: { amount: 40, actual_hp_damage: 6 } },
  { type: 'status_damage', message: 'Affliction damage', payload: { amount: 7 } },
  { type: 'health_steal', message: 'Health stolen', payload: { amount: 5 } },
  { type: 'heal', message: 'Recovered 80 HP', payload: { amount: 80 } },
  { type: 'status_applied', message: 'Gained four stacks', payload: { amount: 4 } },
  { type: 'damage_reduced', message: 'Prevented 10 damage', payload: { amount: 10 } },
  { type: 'damage', message: 'Blocked damage', payload: { amount: 25, actual_hp_damage: 0 } },
];
const metricState = {
  winner_id: 'p1',
  result_type: 'WIN',
  turn_number: 4,
  players: { p1: { name: 'Player One', team: [] }, p2: { name: 'CPU', team: [] } },
  event_log: metricEvents,
};
const recordStore = {
  records: [],
  mineId: () => 'p1',
  saveRecords: () => {},
};
GameStore.prototype.rememberResult.call(recordStore, metricState);

console.log(JSON.stringify({
  result: resultModel(state, 'p1'),
  draw: resultModel({ result_type: 'DRAW', winner_id: null, turn_number: 3, players: {}, event_log: [] }, 'p1'),
  noContest: resultModel({ result_type: 'NO_CONTEST', winner_id: null, turn_number: 1, players: {}, event_log: [] }, 'p1'),
  drawVisual: outcomeVisual('draw'),
  noContestVisual: outcomeVisual('no_contest'),
  lossVisual: outcomeVisual('loss'),
  rewards: missionRewardModel(state, profile, missions),
  records: recordSummary,
  filteredResult: resultModel(metricState, 'p1'),
  filteredRecord: recordStore.records[0],
  damageEventAmounts: metricEvents.map((event) => damageEventAmount(event)),
  layouts,
  worldGradient: worldGradients[0],
  lightWorldColors: [S3_COLORS.boneBright, S3_COLORS.smoke, S3_COLORS.bone, S3_COLORS.boneBright],
  vermilion: S3_COLORS.vermilion,
}));
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


def test_result_metrics_and_rewards_are_current_match_authoritative():
    probe = _node_probe()
    result = probe["result"]
    assert result["outcome"] == "win"
    assert result["turns"] == 8
    assert result["damage"] == 69
    assert result["strikes"][0]["amount"] == 44
    assert result["winnerName"] == "Player One"
    assert result["winnerTeam"] == ["Yuji Itadori", "Megumi Fushiguro", "Nobara Kugisaki"]

    rewards = probe["rewards"]
    assert rewards["lastCompleted"] == ["welcome_to_jujutsu_high"]
    assert rewards["missionTitles"] == ["Welcome to Jujutsu High"]
    assert [reward["title"] for reward in rewards["rewards"]] == ["Mission Board"]
    assert "Future Reward" not in [reward["title"] for reward in rewards["rewards"]]
    assert rewards["completedCount"] == 1
    assert rewards["totalMissions"] == 2


def test_result_and_stored_records_count_only_authoritative_damage_events():
    probe = _node_probe()
    assert probe["damageEventAmounts"] == [18, 6, 7, 5, 0, 0, 0, 0]

    result = probe["filteredResult"]
    assert result["damage"] == 36
    assert [strike["amount"] for strike in result["strikes"]] == [18, 7, 6]
    assert all(strike["type"] not in {"heal", "status_applied", "damage_reduced"} for strike in result["strikes"])

    record = probe["filteredRecord"]
    assert record["damage"] == 36
    assert [strike["amount"] for strike in record["biggest"]] == [18, 7, 6]
    assert all(strike["type"] not in {"heal", "status_applied", "damage_reduced"} for strike in record["biggest"])


def test_draw_and_no_contest_remain_visually_neutral():
    probe = _node_probe()
    assert probe["draw"]["outcome"] == "draw"
    assert probe["noContest"]["outcome"] == "no_contest"
    assert probe["drawVisual"]["neutral"] is True
    assert probe["noContestVisual"]["neutral"] is True
    assert probe["drawVisual"]["accent"] != probe["vermilion"]
    assert probe["noContestVisual"]["accent"] != probe["vermilion"]
    assert probe["lossVisual"]["accent"] == probe["vermilion"]


def test_records_summary_preserves_all_terminal_outcomes():
    model = _node_probe()["records"]
    assert model["counts"] == {"win": 1, "loss": 1, "draw": 1, "no_contest": 1, "unknown": 0}
    assert model["total"] == 4
    assert model["totalDamage"] == 62
    assert model["fastestWin"] == 7
    assert model["biggestHit"] == 30


def test_result_and_records_layouts_respect_supported_safe_frames():
    for entry in _node_probe()["layouts"]:
        frame = entry["current"]
        result = entry["result"]
        records = entry["records"]

        assert result["header"]["y"] >= frame["top"]
        assert result["header"]["y"] + result["header"]["h"] <= result["hero"]["y"]
        assert result["hero"]["y"] + result["hero"]["h"] <= result["metrics"]["y"]
        assert result["metrics"]["y"] + result["metrics"]["h"] <= result["strikes"]["y"]
        assert result["strikes"]["y"] + result["strikes"]["h"] <= result["rewards"]["y"]
        assert result["rewards"]["h"] >= 112
        assert result["rewards"]["y"] + result["rewards"]["h"] <= result["buttons"]["rematch"]["y"]
        assert result["buttons"]["rematch"]["h"] >= 44
        assert result["buttons"]["lobby"]["h"] >= 44
        assert result["buttons"]["lobby"]["y"] + result["buttons"]["lobby"]["h"] <= frame["bottom"]

        assert records["header"]["y"] >= frame["top"]
        assert records["header"]["y"] + records["header"]["h"] <= records["overview"]["y"]
        assert records["overview"]["y"] + records["overview"]["h"] <= records["stats"]["y"]
        assert records["stats"]["y"] + records["stats"]["h"] <= records["list"]["y"]
        assert records["list"]["maxRows"] >= 5
        rows_bottom = records["list"]["y"] + records["list"]["maxRows"] * records["list"]["rowH"] + max(0, records["list"]["maxRows"] - 1) * records["list"]["rowGap"]
        assert rows_bottom <= records["pager"]["y"]
        assert records["pager"]["h"] >= 44
        assert records["pager"]["y"] + records["pager"]["h"] <= records["lobby"]["y"]
        assert records["lobby"]["h"] >= 44
        assert records["lobby"]["y"] + records["lobby"]["h"] <= frame["bottom"]


def test_post_match_world_grade_stays_in_the_light_bone_smoke_system():
    probe = _node_probe()
    assert probe["worldGradient"][:4] == probe["lightWorldColors"]


def test_scenes_use_master_world_and_preserve_navigation_contracts():
    result = (ROOT / "web/static/phaser/scenes/result-scene.js").read_text(encoding="utf-8")
    records = (ROOT / "web/static/phaser/scenes/records-scene.js").read_text(encoding="utf-8")
    master = (ROOT / "web/static/phaser/ui/season3-master-ui.js").read_text(encoding="utf-8")

    assert "const STORM_WORLD_KEY = 'culling-current-rooftop';" in result
    assert "const STORM_WORLD_KEY = 'culling-current-campus';" in records
    assert "drawS3World" in result and "drawS3World" in records
    assert "S3_COLORS.barrier" in master
    assert "strokeWidth" in master
    assert "first_creation_progress" in master
    assert "unlock_details" in master

    assert "this.store.records[0]" not in result
    assert "this.store.activeMission()" not in result
    assert "resultModel(state, this.store.mineId())" in result
    assert "missionRewardModel(state, this.store.firstCreationProfile(), this.store.missions())" in result
    assert "recordsModel(this.store.records)" in records
    assert "this.recordsPage" in records
    assert "slice(start, start + region.maxRows)" in records
    assert "this.render();" not in records

    assert "this.store.changeScene('DraftScene')" in result
    assert "this.store.resetToLobby()" in result
    assert "this.store.changeScene('LobbyScene')" in records
    assert "?v=28" in result and "?v=28" in records and "?v=28" in master
