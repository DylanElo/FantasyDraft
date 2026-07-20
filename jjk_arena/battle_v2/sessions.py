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
    """Store only hashes of resume tokens and rotate them after successful use.

    Rotation is split into reserve/commit/abort so a caller can attempt an
    authoritative reconnect between validating the credential and actually
    consuming it. A rejected or premature resume must never burn the current
    token: only ``commit`` advances the stored hash, and ``abort`` releases
    the in-flight reservation so the same token remains valid for a later,
    successful resume.
    """

    def __init__(self) -> None:
        self._token_hashes: dict[str, dict[str, str]] = {}
        self._reservations: dict[str, dict[str, str]] = {}
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

    def reserve(self, room_id: str, player_id: str, token: str) -> bool:
        """Claim the sole in-flight resume attempt for this credential.

        Returns ``False`` without mutating anything when the token is
        invalid/stale or another resume attempt already holds the
        reservation for this room/player. A held reservation blocks a second
        concurrent replay from also passing verification, without yet
        consuming the token -- that only happens on ``commit``.
        """

        with self._lock:
            if not self.verify(room_id, player_id, token):
                return False
            room_reservations = self._reservations.setdefault(room_id, {})
            if player_id in room_reservations:
                return False
            room_reservations[player_id] = self._digest(str(token))
            return True

    def commit(self, room_id: str, player_id: str, token: str) -> ResumeSession | None:
        """Rotate the credential after a successful authoritative reconnect.

        Only succeeds when the caller still holds the matching reservation
        from ``reserve``. The reservation is released either way.
        """

        with self._lock:
            room_reservations = self._reservations.get(room_id, {})
            held = room_reservations.get(player_id)
            try:
                if held is None or held != self._digest(str(token)):
                    return None
                if not self.verify(room_id, player_id, token):
                    return None
                return self.issue(room_id, player_id)
            finally:
                room_reservations.pop(player_id, None)

    def abort(self, room_id: str, player_id: str) -> None:
        """Release a reservation without rotating the token.

        Used when the authoritative reconnect turns out to be premature
        (the original socket never disconnected) or otherwise fails, so the
        current token remains valid for a subsequent real resume.
        """

        with self._lock:
            self._reservations.get(room_id, {}).pop(player_id, None)

    def rotate(self, room_id: str, player_id: str, token: str) -> ResumeSession | None:
        """Atomic verify-and-rotate, kept for callers with no reserve/commit step."""

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
            self._reservations.pop(room_id, None)

    def clear(self) -> None:
        with self._lock:
            self._token_hashes.clear()
            self._reservations.clear()
