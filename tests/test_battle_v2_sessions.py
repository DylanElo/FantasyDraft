from jjk_arena.battle_v2.sessions import BattleSessionRegistry


def test_resume_token_is_hashed_scoped_and_rotated():
    registry = BattleSessionRegistry()
    issued = registry.issue("room", "p1")

    assert issued.token not in repr(registry._token_hashes)
    assert registry.resume("other", "p1", issued.token) is None
    assert registry.resume("room", "p2", issued.token) is None
    resumed = registry.resume("room", "p1", issued.token)

    assert resumed is not None
    assert resumed.token != issued.token
    assert registry.resume("room", "p1", issued.token) is None
    assert registry.resume("room", "p1", resumed.token) is not None


def test_removing_room_revokes_all_resume_tokens():
    registry = BattleSessionRegistry()
    issued = registry.issue("room", "p1")
    registry.issue("room", "p2")

    registry.remove_room("room")

    assert registry.resume("room", "p1", issued.token) is None
