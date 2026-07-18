import json
import subprocess
from pathlib import Path

from jjk_arena.battle_v2.starter_roster import first_creation_payload


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


def test_season_three_creation_and_mission_regions_fit_supported_safe_frames():
    probe = _run_node(
        r"""
globalThis.JJK_MOBILE_TOKENS = {};
globalThis.JJK_BOOTSTRAP = {};
const { firstCreationS3Layout, missionMapS3Layout } = await import('./web/static/phaser/ui/season-three-ui.js');
const frames = [];
for (const safe of [false, true]) {
  for (const [width, height] of [[360, 800], [390, 844], [430, 932]]) {
    const top = safe ? 57 : 10;
    const bottom = safe ? height - 44 : height - 14;
    const frame = { x: 0, width, height, gutter: 16, top, bottom, fullWidth: width, fullHeight: height };
    const creation = firstCreationS3Layout(frame);
    const mission = missionMapS3Layout(frame);
    const rowsThatFit = Math.max(0, Math.floor(
      (creation.pager.y - creation.roster.y + creation.roster.gap)
      / (creation.roster.cardH + creation.roster.gap)
    ));
    const rows = Math.min(width >= 430 ? 2 : 1, rowsThatFit);
    const creationCardsBottom = creation.roster.y
      + rows * creation.roster.cardH
      + Math.max(0, rows - 1) * creation.roster.gap;
    const missionCardsBottom = mission.cards.y
      + mission.cards.pageSize * mission.cards.h
      + Math.max(0, mission.cards.pageSize - 1) * mission.cards.gap;
    frames.push({ width, height, safe, top, bottom, rows, creation, creationCardsBottom, mission, missionCardsBottom });
  }
}
console.log(JSON.stringify({ frames }));
"""
    )

    for entry in probe["frames"]:
        creation = entry["creation"]
        mission = entry["mission"]
        assert creation["header"]["y"] >= entry["top"]
        assert creation["mission"]["y"] >= creation["header"]["bottom"]
        assert entry["rows"] >= 1
        assert entry["creationCardsBottom"] <= creation["pager"]["y"]
        assert creation["pager"]["h"] >= 44
        assert creation["pager"]["y"] + creation["pager"]["h"] <= creation["cta"]["y"]
        assert creation["cta"]["h"] >= 44
        assert creation["cta"]["y"] + creation["cta"]["h"] <= entry["bottom"]

        assert mission["route"]["y"] >= mission["header"]["bottom"]
        assert entry["missionCardsBottom"] <= mission["locked"]["y"]
        assert mission["locked"]["y"] + mission["locked"]["h"] <= mission["pager"]["y"]
        assert mission["pager"]["y"] + mission["pager"]["h"] <= mission["cta"]["y"]
        assert mission["cta"]["y"] + mission["cta"]["h"] <= entry["bottom"]
        assert mission["cards"]["pageSize"] == (2 if entry["width"] == 430 else 1)


def test_season_three_boot_and_draft_regions_fit_supported_safe_frames():
    probe = _run_node(
        r"""
globalThis.JJK_MOBILE_TOKENS = {};
globalThis.JJK_BOOTSTRAP = {};
const { bootS3Layout, draftS3Layout } = await import('./web/static/phaser/ui/season-three-ui.js');
const frames = [];
for (const safe of [false, true]) {
  for (const [width, height] of [[360, 800], [390, 844], [430, 932]]) {
    const top = safe ? 57 : 10;
    const bottom = safe ? height - 44 : height - 14;
    const frame = { x: 0, width, height, gutter: 16, top, bottom, fullWidth: width, fullHeight: height };
    const boot = bootS3Layout(frame);
    const drafts = [true, false].map((cpu) => {
      const draft = draftS3Layout(frame, { cpu });
      const rows = Math.max(1, Math.floor(
        (draft.pager.y - draft.roster.y + draft.roster.gap)
        / (draft.roster.cardH + draft.roster.gap)
      ));
      const cardsBottom = draft.roster.y
        + rows * draft.roster.cardH
        + Math.max(0, rows - 1) * draft.roster.gap;
      return { cpu, draft, rows, cardsBottom };
    });
    frames.push({ top, bottom, boot, drafts });
  }
}
console.log(JSON.stringify({ frames }));
"""
    )

    for entry in probe["frames"]:
        boot = entry["boot"]
        assert boot["sigil"]["y"] >= entry["top"]
        assert boot["title"]["y"] >= boot["sigil"]["y"] + boot["sigil"]["h"]
        assert boot["meter"]["y"] + boot["meter"]["h"] <= boot["enter"]["y"]
        assert boot["enter"]["h"] >= 44
        assert boot["enter"]["y"] + boot["enter"]["h"] <= entry["bottom"]

        for draft_entry in entry["drafts"]:
            draft = draft_entry["draft"]
            assert draft["header"]["y"] >= entry["top"]
            assert draft["player"]["y"] >= draft["header"]["bottom"]
            if draft_entry["cpu"]:
                assert draft["enemy"] is not None
                assert draft["difficulty"] is not None
                assert draft["difficulty"]["h"] >= 44
                assert draft["enemy"]["y"] >= draft["player"]["y"] + draft["player"]["h"]
            else:
                assert draft["enemy"] is None
                assert draft["difficulty"] is None
            assert draft["targets"]["h"] >= 44
            assert draft_entry["rows"] >= 1
            assert draft_entry["cardsBottom"] <= draft["pager"]["y"]
            assert draft["pager"]["h"] >= 44
            assert draft["pager"]["y"] + draft["pager"]["h"] <= draft["cta"]["y"]
            assert draft["cta"]["h"] >= 44
            assert draft["cta"]["y"] + draft["cta"]["h"] <= entry["bottom"]


def test_first_creation_navigation_is_atomic_and_cpu_safe():
    probe = _run_node(
        r"""
globalThis.JJK_BOOTSTRAP = { firstCreation: { roster: {
  alpha: { id: 'alpha', name: 'Alpha', skills: [] },
  beta: { id: 'beta', name: 'Beta', skills: [] },
  gamma: { id: 'gamma', name: 'Gamma', skills: [] },
} } };
globalThis.window = { JJK_BOOT: {}, setTimeout: () => {}, setInterval: () => {}, __phaserShellDebug: null };
globalThis.document = { getElementById: () => null };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const { GameStore } = await import('./web/static/phaser/store/game-store.js');

function freshStore() {
  const store = Object.create(GameStore.prototype);
  store.matchMode = 'pvp';
  store.draftTarget = 'enemyTeam';
  store.detailCharacterId = 'alpha';
  store.playerTeam = [];
  store.scene = null;
  store.changeScene = (scene) => { store.scene = scene; };
  store.showToast = (message) => { store.toast = message; };
  return store;
}

const direct = freshStore();
direct.openFirstCreation();
const recommended = freshStore();
recommended.applyRecommendedTeam({ recommended_team: ['alpha', 'beta', 'gamma'] });
console.log(JSON.stringify({
  direct: {
    mode: direct.matchMode,
    target: direct.draftTarget,
    detail: direct.detailCharacterId,
    scene: direct.scene,
  },
  recommended: {
    mode: recommended.matchMode,
    target: recommended.draftTarget,
    detail: recommended.detailCharacterId,
    scene: recommended.scene,
    team: recommended.playerTeam,
  },
}));
"""
    )

    assert probe["direct"] == {
        "mode": "cpu",
        "target": "playerTeam",
        "detail": None,
        "scene": "FirstCreationScene",
    }
    assert probe["recommended"] == {
        "mode": "cpu",
        "target": "playerTeam",
        "detail": None,
        "scene": "FirstCreationScene",
        "team": ["alpha", "beta", "gamma"],
    }


def test_season_three_creation_keeps_the_locked_nineteen_starter_roster():
    roster = first_creation_payload()["roster"]

    assert [character["name"] for character in roster.values()] == [
        "Yuji Itadori",
        "Megumi Fushiguro",
        "Nobara Kugisaki",
        "Maki Zenin",
        "Toge Inumaki",
        "Panda",
        "Aoi Todo",
        "Noritoshi Kamo",
        "Momo Nishimiya",
        "Mai Zenin",
        "Kasumi Miwa",
        "Kokichi Muta / Mechamaru",
        "Junpei Yoshino",
        "Satoru Gojo (Young)",
        "Suguru Geto (Young)",
        "Shoko Ieiri (Young)",
        "Utahime Iori (Young)",
        "Mei Mei (Young)",
        "Yuta Okkotsu (JJK 0)",
    ]


def test_creation_and_mission_scenes_use_scoped_s3_components_without_data_drift():
    helper = (ROOT / "web/static/phaser/ui/season-three-ui.js").read_text(encoding="utf-8")
    creation = (ROOT / "web/static/phaser/scenes/first-creation-scene.js").read_text(encoding="utf-8")
    missions = (ROOT / "web/static/phaser/scenes/mission-map-scene.js").read_text(encoding="utf-8")
    lobby = (ROOT / "web/static/phaser/scenes/lobby-scene.js").read_text(encoding="utf-8")

    assert "bone:" in helper
    assert "smoke:" in helper
    assert "drawS3World" in helper
    assert "drawS3Panel" in helper
    assert "S3_COLORS.red" in helper
    assert "S3_COLORS.cyan" in helper

    assert "worldBackdrop" not in creation
    assert "const FIRST_CREATION_WORLD_KEY = 'culling-current-campus';" in creation
    assert "dossierHeader" not in creation
    assert "platePanel" not in creation
    assert "shortText(" not in creation
    assert "this.store.rosterEntries()" in creation
    assert "this.store.presetEntries()" in creation
    assert "renderStarterRosterCard" in creation
    assert "renderCharacterDetailSheet" in creation
    assert "(character.skills || []).slice(0, 4)" in creation
    assert "this.store.startMatch()" in creation

    assert "worldBackdrop" not in missions
    assert "const MISSION_WORLD_KEY = 'culling-current-map';" in missions
    assert "dossierHeader" not in missions
    assert "platePanel" not in missions
    assert "shortText(" not in missions
    assert "this.store.missions()" in missions
    assert "this.store.firstCreationProfile()" in missions
    assert "const objectives = (mission.objectives || []).slice();" in missions
    assert "this.store.applyRecommendedTeam(mission)" in missions
    assert "this.store.openFirstCreation()" in missions
    assert "this.render();" not in missions
    assert "this.store.openFirstCreation()" in lobby


def test_boot_and_draft_scenes_use_scoped_s3_components_and_keep_draft_contracts():
    helper = (ROOT / "web/static/phaser/ui/season-three-ui.js").read_text(encoding="utf-8")
    boot = (ROOT / "web/static/phaser/scenes/boot-scene.js").read_text(encoding="utf-8")
    draft = (ROOT / "web/static/phaser/scenes/draft-scene.js").read_text(encoding="utf-8")

    assert "bootS3Layout" in helper
    assert "draftS3Layout" in helper
    assert "worldBackdrop" not in boot
    assert "drawS3World" in boot
    assert "combat-underpass-night" not in boot
    assert "underpass-courtyard-night.png" not in boot
    assert "culling-current-home" in boot
    assert "culling-current-campus" in boot
    assert "culling-current-map" in boot
    assert "'JJK Arena'" in boot
    assert "'Culling Game'" not in boot

    assert "worldBackdrop" not in draft
    assert "drawS3World" in draft
    assert "drawS3Panel" in draft
    assert "drawS3Button" in draft
    assert "culling-current-campus" in draft
    assert "JJK ARENA / CPU MATCHUP" in draft
    assert "CULLING GAME / CPU MATCHUP" not in draft
    assert "this.store.setDraftTarget('playerTeam')" in draft
    assert "this.store.setDraftTarget('enemyTeam')" in draft
    assert "this.store.setDifficulty(level)" in draft
    assert "this.store.toggleTeamPick(teamKey, character.id)" in draft
    assert "this.store.startMatch()" in draft
