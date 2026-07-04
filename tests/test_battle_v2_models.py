from jjk_bot.battle_v2 import (
    BattlePhase,
    BattleState,
    CharacterState,
    DamageType,
    EffectSpec,
    EnergyType,
    PlayerState,
    SkillClass,
    SkillSpec,
    TargetRule,
    use_battle_v2,
)


def test_battle_v2_default_flag_is_off(monkeypatch):
    monkeypatch.delenv("JJK_BATTLE_SYSTEM", raising=False)

    assert use_battle_v2() is False


def test_battle_v2_flag_turns_on_for_v2(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")

    assert use_battle_v2() is True


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
