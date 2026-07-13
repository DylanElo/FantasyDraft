"""Capture deterministic mobile QA states for the real Phaser combat scene.

The script drives the public GameStore interaction methods used by the UI. It
never swaps in a mock battle state; screenshots come from the running Flask +
Socket.IO application.
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import Any

from playwright.sync_api import Browser, BrowserContext, Page, sync_playwright


VIEWPORTS = ((360, 800), (390, 844), (430, 932))


def poll(page: Page, expression: str, timeout: float = 16.0) -> Any:
    deadline = time.time() + timeout
    last: Any = None
    while time.time() < deadline:
        try:
            last = page.evaluate(expression)
            if last:
                return last
        except Exception:
            pass
        time.sleep(0.08)
    raise RuntimeError(f"Timed out waiting for: {expression!r}; last={last!r}")


def new_context(browser: Browser, width: int, height: int) -> tuple[BrowserContext, Page, list[str]]:
    context = browser.new_context(
        viewport={"width": width, "height": height},
        device_scale_factor=1,
        is_mobile=True,
        has_touch=True,
    )
    page = context.new_page()
    # CI may not have external DNS. The application retains its production CDN
    # links, while visual QA uses the declared local fallbacks deterministically.
    page.route(
        "https://fonts.googleapis.com/**",
        lambda route: route.fulfill(status=200, content_type="text/css", body=""),
    )
    page.route("https://fonts.gstatic.com/**", lambda route: route.abort())
    logs: list[str] = []
    page.on("console", lambda message: logs.append(f"{message.type}: {message.text}"))
    page.on("pageerror", lambda error: logs.append(f"pageerror: {error}"))
    return context, page, logs


def enter_combat(page: Page, base_url: str) -> None:
    page.goto(base_url, wait_until="domcontentloaded", timeout=30_000)
    poll(
        page,
        "Boolean(window.__phaserShellDebug && window.JJKPhaserShell && window.JJKPhaserShell.game)",
    )
    page.evaluate("() => { window.__phaserShellDebug.store.startMatch(); return true; }")
    poll(
        page,
        "(() => { const s = window.__phaserShellDebug.getState(); return s.hasBattle && s.scene === 'CombatScene'; })()",
    )
    poll(
        page,
        "window.JJKPhaserShell.game.scene.getScene('CombatScene').textures.exists('combat-underpass-night')",
    )
    time.sleep(0.55)


def capture(page: Page, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    page.locator("canvas").first.screenshot(path=str(path), timeout=15_000)


def button_report(page: Page, width: int, height: int) -> dict[str, Any]:
    buttons = page.evaluate("window.__phaserShellButtons || []")
    too_small = [button for button in buttons if button["w"] < 44 or button["h"] < 44]
    outside = [
        button
        for button in buttons
        if button["x"] < -1
        or button["y"] < -1
        or button["x"] + button["w"] > width + 1
        or button["y"] + button["h"] > height + 1
    ]
    return {"buttons": buttons, "too_small": too_small, "outside_viewport": outside}


def available_manual_skill(page: Page) -> dict[str, Any] | None:
    return page.evaluate(
        """() => {
          const s = window.__phaserShellDebug.store;
          for (let slot = 0; slot < s.me().team.length; slot += 1) {
            const caster = s.me().team[slot];
            const skill = s.skillsFor(caster).find((candidate) => {
              const kind = (candidate.target_rule && candidate.target_rule.kind) || 'enemy';
              return s.skillCooldown(caster, candidate) <= 0
                && !s.statusBlocksSkill(caster, candidate)
                && s.skillFit(candidate, caster).ok
                && (kind === 'enemy' || kind === 'ally');
            });
            if (skill) {
              return {
                id: skill.id,
                slot,
                kind: (skill.target_rule && skill.target_rule.kind) || 'enemy',
              };
            }
          }
          return null;
        }"""
    )


def target_examples(page: Page) -> dict[str, Any]:
    return page.evaluate(
        """() => {
          const s = window.__phaserShellDebug.store;
          const candidates = [];
          for (const side of ['mine', 'enemy']) {
            const player = side === 'mine' ? s.me() : s.foe();
            (player.team || []).forEach((character, slot) => {
              candidates.push({ side, slot, legal: s.canTarget(character, slot, side) });
            });
          }
          return {
            legal: candidates.find((candidate) => candidate.legal) || null,
            illegal: candidates.find((candidate) => !candidate.legal) || null,
          };
        }"""
    )


def disabled_skill(page: Page) -> dict[str, Any] | None:
    return page.evaluate(
        """() => {
          const s = window.__phaserShellDebug.store;
          const caster = s.me().team[s.selectedCasterSlot];
          const skill = s.skillsFor(caster).find((candidate) => (
            s.skillCooldown(caster, candidate) > 0
            || !!s.statusBlocksSkill(caster, candidate)
            || !s.skillFit(candidate, caster).ok
          ));
          return skill ? { id: skill.id, name: skill.name } : null;
        }"""
    )


def capture_state_suite(page: Page, output: Path) -> dict[str, Any]:
    report: dict[str, Any] = {}

    page.evaluate(
        """() => {
          const s = window.__phaserShellDebug.store;
          s.selectedCasterSlot = null;
          s.selectedSkillId = null;
          s.detailSkillId = null;
          s.notify();
        }"""
    )
    time.sleep(0.2)
    capture(page, output / "390-01-default-no-fighter.png")

    page.evaluate("window.__phaserShellDebug.store.selectCaster(0)")
    time.sleep(0.2)
    capture(page, output / "390-02-character-selected.png")

    unavailable = disabled_skill(page)
    if unavailable:
        page.evaluate("(id) => window.__phaserShellDebug.store.openSkillDetail(id)", unavailable["id"])
        time.sleep(0.2)
        capture(page, output / "390-03-unavailable-skill.png")
        page.evaluate("window.__phaserShellDebug.store.closeSkillDetail()")
        time.sleep(0.2)
    report["unavailable_skill"] = unavailable

    skill = available_manual_skill(page)
    if not skill:
        raise RuntimeError("Could not find an available manually targeted skill for visual QA")
    page.evaluate("(slot) => window.__phaserShellDebug.store.selectCaster(slot)", skill["slot"])
    page.evaluate("(id) => window.__phaserShellDebug.store.selectSkill(id)", skill["id"])
    time.sleep(2.35)  # keep legal target treatment, allow instructional toast to clear
    capture(page, output / "390-04-skill-selected-legal-targets.png")

    targets = target_examples(page)
    if not targets["legal"] or not targets["illegal"]:
        raise RuntimeError(f"Could not find both legal and illegal targets: {targets}")
    page.evaluate(
        "([side, slot]) => window.__phaserShellDebug.store.target(side, slot)",
        [targets["illegal"]["side"], targets["illegal"]["slot"]],
    )
    time.sleep(0.18)
    capture(page, output / "390-05-illegal-target-feedback.png")
    time.sleep(2.2)

    page.evaluate(
        "([side, slot]) => window.__phaserShellDebug.store.target(side, slot)",
        [targets["legal"]["side"], targets["legal"]["slot"]],
    )
    poll(page, "window.__phaserShellDebug.getState().actionCount >= 1")
    time.sleep(0.45)
    capture(page, output / "390-06-action-queued.png")

    page.evaluate("window.__phaserShellDebug.store.openQueueReview()")
    poll(page, "window.__phaserShellDebug.getState().queueReviewOpen")
    time.sleep(0.25)
    capture(page, output / "390-07-queue-review.png")

    report["selected_skill"] = skill
    report["target_examples"] = targets
    report["final_state"] = page.evaluate("window.__phaserShellDebug.getState()")
    return report


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:5000")
    parser.add_argument("--output", default="artifacts/ui-redesign/after")
    args = parser.parse_args()

    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    report: dict[str, Any] = {"viewports": {}, "state_suite": {}}

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path="/usr/bin/chromium",
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        for width, height in VIEWPORTS:
            context, page, logs = new_context(browser, width, height)
            try:
                enter_combat(page, args.base_url)
                capture(page, output / f"{width}x{height}-combat-default.png")
                report["viewports"][f"{width}x{height}"] = {
                    "state": page.evaluate("window.__phaserShellDebug.getState()"),
                    "buttons": button_report(page, width, height),
                    "console": logs,
                }
                if width == 390 and height == 844:
                    report["state_suite"] = capture_state_suite(page, output)
                    report["state_suite"]["buttons"] = button_report(page, width, height)
                    report["state_suite"]["console"] = logs
            finally:
                context.close()
        browser.close()

    (output / "visual-qa-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({
        "output": str(output),
        "viewports": list(report["viewports"]),
        "selected_skill": report["state_suite"].get("selected_skill"),
        "unavailable_skill": report["state_suite"].get("unavailable_skill"),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
