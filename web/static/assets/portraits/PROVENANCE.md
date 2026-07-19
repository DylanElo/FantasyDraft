# Season 3 starter portrait provenance

The 19 files under `culling-current/` are original generated runtime
illustrations for the exact locked First Creation roster. They were created on
2026-07-18 with OpenAI built-in image generation. Official anime frames, key
visuals, manga panels, logos, and downloaded reference images were not supplied
to the generator. The only image input was this project’s original generated
master board:

- `artifacts/ui-redesign/s3-style/master-visual-system.png`
- Result: `exec-ff298e55-fb7e-4ed0-87d7-102f0179c56a`
- SHA-256: `0BBAAC5A1A98A2178648ADD1DC6F69CA8DD2FCD8DAC77D65147659CBD14DE71F`

Every generated source was a 1086 x 1448 PNG. Each shipping file was resized
without compositing to 600 x 800 RGB WebP using Pillow LANCZOS resampling,
quality 90, method 6. Runtime focal-point cover crops are defined in
`web/static/phaser/core/portrait-registry.js`; screens do not stretch the art.

The checkout independently verifies the exact 19 shipping filenames,
dimensions, registry mappings, and hashes below. The generated source PNGs and
generator session logs are not committed, so result IDs, source dimensions,
and input-history statements are contemporaneous production records rather
than facts reconstructable from the shipping files alone.

## Shipping files

| Starter | Shipping file | Generation result | SHA-256 |
|---|---|---|---|
| Yuji Itadori | `yuji-itadori.webp` | `exec-99f000c6-3611-4fcb-9db3-0329bb31b1ca` | `7CA90EACB1B29A9F69A8DA59A9F7FE639657D73785C264D9EE1AA7C38A934561` |
| Megumi Fushiguro | `megumi-fushiguro.webp` | `exec-34e2f1ef-0d61-490a-8f36-f98231795374` | `FD879B64DA9470674364CA676C7CC4F239E9AD5683F77892C7E1ACBBD47C6F49` |
| Nobara Kugisaki | `nobara-kugisaki.webp` | `exec-8c41177b-d9dd-41c2-8fd1-2192d7609060` | `36AA375B4D6874ADFD31FAE341B858B99ED8B40C7BB6FAB8D08B11746B755A48` |
| Maki Zenin | `maki-zenin.webp` | `exec-84d41471-0fb2-491c-8d8a-8fe6780f0e6b` | `F03C88E583FF0FDB2C84504EF4CEC829E41385B8D56DF98424B1938265A5714A` |
| Toge Inumaki | `toge-inumaki.webp` | `exec-e702e765-c5cd-4f51-82e3-9c2a22630558` | `13400C28FF4557BB4C91DC1DA67F9E8727F48F8257AB671FD63FC48F157ABDB7` |
| Panda | `panda.webp` | `exec-fa8073ee-5e68-4a02-a40f-d6c2e7bc642c` | `E4C726153FDF5E63D0AA2EE150CC292F3283F9718DDF39388DECAB45C1637E3A` |
| Aoi Todo | `aoi-todo.webp` | `exec-82f6007a-518f-44f8-b969-8fa7ccebafbf` | `C5A5AB1AD4C07640A4EEFCBA8C1133405A7E00A3731A6A9123A7CA7C78B8E420` |
| Noritoshi Kamo | `noritoshi-kamo.webp` | `exec-93ec9e76-155e-4358-b536-941fd8a33675` | `D6DE1126BEC947FF08B830581C5E17A6DD798125F905799B9DC0CAAAC825D444` |
| Momo Nishimiya | `momo-nishimiya.webp` | `exec-c7723dfb-12ab-49b7-a964-a05ca2166a88` | `6949148C2F36308F092FBDDE2FE7BB28A306860DC73A1C3D7D5FA4EBC57FFB69` |
| Mai Zenin | `mai-zenin.webp` | `exec-09ca5451-9bc7-4e6f-ad49-bdb5d8e3118c` | `2CB568586405BF4EA140707AEF2D1FAF7CFEB6670050C953F8361287A033D0AA` |
| Kasumi Miwa | `kasumi-miwa.webp` | `exec-9e0ac23f-5c55-4468-8ae6-3659f90f38b8` | `DEB24C6F272DF25218ADC1EB5CFFC02297EA33868EE7511A261B5E0D951AF879` |
| Kokichi Muta / Mechamaru | `kokichi-muta-mechamaru.webp` | `exec-17c79222-d611-486e-b17b-656a85456868` | `32152EF29D61A8702373ED8FF4F2CBCE28884B789CD51F61F15465012FE2B204` |
| Junpei Yoshino | `junpei-yoshino.webp` | `exec-0fd59dbd-f1e3-49c6-b246-bf2b47501888` | `ED3EB06DFE73182302A52BD327E5829AF045900C13706B3CB25CDC8F17B93B71` |
| Satoru Gojo (Young) | `satoru-gojo-young.webp` | `exec-4a6f0a10-f64e-4a5c-acdb-d86c7ef7a7e2` | `1F47E8A0E79C58E41D7655B4405C3A321B264F2A6AFE06E996CF6AD111E9B533` |
| Suguru Geto (Young) | `suguru-geto-young.webp` | `exec-005ea641-51c9-4c8f-b04f-e2d4f8acbf35` | `F10DA489ADA39F52D20F4EE47DE7AB27C9580F8628505954A48D094C87CAF639` |
| Shoko Ieiri (Young) | `shoko-ieiri-young.webp` | `exec-def1cffa-0481-46ca-8f14-7ef346a664bc` | `E0CB4F9646963B3B4CD0CC9D4FC7AE76EF6208A3E42AFB3B3AC8C128B5A13281` |
| Utahime Iori (Young) | `utahime-iori-young.webp` | `exec-f62cf9df-e34b-4f81-982a-39b3a5430307` | `65D6995F36B6D11414360D2101FF93291F6C2F579ED3BC84DF8DCE45DA7C2883` |
| Mei Mei (Young) | `mei-mei-young.webp` | `exec-431684d8-3bbd-4021-84f5-c307334e4fba` | `7DBECFCA0BA42742AC4633830DEE5C85E5F350A04BD3F132947A2C170932D1C4` |
| Yuta Okkotsu (JJK 0) | `yuta-okkotsu-jjk0.webp` | `exec-45d236f5-3529-4261-b011-3733b6bc065d` | `04CD7CED5AD41456794A96DCF52B5988D6A00585410AD9DBA6A83A565B7DA890` |

## Shared generation prompt

> Use case: stylized-concept. Asset type: final runtime character illustration
> for a portrait-first Jujutsu Kaisen tactical mobile game; one source supports
> full 3:4 roster card, centered square face crop, and wide upper-torso combat
> crop. Input image 1 is the internally generated Season-3 master visual
> system. Follow only its sharp hand-inked contours, raw pencil/cross-hatch
> accents, large flat high-contrast cel shadows, barrier-red geometry, cyan
> curse light, bone/smoke/storm palette, photographic-feeling painted city
> depth, and production finish. Do not copy its characters, poses, UI, or
> layout. Style/medium: unmistakable Jujutsu Kaisen Season 3 Culling Game
> visual language in fresh original production art; no glossy gacha airbrush
> and no soft 3D render. Composition/framing: exactly one primary subject,
> vertical 3:4, waist-up three-quarter pose, face and complete hair/head in
> upper-center safe zone, shoulders and signature hands/prop readable, generous
> padding, survives centered square and wide upper-torso crops. Lighting/mood:
> tense post-Shibuya daylight, storm-ochre sky, cold concrete, hard highlights,
> thin red barrier lines, selective curse cyan; face bright and legible.
> Background: painted Tokyo colony rooftop/city depth, bone-gray concrete,
> muted ochre clouds, no additional people; geometry behind face. Constraints:
> faithful canonical specified starter/era form and age; fresh original pose;
> no copied anime frame, manga panel, key visual, official art, logo, text,
> letters, numbers, watermark, border, card frame, blood, gore, extra limbs,
> malformed hands, near-black full background, neon cyberpunk, or generic
> glossy mobile rendering.

## Character-specific direction

- Yuji: starter form, red hood, Divergent Fist cyan contour; no Sukuna marks,
  awakened state, or injuries.
- Megumi: spiky black hair, hand sign, abstract canine shadow.
- Nobara: auburn bob, hammer, and three nails; no doll or gore.
- Maki: starter-era ponytail, rectangular glasses, red-shaft polearm; no
  awakened form, burns, or scars.
- Toge: platinum hair, high collar, snake-and-fang mouth marks, cyan sound
  rings.
- Panda: canonical cursed-corpse form, not a realistic animal or mask.
- Todo: muscular build, topknot, facial scar, clap pose.
- Kamo: low-tied black hair, bow, stylized crimson cursed-energy arrow; no
  blood depiction.
- Momo: blonde side pigtails and broom.
- Mai: short dark-green bob, one lowered revolver; no Maki traits.
- Miwa: light-blue side ponytail, suit uniform, katana, simple-domain ring.
- Mechamaru: student puppet body; not Ultimate Mechamaru, a human body, or a
  giant form.
- Junpei: long hair over one eye and abstract jellyfish shikigami.
- Young Gojo: school-era sunglasses, blue eyes, Lapse Blue; no adult blindfold
  or Hollow Purple.
- Young Geto: school uniform, bun, cursed-spirit orb; no adult robes, stitches,
  or Kenjaku traits.
- Young Shoko: short brown hair, facial mole, medical jacket, bandage, reverse
  cursed-technique light; no adult styling or cigarette.
- Young Utahime: school era without facial scar, red cords, timing gesture.
- Young Mei Mei: school-era silver-blue side braid and crow silhouette; no
  adult dress.
- JJK 0 Yuta: white high-collar uniform, katana, Rika shadow; no Sendai,
  Domain, Shinjuku, or Gojo-body traits.

## Limitation

These files document a coherent original-generation workflow; they do not
constitute copyright, trademark, likeness, licensing, or commercial-release
clearance. The game still depicts Jujutsu Kaisen identities. A rights holder or
qualified legal reviewer must determine release suitability.
