import json
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "web" / "static" / "assets"


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


def test_boot_queues_only_splash_home_and_startup_portraits():
    source = (ROOT / "web" / "static" / "phaser" / "scenes" / "boot-scene.js").read_text(encoding="utf-8")
    registry = (ROOT / "web" / "static" / "phaser" / "core" / "asset-registry.js").read_text(encoding="utf-8")

    assert "INITIAL_ENVIRONMENT_KEYS.forEach" in source
    assert "registerEnvironmentTextureAttempt(this, environment.key)" in source
    assert "this.load.image('culling-current-campus'" not in source
    assert "this.load.image('culling-current-map'" not in source
    assert "this.load.image('culling-current-rooftop'" not in source
    assert "'culling-current-home',\n  'culling-current-home-hero'" in registry


def test_environment_registry_and_scene_staging_are_deterministic():
    probe = _run_node(
        r"""
globalThis.JJK_MOBILE_TOKENS = {};
globalThis.JJK_BOOTSTRAP = {};
const registry = await import('./web/static/phaser/core/asset-registry.js');

function makeScene(name) {
  const queued = [];
  const listeners = {};
  let exists = false;
  let renders = 0;
  let starts = 0;
  const scene = {
    keyName: name,
    textures: { exists() { return exists; } },
    load: {
      image(key, url) { queued.push([key, url]); },
      on(name, callback) { listeners[name] = callback; },
      off(name, callback) { if (listeners[name] === callback) delete listeners[name]; },
      once(name, callback) { listeners[name] = callback; },
      isLoading() { return false; },
      start() { starts += 1; },
    },
    scene: { isActive(key) { return key === name; } },
    render() { renders += 1; },
    finish(success = true) {
      exists = success;
      if (!success && listeners.loaderror) listeners.loaderror({ key: 'culling-current-campus' });
      if (listeners.complete) listeners.complete();
    },
    snapshot() { return { queued, renders, starts }; },
  };
  return scene;
}

const first = makeScene('FirstCreationScene');
const firstResult = registry.stageEnvironmentTexture(first, 'culling-current-campus');
const repeatedResult = registry.stageEnvironmentTexture(first, 'culling-current-campus');
first.finish(true);
const readyResult = registry.stageEnvironmentTexture(first, 'culling-current-campus');

const failed = makeScene('RecordsScene');
const failedFirst = registry.stageEnvironmentTexture(failed, 'culling-current-map');
failed.finish(false);
const failedAgain = registry.stageEnvironmentTexture(failed, 'culling-current-map');

const boot = makeScene('BootScene');
registry.registerEnvironmentTextureAttempt(boot, 'culling-current-home');
const bootMissingAfterPreload = registry.stageEnvironmentTexture(boot, 'culling-current-home');

console.log(JSON.stringify({
  initial: registry.INITIAL_ENVIRONMENT_KEYS,
  campusScenes: registry.environmentAssetFor('culling-current-campus').scenes,
  missionAssets: registry.environmentAssetsForScene('MissionMapScene').map((entry) => entry.key),
  firstResult,
  repeatedResult,
  readyResult,
  first: first.snapshot(),
  failedFirst,
  failedAgain,
  failed: failed.snapshot(),
  bootMissingAfterPreload,
  boot: boot.snapshot(),
  unknown: registry.stageEnvironmentTexture(first, 'not-registered'),
}));
"""
    )

    assert probe["initial"] == ["culling-current-home", "culling-current-home-hero"]
    assert probe["campusScenes"] == ["DraftScene", "FirstCreationScene", "RecordsScene"]
    assert probe["missionAssets"] == ["culling-current-map"]
    assert probe["firstResult"] == "queued"
    assert probe["repeatedResult"] == "loading"
    assert probe["readyResult"] == "ready"
    assert probe["first"] == {
        "queued": [["culling-current-campus", "/static/assets/environments/culling-current-campus.webp"]],
        "renders": 1,
        "starts": 1,
    }
    assert probe["failedFirst"] == "queued"
    assert probe["failedAgain"] == "fallback"
    assert probe["failed"]["renders"] == 1
    assert probe["failed"]["starts"] == 1
    assert probe["bootMissingAfterPreload"] == "fallback"
    assert probe["boot"] == {"queued": [], "renders": 0, "starts": 0}
    assert probe["unknown"] == "fallback"


def test_season_three_facade_keeps_compatibility_variants_and_shared_tokens():
    probe = _run_node(
        r"""
globalThis.JJK_MOBILE_TOKENS = {};
globalThis.JJK_BOOTSTRAP = {};
const facade = await import('./web/static/phaser/ui/season3-ui.js');
const current = await import('./web/static/phaser/ui/culling-current-ui.js?v=42');
const flow = await import('./web/static/phaser/ui/season-three-ui.js?v=42');
const post = await import('./web/static/phaser/ui/season3-master-ui.js?v=42');
console.log(JSON.stringify({
  frozen: Object.isFrozen(facade.Season3UI),
  tokenFrozen: Object.isFrozen(facade.S3_TOKENS.palette),
  roles: Object.keys(facade.Season3UI),
  currentWorldCompatible: facade.Season3UI.current.world === current.drawCurrentWorld,
  flowPanelCompatible: facade.Season3UI.flow.panel === flow.drawS3Panel,
  flowColorsCompatible: facade.Season3UI.flow.colors === flow.S3_COLORS,
  flowBootLayoutCompatible: facade.Season3UI.flow.bootLayout === flow.bootS3Layout,
  postButtonCompatible: facade.Season3UI.postMatch.button === post.drawS3Button,
  postColorsCompatible: facade.Season3UI.postMatch.colors === post.S3_COLORS,
  postResultModelCompatible: facade.Season3UI.postMatch.resultModel === post.resultModel,
  colors: facade.S3_TOKENS.semantic,
  flowBone: flow.S3_COLORS.bone,
  postBone: post.S3_COLORS.bone,
}));
"""
    )

    assert probe["frozen"] is True
    assert probe["tokenFrozen"] is True
    assert probe["roles"] == ["tokens", "current", "flow", "postMatch"]
    assert probe["currentWorldCompatible"] is True
    assert probe["flowPanelCompatible"] is True
    assert probe["flowColorsCompatible"] is True
    assert probe["flowBootLayoutCompatible"] is True
    assert probe["postButtonCompatible"] is True
    assert probe["postColorsCompatible"] is True
    assert probe["postResultModelCompatible"] is True
    assert probe["colors"] == {
        "selected": 0xD8BF68,
        "legalTarget": 0x35DDE8,
        "danger": 0xE32620,
        "queued": 0x4FB06D,
        "domain": 0x7C3AED,
    }
    assert probe["flowBone"] == probe["postBone"] == 0xF2E8D5


def test_scenes_only_import_the_canonical_season_three_facade():
    ui_import_pattern = re.compile(r"from\s+['\"](\.\./ui/[^'\"]+)['\"]")
    offenders = []
    for path in (ROOT / "web" / "static" / "phaser" / "scenes").rglob("*.js"):
        source = path.read_text(encoding="utf-8")
        for specifier in ui_import_pattern.findall(source):
            if specifier != "../ui/season3-ui.js?v=42":
                offenders.append((path.name, specifier))
    assert offenders == []


def test_asset_clearance_manifest_never_equates_generation_with_clearance():
    manifest = json.loads((ASSET_ROOT / "asset-clearance-manifest.json").read_text(encoding="utf-8"))
    statuses = set(manifest["status_definitions"])
    assert statuses == {"prototype_only", "generated_review_required", "cleared"}
    assert manifest["summary"]["cleared_groups"] == 0
    assert not [group for group in manifest["groups"] if group["clearance_status"] == "cleared"]

    for group in manifest["groups"]:
        assert group["clearance_status"] in statuses
        for relative in group.get("paths", []):
            assert (ASSET_ROOT / relative).is_file(), relative
        if group["runtime"] and group["paths"]:
            assert group["clearance_status"] == "generated_review_required"


def test_runtime_texture_budget_matches_checkout_and_stays_under_startup_caps():
    budget = json.loads((ASSET_ROOT / "runtime-texture-budget.json").read_text(encoding="utf-8"))
    default = budget["cold_boot_default"]
    maximum = budget["cold_boot_maximum_saved_team"]

    def verify(entries):
        for entry in entries:
            path = ASSET_ROOT / entry["path"]
            assert path.stat().st_size == entry["compressed_file_bytes"]
            assert entry["decoded_rgba8_bytes"] == entry["width"] * entry["height"] * 4

    verify(default["assets"])
    verify(maximum["additional_portraits"])
    verify(budget["deferred_environment_assets"])
    assert sum(entry["compressed_file_bytes"] for entry in default["assets"]) == default["compressed_file_bytes"]
    assert sum(entry["decoded_rgba8_bytes"] for entry in default["assets"]) == default["decoded_rgba8_bytes"]
    assert default["compressed_file_bytes"] + sum(entry["compressed_file_bytes"] for entry in maximum["additional_portraits"]) == maximum["compressed_file_bytes"]
    assert default["decoded_rgba8_bytes"] + sum(entry["decoded_rgba8_bytes"] for entry in maximum["additional_portraits"]) == maximum["decoded_rgba8_bytes"]
    assert maximum["compressed_file_bytes"] <= budget["startup_policy"]["compressed_budget_bytes"]
    assert maximum["decoded_rgba8_bytes"] <= budget["startup_policy"]["decoded_rgba8_budget_bytes"]


def test_runtime_cache_chain_and_delivery_manifest_agree_on_v42():
    budget = json.loads((ASSET_ROOT / "runtime-texture-budget.json").read_text(encoding="utf-8"))
    shell = (ROOT / "web" / "static" / "phaser-shell.js").read_text(encoding="utf-8")
    template = (ROOT / "web" / "templates" / "index.html").read_text(encoding="utf-8")
    assert budget["runtime_cache_version"] == "42"
    assert "const SHELL_VERSION = '42';" in shell
    assert "phaser-shell.js') }}?v=42" in template
    assert "phaser-design-tokens.js') }}?v=42" in template

    mismatches = []
    specifier_pattern = re.compile(
        r"(?:from\s+|import\s*\(\s*|import\s+)[\"']([^\"']+\.js(?:\?v=[^\"']+)?)",
    )
    for path in (ROOT / "web" / "static" / "phaser").rglob("*.js"):
        source = path.read_text(encoding="utf-8")
        for specifier in specifier_pattern.findall(source):
            if specifier.startswith(".") and not specifier.endswith("?v=42"):
                mismatches.append((str(path.relative_to(ROOT)), specifier))
    assert mismatches == []
