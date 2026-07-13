"""Opaque resume credentials for process-owned Battle v2 rooms."""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import secrets
from threading import RLock


@dataclass(frozen=True, slots=True)
class ResumeSession:
    room_id: str
    player_id: str
    token: str


class BattleSessionRegistry:
    """Store only hashes of resume tokens and rotate them after successful use."""

    def __init__(self) -> None:
        self._token_hashes: dict[str, dict[str, str]] = {}
        self._lock = RLock()

    @staticmethod
    def _digest(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def issue(self, room_id: str, player_id: str) -> ResumeSession:
        with self._lock:
            token = secrets.token_urlsafe(32)
            self._token_hashes.setdefault(room_id, {})[player_id] = self._digest(token)
            return ResumeSession(room_id, player_id, token)

    def verify(self, room_id: str, player_id: str, token: str) -> bool:
        """Validate a credential without consuming or rotating it."""

        with self._lock:
            expected = self._token_hashes.get(room_id, {}).get(player_id)
            return expected is not None and secrets.compare_digest(expected, self._digest(str(token)))

    def rotate(self, room_id: str, player_id: str, token: str) -> ResumeSession | None:
        """Rotate only when the supplied credential is still current."""

        with self._lock:
            if not self.verify(room_id, player_id, token):
                return None
            return self.issue(room_id, player_id)

    def resume(self, room_id: str, player_id: str, token: str) -> ResumeSession | None:
        """Backward-compatible atomic verify-and-rotate operation."""

        return self.rotate(room_id, player_id, token)

    def remove_room(self, room_id: str) -> None:
        with self._lock:
            self._token_hashes.pop(room_id, None)

    def clear(self) -> None:
        with self._lock:
            self._token_hashes.clear()
