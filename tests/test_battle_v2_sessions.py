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


def test_aborted_reservation_does_not_burn_the_token():
    registry = BattleSessionRegistry()
    issued = registry.issue("room", "p1")

    assert registry.reserve("room", "p1", issued.token) is True
    registry.abort("room", "p1")

    # The token is untouched: it still verifies and can be reserved again.
    assert registry.verify("room", "p1", issued.token) is True
    assert registry.reserve("room", "p1", issued.token) is True
    committed = registry.commit("room", "p1", issued.token)

    assert committed is not None
    assert committed.token != issued.token
    assert registry.verify("room", "p1", issued.token) is False


def test_reserve_blocks_a_concurrent_replay_before_commit():
    registry = BattleSessionRegistry()
    issued = registry.issue("room", "p1")

    assert registry.reserve("room", "p1", issued.token) is True
    # A second concurrent attempt with the same still-valid token is refused
    # while the first reservation is outstanding, without mutating anything.
    assert registry.reserve("room", "p1", issued.token) is False
    assert registry.verify("room", "p1", issued.token) is True

    committed = registry.commit("room", "p1", issued.token)
    assert committed is not None
    assert committed.token != issued.token


def test_commit_requires_a_matching_reservation():
    registry = BattleSessionRegistry()
    issued = registry.issue("room", "p1")

    # Committing without first reserving must not rotate the token.
    assert registry.commit("room", "p1", issued.token) is None
    assert registry.verify("room", "p1", issued.token) is True
