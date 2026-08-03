# JJK Arena Frontend VNext

An isolated React + TypeScript + Phaser vertical slice. The legacy Flask/Phaser client is unchanged.

## Run locally

```powershell
cd frontend-vnext
npm install
npm run dev
```

Open the printed local URL. Production validation uses `npm run build`; focused behavior checks use `npm test`.

## Divergent Fist choreography laboratory

Open `/prototype/divergent-fist` on the same Vite server. This isolated route
uses mocked data and does not replace or depend on the existing combat flow,
Socket.IO, or Python. Its controls can pause/resume, move to previous/next,
jump to any of 21 beats, replay, change speed, toggle reduced motion, and show
formation, fighter-anchor, and effect-anchor debug overlays.

Artist review mode freezes an exact deterministic beat and keeps its compact
review toolbar below the capture area:

```text
/prototype/divergent-fist?review=1&preset=desktop&beat=physical-impact
```

Presets are `desktop` (1440×900), `laptop` (1280×720), and `mobile`
(844×390). Add `reduced=1`, `debug=1`, `labels=1`, or `anchors=1` for the
corresponding review state. Run `npm run audit:divergent-fist` for the focused,
readable 47-slot manifest audit.

All lab artwork is explicitly temporary. The replacement contract and artist
checklist are in `docs/divergent-fist-asset-manifest.md`.

The production-art handoff is under `art-handoff/divergent-fist/`. Validate an
incoming drop with `npm run audit:divergent-fist-art`; the current placeholder
baseline is intentionally not production-ready. Engineering freeze details are
recorded in `docs/divergent-fist-engineering-freeze.md`.

## Boundary

React owns navigation, selection, commands, queue review, results, responsive layout, and accessibility. Phaser owns the battlefield plate, atmosphere, camera flash, and impact shake. `src/mockAuthority.ts` is a deliberately isolated stand-in for viewer-specific `battle_v2_update` snapshots; the UI reads its legal targets and disabled reasons instead of deciding legality.

## Deferred

- Replace the mock adapter with the existing versioned Socket.IO command/update contract.
- Drive Phaser playback from authoritative battle events rather than the slice's deterministic three-turn proof.
- Commission/review final release art and audio. Current repository-generated art remains temporary and subject to rights review.
