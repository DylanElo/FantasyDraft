# Chunk 2 Mobile Wireframes And Interaction Flow

These wireframes define the implemented portrait hierarchy. They preserve the
Battle v2 socket contract and never calculate battle outcomes in Phaser.

## Lobby

```text
[turn-safe product header]
[identity + room dossier]
[        QUICK PLAY        ]
[ PRIVATE PVP ][ FIRST CREATION ]
[ MISSION MAP ][ RECORDS        ]
[recent results]
```

The primary play action sits above the lower navigation choices. Full labels
replace letter-only navigation.

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
[turn / phase] [energy] [leave]
[enemy 1] [enemy 2] [enemy 3]
[prompt / playback / queued actions]
[ally 1]  [ally 2]  [ally 3]
[selected fighter + readiness]
[skill 1][skill 2]
[skill 3][skill 4]
[Cancel] [End]       [Review]
```

Tap a skill once to select it. Tap the selected skill again to open Skill
Detail. The detail surface shows full name, adjusted cost, target family,
classes, cooldown or disabled reason, and authoritative description.

## Targeting

```text
primary target -> secondary target when required
               -> alternate redirect destination when required
               -> queued action
```

Teal identifies legal targets. Phaser preserves the primary, secondary, and
alternate fields; the server validates every submitted target.

## Queue Review

```text
[QUEUE REVIEW] [remaining energy]
[Q1 full skill / caster / PRIMARY / SECONDARY-or-ALTERNATE] [up][down]
[Q2 ...] [Wild payment controls]
[Q3 ...]
[Cancel] [Back]               [Confirm Queue]
```

Confirm is disabled when Wild payments are missing or the displayed energy can
no longer pay the queue. Validation is adjacent to the queue, not toast-only.

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

The Lobby, First Creation, Character Detail, Combat, Skill Detail, Queue Review,
and Results states are checked at 390x844 and 430x932. The 360x800 layout remains
covered by executable region and minimum-target assertions.
