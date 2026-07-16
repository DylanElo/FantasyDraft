"""Generate the temporary combat environment used by the mobile Phaser UI.

The image is deliberately original and procedural: a rain-darkened municipal
underpass opening onto an old school courtyard, with a restrained cursed-domain
distortion.  It is a production-intent placeholder, not final illustrated art.
"""
from __future__ import annotations

from pathlib import Path
import math
import random

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter


WIDTH = 860
HEIGHT = 1864
SEED = 73103
OUTPUT = Path(__file__).resolve().parents[1] / "web/static/assets/environments/underpass-courtyard-night.png"


def rgba(hex_value: str, alpha: int = 255) -> tuple[int, int, int, int]:
    value = hex_value.lstrip("#")
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4)) + (alpha,)


def vertical_gradient(top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    y = np.linspace(0.0, 1.0, HEIGHT, dtype=np.float32)[:, None, None]
    top_arr = np.array(top, dtype=np.float32)[None, None, :]
    bottom_arr = np.array(bottom, dtype=np.float32)[None, None, :]
    pixels = top_arr * (1.0 - y) + bottom_arr * y
    pixels = np.repeat(pixels, WIDTH, axis=1)
    return Image.fromarray(np.uint8(np.clip(pixels, 0, 255)), "RGB").convert("RGBA")


def glow_layer(center: tuple[int, int], radius: int, color: tuple[int, int, int], strength: int) -> Image.Image:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    steps = 14
    for index in range(steps, 0, -1):
        scale = index / steps
        r = int(radius * scale)
        alpha = int(strength * (1.0 - scale) ** 1.7)
        draw.ellipse((center[0] - r, center[1] - r, center[0] + r, center[1] + r), fill=(*color, alpha))
    return layer.filter(ImageFilter.GaussianBlur(radius * 0.16))


def main() -> None:
    rng = random.Random(SEED)
    base = vertical_gradient((8, 18, 28), (4, 8, 13))

    # Subtle painterly grain and cold sky variation.
    pixels = np.asarray(base).astype(np.int16)
    noise = np.random.default_rng(SEED).normal(0, 5.5, (HEIGHT, WIDTH, 1))
    pixels[:, :, :3] = np.clip(pixels[:, :, :3] + noise, 0, 255)
    base = Image.fromarray(np.uint8(pixels), "RGBA")

    architecture = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(architecture)

    # Distant school building: old concrete, long horizontal windows, quiet mass.
    d.polygon([(0, 170), (520, 80), (625, 770), (0, 930)], fill=rgba("#101b25"))
    d.polygon([(0, 170), (520, 80), (516, 154), (0, 255)], fill=rgba("#263441", 205))
    d.polygon([(0, 255), (516, 154), (582, 710), (0, 830)], fill=rgba("#14222d", 240))
    for row in range(4):
        y = 292 + row * 112
        x_shift = row * 7
        for col in range(5):
            x = 34 + col * 95 + x_shift
            window = [(x, y), (x + 67, y - 11), (x + 74, y + 46), (x + 6, y + 57)]
            warm = row == 1 and col in (1, 2)
            d.polygon(window, fill=rgba("#9d7448" if warm else "#162b38", 190))
            d.line(window + [window[0]], fill=rgba("#60717b", 115), width=3)
            if warm:
                d.polygon([(x + 5, y + 4), (x + 64, y - 6), (x + 69, y + 42), (x + 10, y + 50)], fill=rgba("#e8b36c", 55))
    # School awning and old utility conduits.
    d.polygon([(0, 694), (598, 570), (612, 646), (0, 786)], fill=rgba("#0b141b", 245))
    d.line([(80, 236), (112, 704)], fill=rgba("#54616a", 110), width=8)
    d.line([(102, 228), (140, 697)], fill=rgba("#1b2831", 230), width=4)

    # Massive underpass ceiling and beams, framing the top of the battlefield.
    d.polygon([(0, 0), (860, 0), (860, 310), (570, 260), (0, 390)], fill=rgba("#080d12", 255))
    d.polygon([(0, 220), (860, 86), (860, 170), (0, 340)], fill=rgba("#263039", 235))
    d.polygon([(0, 278), (860, 132), (860, 164), (0, 326)], fill=rgba("#4c5559", 75))
    for beam_y in (54, 140, 226):
        d.polygon([(0, beam_y + 70), (860, beam_y - 45), (860, beam_y - 12), (0, beam_y + 105)], fill=rgba("#111920", 235))
        d.line([(0, beam_y + 72), (860, beam_y - 43)], fill=rgba("#718087", 65), width=4)

    # Right stair and municipal wall: a concrete route up to the courtyard.
    d.polygon([(580, 365), (860, 310), (860, 1110), (742, 1040), (630, 768)], fill=rgba("#121f28", 248))
    d.polygon([(676, 520), (860, 470), (860, 915), (786, 889), (628, 670)], fill=rgba("#24343d", 225))
    for step in range(9):
        y = 590 + step * 38
        x_left = 642 + step * 12
        d.polygon([(x_left, y), (860, y - 28), (860, y + 3), (x_left + 8, y + 32)], fill=rgba("#3b4850", 112))
        d.line([(x_left, y), (860, y - 28)], fill=rgba("#91a0a4", 65), width=3)
    d.line([(638, 528), (839, 465), (849, 880)], fill=rgba("#849397", 135), width=8)
    d.line([(648, 546), (824, 493), (833, 874)], fill=rgba("#11191f", 230), width=4)

    # Courtyard opening and night sky beyond the underpass.
    d.polygon([(356, 340), (664, 276), (736, 1010), (188, 1114)], fill=rgba("#0d2431", 230))
    d.polygon([(408, 372), (641, 326), (688, 795), (292, 866)], fill=rgba("#153847", 165))
    d.polygon([(442, 396), (618, 362), (642, 612), (374, 659)], fill=rgba("#315164", 75))

    # Courtyard fence and sparse trees.
    d.line([(258, 824), (714, 740)], fill=rgba("#839398", 120), width=7)
    d.line([(246, 862), (722, 774)], fill=rgba("#202b31", 225), width=10)
    for post in range(8):
        x = 275 + post * 58
        y = 819 - post * 10
        d.line([(x, y), (x + 4, y + 165)], fill=rgba("#56666d", 115), width=5)
    for _ in range(16):
        tx = rng.randint(270, 710)
        ty = rng.randint(520, 780)
        radius = rng.randint(26, 62)
        d.ellipse((tx - radius, ty - radius, tx + radius, ty + radius), fill=rgba("#0c2528", rng.randint(80, 145)))

    # Foreground pillars create depth and intentionally frame the UI.
    d.polygon([(0, 0), (104, 0), (164, 1864), (0, 1864)], fill=rgba("#05080b", 252))
    d.polygon([(786, 0), (860, 0), (860, 1864), (744, 1864)], fill=rgba("#04070a", 248))
    d.polygon([(22, 0), (88, 0), (139, 1864), (62, 1864)], fill=rgba("#1e282e", 82))
    d.polygon([(810, 0), (860, 0), (831, 1864), (770, 1864)], fill=rgba("#253139", 64))

    base = Image.alpha_composite(base, architecture)

    # Wet ground: perspective concrete planes and pooled reflections.
    ground = Image.new("RGBA", base.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(ground)
    horizon = 770
    gd.polygon([(0, horizon), (860, 675), (860, 1864), (0, 1864)], fill=rgba("#091116", 248))
    gd.polygon([(185, 850), (734, 743), (850, 1864), (70, 1864)], fill=rgba("#101b20", 220))
    # Perspective seams.
    vanishing = (535, 713)
    for x in (-120, 60, 235, 420, 610, 820, 1010):
        gd.line([vanishing, (x, 1864)], fill=rgba("#65747a", 45), width=3)
    for index, y in enumerate((880, 1020, 1190, 1395, 1630)):
        left = int(145 - index * 42)
        right = int(748 + index * 47)
        gd.line([(left, y), (right, y - 22)], fill=rgba("#77878b", 38), width=3)
    # Drainage channel and rail shadow.
    gd.polygon([(92, 1220), (790, 1082), (806, 1124), (102, 1286)], fill=rgba("#030608", 178))
    gd.line([(108, 1234), (788, 1099)], fill=rgba("#6e7c80", 42), width=4)
    # Puddles.
    for _ in range(18):
        x = rng.randint(120, 760)
        y = rng.randint(900, 1780)
        width = rng.randint(48, 210)
        height = rng.randint(8, 28)
        gd.ellipse((x - width, y - height, x + width, y + height), fill=rgba("#1f4c5d", rng.randint(18, 52)))
        gd.arc((x - width, y - height, x + width, y + height), 180, 356, fill=rgba("#8ab0b7", 40), width=2)
    base = Image.alpha_composite(base, ground)

    # Warm practical lamp and elongated wet reflection.
    lamp = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(lamp)
    ld.line([(690, 286), (690, 634)], fill=rgba("#22292d", 245), width=13)
    ld.line([(690, 322), (638, 345)], fill=rgba("#262f34", 245), width=9)
    ld.rounded_rectangle((604, 334, 666, 374), radius=8, fill=rgba("#2a2923"), outline=rgba("#9c8361", 175), width=3)
    ld.rectangle((616, 344, 654, 363), fill=rgba("#ffd18a", 215))
    lamp = Image.alpha_composite(lamp, glow_layer((635, 354), 210, (238, 163, 88), 120))
    reflection = Image.new("RGBA", base.size, (0, 0, 0, 0))
    rd = ImageDraw.Draw(reflection)
    rd.polygon([(606, 760), (674, 748), (750, 1810), (493, 1864)], fill=rgba("#ca7b3c", 30))
    for y in range(790, 1810, 45):
        half = int(10 + (y - 790) * 0.10)
        jitter = rng.randint(-18, 18)
        rd.line([(636 - half + jitter, y), (636 + half + jitter, y - 5)], fill=rgba("#efb16a", rng.randint(15, 55)), width=rng.randint(2, 5))
    reflection = reflection.filter(ImageFilter.GaussianBlur(7))
    base = Image.alpha_composite(base, reflection)
    base = Image.alpha_composite(base, lamp)

    # Cold blue reflection from the courtyard opening.
    cold = Image.new("RGBA", base.size, (0, 0, 0, 0))
    cd = ImageDraw.Draw(cold)
    cd.polygon([(248, 790), (714, 708), (806, 1840), (104, 1840)], fill=rgba("#1a6b83", 22))
    for y in range(860, 1770, 66):
        half = int(80 + (y - 860) * 0.22)
        cd.line([(480 - half, y), (480 + half, y - 18)], fill=rgba("#6ea6b0", rng.randint(12, 30)), width=3)
    base = Image.alpha_composite(base, cold.filter(ImageFilter.GaussianBlur(4)))

    # Cursed-domain distortion: restrained violet fissures, not routine chrome.
    curse = Image.new("RGBA", base.size, (0, 0, 0, 0))
    cd = ImageDraw.Draw(curse)
    fissures = [
        [(534, 210), (505, 350), (552, 458), (511, 610), (548, 742)],
        [(746, 420), (701, 565), (731, 696), (690, 858)],
        [(138, 500), (178, 650), (144, 830), (188, 1000)],
    ]
    for points in fissures:
        cd.line(points, fill=rgba("#8f6cff", 52), width=9)
        cd.line(points, fill=rgba("#c8b7ff", 82), width=2)
        for x, y in points[1:-1]:
            cd.ellipse((x - 10, y - 10, x + 10, y + 10), fill=rgba("#9b7cff", 35))
    # Floating residue concentrated around the domain seam.
    for _ in range(52):
        x = int(rng.triangular(120, 780, 530))
        y = rng.randint(220, 1360)
        r = rng.randint(1, 6)
        cd.ellipse((x - r, y - r, x + r, y + r), fill=rgba("#aa91ff", rng.randint(18, 70)))
    curse = curse.filter(ImageFilter.GaussianBlur(1.2))
    base = Image.alpha_composite(base, curse)

    # Mist banks create depth and separate the tactical lanes.
    mist = Image.new("RGBA", base.size, (0, 0, 0, 0))
    md = ImageDraw.Draw(mist)
    for _ in range(22):
        x = rng.randint(-90, 850)
        y = rng.randint(660, 1540)
        rx = rng.randint(130, 330)
        ry = rng.randint(24, 72)
        md.ellipse((x - rx, y - ry, x + rx, y + ry), fill=rgba("#8fb0b8", rng.randint(5, 17)))
    mist = mist.filter(ImageFilter.GaussianBlur(38))
    base = Image.alpha_composite(base, mist)

    # Rain: long perspective streaks plus a few bright foreground drops.
    rain = Image.new("RGBA", base.size, (0, 0, 0, 0))
    rd = ImageDraw.Draw(rain)
    for _ in range(430):
        x = rng.randint(-40, WIDTH + 40)
        y = rng.randint(0, HEIGHT)
        length = rng.randint(12, 48)
        alpha = rng.randint(18, 74)
        width = 1 if alpha < 54 else 2
        rd.line([(x, y), (x - 5, y + length)], fill=rgba("#b7d5dc", alpha), width=width)
    for _ in range(26):
        x = rng.randint(0, WIDTH)
        y = rng.randint(0, HEIGHT)
        length = rng.randint(50, 110)
        rd.line([(x, y), (x - 12, y + length)], fill=rgba("#d9eef1", rng.randint(45, 100)), width=2)
    rain = rain.filter(ImageFilter.GaussianBlur(0.35))
    base = Image.alpha_composite(base, rain)

    # Cinematic vignette preserves readable edges while leaving the world visible.
    vignette = Image.new("L", base.size, 0)
    vd = ImageDraw.Draw(vignette)
    vd.ellipse((-240, -120, WIDTH + 220, HEIGHT + 190), fill=228)
    vignette = vignette.filter(ImageFilter.GaussianBlur(150))
    dark = Image.new("RGBA", base.size, rgba("#020406", 150))
    dark.putalpha(Image.eval(vignette, lambda value: 255 - value))
    base = Image.alpha_composite(base, dark)

    # Final restrained grade.
    grade = Image.new("RGBA", base.size, rgba("#061018", 10))
    base = Image.alpha_composite(base, grade)

    # Lift shadow detail so the architecture survives mobile downsampling and
    # the game's local contrast scrims. This is deliberately a midtone lift,
    # not a washed-out exposure increase.
    rgb = np.asarray(base.convert("RGB"), dtype=np.float32) / 255.0
    rgb = np.power(rgb, 0.76) * 1.08
    rgb = np.clip(rgb, 0.0, 1.0)
    base = Image.fromarray(np.uint8(rgb * 255.0), "RGB").convert("RGBA")
    base = ImageEnhance.Color(base).enhance(1.12)
    base = ImageEnhance.Contrast(base).enhance(1.04)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(OUTPUT, quality=94, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
