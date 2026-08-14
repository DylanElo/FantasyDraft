# Rights review dossier

Prepared 2026-08-12 for whoever performs the commercial rights review. This
document organises facts and frames decisions. **It is not legal advice, and
nothing in it clears any asset.** `web/static/assets/asset-clearance-manifest.json`
remains the machine-readable source of truth, and only the rights owner or a
qualified reviewer may move a group to `cleared`.

## The central question

Every asset question here is downstream of one fact: **Jujutsu Kaisen is
licensed intellectual property.** The manga is Gege Akutami / Shueisha; the
anime is MAPPA. The game depicts named characters from that work — Yuji
Itadori, Satoru Gojo, and seventeen others — under their real names, with their
real techniques, in their real setting.

No generation workflow, provenance record, or "original art" claim changes that.
The portraits being originally drawn rather than traced affects *copyright in
the drawing*; it does not affect *character, name, and trademark rights in the
underlying work*. The project's own `portraits/PROVENANCE.md` already says so:
"The game still depicts Jujutsu Kaisen identities."

So the reviewer's first question is not about any individual file. It is:

> **Under what basis does this project intend to commercially exploit Jujutsu
> Kaisen characters — a license, a fan-work exemption, or a non-commercial
> release?**

Every per-group decision below is conditional on that answer. If the answer is
"no license and commercial release", the per-group detail is largely moot: the
named-character groups cannot ship regardless of how they were produced.

## Risk-ranked inventory

| # | Group | What it is | Named characters? | Franchise refs used in generation? | Risk |
|---|---|---|---|---|---|
| 1 | `interaction_audio_pack` | 14 UI/combat cues, 356 KiB | No | No | **Lowest** |
| 2 | `runtime_boot_and_world_environments` | 4 city/campus/map/rooftop plates | No | No | Low |
| 3 | `runtime_unique_skill_atlases_v3` | 5 effect atlases, 78 cells | No | 2 approved internal style refs | Low–moderate |
| 4 | `runtime_semantic_skill_fallbacks` | 4 legacy family textures | No | **Yes — a franchise screenshot as style context** | Moderate |
| 5 | `runtime_starter_portraits` | 19 character portraits | **Yes — all 19** | No | **High** |
| 6 | `starter_trio_production_proof` | Shipping proof art, 3 characters | **Yes** | Existing identity refs | **High** |
| 7 | `runtime_home_hero` | Key visual, 3 heroes in a plaza | **Yes** | **Yes — franchise imagery as generation context** | **Highest** |
| 8 | `concept_and_qa_artifacts` | Prototype evidence, not shipped | Mixed | Mixed | N/A — not runtime |

### Why group 7 is the sharpest

`culling-current-home-hero-v2.webp` is the only asset that combines both risk
factors: it depicts three named characters *and* the recorded prompt shows
franchise imagery was supplied as input, including a composition reference the
prompt explicitly instructs not to reproduce the UI, title, logos, or text of.
The existence of that instruction is evidence of care, but it also documents
that franchise material was in the pipeline. It is loaded at boot, so it is the
first thing a player — or a rights holder — sees.

### Why group 4 deserves attention despite being character-free

`skills/PROVENANCE.md` records that the four legacy family textures used a
franchise screenshot as style and intensity context. They are character-free,
which lowers exposure considerably, but the input trail is documented and a
reviewer should know it exists. They are only fallbacks; the v3 atlases (group 3)
are the primary skill art, so retiring group 4 is cheap if the reviewer prefers.

## Decision required per group

For each group the reviewer needs to record one of:

- **Cleared** — approved for commercial release. Requires their identity, date,
  and basis. Update `clearance_status` in the manifest.
- **Cleared for non-commercial release only** — needs a new status value; the
  manifest vocabulary does not currently express this.
- **Replace** — asset must be regenerated without the disqualifying input.
- **Remove** — asset must not ship.

Note that `tests/test_phaser_asset_delivery.py::test_asset_clearance_manifest_never_equates_generation_with_clearance`
currently asserts `cleared_groups == 0` and that every runtime group with paths
is `generated_review_required`. That guard is deliberate and good. It will need
updating in the same change that records a real clearance — do not weaken it
beforehand.

## Source-art exposure remediation

The 15 high-resolution, un-cleared `*-source.png` development files were moved
from Flask's publicly served `web/static/` tree to
`artifacts/production-proof-sources/`. The runtime `.webp` variants remain in
place. This removes approximately 42 MB from the deployed static payload while
retaining the sources for review.

The `starter_trio_production_proof` group in
`web/static/assets/asset-clearance-manifest.json` explicitly inventories the
moved directory. Relocation prevents public delivery; it does not grant rights
or change the files' `prototype_only` status.

## Evidence already available to the reviewer

The project's documentation is genuinely good and should shorten the review:

- `web/static/assets/portraits/PROVENANCE.md` — per-character generation records,
  era/costume constraints, and an explicit limitation statement.
- `web/static/assets/environments/PROVENANCE.md` — per-plate records, including
  a candid "structural rewrite assets" section naming the reference inputs.
- `web/static/assets/skills/PROVENANCE.md` — atlas prompts, cell layout, and the
  reference disclosure for the fallbacks.
- `web/static/assets/audio/PROVENANCE.md` — full pipeline description for the
  audio pack.
- `web/static/assets/asset-clearance-manifest.json` — status per group, with the
  standing rule that provenance never equals clearance.

## What is explicitly *not* evidence of clearance

Recorded here because it is the most common way this goes wrong:

- Provenance records. They describe production, not permission.
- "The art is original / not traced." Relevant to drawing copyright only.
- The asset being character-free. Reduces exposure; does not grant rights.
- The asset already being live in the client. Runtime use implies nothing.
- Any statement produced by an AI assistant, including this document.
