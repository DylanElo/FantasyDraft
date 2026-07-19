import json
import math
import subprocess
from pathlib import Path

from jjk_arena.battle_v2.starter_roster import (
    FIRST_CREATION_CHARACTER_IDS,
    FIRST_CREATION_CHARACTER_NAMES,
)


ROOT = Path(__file__).resolve().parents[1]
PORTRAIT_DIR = ROOT / "web" / "static" / "assets" / "portraits" / "culling-current"


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


def _webp_dimensions(path: Path) -> tuple[int, int]:
    data = path.read_bytes()[:32]
    assert data[:4] == b"RIFF"
    assert data[8:12] == b"WEBP"
    chunk = data[12:16]
    if chunk == b"VP8 ":
        assert data[23:26] == b"\x9d\x01\x2a"
        return int.from_bytes(data[26:28], "little") & 0x3FFF, int.from_bytes(data[28:30], "little") & 0x3FFF
    if chunk == b"VP8X":
        return 1 + int.from_bytes(data[24:27], "little"), 1 + int.from_bytes(data[27:30], "little")
    if chunk == b"VP8L":
        assert data[20] == 0x2F
        b0, b1, b2, b3 = data[21:25]
        return 1 + (b0 | ((b1 & 0x3F) << 8)), 1 + ((b1 >> 6) | (b2 << 2) | ((b3 & 0x0F) << 10))
    raise AssertionError(f"Unsupported WebP chunk {chunk!r} in {path.name}")


def _registry_probe() -> dict:
    return _run_node(
        r"""
const registry = await import('./web/static/phaser/core/portrait-registry.js');
const entries = registry.starterPortraitEntries();
const canonicalRoster = Object.fromEntries(entries.map((entry) => [entry.id, { name: entry.name }]));
const missingRoster = { ...canonicalRoster };
delete missingRoster.yuji_itadori;
const mismatchedRoster = { ...canonicalRoster, yuji_itadori: { name: 'Yuji (Black Flash)' } };
const extraRoster = { ...canonicalRoster, yuji_awakened: { name: 'Yuji (Awakened)' } };
console.log(JSON.stringify({
  entries,
  idsFrozen: Object.isFrozen(registry.STARTER_PORTRAIT_IDS),
  registryFrozen: Object.isFrozen(registry.STARTER_PORTRAITS),
  canonicalIssues: registry.starterPortraitContractIssues(canonicalRoster),
  missingIssues: registry.starterPortraitContractIssues(missingRoster),
  mismatchedIssues: registry.starterPortraitContractIssues(mismatchedRoster),
  extraIssues: registry.starterPortraitContractIssues(extraRoster),
  unknownFile: registry.portraitFileFor('yuji_awakened'),
  unknownTexture: registry.portraitTextureKeyFor('yuji_awakened'),
}));
"""
    )


def test_starter_portrait_registry_matches_the_locked_first_creation_contract():
    probe = _registry_probe()
    entries = probe["entries"]

    assert probe["idsFrozen"] is True
    assert probe["registryFrozen"] is True
    assert [entry["id"] for entry in entries] == list(FIRST_CREATION_CHARACTER_IDS)
    assert {entry["id"]: entry["name"] for entry in entries} == FIRST_CREATION_CHARACTER_NAMES
    assert len(entries) == 19

    for entry in entries:
        character_id = entry["id"]
        expected_file = f"{character_id.replace('_', '-')}.webp"
        assert entry["starter"] is True
        assert entry["file"] == expected_file
        assert entry["url"] == f"/static/assets/portraits/culling-current/{expected_file}"
        assert entry["mime"] == "image/webp"
        assert entry["width"] == 600
        assert entry["height"] == 800
        assert entry["aspect"] == 0.75
        assert entry["textureKey"] == f"portrait_{character_id}"
        assert "legacyCardTextureKey" not in entry
        assert isinstance(entry["accent"], int)
        for context in ("hero", "square", "combat"):
            focal = entry["focal"][context]
            assert 0 <= focal["x"] <= 1
            assert 0 <= focal["y"] <= 1

    assert next(entry for entry in entries if entry["id"] == "yuji_itadori")["file"] == "yuji-itadori.webp"
    assert next(entry for entry in entries if entry["id"] == "satoru_gojo_young")["file"] == "satoru-gojo-young.webp"
    assert next(entry for entry in entries if entry["id"] == "yuta_okkotsu_jjk0")["file"] == "yuta-okkotsu-jjk0.webp"
    assert probe["unknownFile"] is None
    assert probe["unknownTexture"] == "portrait_yuji_awakened"


def test_registry_detects_missing_extra_and_variant_name_drift():
    probe = _registry_probe()
    assert probe["canonicalIssues"] == []
    assert any(issue["code"] == "missing_id" and issue["id"] == "yuji_itadori" for issue in probe["missingIssues"])
    assert any(issue["code"] == "name_mismatch" and issue["id"] == "yuji_itadori" for issue in probe["mismatchedIssues"])
    assert any(issue["code"] == "unregistered_id" and issue["id"] == "yuji_awakened" for issue in probe["extraIssues"])


def test_focal_cover_crop_preserves_target_aspect_and_clamps_focal_edges():
    probe = _run_node(
        r"""
const { focalCoverCrop } = await import('./web/static/phaser/core/portrait-registry.js');
const targets = {
  square: [64, 64],
  home360: [92.6666666667, 179],
  home390: [102.6666666667, 179],
  home430: [116, 179],
  combat360: [97.3333333333, 60],
  combat390: [107.3333333333, 72],
  combat430: [120.6666666667, 80],
  combatSafe360: [97.3333333333, 52],
  combatSafe390: [107.3333333333, 60],
};
const crops = Object.fromEntries(Object.entries(targets).map(([name, [width, height]]) => [
  name,
  { targetWidth: width, targetHeight: height, ...focalCoverCrop(600, 800, width, height, { x: 0.5, y: 0.5 }) },
]));
let invalidRaised = false;
try { focalCoverCrop(0, 800, 64, 64); } catch (error) { invalidRaised = error instanceof RangeError; }
console.log(JSON.stringify({
  crops,
  full: focalCoverCrop(600, 800, 600, 800, { x: 0.5, y: 0.5 }),
  left: focalCoverCrop(600, 800, 100, 200, { x: 0, y: 0.5 }),
  bottom: focalCoverCrop(600, 800, 120, 60, { x: 0.5, y: 1 }),
  invalidRaised,
}));
"""
    )

    assert probe["invalidRaised"] is True
    assert probe["full"] == {
        "x": 0,
        "y": 0,
        "width": 600,
        "height": 800,
        "scale": 1,
        "focalX": 0.5,
        "focalY": 0.5,
    }
    assert probe["left"]["x"] == 0
    assert math.isclose(
        probe["bottom"]["y"] + probe["bottom"]["height"],
        800,
        rel_tol=0,
        abs_tol=1e-8,
    )

    for crop in probe["crops"].values():
        assert 0 <= crop["x"] <= 600 - crop["width"] + 1e-8
        assert 0 <= crop["y"] <= 800 - crop["height"] + 1e-8
        assert math.isclose(
            crop["width"] / crop["height"],
            crop["targetWidth"] / crop["targetHeight"],
            rel_tol=1e-10,
        )
        assert math.isclose(crop["width"] * crop["scale"], crop["targetWidth"], rel_tol=1e-10)
        assert math.isclose(crop["height"] * crop["scale"], crop["targetHeight"], rel_tol=1e-10)


def test_runtime_uses_registry_preload_true_crop_and_diagnostic_fallback_contracts():
    runtime_config = (ROOT / "web/static/phaser/core/runtime-config.js").read_text(encoding="utf-8")
    roster = (ROOT / "web/static/phaser/core/roster.js").read_text(encoding="utf-8")
    boot = (ROOT / "web/static/phaser/scenes/boot-scene.js").read_text(encoding="utf-8")
    base = (ROOT / "web/static/phaser/scenes/base-scene.js").read_text(encoding="utf-8")
    store = (ROOT / "web/static/phaser/store/game-store.js").read_text(encoding="utf-8")

    assert "LOCAL_PORTRAIT_FILES" not in runtime_config
    assert "yuji-black-flash.svg" not in roster
    assert "registeredPortraitFileFor" in roster
    assert "starterPortraitEntries().forEach" in boot
    assert "this.load.image(entry.textureKey, entry.url);" in boot
    assert "legacyCardTextureKey" not in boot
    assert "this.load.on('loaderror'" in boot
    assert "reportPortraitLoadError" in boot
    assert "validatePortraitDimensions" in boot
    assert "this.load.svg" not in boot

    assert "focalCoverCrop" in base
    assert "image.setOrigin(" in base
    assert "image.setCrop(crop.x, crop.y, crop.width, crop.height);" in base
    assert "image.setScale(crop.scale);" in base
    assert "portraitArtwork(" in base
    assert "drawPortraitFallback(" in base
    assert "CULLING_COLORS.ivory" in base
    assert "portraitFocal(characterOrId" in store


def test_base_scene_cover_renderer_registers_a_bounded_local_crop_frame():
    probe = _run_node(
        r"""
globalThis.Phaser = { Scene: class {} };
const { BaseScene } = await import('./web/static/phaser/scenes/base-scene.js');
const calls = {};
const frames = new Map();
const texture = {
  has(name) { return frames.has(name); },
  get(name) { return frames.get(name); },
  add(name, sourceIndex, x, y, width, height) {
    const frame = { name, sourceIndex, x, y, width, height };
    frames.set(name, frame);
    calls.addedFrame = [name, sourceIndex, x, y, width, height];
    return frame;
  },
};
const image = {
  texture,
  frame: { realWidth: 600, realHeight: 800 },
  setFrame(name) { calls.frame = name; return this; },
  setOrigin(x, y) { calls.origin = [x, y]; return this; },
  setCrop(x, y, width, height) { calls.crop = [x, y, width, height]; return this; },
  setScale(scaleX, scaleY) { calls.scale = [scaleX, scaleY]; return this; },
  setDepth(depth) { calls.depth = depth; return this; },
  setAlpha(alpha) { calls.alpha = alpha; return this; },
  setData(key, value) { calls.data = [key, value]; return this; },
};
const scene = {
  textures: {
    exists: (key) => key === 'portrait_yuji_itadori',
    get: () => texture,
  },
  add: {
    image(x, y, key) {
      calls.position = [x, y, key];
      return image;
    },
  },
  nodes: [],
};
const result = BaseScene.prototype.coverImage.call(
  scene,
  'portrait_yuji_itadori',
  10,
  20,
  100,
  50,
  { focal: { x: 0.5, y: 1 }, depth: 4, alpha: 0.8 },
);
const missing = BaseScene.prototype.coverImage.call(scene, 'missing', 0, 0, 10, 10, {});
console.log(JSON.stringify({ calls, resultIsImage: result === image, missing, nodeCount: scene.nodes.length }));
"""
    )

    assert probe["resultIsImage"] is True
    assert probe["missing"] is None
    assert probe["nodeCount"] == 1
    assert probe["calls"]["position"] == [60, 45, "portrait_yuji_itadori"]
    assert probe["calls"]["frame"].startswith("__jjk_cover_")
    assert probe["calls"]["addedFrame"][1:] == [0, 0, 500, 600, 300]
    assert "crop" not in probe["calls"]
    assert probe["calls"]["origin"] == [0.5, 0.5]
    assert probe["calls"]["scale"][1] is None
    assert math.isclose(probe["calls"]["scale"][0], 1 / 6, rel_tol=1e-12)
    assert probe["calls"]["depth"] == 4
    assert probe["calls"]["alpha"] == 0.8
    assert probe["calls"]["data"][0] == "coverCrop"


def test_portrait_load_failures_are_deduplicated_and_debuggable():
    probe = _run_node(
        r"""
globalThis.window = {};
const errors = [];
const originalError = console.error;
console.error = (message) => errors.push(String(message));
const { AssetRegistry } = await import('./web/static/phaser/core/asset-registry.js');
const assets = new AssetRegistry();
const baseAccepted = assets.reportPortraitLoadError({ key: 'portrait_yuji_itadori', error: { message: '404' } });
const unrelatedAccepted = assets.reportPortraitLoadError({ key: 'culling-current-home', error: { message: '404' } });
assets.reportPortraitContractIssue({ code: 'dimension_mismatch', id: 'yuji_itadori', message: 'wrong size' });
assets.reportPortraitContractIssue({ code: 'dimension_mismatch', id: 'yuji_itadori', message: 'wrong size' });
console.error = originalError;
console.log(JSON.stringify({
  baseAccepted,
  unrelatedAccepted,
  diagnostics: assets.portraitLoadDiagnostics(),
  globalDiagnostics: window.__jjkPortraitDiagnostics,
  errors,
  yujiTone: assets.toneFor('yuji_itadori'),
}));
"""
    )

    assert probe["baseAccepted"] is True
    assert probe["unrelatedAccepted"] is False
    assert probe["diagnostics"] == probe["globalDiagnostics"]
    assert len(probe["diagnostics"]["failures"]) == 1
    assert probe["diagnostics"]["failures"][0]["id"] == "yuji_itadori"
    assert probe["diagnostics"]["failures"][0]["textureKeys"] == ["portrait_yuji_itadori"]
    assert len(probe["diagnostics"]["contractIssues"]) == 1
    assert len(probe["errors"]) == 2
    assert probe["yujiTone"] == 0xE32620


def test_supplied_culling_current_portraits_match_registry_dimensions():
    assert PORTRAIT_DIR.is_dir()
    expected_files = {f"{character_id.replace('_', '-')}.webp" for character_id in FIRST_CREATION_CHARACTER_IDS}
    supplied_files = {path.name for path in PORTRAIT_DIR.glob("*.webp")}
    assert supplied_files == expected_files
    for path in PORTRAIT_DIR.glob("*.webp"):
        assert _webp_dimensions(path) == (600, 800)
