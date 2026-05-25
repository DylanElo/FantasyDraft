"""Export server character definitions for the static roster browser."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from jjk_bot.characters import CHARACTERS
from web.app import char_to_dict


def main() -> None:
    payload = [char_to_dict(char) for char in CHARACTERS]
    out_path = ROOT / "web" / "static" / "characters_data.js"
    out_path.write_text(
        "const CHARACTERS_DATA = "
        + json.dumps(payload, indent=2, ensure_ascii=False)
        + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {out_path} with {len(payload)} characters.")


if __name__ == "__main__":
    main()
