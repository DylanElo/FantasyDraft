# Starter trio production proof

Status: **prototype only**. These files are not registered by Phaser, do not
replace the maintained runtime art, and are not commercially release-cleared.

## Locked contract

- Original 3:4 portrait masters support roster, square face, wide combat, and
  96 px token crops without baked UI or text.
- Skill icons use one bold, centered technique symbol, remain readable at
  56 px, and describe the shipping First Creation skill rather than a generic
  damage family.
- The visual grammar follows the Culling Current system: sharp ink contours,
  hard cel shadows, bone concrete, deep indigo, curse cyan, barrier red, and
  restrained aged gold.
- Runtime derivatives are 600x800 portrait WebP and 512x512 skill WebP at
  quality 88. Source PNGs remain beside them for later art direction.

The QA boards are `starter-trio-portrait-crops.png` and
`starter-trio-skill-icons.png`. All three portraits passed the crop gate. All
12 icons passed the 56 px silhouette gate. Review threshold was 85/100; the
accepted set scored 88-93. A rejected Yuji hand draft was not retained.

## Generation provenance

The existing generated runtime portrait for each named character was supplied
only as an identity/costume reference. Prompts explicitly prohibited copying
its pose, composition, rendering, official frames, logos, UI, or text. Skill
icons used the accepted proof portrait only as a palette and rendering
reference. Generation provenance does not grant character-likeness,
copyright, trademark, licensing, or commercial-release clearance.

| Asset | Image generation result | Source PNG SHA-256 |
| --- | --- | --- |
| Yuji Itadori portrait | `exec-4a5ffcc1-5a49-41a2-8e22-5a1221cc41b2` | `525c2c09a0fa4fa05a5ab0c24fe3d4b2fbc7eab69707fc374bface640592970a` |
| Megumi Fushiguro portrait | `exec-ae2c41aa-a93f-443a-a846-adab9ebe5e1b` | `139186772d58f450bb779dcd806ebb00978c49bee27272a5300173d2a4b6d66f` |
| Nobara Kugisaki portrait | `exec-69d37b45-0fd9-46d5-823a-e35a987b4bdd` | `239d6cff629a0a58a74ccf1dd4a815707bc3bb93b5deb9bedc6143eae243b910` |
| Divergent Fist | `exec-f3e561d8-8502-4c86-8fbf-3b80a9ef5ecc` | `5854aeb3b84c53b36779dd3fc9cd11636a0309ce244d7a94961eee9347b78bc8` |
| Cursed Energy Reinforcement | `exec-748632a5-c0f3-4a1e-97b7-57dd497fb76a` | `66c49f6cc4724430d3f1a642683ae12c145a900f37cc606c9856d43cde9784c7` |
| Black Flash Attempt | `exec-b8084746-ef58-4b69-9247-1493b66f659e` | `e96d2faf5f7fc52a819c2ce64801035d880c3e9f65f5a5b6cb171dc5476e8de8` |
| Reflexive Guard | `exec-1b54cad8-441c-4f7d-b56d-7fff0f578a62` | `ac42923be8a0e71db0775b64a66a169080ec04d8ace43211f57316a0d5107808` |
| Divine Dogs | `exec-fed45746-c213-44e1-af8c-f3892d0f221a` | `954afeee6596bd8f39bf31ea74bc50fba48b03dbf9724cc3a89a6ce2db33aedf` |
| Nue Dive | `exec-4aeea240-c5ee-47a8-bf75-bb33553d6a56` | `17e366ac98d511f43e325e1d3ea542fa2a6b0dd6aaf93aa21fbd949e687a9ca7` |
| Toad Snare | `exec-862a923c-7703-4fba-bc54-cad3a60a2699` | `3a476eb4feea15ae867db27649a2ce6bd4c8fd837e98e156cebe0048132692f9` |
| Shadow Retreat | `exec-aa52b53f-db77-48c2-9dfd-4467c048ab15` | `47163c6755666e5730b6f06040383a47318beb0bd56d3090a29ac3b6227e8dbd` |
| Nail Barrage | `exec-7b871dc0-3172-4221-9866-1894b2033ff2` | `668f2afae6c75fd2e853abd605ba8efddc110e65faa3d37a3a39bdd1ec484714` |
| Straw Doll Resonance | `exec-d2aa5efe-54fd-4920-9273-c274dc81cd96` | `b1a123ea9b99218ea530571fbf83d6567c77674ccd33f0da2d2d09955bbc0d2d` |
| Hairpin | `exec-700d39a8-fd31-481b-a1f8-a6c0d78b7e52` | `3aea2d9b0ce3560045757916b15dcbad2fe0f3fb1c914be90bfd7eb231d86d49` |
| Hammer Guard | `exec-8676cf2b-dd4e-4eca-a52e-1fe26fb07fb8` | `19f82e24d568f06850882f4ad1c9a463fcd08ee6003eb42955f213102239d203` |

## Runtime proof

Local development can opt into this set with `?art=proof`. The switch is
ignored outside `localhost`, `127.0.0.1`, and `::1`; normal runtime art remains
the default. The proof reuses the maintained portrait registry, atlas loader,
skill renderer, and authoritative Battle v2 flow.

Real-browser Planning and Queue Review QA passed at 360x800, 390x844, and
430x932. Evidence is under
`artifacts/ui-redesign/s3-structure-v2/qa/current-proof/`. The remaining 16
characters and 66 skills should be generated only after this visual direction
is accepted; the proof demonstrates Phaser compatibility, not commercial
clearance.
