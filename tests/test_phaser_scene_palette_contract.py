import json
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _palette_keys(module_path: str) -> set[str]:
    script = f"""
globalThis.window = globalThis;
globalThis.JJK_BOOTSTRAP = {{}};
const {{ S3_COLORS }} = await import('./{module_path}');
console.log(JSON.stringify(Object.keys(S3_COLORS)));
"""
    result = subprocess.run(
        ["node", "--experimental-default-type=module", "-"],
        input=script,
        text=True,
        capture_output=True,
        cwd=ROOT,
        check=True,
    )
    return set(json.loads(result.stdout))


def _used_palette_keys(scene_path: str) -> set[str]:
    source = (ROOT / scene_path).read_text(encoding="utf-8")
    return set(re.findall(r"S3_COLORS\.([A-Za-z0-9_]+)", source))


def test_redesigned_scenes_only_reference_keys_from_their_imported_palette():
    creation_keys = _palette_keys("web/static/phaser/ui/season-three-ui.js")
    post_match_keys = _palette_keys("web/static/phaser/ui/season3-master-ui.js")

    assert _used_palette_keys("web/static/phaser/scenes/mission-map-scene.js") <= creation_keys
    assert _used_palette_keys("web/static/phaser/scenes/records-scene.js") <= post_match_keys
    assert _used_palette_keys("web/static/phaser/scenes/result-scene.js") <= post_match_keys
