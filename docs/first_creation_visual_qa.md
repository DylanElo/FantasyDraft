# First Creation Visual QA Plan

The first-creation onboarding flow is now ready for browser-based screenshot QA once a browser runner is installed.

## Required captures

1. Battle v2 lobby: operation cards, room/codename fields, recent activity.
2. First creation setup: guide panel, energy legend, mission roadmap, preset rail.
3. Character details: selected starter with full four-skill panel.
4. Battle HUD: energy row, one-skill-per-living-fighter reminder, damage-family lesson card, queue panel.
5. Result screen: victory/defeat layout with mission-complete copy.

## Suggested command

```bash
JJK_BATTLE_SYSTEM=v2 pytest tests/test_first_creation_visual.py --headed
```

The current container does not include Playwright, so this document records the required visual regression targets rather than enabling screenshot assertions yet.
