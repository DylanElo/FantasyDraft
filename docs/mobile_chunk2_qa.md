# Chunk 2 Mobile QA Evidence

Date: 2026-07-12

> Historical v2 mobile evidence. It is preserved as a record of the earlier
> interface and must not be used as the current visual reference. The later
> Culling Current v23 checkpoint under
> `artifacts/ui-redesign/culling-current/qa/` is also historical; Season 3
> structural Home, Combat, and Queue Review evidence belongs under
> `artifacts/ui-redesign/s3-structure-v2/qa/`.

The Phaser client was exercised against the live Flask-SocketIO Battle v2
server in a mobile browser viewport. The server remained authoritative for
match creation, queue submission, CPU turns, surrender, and Results.

## Captured States

The repository evidence is under `artifacts/chunk2-mobile-qa/`.

| State | 390x844 viewport | 430x932 viewport |
| --- | --- | --- |
| Lobby | `390-lobby.png` | `430-lobby.png` |
| First Creation | `390-first-creation.png` | `430-first-creation.png` |
| Character Detail | `390-character-detail.png` | `430-character-detail.png` |
| Combat Planning | `390-combat.png` | `430-combat.png` |
| Skill Detail | `390-skill-detail.png` | `430-skill-detail.png` |
| Queue Review | `390-queue-review.png` | `430-queue-review.png` |
| Results | `390-results.png` | `430-results.png` |

The browser reported the requested CSS viewport dimensions. Its PNG capture
surface omitted the final device row on most captures, producing 390x843 and
430x931 files; the Results capture at 430 is 430x932. No game content occupies
or depends on that final safe-area row.

## Findings Closed

- Character Detail now replaces the roster reading surface instead of
  compositing labels from both layers.
- Full starter names remain visible in trio, roster, combat token, and queue
  primary labels.
- Skill Detail exposes adjusted cost, target family, classes, authoritative
  description, cooldown, and disabled reason without leaving Combat.
- Disabled skill cards remain inspectable but cannot be selected.
- Queue Review labels primary, secondary, and alternate targets distinctly.
- Queue confirmation is disabled when current energy or Wild assignments do
  not pay the displayed queue.
- Active-match Exit surrenders and prevents late room updates from reopening
  the abandoned match.
- Playback cut-ins no longer duplicate the same skill banner, and queued
  playback spacing prevents simultaneous cut-ins.
- Layout calculations use canvas CSS dimensions, preventing physical-pixel
  display scaling from changing logical mobile placement after interaction.
- No browser console warnings or errors were present after the final flow.

## Deterministic CPU Evidence

Two mirrored 20-game batches were run for the tutorial trio versus the JJK0
beginner trio, seeds 20260712 through 20260751.

- Yuji/Megumi/Nobara in the first seat: 14-6, average 39.15 turns.
- Yuta/Maki/Toge in the first seat: 1-18 with one turn cap, average 38.85 turns.
- Combined tutorial-trio result: 32 wins in 40 games.

This exposes a material team and/or seat interaction but is not sufficient for
an automatic balance change. The report remains confounded by heuristic CPU
policy, team composition, and a small matchup sample. Human play sessions and
broader mirrored preset reports remain required before changing costs or
numbers.

The full default balance report was attempted at 50, 10, and 1 game per
orientation, but its all-preset matrix exceeded the local two-minute command
ceiling each time. The two timed-out workers were stopped before the bounded
matchup batches were run.
