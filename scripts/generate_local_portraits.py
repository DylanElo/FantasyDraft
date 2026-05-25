"""Generate local stylized SVG portraits for characters with broken remotes."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from jjk_bot.portrait_assets import LOCAL_PORTRAIT_NAMES, portrait_slug


PALETTES = {
    "Yuta Okkotsu (JJK 0)": ("#7c3aed", "#dbeafe", "#111827"),
    "Yuta Okkotsu (Sendai)": ("#2563eb", "#f8fafc", "#1e1b4b"),
    "Yuta (Gojo's Body)": ("#60a5fa", "#ffffff", "#0f172a"),
    "Gojo (Young)": ("#38bdf8", "#f8fafc", "#1e293b"),
    "Gojo (Unsealed)": ("#a855f7", "#e0f2fe", "#020617"),
    "Sukuna (Full Power)": ("#dc2626", "#fca5a5", "#170505"),
    "Sukuna (Heian Era)": ("#991b1b", "#fed7aa", "#1c0707"),
    "Yuji (Black Flash)": ("#f43f5e", "#fecdd3", "#18040b"),
    "Yuji (Awakened)": ("#ef4444", "#fecaca", "#111827"),
    "Kenjaku": ("#7f1d1d", "#c084fc", "#14051d"),
    "Hiromi Higuruma": ("#f59e0b", "#fef3c7", "#1f2937"),
    "Uraume": ("#0ea5e9", "#e0f2fe", "#082f49"),
}


def initials(name: str) -> str:
    clean = name.split("(")[0].strip()
    return "".join(part[0] for part in clean.split()[:2]).upper() or "?"


def svg_for(name: str) -> str:
    accent, light, dark = PALETTES[name]
    label = initials(name)
    safe_name = name.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 560" role="img" aria-label="{safe_name}">
  <defs>
    <radialGradient id="a" cx="50%" cy="20%" r="72%">
      <stop offset="0" stop-color="{light}" stop-opacity="0.7"/>
      <stop offset="0.38" stop-color="{accent}" stop-opacity="0.42"/>
      <stop offset="1" stop-color="{dark}"/>
    </radialGradient>
    <linearGradient id="b" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="{accent}" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#111827" stop-opacity="0.8"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="420" height="560" rx="34" fill="url(#a)"/>
  <path d="M30 80 C100 28 320 28 390 80 L366 128 C286 88 134 88 54 128 Z" fill="{accent}" opacity="0.28"/>
  <circle cx="210" cy="178" r="82" fill="#0f172a" opacity="0.86"/>
  <path d="M118 456 C132 330 158 272 210 272 C262 272 288 330 302 456 Z" fill="url(#b)"/>
  <path d="M112 246 C140 204 164 178 210 178 C256 178 280 204 308 246 C286 278 252 294 210 294 C168 294 134 278 112 246 Z" fill="{light}" opacity="0.24"/>
  <path d="M84 430 C130 394 290 394 336 430" fill="none" stroke="{light}" stroke-width="8" opacity="0.34"/>
  <path d="M72 496 L348 496" stroke="{accent}" stroke-width="3" opacity="0.75"/>
  <text x="210" y="198" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, serif" font-size="74" font-weight="900" fill="{light}" filter="url(#glow)">{label}</text>
  <text x="210" y="518" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="800" letter-spacing="2" fill="{light}" opacity="0.9">{safe_name.upper()}</text>
</svg>
"""


def main() -> None:
    out_dir = ROOT / "web" / "static" / "assets" / "portraits"
    out_dir.mkdir(parents=True, exist_ok=True)

    manifest = {}
    for name in sorted(LOCAL_PORTRAIT_NAMES):
        slug = portrait_slug(name)
        path = out_dir / f"{slug}.svg"
        path.write_text(svg_for(name), encoding="utf-8")
        manifest[name] = f"assets/portraits/{slug}.svg"

    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Wrote {len(manifest)} local portraits to {out_dir}.")


if __name__ == "__main__":
    main()
