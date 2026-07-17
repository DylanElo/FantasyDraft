# Current mobile visual QA

This directory contains fresh post-hardening evidence captured on 2026-07-17
from source commit `cb38012b5c5c07854781d04028120a5ed2da6163` with
Phaser cache version 22.

The six core screens are captured at every supported phone viewport:

- Lobby
- Draft
- First Creation roster
- Mission Map
- Combat planning
- Records

File names use `{width}x{height}-{screen}.png`. The directory therefore holds
18 screenshots: six each at 360x800, 390x844, and 430x932. The interaction
state pack under `../../visual_qa/current/` adds First Creation detail, Queue
Review, Skill Detail, and Result without duplicating the roster screenshot.

The Draft and First Creation fixtures deliberately use Young Gojo, Young Geto,
Young Shoko, Kokichi Muta / Mechamaru, and other long labels so the evidence
exercises the locked no-truncated-primary-name contract. Combat is a
browser-local planning state; Records and Lobby use deterministic local record
rows.

Verification completed for this pack:

- all 18 files have a real PNG signature and exact declared dimensions;
- every registered control is at least 44x44 CSS pixels and remains inside the
  viewport;
- no non-modal registered hit rectangles overlap;
- the browser console reported no warnings or errors;
- all six scenes were visually inspected at all three sizes.

The browser compositor used device-pixel scaling for 360x800 and 430x932, so
those source frames were normalized to their exact CSS viewport dimensions.
The native 390x844 capture API returned 390x843; one `#050711` background row
was added below the safe content. No game content was cropped, stretched, or
invented.

The previous historical set remains under `../pre-hardening-d250917/` and is
not current evidence.
