# Battle v2 Socket Contract

Battle v2 SocketIO events are the maintained gameplay surface. The server owns match state, validation, queue resolution, private serialization, and CPU responses.

## Versioned command envelope

Every mutating command after match creation includes the last authoritative
`state_revision` received by the client and a non-empty, per-player
`client_action_nonce`:

```json
{
  "state_revision": 12,
  "client_action_nonce": "1712345678901-7"
}
```

The server rejects stale revisions before gameplay mutation. A retry using the
same nonce, command, and sanitized payload is idempotent and returns current
viewer state without applying the command again. Reusing a nonce for a
different command or payload is rejected. Successful commands and automatic
authoritative continuations advance `state_revision`; rejected commands leave
state, energy, cooldowns, queues, RNG, and logs unchanged.

## Client Events

### `battle_v2_start_classic`

Starts an isolated Classic Arena v2 room. For local/dev testing the client may
provide both teams:

```json
{
  "room_id": "abc123",
  "player_name": "Player",
  "player_team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"],
  "enemy_team": ["satoru_gojo", "ryomen_sukuna", "mahito"]
}
```

If `player_team` is omitted, the starter trio Yuji/Nobara/Megumi is used. If
`enemy_team` is omitted, Gojo/Sukuna/Mahito is used.

### `battle_v2_join_pvp`

Joins a private two-human Battle v2 room. The first player is held in a waiting
lobby; the second player starts the match with each player's selected team.

```json
{
  "room_id": "private-room",
  "player_name": "Player",
  "player_team": ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"]
}
```

### `battle_v2_leave_pvp`

Leaves a waiting PvP lobby before the second player joins. This does not end an
already-started Battle v2 match.

```json
{
  "room_id": "private-room"
}
```

### `battle_v2_submit_plan`

Stores pending actions for queue review without spending energy.

```json
{
  "state_revision": 0,
  "client_action_nonce": "1712345678901-1",
  "actions": [
    {
      "id": "a1",
      "caster_slot": 0,
      "skill_id": "divergent_fist",
      "target_player_id": "enemy",
      "target_slot": 1
    }
  ]
}
```

### `battle_v2_update_queue`

Sets queue order and wildcard payments. This validates the full queue.

```json
{
  "state_revision": 1,
  "client_action_nonce": "1712345678901-2",
  "queue_order": ["a1"],
  "wildcard_pays": {
    "a1": ["green"]
  }
}
```

### `battle_v2_confirm_queue`

Confirms and resolves the current player's queued actions.

```json
{"state_revision": 2, "client_action_nonce": "1712345678901-3"}
```

### `battle_v2_cancel_queue`

Clears the current player's pending queue and returns to planning.

```json
{"state_revision": 1, "client_action_nonce": "1712345678901-4"}
```

### `battle_v2_end_turn`

Clears any pending actions and ends the current player's turn without resolving
skills. Normal turn-end status/cooldown cleanup still runs. In local CPU rooms,
the server immediately runs CPU turns until control returns to the human or the
match finishes.

The local CPU builds one legal action per living caster and scores candidates
before resolving. It prioritizes killing blows, wounded-ally healing, stun and
defensive utility, payoff skills with conditions, and higher-impact damage
families such as soul or piercing damage.

```json
{"state_revision": 0, "client_action_nonce": "1712345678901-5"}
```

### `battle_v2_convert_energy`

Converts two matching core energy into one different core energy once during
the current turn.

```json
{
  "state_revision": 0,
  "client_action_nonce": "1712345678901-6",
  "source": "green",
  "target": "red"
}
```

### `battle_v2_surrender`

Concedes the v2 match for the current player.

```json
{"state_revision": 0, "client_action_nonce": "1712345678901-7"}
```

## Server Events

### `battle_v2_lobby`

Emitted to a player waiting for a second human opponent in a private PvP room.
Also confirms when a waiting player cancels the lobby.

```json
{
  "room_id": "private-room",
  "status": "waiting",
  "players": [{"id": "session-id", "name": "Player"}]
}
```

### `battle_v2_update`

Emitted to each human player in the room through that player's private socket
room. Every payload is serialized for its viewer, so invisible statuses,
private events, and pending queues do not leak to opponents.

### `battle_v2_error`

Returned when the feature flag is disabled, the session is missing, validation
fails, or the room/action is invalid.

```json
{
  "message": "not this player's turn"
}
```

### `battle_v2_log`

Reserved for later public log fan-out. Current handlers keep authoritative
viewer-specific state updates private via `battle_v2_update`.

### `battle_v2_finished`

Emitted to each human player in the room after a confirm, end-turn CPU response,
or surrender produces a winner.

```json
{
  "winner_id": "player-session-id"
}
```
