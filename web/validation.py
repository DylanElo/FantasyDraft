"""Pure, stateless helpers used by web/app.py: env parsing, CORS origin
resolution, room naming, and request-payload cleaning/clamping.

Extracted from app.py (see docs/audit_ledger.md) as the first, lowest-risk
slice of that file's split -- none of these are monkeypatched by name in the
test suite (only called directly), so nothing here needs the
"reference shared state via the app module" discipline the later, stateful
slices will.
"""

from __future__ import annotations

import os
import re
import uuid

from jjk_arena.battle_v2.manager import BattleV2Error

ROOM_RE = re.compile(r"[^a-zA-Z0-9_-]+")
CONTROL_RE = re.compile(r"[\x00-\x1f\x7f]+")
RESUME_TOKEN_RE = re.compile(r"[^a-zA-Z0-9_-]+")


def env_flag(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _http_origin(host: str, port: int) -> str:
    """Build an exact HTTP origin for a development bind host."""

    normalized = str(host or "").strip().strip("[]")
    rendered_host = f"[{normalized}]" if ":" in normalized else normalized
    return f"http://{rendered_host}:{int(port)}"


def resolve_cors_origins(
    configured_origins: str | None,
    host: str,
    port: int,
    *,
    production_mode: bool,
) -> list[str]:
    """Resolve explicit Socket.IO origins without a permissive wildcard.

    Development defaults follow the actual bind port and include the two
    common loopback browser aliases. Production deliberately has no implicit
    HTTP fallback: readiness continues to require an explicit HTTPS list.
    """

    if configured_origins and configured_origins.strip():
        return list(dict.fromkeys(
            origin.strip()
            for origin in configured_origins.split(",")
            if origin.strip()
        ))
    if production_mode:
        return []

    normalized_host = str(host or "").strip().strip("[]")
    hosts = [] if normalized_host in {"", "0.0.0.0", "::"} else [normalized_host]
    hosts.extend(["127.0.0.1", "localhost"])
    return list(dict.fromkeys(_http_origin(item, port) for item in hosts))


def player_room(player_id: str) -> str:
    return f"player:{player_id}"


def match_room(match_id: str) -> str:
    return f"match:{match_id}"


def lobby_room(lobby_code: str) -> str:
    return f"lobby:{lobby_code}"


def new_match_id() -> str:
    return f"m_{uuid.uuid4().hex[:30]}"


def clean_room_id(value) -> str:
    room_id = ROOM_RE.sub("", str(value or "lobby").strip())[:32]
    return room_id or "lobby"


def clean_player_name(value, fallback: str) -> str:
    name = CONTROL_RE.sub("", str(value or "").strip())[:24]
    return name or fallback


def clean_skill_name(value) -> str:
    return CONTROL_RE.sub("", str(value or "").strip())[:80]


def clean_v2_team(value, fallback: list[str]) -> list[str]:
    if not isinstance(value, list):
        return list(fallback)
    team = [CONTROL_RE.sub("", str(name).strip())[:80] for name in value[:3] if str(name).strip()]
    return team if len(team) == 3 else list(fallback)


def clamp_int(value, minimum: int, maximum: int, default: int = 0) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, parsed))


def clean_v2_actions(value) -> list[dict]:
    if not isinstance(value, list):
        return []
    actions = []
    for raw in value[:3]:
        if not isinstance(raw, dict):
            continue
        action = {
            "id": CONTROL_RE.sub("", str(raw.get("id", "")).strip())[:64],
            "caster_slot": clamp_int(raw.get("caster_slot", 0), 0, 2),
            "skill_id": clean_skill_name(raw.get("skill_id", "")),
            "target_player_id": CONTROL_RE.sub("", str(raw.get("target_player_id", "")).strip())[:64],
            "target_slot": None if raw.get("target_slot") is None else clamp_int(raw.get("target_slot", 0), 0, 2),
            "target_slots": [
                clamp_int(slot, 0, 2)
                for slot in raw.get("target_slots", [])[:3]
            ] if isinstance(raw.get("target_slots", []), list) else [],
            "secondary_target_slot": None if raw.get("secondary_target_slot") is None else clamp_int(raw.get("secondary_target_slot"), 0, 2),
            "alternate_target_player_id": None if raw.get("alternate_target_player_id") is None else CONTROL_RE.sub("", str(raw.get("alternate_target_player_id", "")).strip())[:64],
            "alternate_target_slot": None if raw.get("alternate_target_slot") is None else clamp_int(raw.get("alternate_target_slot"), 0, 2),
            "wildcard_pays": [
                CONTROL_RE.sub("", str(energy).strip().lower())[:8]
                for energy in raw.get("wildcard_pays", [])[:3]
            ] if isinstance(raw.get("wildcard_pays", []), list) else [],
            "queue_index": clamp_int(raw.get("queue_index", len(actions)), 0, 2, default=len(actions)),
        }
        actions.append(action)
    return actions


def clean_v2_queue_order(value) -> list[str]:
    if not isinstance(value, list):
        return []
    return [CONTROL_RE.sub("", str(action_id).strip())[:64] for action_id in value[:3]]


def clean_v2_wildcard_pays(value) -> dict[str, list[str]]:
    if not isinstance(value, dict):
        return {}
    cleaned = {}
    for action_id, pays in value.items():
        clean_id = CONTROL_RE.sub("", str(action_id).strip())[:64]
        if not clean_id or not isinstance(pays, list):
            continue
        cleaned[clean_id] = [
            CONTROL_RE.sub("", str(energy).strip().lower())[:8]
            for energy in pays[:3]
        ]
    return cleaned


def clean_v2_energy_color(value) -> str:
    return CONTROL_RE.sub("", str(value or "").strip().lower())[:8]


def clean_v2_energy_colors(values) -> list[str]:
    if not isinstance(values, list):
        return []
    # Preserve a sixth entry as an overlong sentinel so the authoritative
    # exact-five check rejects extra selections instead of accepting a
    # silently truncated request. Nothing beyond six changes that result.
    return [clean_v2_energy_color(value) for value in values[:6]]


def clean_resume_token(value) -> str:
    return RESUME_TOKEN_RE.sub("", str(value or "").strip())[:128]


def clean_v2_command_metadata(data: dict) -> tuple[int, str]:
    if "state_revision" not in data:
        raise BattleV2Error("state_revision is required")
    if isinstance(data["state_revision"], bool):
        raise BattleV2Error("state_revision must be a non-negative integer")
    try:
        state_revision = int(data["state_revision"])
    except (TypeError, ValueError) as exc:
        raise BattleV2Error("state_revision must be a non-negative integer") from exc
    if state_revision < 0:
        raise BattleV2Error("state_revision must be a non-negative integer")
    nonce = CONTROL_RE.sub("", str(data.get("client_action_nonce", "")).strip())[:64]
    if not nonce:
        raise BattleV2Error("client_action_nonce is required")
    return state_revision, nonce
