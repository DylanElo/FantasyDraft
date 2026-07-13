"""Thread-safe waiting-lobby and active-match identity registry."""

from __future__ import annotations

from copy import deepcopy
from threading import RLock
from typing import Any, Callable


class LobbyRegistryError(ValueError):
    pass


class LobbyRegistry:
    def __init__(self) -> None:
        self._lock = RLock()
        self._waiting: dict[str, list[dict[str, Any]]] = {}
        self._active_by_code: dict[str, str] = {}
        self._match_by_player: dict[str, str] = {}

    def join(self, code: str, player: dict[str, Any], create_match_id: Callable[[], str]) -> tuple[str, list[dict[str, Any]], str | None]:
        """Atomically join a lobby; exactly one caller can start its match."""
        with self._lock:
            if code in self._active_by_code:
                match_id = self._active_by_code[code]
                if self._match_by_player.get(str(player["id"])) == match_id:
                    return "active", [], match_id
                raise LobbyRegistryError("Battle v2 room already started.")
            players = [entry for entry in self._waiting.get(code, []) if entry["id"] != player["id"]]
            players.append(deepcopy(player))
            if len(players) < 2:
                self._waiting[code] = players
                return "waiting", deepcopy(players), None
            players = players[:2]
            match_id = create_match_id()
            self._waiting.pop(code, None)
            self._active_by_code[code] = match_id
            for entry in players:
                self._match_by_player[str(entry["id"])] = match_id
            return "start", deepcopy(players), match_id

    def cancel(self, code: str, player_id: str) -> list[dict[str, Any]]:
        with self._lock:
            players = [entry for entry in self._waiting.get(code, []) if entry["id"] != player_id]
            if players:
                self._waiting[code] = players
            else:
                self._waiting.pop(code, None)
            return deepcopy(players)

    def activate(self, code: str, match_id: str, player_ids: list[str]) -> None:
        with self._lock:
            if code in self._active_by_code:
                raise LobbyRegistryError("Battle v2 room already started.")
            self._waiting.pop(code, None)
            self._active_by_code[code] = match_id
            for player_id in player_ids:
                self._match_by_player[player_id] = match_id

    def resolve(self, code: str | None, player_id: str | None = None) -> str | None:
        with self._lock:
            if player_id and player_id in self._match_by_player:
                return self._match_by_player[player_id]
            return self._active_by_code.get(code or "")

    def cleanup_match(self, match_id: str) -> None:
        with self._lock:
            codes = [code for code, active in self._active_by_code.items() if active == match_id]
            for code in codes:
                self._active_by_code.pop(code, None)
            for player_id, active in list(self._match_by_player.items()):
                if active == match_id:
                    self._match_by_player.pop(player_id, None)

    def release_player(self, match_id: str, player_id: str) -> None:
        with self._lock:
            if self._match_by_player.get(player_id) == match_id:
                self._match_by_player.pop(player_id, None)

    def bind_players(self, match_id: str, player_ids: list[str]) -> None:
        with self._lock:
            for player_id in player_ids:
                self._match_by_player[player_id] = match_id

    def cleanup_lobby(self, code: str) -> None:
        with self._lock:
            self._waiting.pop(code, None)

    def waiting(self, code: str) -> list[dict[str, Any]]:
        with self._lock:
            return deepcopy(self._waiting.get(code, []))

    def waiting_snapshot(self) -> dict[str, list[dict[str, Any]]]:
        with self._lock:
            return deepcopy(self._waiting)

    def clear(self) -> None:
        with self._lock:
            self._waiting.clear()
            self._active_by_code.clear()
            self._match_by_player.clear()
