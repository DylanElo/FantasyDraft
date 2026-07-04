# Battle v2 Socket Contract

Battle v2 SocketIO events are gated by `JJK_BATTLE_SYSTEM=v2`. The default app
path remains v1, and these events must not mutate the v1 `Game` object.

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

### `battle_v2_submit_plan`

Stores pending actions for queue review without spending energy.

```json
{
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
  "queue_order": ["a1"],
  "wildcard_pays": {
    "a1": ["green"]
  }
}
```

### `battle_v2_confirm_queue`

Confirms and resolves the current player's queued actions.

```json
{}
```

### `battle_v2_cancel_queue`

Clears the current player's pending queue and returns to planning.

```json
{}
```

### `battle_v2_surrender`

Concedes the v2 match for the current player.

```json
{}
```

## Server Events

### `battle_v2_update`

Emitted only to the requesting socket. The payload is serialized for that viewer
so invisible statuses and pending queues do not leak to opponents.

### `battle_v2_error`

Returned when the feature flag is disabled, the session is missing, validation
fails, or the room/action is invalid.

```json
{
  "message": "not this player's turn"
}
```

### `battle_v2_log`

Reserved for later public log fan-out. Current handlers keep authoritative state
updates private via `battle_v2_update`.

### `battle_v2_finished`

Emitted to the requesting socket after a confirm or surrender produces a winner.

```json
{
  "winner_id": "player-session-id"
}
```
