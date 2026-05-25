"""Local portrait asset mapping for unreliable remote character images."""
from __future__ import annotations

import re
from pathlib import Path


LOCAL_PORTRAIT_NAMES = {
    "Yuta Okkotsu (JJK 0)",
    "Yuta Okkotsu (Sendai)",
    "Yuta (Gojo's Body)",
    "Gojo (Young)",
    "Gojo (Unsealed)",
    "Sukuna (Full Power)",
    "Sukuna (Heian Era)",
    "Yuji (Black Flash)",
    "Yuji (Awakened)",
    "Kenjaku",
    "Hiromi Higuruma",
    "Uraume",
}


def portrait_slug(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "unknown"


def local_portrait_path(name: str) -> str | None:
    if name not in LOCAL_PORTRAIT_NAMES:
        return None
    return f"assets/portraits/{portrait_slug(name)}.svg"


def has_local_portrait_file(root: Path, name: str) -> bool:
    rel = local_portrait_path(name)
    return bool(rel and (root / "web" / "static" / rel).exists())
