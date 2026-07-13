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

Starts an isolated Classic Arena v2 match. The server always generates its
authoritative match id. For local/dev testing the client may provide both teams:

```json
{
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

A private code and a player's active-match slot become available for reuse the
instant the bound match reaches `FINISHED` — this does not require the client
to send `battle_v2_leave_pvp` or `battle_v2_ack_result` first. An invalid or
incompatible second joiner (mismatched roster mode, or a match-start failure)
never mutates the first player's waiting lobby entry; match creation is the
sole commit point.

### `battle_v2_leave_pvp`

Leaves a waiting PvP lobby before the second player joins. This does not end an
already-started Battle v2 match.

```json
{
  "room_id": "private-room"
}
```

### `battle_v2_resume`

Reattaches a new socket/browser session to an existing human player identity.
The opaque token was previously delivered through `battle_v2_session` and is
rotated after every successful resume.

```json
{
  "room_id": "private-room",
  "player_id": "player-session-id",
  "resume_token": "opaque-room-scoped-token"
}
```

Successful resume joins the original private socket room, emits a rotated
`battle_v2_session`, and then emits a viewer-specific `battle_v2_update` with
the current phase, revision, pending queue, and remaining time. Invalid,
cross-room, cross-player, and already-rotated tokens are rejected. The token is
only rotated after `reconnect_player` succeeds, so a rejected resume never
consumes it. A successful resume also reconciles the player's one-live-match
identity to this room, so a stale or desynced identity mapping cannot be used
to join or start a second concurrent match.

### `battle_v2_rematch`

Requests a new match against the same opponent after a finished match reaches
a terminal result.

```json
{
  "old_match_id": "m_...",
  "state_revision": 12,
  "client_action_nonce": "1712345678901-9"
}
```

`state_revision` must match the finished match's final revision, and
`client_action_nonce` is required. Rematch is idempotent per `old_match_id`:
once a rematch has produced a new match id, repeated `battle_v2_rematch`
requests (including concurrent ones) resolve to that same new match id rather
than creating additional rooms. Reusing a nonce with a different revision is
rejected as replay. On success the server emits `battle_v2_rematch` with
`old_match_id`/`new_match_id`, followed by a viewer-specific `battle_v2_update`
for the new match.

### `battle_v2_ack_result`

Releases a finished match's identity/code bindings (active-match slot and
private code) without deleting the archived match state, letting a player
start a new match immediately rather than waiting for the runtime TTL sweep.
This is optional — as noted under `battle_v2_join_pvp`, a finished match's
code and slot are already reusable without this event.

```json
{
  "match_id": "m_..."
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

### `battle_v2_session`

Privately delivers the room/player resume credential after match creation or a
successful resume. The token is never included in battle serialization or
broadcast to the opponent.

```json
{
  "room_id": "private-room",
  "player_id": "player-session-id",
  "resume_token": "opaque-room-scoped-token"
}
```

### `battle_v2_resume_rejected`

Indicates that a resume credential is missing, invalid, scoped to another
room/player, rotated, or belongs to a room that no longer exists.

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

The payload includes authoritative `state_revision` and
`phase_seconds_remaining`. Remaining time is a display value derived from the
server's monotonic deadline. The server independently wakes the room and emits
a new viewer-specific update when Planning or Queue Review expires; the client
must not perform the timeout transition itself.

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
surrender, or disconnect-grace expiry produces a winner (or a no-contest).

```json
{
  "winner_id": "player-session-id"
}
```

A disconnected player who does not reconnect within their 90-second grace
window (or exhausts the 180-second cumulative budget) is auto-forfeited by the
authoritative background scheduler — the same scheduler that drives planning
and queue-review phase timeouts — without requiring any further client action
from the connected opponent.
