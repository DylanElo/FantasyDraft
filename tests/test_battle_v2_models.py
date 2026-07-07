from jjk_bot.battle_v2 import (
    BattlePlayerConfig,
    BattlePhase,
    BattleState,
    BattleV2Manager,
    CharacterState,
    DamageType,
    EffectSpec,
    EnergyType,
    PlayerState,
    SkillClass,
    SkillSpec,
    TargetRule,
    battle_state_to_dict,
    battle_v2_enabled,
    payload_to_action,
)


def test_battle_v2_default_flag_is_on(monkeypatch):
    monkeypatch.delenv("JJK_BATTLE_SYSTEM", raising=False)

    assert battle_v2_enabled() is True


def test_battle_v2_flag_can_be_explicitly_disabled(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v1")

    assert battle_v2_enabled() is False


def test_battle_v2_flag_turns_on_for_v2(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")

    assert battle_v2_enabled() is True


def test_battle_v2_models_import_and_compose():
    skill = SkillSpec(
        id="divergent_fist",
        name="Divergent Fist",
        text="Deal 20 normal damage.",
        cost=[EnergyType.GREEN],
        cooldown=0,
        target_rule=TargetRule(kind="enemy"),
        classes=[SkillClass.PHYSICAL, SkillClass.INSTANT],
        effects=[EffectSpec(type="damage", amount=20, damage_type=DamageType.NORMAL)],
    )
    yuji = CharacterState(character_id="yuji_itadori", name="Yuji Itadori")
    player = PlayerState(id="p1", name="Player 1", team=[yuji])
    state = BattleState(players={player.id: player}, turn_player_id=player.id)

    assert skill.cost == [EnergyType.GREEN]
    assert state.phase == BattlePhase.PLANNING
    assert state.players["p1"].team[0].hp == 100


def test_battle_v2_public_manager_api():
    manager = BattleV2Manager(rng_seed=1)
    config = BattlePlayerConfig("p1", "Player 1", ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"])
    action = payload_to_action(
        "p1",
        0,
        {
            "caster_slot": 0,
            "skill_id": "divergent_fist",
            "target_player_id": "p2",
            "target_slot": 0,
        },
    )

    assert manager.rng_seed == 1
    assert config.team[0] == "yuji_itadori"
    assert action.skill_id == "divergent_fist"
    assert callable(battle_state_to_dict)
