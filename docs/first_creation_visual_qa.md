# First Creation and Team Flow Visual QA

This is the current visual acceptance plan for the art-first First Creation, Team Setup, Matchup, Mission Map, Results, and Records/Profile flow.

Automated source, geometry, socket, and authority tests are necessary, but they are not screenshot evidence. Do not mark the visual pass complete without real-browser captures, interaction checks, and a clean console at the required phone sizes.

## Implemented flow under test

```text
Home
|- First Creation -> Character Study -> Matchup -> Combat
|- Team Setup (CPU) -> Matchup -> Combat
|- Team Setup (Private Room) -> Matchup waiting/cancel -> Combat
|- Mission Map -> recommended trio -> First Creation
`- Records / Profile

Combat -> Results -> Rematch (Team Setup) or Return Home
```

## Required viewport matrix

| Viewport | Requirement |
| --- | --- |
| `360 x 800` | Small-phone clipping, long-name, compact result/profile, and safe-bottom stress pass |
| `390 x 844` | Primary design and interaction reference; capture every required screen state |
| `430 x 932` | Large-phone crop, spacing, portrait scaling, and additional timeline-row pass |

Run at least one safe-area/browser-chrome-resize pass for every size. The release evidence set must include complete `390 x 844` and `430 x 932` captures; `360 x 800` may be a focused stress set if every primary state is already covered by automated geometry tests.

## Required captures

| ID | Screen/state | What must be visible |
| --- | --- | --- |
| `01-home` | Home landing | Character-led hero, active trio identity, Quick Match, feature tiles, labeled bottom navigation, editable player/room affordances |
| `02-first-creation` | First Creation browser | Three readable trio slots, active filter, large featured fighter, full name/role/state, pager, Add/Remove state, and `Review Matchup` |
| `03-first-creation-filter` | Kyoto or Special filter | Correct filtered count/order with no loss of the canonical 19-character roster |
| `04-character-study` | Full Character Study | Hero profile plus a primary skill and a replacement-skill page showing art, slot identity, cost, cooldown, targeting, classes, and readable description |
| `05-team-setup-cpu-player` | CPU Team Setup editing player | Player trio selected, difficulty control, featured fighter, and player-team accent |
| `06-team-setup-cpu-rival` | CPU Team Setup editing rival | CPU trio selected, same art-led hierarchy, and no stale player-team action label |
| `07-team-setup-private` | Private Room Team Setup | Room code and player trio only; no editable/displayed local CPU opponent roster |
| `08-matchup-cpu` | CPU Matchup ready | Actual selected rival trio above, objective/mode, player trio below, difficulty, and `Enter Arena` |
| `09-matchup-private-ready` | Private Room before join | Sealed challenger cards, room code, player trio, `Join Private Room`, and no opponent identity leak |
| `10-matchup-private-waiting` | Waiting or join-failed state | Waiting/error message, sealed opponent, enabled Cancel action, and no duplicated join action |
| `11-mission-map` | Route overview and selected dossier | Route spine, node states, progress, selected mission title/description, recommended trio, sealed later incidents, and `SELECT THIS TRIO` |
| `12-results-win` | Victory with mission progress | Outcome hero, three-fighter composition, mission progress/reward state, current-match impacts, Rematch, and Return Home |
| `13-results-neutral` | Draw or no-contest | Neutral outcome treatment with no false victory/defeat or mission-clear claim |
| `14-records-empty` | Empty local archive | Player identity/current trio fallback, zeroed summary, explicit empty-state copy, and disabled pager directions |
| `15-records-history` | Populated local archive | Most-deployed trio, W/L/D/NC counts, metrics, latest-first rows with team portraits, and working pagination |

## Interaction scripts

### CPU onboarding

1. Enter First Creation from Home.
2. Change filters and page to at least one long-name starter.
3. Open Character Study, page through every skill, and verify replacement slot identity.
4. Add/remove a fighter, complete exactly three slots, and select `Review Matchup`.
5. Confirm that no battle socket start occurs until `Enter Arena` on Matchup.
6. Enter the arena and verify the first authoritative battle update routes to Combat.

### Reusable CPU Team Setup

1. Enter Quick Match/Team Setup.
2. Switch between `My Trio` and `CPU Trio`; verify the visible trio and Add/Remove action follow the active side.
3. Cycle Easy/Normal/Hard and confirm the Matchup copy matches the selected difficulty.
4. Back out from Matchup and verify edits remain available without starting a battle.

### Private Room privacy and cancellation

1. Enter Private Room Team Setup with a complete player trio.
2. Open Matchup and confirm all challenger cards remain sealed before authoritative matchmaking data exists.
3. Select `Join Private Room` once; verify the pending action disables duplicate submission.
4. Capture waiting and join-failed states, then cancel.
5. Verify cancellation emits the leave action, returns to Home, and a late server cancellation acknowledgement does not pull the client back into Team Setup.
6. Resume an existing live battle and verify it goes directly to Combat rather than replaying the pre-match review.

### Mission and post-match flow

1. Open Mission Map and select open, active, and cleared nodes where fixtures permit.
2. Apply a recommended trio and verify First Creation opens with that exact three-character team.
3. Finish controlled win, loss, draw, and no-contest fixtures.
4. Verify only an authoritative victory can display a newly cleared mission/reward.
5. Use Rematch and Return Home, then open Records and confirm the terminal result was stored once.

## Visual checks for every capture

- The environment and character art lead the composition; routine UI remains bone/smoke rather than defaulting to a dark dashboard.
- No deprecated dense dashboard, two-column roster grid, narrow three-column roster browser, or overlapping fixed CTA returns.
- Full names, mission titles, outcome labels, and actionable copy wrap without ellipsis or clipping.
- Portrait crops preserve faces, silhouettes, and focal points at all three sizes.
- All primary controls are at least 44 px, thumb-reachable, and above the safe-area bottom.
- Pager, CTA, toast, settings sheet, and browser chrome resizing do not overlap critical content.
- Gold means selected/committed, cyan means legal/player-side, red means rival/danger, and routine violet is absent.
- Skill illustrations match their energy/family treatment and remain readable behind text/state overlays.

## Motion and sound checks

- Featured/profile entrances play once rather than replaying on every store notification.
- Character Study skill paging has a short directional transition and does not leave destroyed nodes or duplicate hit targets.
- Matchup pending/waiting feedback changes immediately and blocks duplicate launch input.
- Results uses a short reveal cue and staggered hero entrance; Records animates the profile trio once.
- Ambient motion does not obscure names, HP, route state, or CTAs.
- SFX unlocks from a user gesture, presentation settings apply immediately, and reduced-motion mode removes nonessential movement without removing state feedback.

## Authority and privacy checks

- First Creation contains exactly the locked 19 starters; Junpei, all five young mentors/sorcerers, and JJK0 Yuta remain present.
- PvP Matchup never substitutes `enemyTeam` from the earlier CPU selection for the real opponent.
- Mission completion, unlocks, rewards, result outcome, damage totals, and biggest impacts come from authoritative serialized state/event logs.
- Records is labeled and treated as a bounded local-device archive, not a server leaderboard or account progression source.
- Resume and reconnect never expose another viewer's hidden queue, trap, target, or status data.

## Automated preflight

Run the focused structural/authority suite before capturing:

```bash
python -m pytest -q \
  tests/test_phaser_home_structure.py \
  tests/test_phaser_first_creation_structure.py \
  tests/test_phaser_team_matchup_flow.py \
  tests/test_phaser_season_three_creation.py \
  tests/test_phaser_result_records_s3.py \
  tests/test_phaser_mobile_layout.py
```

Also run `node --check` for every changed Phaser JavaScript file and `git diff --check`.

## Browser evidence

The maintained runtime cache version is `36`. Evidence is current only when it
matches that cache version and its exact source commit. Each release capture
set must record browser/version, origin, viewport and canvas dimensions,
fixture/interaction path, console warning/error count, and screenshot SHA-256.
The older v27/v28 Season 3 packs are historical evidence and do not satisfy the
v36 release gate. See `docs/phaser_asset_delivery_contract.md` for the exact
version and evidence policy.

Store intentional release captures under a documented QA path such as:

```text
artifacts/ui-redesign/s3-structure-v2/qa/current/
```

Use filenames containing the viewport and state, for example `390x844-08-matchup-cpu.png`. Record browser, viewport, commit, console status, interaction path, and known caution beside the captures.

`tests/test_first_creation_visual.py` is a legacy fixed-coordinate smoke test. Its older Lobby -> Draft -> Combat clicks do not exercise the current First Creation -> Character Study -> Matchup flow, so its screenshots are not current acceptance evidence until that test is rewritten.

For continuity with the historical Playwright plan, its surface names map as
follows: **Battle v2 lobby** is now Home plus Team Setup;
**First creation setup** is the art-first First Creation browser; **Character details** is the
full Character Study; and **Battle HUD** is Combat Planning plus Queue Review.
Those aliases describe test lineage only and do not reinstate the deprecated
layouts.

## Completion gate

The visual pass is complete only when:

- all automated preflight checks pass;
- required `390 x 844` and `430 x 932` captures exist;
- the focused `360 x 800` stress pass has no clipped critical content;
- CPU and Private Room interaction scripts pass;
- console output is clean; and
- every caution is either fixed or explicitly recorded as remaining work.
