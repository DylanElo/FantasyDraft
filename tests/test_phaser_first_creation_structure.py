import json
import subprocess
from pathlib import Path

from jjk_arena.battle_v2.starter_roster import first_creation_payload


ROOT = Path(__file__).resolve().parents[1]
SCENE = ROOT / "web" / "static" / "phaser" / "scenes" / "first-creation-scene.js"


def _run_node(script: str) -> dict:
    result = subprocess.run(
        ["node", "--input-type=module", "-"],
        input=script,
        text=True,
        capture_output=True,
        cwd=ROOT,
        check=True,
    )
    return json.loads(result.stdout)


def test_character_led_creation_and_full_screen_study_fit_supported_phones():
    probe = _run_node(
        r"""
globalThis.Phaser = { Scene: class { constructor() {} } };
globalThis.JJK_MOBILE_TOKENS = {};
globalThis.JJK_BOOTSTRAP = {};
const { FirstCreationScene } = await import('./web/static/phaser/scenes/first-creation-scene.js');
const scene = new FirstCreationScene();
const cases = [];
for (const safe of [false, true]) {
  for (const [width, height] of [[360, 800], [390, 844], [430, 932]]) {
    const top = safe ? 57 : 10;
    const bottom = safe ? height - 44 : height - 14;
    const frame = { x: 0, width, height, top, bottom, fullWidth: width, fullHeight: height, gutter: 16 };
    cases.push({ safe, width, height, top, bottom, main: scene.firstCreationLayout(frame), study: scene.characterStudyLayout(frame) });
  }
}
console.log(JSON.stringify({ cases }));
"""
    )

    for entry in probe["cases"]:
        main = entry["main"]
        study = entry["study"]

        assert main["header"]["y"] >= entry["top"]
        assert main["trio"]["y"] >= main["header"]["bottom"]
        assert main["trio"]["h"] >= 98
        assert main["filters"]["y"] >= main["trio"]["y"] + main["trio"]["h"]
        assert main["filters"]["h"] >= 44
        assert main["featured"]["y"] >= main["filters"]["y"] + main["filters"]["h"]
        assert main["featured"]["w"] == entry["width"] - 20
        assert main["featured"]["h"] >= 343
        assert main["featured"]["y"] + main["featured"]["h"] <= main["pager"]["y"]
        assert main["pager"]["h"] >= 44
        assert main["pager"]["y"] + main["pager"]["h"] <= main["cta"]["y"]
        assert main["cta"]["h"] >= 44
        assert main["cta"]["y"] + main["cta"]["h"] <= entry["bottom"]

        assert study["header"]["y"] >= entry["top"]
        assert study["hero"]["y"] >= study["header"]["bottom"]
        assert study["hero"]["w"] == entry["width"] - 20
        assert study["hero"]["h"] >= 248
        assert study["skill"]["y"] >= study["hero"]["y"] + study["hero"]["h"]
        assert study["skill"]["h"] >= 252
        # Six 15px description lines begin at +150 and retain a 12px gutter.
        assert study["skill"]["y"] + 150 + (6 * 15) + 12 <= study["skill"]["y"] + study["skill"]["h"]
        assert study["skill"]["y"] + study["skill"]["h"] <= study["pager"]["y"]
        assert study["pager"]["h"] >= 44
        assert study["pager"]["y"] + study["pager"]["h"] <= study["cta"]["y"]
        assert study["cta"]["h"] >= 44
        assert study["cta"]["y"] + study["cta"]["h"] <= entry["bottom"]


def test_creation_browser_preserves_canonical_order_and_filter_coverage():
    roster = first_creation_payload()["roster"]
    alphabetized_roster = dict(sorted(roster.items()))
    probe = _run_node(
        f"""
globalThis.Phaser = {{ Scene: class {{ constructor() {{}} }} }};
globalThis.JJK_MOBILE_TOKENS = {{}};
globalThis.JJK_BOOTSTRAP = {{ firstCreation: {{ roster: {json.dumps(alphabetized_roster)} }} }};
const {{ FirstCreationScene }} = await import('./web/static/phaser/scenes/first-creation-scene.js');
const scene = new FirstCreationScene();
const result = {{}};
for (const filter of ['all', 'tokyo', 'kyoto', 'special']) {{
  scene.creationFilter = filter;
  result[filter] = scene.filteredRoster().map((character) => character.name);
}}
console.log(JSON.stringify(result));
"""
    )

    assert probe["all"] == [character["name"] for character in roster.values()]
    assert len(probe["all"]) == 19
    assert len(probe["tokyo"]) == 6
    assert len(probe["kyoto"]) == 6
    assert len(probe["special"]) == 7
    assert set(probe["tokyo"] + probe["kyoto"] + probe["special"]) == set(probe["all"])


def test_first_creation_is_not_the_deprecated_dashboard_or_two_column_roster():
    source = SCENE.read_text(encoding="utf-8")

    assert "extends BaseScene" in source
    assert "firstCreationLayout(frame)" in source
    assert "renderTrioSlots" in source
    assert "renderFeaturedCharacter" in source
    assert "renderCharacterStudy" in source
    assert "renderAuthoritativeSkill" in source
    assert "Open character study:" in source
    assert "Review Matchup" in source

    assert "this.store.presetEntries()" not in source
    assert "renderPresetTile" not in source
    assert "renderMissionHeader" not in source
    assert "renderStarterRosterCard" not in source
    assert "renderCharacterDetailSheet" not in source
    assert "index % 2" not in source
    assert "slice(0, 4)" not in source


def test_character_study_reads_every_authoritative_profile_and_skill_field():
    source = SCENE.read_text(encoding="utf-8")

    assert "character.name" in source
    assert "character.era" in source
    assert "character.role" in source
    assert "character.state" in source
    assert "character.tags || []" in source
    assert "const skills = character.skills || [];" in source
    assert "skill.name" in source
    assert "skill.cost || []" in source
    assert "skill.cooldown" in source
    assert "skill && skill.target_rule" in source
    assert "rule.min_targets" in source
    assert "rule.max_targets" in source
    assert "rule.allow_self" in source
    assert "rule.allow_dead" in source
    assert "rule.required_status" in source
    assert "skill.classes || []" in source
    assert "skill.text" in source
    assert "skillVisualFor(skill)" in source
    assert "visual.kind === 'replacement'" in source
    assert "Number.isInteger(visual.slot)" in source
    assert "startsWith('replacement:')" not in source
    assert "this.studyEntryRenders = 2" in source
    assert "this.studySkillTransition" in source
    assert "this.presentationLayer.sceneIntro" in source
    assert "this.store.toggleTeamPick('playerTeam', character.id)" in source
    assert "this.store.closeCharacterDetail()" in source

    payload = first_creation_payload()["roster"]
    assert len(payload) == 19
    assert sum(len(character["skills"]) for character in payload.values()) == 78
    assert all(skill["name"] and skill["text"] for character in payload.values() for skill in character["skills"])
