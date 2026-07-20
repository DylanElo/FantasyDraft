# Phaser asset delivery and release-truth contract

## Canonical presentation facade

New presentation code imports `Season3UI` from
`web/static/phaser/ui/season3-ui.js`. It is the documented facade for the
locked Season 3 tokens and component roles:

- `current` retains the approved Home/Combat-era component variant;
- `flow` retains Boot, creation, team, mission, and matchup components; and
- `postMatch` retains Result/Records components.

The older `culling-current-ui.js`, `season-three-ui.js`, and
`season3-master-ui.js` modules remain internal compatibility variants behind
that facade for approved scene compositions; scenes do not import them
directly. `season3-tokens.js` exposes their canonical palette and semantics;
the Flow and Post Match variants also share clipped geometry there. The
asymmetric Current panel remains an explicit facade variant. New fourth
variants must not be added beside the facade. This is an infrastructure
consolidation, not permission to collapse distinct screens or recolor
deprecated layouts.

## Environment loading allocation

`core/asset-registry.js` is the source of truth for environment keys, URLs,
dimensions, and scene ownership. Boot queues only:

- `culling-current-home` for the splash; and
- `culling-current-home-hero` for the immediate Home destination.

Campus, map, and rooftop plates are requested when a scene first calls its
world component. Requests are deduplicated across concurrent scenes, attempted
once per scene instance, and rerender the active waiter after completion. The
existing bone/smoke or painted-gradient world remains the deterministic
fallback while loading and after failure. Missing art therefore cannot produce
an empty screen or a render-triggered retry loop.

The exact cold-start compressed and estimated RGBA8 decoded totals and caps
are machine-readable in
`web/static/assets/runtime-texture-budget.json`. The default checkout is
1,234,652 compressed bytes and 17,221,552 estimated decoded bytes. The maximum
saved-team cold start in the current 19-portrait set is 1,745,286 compressed
bytes and 22,981,552 estimated decoded bytes, below the 2 MiB / 24 MiB policy
caps. These figures exclude Phaser, fonts, JavaScript, canvas buffers, mipmaps,
driver allocation, and browser overhead.

## Clearance truth

`web/static/assets/asset-clearance-manifest.json` is the machine-readable
release gate. `generated_review_required` means provenance is recorded but
commercial-release rights are not established. `prototype_only` means the
asset is lineage or QA evidence and cannot ship. `cleared` requires an explicit
rights record; no current visual asset group has that status.

Runtime registration, generation provenance, hashes, screenshots, or a clean
console never imply copyright, trademark, likeness, or commercial clearance.

## Runtime and QA version policy

The maintained Phaser cache version is exactly `42`. A QA evidence set is
current only when its adjacent manifest or README records all of:

- exact source commit;
- cache version `42` from the HTML shell through the ES-module graph;
- browser name and version;
- page origin;
- viewport and Phaser canvas dimensions;
- fixture/interaction path;
- console warning/error count; and
- screenshot filename plus SHA-256.

Evidence captured from another cache version or source commit remains useful
historical evidence but cannot satisfy the current release gate. The checked-in
v27 and v28 Season 3 structural packs therefore remain historical; a complete
v42 390x844 and 430x932 set is still required before visual-release approval.
The cache chain must be changed atomically in the template, shell loader, and
every maintained module import. Mixed-version graphs fail preflight.
