import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_mobile_layout_regions_remain_inside_supported_viewports():
    script = r"""
globalThis.window = globalThis;
globalThis.JJK_BOOT = {};
await import('./web/static/phaser-design-tokens.js');
const { LayoutService } = await import('./web/static/phaser/core/layout-service.js');
const { TOKEN_TOUCH } = await import('./web/static/phaser/core/runtime-config.js');
const sizes = [[360, 800], [390, 844], [430, 932]];
const layouts = sizes.map(([width, height]) => {
  const service = new LayoutService({ scale: { width, height } });
  return { width, height, frame: service.frame(), hud: service.topHud(), enemy: service.enemyLane(), center: service.centerStage(), ally: service.allyLane(), dock: service.commandDock() };
});
const scaledDisplay = new LayoutService({ scale: { width: 488, height: 1055 }, game: { canvas: { clientWidth: 390, clientHeight: 844 } } }).frame();
console.log(JSON.stringify({ layouts, scaledDisplay, minTarget: TOKEN_TOUCH.minTarget }));
"""
    result = subprocess.run(
        ["node", "--experimental-default-type=module", "-"],
        input=script,
        text=True,
        capture_output=True,
        cwd=ROOT,
        check=True,
    )
    probe = json.loads(result.stdout)
    assert probe["minTarget"] >= 44
    assert probe["scaledDisplay"]["width"] == 390
    assert probe["scaledDisplay"]["height"] == 844
    for layout in probe["layouts"]:
        assert layout["frame"]["width"] <= layout["width"]
        assert layout["hud"]["y"] >= 0
        assert layout["enemy"]["y"] + layout["enemy"]["height"] <= layout["center"]["y"] + 55
        assert layout["center"]["height"] >= 88
        assert layout["ally"]["y"] + layout["ally"]["height"] <= layout["dock"]["y"] + 60
        assert layout["dock"]["y"] + layout["dock"]["height"] == layout["height"]
