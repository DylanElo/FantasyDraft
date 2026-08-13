# Night Parade — integration handoff

Status: **design prototype, not mergeable code.** Read the blocker before planning work.

## The blocker

`docs/season3_visual_system.md` records Incident Cut as the implemented, locked
maintained-client direction: daylight bone/ivory panels, cold concrete, storm
ochre sky. Night Parade is the opposite — a nocturnal near-black ground where
emission carries every affordance.

Per `AGENTS.md` ("If the user request, docs, tests, and code disagree, stop and
report the conflict. Do not silently reinterpret the design." and "do not change
a locked design decision merely to simplify implementation"), an agent must not
apply this direction on its own. It needs an explicit decision record
superseding the Incident Cut palette, authored by the user.

Everything below assumes that decision has been made.

## What is reusable

| Artifact | Reusable? | Notes |
|---|---|---|
| Palette + motion timings | Yes | `night-parade-tokens.js`, shaped to mirror `JJK_MOBILE_TOKENS` |
| Energy colours + labels | Already correct | Copied unchanged from the shipping token file |
| Screen composition + hierarchy | Yes | Row fractions and scrim in `tokens.stage` |
| Interaction model | Yes | Tap fighter → skill → target; queue badge; gold confirm |
| Copy and disabled-reason wording | Yes | "Not enough energy", "Stunned — cannot act", "Pass turn" |
| The prototype's JS | **No** | Vanilla canvas, not Phaser scenes |
| The prototype's rules | **No** | Local simulation. Must be deleted, not ported |
| Character kits | **No** | Illustrative values, not authoritative `SkillSpec` data |
| Fighter silhouettes | Reference only | Procedural stand-ins for the real illustration contract |

## Why the code will not drop in

- The maintained client is Phaser, scene-based (`BootScene`, `LobbyScene`,
  `FirstCreationScene`, `DraftScene`, `MissionMapScene`, `MatchupScene`,
  `CombatScene`, `ResultScene`, `RecordsScene`). The prototype is one HTML file
  with a hand-rolled canvas loop and DOM overlays.
- The prototype decides damage, legality and victory locally. The real client
  must never do this — Battle v2 on the server is authoritative and the browser
  only submits intent and renders viewer-specific state.
- The prototype keeps trio/records/mission progress in `localStorage`. In the
  real client, mission progression and results are profile/server-backed; only
  the bounded 12-entry record archive is legitimately device-local.
- No build pipeline is introduced, which is consistent with `AGENTS.md`, but the
  prototype also is not structured as Phaser scenes, so it is a redraw, not a port.

## Screen mapping

| Prototype view | Phaser scene | Coverage |
|---|---|---|
| `vTitle` | `BootScene` | Tone only |
| `vHome` | `LobbyScene` | Trio strip, rail, Deploy. **Missing:** identity/connection, CPU vs Private PvP split, room code |
| `vRoster` | `FirstCreationScene` / `DraftScene` | 19 starters, affiliation filters, trio slots. **Missing:** featured-fighter carousel, CPU trio editing, difficulty cycling |
| `vStudy` | Character Study component | Skills, costs, target grammar, classes. **Missing:** replacements, cooldowns, Domain/hidden states |
| `vMissions` | `MissionMapScene` | Route spine, node states, dossier, recommended trio. **Missing:** painted map art, server-backed state |
| `vMatch` | `MatchupScene` | Trio vs trio, mode, enter. **Missing:** PvP sealed silhouettes, waiting/cancel |
| `vBattle` | `CombatScene` | Planning, targeting, resolution playback. **Missing:** Queue Review as a distinct reorder/Wild-payment deck, replacements, reveal cues, timers, reconnect |
| `vEnd` | `ResultScene` | Win/loss card. **Missing:** draw, no-contest, rewards, mission debrief |
| `vRecords` | `RecordsScene` | Bounded local list. **Missing:** profile hero, prev/next featured record |

## Known gaps against the locked contracts

1. Queue Review is not a separate screen. The prototype confirms straight from
   planning, so reordering and explicit Wild assignment are not exercised.
2. Wild payment is auto-assigned from leftover energy. The real contract requires
   the player to assign `X` during queue review, and the UI must show it.
3. No replacement skills, cooldowns, hidden/invisible state, or reveal conditions.
4. Draw and no-contest terminal states are not represented.
5. Kits are three skills each; the real contract is normally four primaries plus
   zero to two replacements, one named state, one payoff, one weakness.
6. Silhouettes are procedural. The illustration contract requires a 3:4 roster
   card, square face crop, wide combat crop, and registered focal points.

## Suggested sequencing if adopted

1. User authors a decision record superseding the Incident Cut palette.
2. Land `night-parade-tokens.js` alone, with no scene changes. Verify nothing
   reads removed keys.
3. Re-skin one scene end to end (`ResultScene` is the smallest) and capture QA at
   390x844 and 430x932.
4. Only then touch `CombatScene`, and keep Queue Review in its own PR.

Do not combine the re-skin with roster, progression, or engine work — `AGENTS.md`
requires those stay in separate focused PRs.
