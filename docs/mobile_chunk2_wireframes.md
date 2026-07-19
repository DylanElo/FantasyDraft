# Chunk 2 Mobile Wireframes And Interaction Flow

These wireframes define the implemented portrait hierarchy. They preserve the
Battle v2 socket contract and never calculate battle outcomes in Phaser.

## Lobby

```text
[player identity]                    [room code]
[              bright city world              ]
[          active fighter trio                 ]
[             READY FOR BATTLE                 ]
[ PRIVATE ROOM ][ FIRST CREATION ][ MISSION MAP]
[     Home     ][    Roster     ][   Records   ]
```

The Culling Current Home is world-led rather than panel-led. The active trio,
player name, room code, and mission title are real store data; the screen does
not invent level, currency, mail, or other concept-only economies. The primary
CPU battle action stays thumb-reachable above three compact secondary modes
and fully labeled bottom navigation.

## First Creation And Character Detail

```text
[First Creation             Back]
[route progress        Mission Map]
[slot 1][slot 2][slot 3]
[two readable preset cards]
[two-column dossier roster]
[Previous] page [Next]
[          ENTER DOMAIN          ]

Character detail replaces the roster surface while open:
[portrait] [full name]       [Close]
[role / era / tags]
[four full skill rows]
[          ADD OR REMOVE          ]
```

The detail sheet is a dedicated reading state rather than a translucent layer
behind active roster labels.

## Combat Planning And Skill Detail

```text
[turn / phase / timer] [T J S B energy] [exit]
[enemy 1] [enemy 2] [enemy 3]
[open rooftop targeting lane / directive / queue]
[ally 1]  [ally 2]  [ally 3]
[selected fighter + readiness]
[skill 1][skill 2]
[skill 3][skill 4]
[Clear Queue] [Pass]       [Review]
```

The light HUD exposes the actual phase and server-provided remaining time. Tap
a skill once to select it; disabled skills remain tappable for inspection.
Skill Detail shows full name, adjusted cost, target family, classes, cooldown
or disabled reason, replacement/base-slot relationship, and authoritative
description.

## Targeting

```text
primary target -> secondary target when required
               -> alternate redirect destination when required
               -> queued action
```

Electric cyan identifies legal targets. Phaser preserves the primary,
secondary, team, and alternate fields; the server validates every submitted
target.

## Queue Review

```text
[RESOLUTION ORDER] [available energy -> after]
[Q1 full skill / caster / PRIMARY / SECONDARY / ALTERNATE] [up][down]
[Q2 ...] [Wild payment controls]
[Q3 ...]
[Clear] [Back]                [Confirm Queue]
```

Confirm is disabled when Wild payments are missing or the displayed energy can
no longer pay the queue. The action that fails receives its exact row-local
reason, while the sheet footer preserves the complete queue-level reason.

## Results

```text
[VICTORY or DEFEAT]
[winner / turns / damage]
[largest strikes]
[mission progress and reward state]
[Rematch]
[Lobby]
```

## Required Responsive Evidence

The 2026-07-17 Culling Current v23 Home, Combat, Skill Detail, and valid/invalid
Queue Review states were captured at 360x800, 390x844, and 430x932. A
47px-top/34px-bottom inset stress capture covered Home, Combat, and Queue Review
at 360x800, with additional safe Queue Review evidence at 390x844. These images
predate the Season 3 runtime; executable layout tests still cover normal and
safe frames at all three target sizes.
