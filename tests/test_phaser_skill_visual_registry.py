import json
import math
import subprocess
from pathlib import Path

from jjk_arena.battle_v2.starter_roster import FIRST_CREATION_ROSTER


ROOT = Path(__file__).resolve().parents[1]
ATLAS = ROOT / "web" / "static" / "assets" / "skills" / "culling-current" / "skill-action-atlas-v2.png"


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


def _shipping_skill_ids() -> list[str]:
    return [skill.id for character in FIRST_CREATION_ROSTER.values() for skill in character.skills]


def test_all_78_shipping_skill_ids_have_stable_visual_metadata_and_atlas_frames():
    probe = _run_node(
        r"""
const registry = await import('./web/static/phaser/core/skill-visual-registry.js');
const entries = registry.skillVisualEntries();
let missingRaised = false;
try { registry.assertSkillVisualCoverage(['fc_missing_skill']); } catch (error) { missingRaised = /fc_missing_skill/.test(error.message); }
console.log(JSON.stringify({
  atlas: registry.SKILL_ACTION_ATLAS,
  ids: registry.SKILL_VISUAL_IDS,
  entries,
  coverage: registry.skillVisualCoverage(registry.SKILL_VISUAL_IDS),
  unknown: registry.skillVisualFor('fc_missing_skill'),
  missingRaised,
  idsFrozen: Object.isFrozen(registry.SKILL_VISUAL_IDS),
  registryFrozen: Object.isFrozen(registry.SKILL_VISUALS),
  nestedFrozen: entries.every((entry) => Object.isFrozen(entry) && Object.isFrozen(entry.icon) && Object.isFrozen(entry.palette) && Object.isFrozen(entry.art) && Object.isFrozen(entry.art.crop)),
}));
"""
    )

    shipping_ids = _shipping_skill_ids()
    assert len(shipping_ids) == 78
    assert probe["ids"] == shipping_ids
    assert probe["coverage"] == {"complete": True, "missing": [], "unexpected": []}
    assert probe["unknown"] is None
    assert probe["missingRaised"] is True
    assert probe["idsFrozen"] is True
    assert probe["registryFrozen"] is True
    assert probe["nestedFrozen"] is True

    atlas = probe["atlas"]
    assert atlas == {
        "key": "s3-skill-action-atlas-v2",
        "path": "/static/assets/skills/culling-current/skill-action-atlas-v2.png",
        "sourceWidth": 1254,
        "sourceHeight": 1254,
        "columns": 4,
        "rows": 4,
        "frameCount": 16,
    }

    entries = probe["entries"]
    assert len({entry["icon"]["motif"] for entry in entries}) == 78
    assert len({entry["icon"]["sigil"] for entry in entries}) == 78
    assert len({entry["art"]["variant"] for entry in entries}) == 78
    assert {entry["art"]["frame"] for entry in entries} == set(range(16))

    for entry in entries:
        assert entry["id"] in shipping_ids
        assert entry["characterId"] in FIRST_CREATION_ROSTER
        assert entry["slot"] in {0, 1, 2, 3}
        assert entry["kind"] in {"primary", "replacement"}
        assert entry["icon"]["form"]
        assert entry["icon"]["rings"] in {1, 2, 3}
        assert 3 <= entry["icon"]["spokes"] <= 8
        assert entry["palette"]["family"] in {"body", "technique", "focus", "curse"}
        assert isinstance(entry["palette"]["accent"], int)
        assert entry["art"]["textureKey"] == atlas["key"]
        assert entry["art"]["atlasKey"] == atlas["key"]
        assert entry["art"]["atlasPath"] == atlas["path"]
        assert 0 <= entry["art"]["frame"] < 16
        assert entry["art"]["column"] == entry["art"]["frame"] % 4
        assert entry["art"]["row"] == entry["art"]["frame"] // 4
        assert entry["art"]["crop"] == {
            "u": entry["art"]["column"] / 4,
            "v": entry["art"]["row"] / 4,
            "width": 0.25,
            "height": 0.25,
        }
        assert 0 <= entry["art"]["focalX"] <= 1
        assert 0 <= entry["art"]["focalY"] <= 1
        assert entry["motion"]["profile"] in {
            "strike",
            "projectile",
            "guard",
            "control",
            "support",
            "reveal",
            "finisher",
        }


def test_replacements_keep_original_slot_identity_in_the_visual_registry():
    probe = _run_node(
        r"""
const { skillVisualFor } = await import('./web/static/phaser/core/skill-visual-registry.js');
console.log(JSON.stringify({
  geto: skillVisualFor('fc_suguru_geto_young_compressed_uzumaki'),
  yuta: skillVisualFor('fc_yuta_okkotsu_jjk0_cursed_speech_megaphone'),
}));
"""
    )

    assert probe["geto"]["kind"] == "replacement"
    assert probe["geto"]["slot"] == 0
    assert probe["geto"]["replacementFor"] == "fc_suguru_geto_young_swarm_curse"
    assert probe["yuta"]["kind"] == "replacement"
    assert probe["yuta"]["slot"] == 2
    assert probe["yuta"]["replacementFor"] == "fc_yuta_okkotsu_jjk0_rikas_curse"


def test_atlas_frame_and_focal_crops_stay_inside_their_4_by_4_cells():
    probe = _run_node(
        r"""
const registry = await import('./web/static/phaser/core/skill-visual-registry.js');
const visuals = await import('./web/static/phaser/ui/skill-visuals.js');
const crops = registry.SKILL_VISUAL_IDS.map((id) => ({
  id,
  frame: visuals.skillAtlasFrameRect(id, 1254, 1254),
  crop: visuals.skillArtCropRect(id, 1254, 1254, 88, 132),
}));
console.log(JSON.stringify({ crops }));
"""
    )

    for entry in probe["crops"]:
        frame = entry["frame"]
        crop = entry["crop"]
        assert frame["width"] in {313, 314}
        assert frame["height"] in {313, 314}
        assert frame["x"] <= crop["x"]
        assert frame["y"] <= crop["y"]
        assert crop["x"] + crop["width"] <= frame["x"] + frame["width"] + 1e-8
        assert crop["y"] + crop["height"] <= frame["y"] + frame["height"] + 1e-8
        assert math.isclose(crop["width"] / crop["height"], 88 / 132, rel_tol=1e-10)


def test_action_atlas_exists_at_the_registered_runtime_path_and_is_1254_square():
    data = ATLAS.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    assert int.from_bytes(data[16:20], "big") == 1254
    assert int.from_bytes(data[20:24], "big") == 1254


def test_skill_art_renderer_uses_true_atlas_crop_origin_and_crop_relative_scale():
    probe = _run_node(
        r"""
const { drawSkillArtCrop } = await import('./web/static/phaser/ui/skill-visuals.js');
const calls = {};
const image = {
  setOrigin(x, y) { calls.origin = [x, y]; return this; },
  setCrop(x, y, width, height) { calls.crop = [x, y, width, height]; return this; },
  setScale(x, y) { calls.scale = [x, y]; return this; },
  setAlpha(alpha) { calls.alpha = alpha; return this; },
  setDepth(depth) { calls.depth = depth; return this; },
  setFlipX(value) { calls.flipX = value; return this; },
};
const scene = {
  textures: {
    exists: (key) => key === 's3-skill-action-atlas-v2',
    get: () => ({ getSourceImage: () => ({ width: 1254, height: 1254 }) }),
  },
  add: {
    image(x, y, key) { calls.position = [x, y, key]; return image; },
  },
  nodes: [],
};
const result = drawSkillArtCrop(scene, 'fc_yuji_itadori_divergent_fist', 10, 20, 88, 132, { alpha: 0.7, depth: -1 });
console.log(JSON.stringify({ calls, crop: result.crop, nodeCount: scene.nodes.length }));
"""
    )

    calls = probe["calls"]
    crop = probe["crop"]
    assert calls["position"] == [54, 86, "s3-skill-action-atlas-v2"]
    assert calls["crop"] == [crop["x"], crop["y"], crop["width"], crop["height"]]
    assert math.isclose(calls["scale"][0] * crop["width"], 88, rel_tol=1e-10)
    assert math.isclose(calls["scale"][1] * crop["height"], 132, rel_tol=1e-10)
    assert math.isclose(calls["origin"][0], (crop["x"] + crop["width"] / 2) / 1254, rel_tol=1e-10)
    assert math.isclose(calls["origin"][1], (crop["y"] + crop["height"] / 2) / 1254, rel_tol=1e-10)
    assert calls["alpha"] == 0.7
    assert calls["depth"] == -1
    assert probe["nodeCount"] == 1


def test_visual_mapping_never_switches_on_player_facing_skill_names():
    registry_source = (ROOT / "web/static/phaser/core/skill-visual-registry.js").read_text(encoding="utf-8")
    renderer_source = (ROOT / "web/static/phaser/ui/skill-visuals.js").read_text(encoding="utf-8")

    assert "skillOrId.name" not in registry_source
    assert "skillOrId.name" not in renderer_source
    assert "displayName" not in registry_source
    assert "replacementFor" in registry_source
    assert "skillVisualFor(skillOrId)" in renderer_source
