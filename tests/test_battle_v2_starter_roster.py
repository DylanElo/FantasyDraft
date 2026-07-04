import pytest

from jjk_bot.battle_v2.effects import apply_damage
from jjk_bot.battle_v2.models import (
    BattleState,
    CharacterState,
    DamageType,
    EnergyType,
    PendingAction,
    PlayerState,
    SkillClass,
    StatusEffect,
)
from jjk_bot.battle_v2.resolver import ResolverError, resolve_queue, validate_action
from jjk_bot.battle_v2.starter_roster import SKILLS_BY_ID, STARTER_ROSTER


def make_player(player_id, character_ids):
    return PlayerState(
        id=player_id,
        name=player_id,
        team=[
            CharacterState(character_id=character_id, name=STARTER_ROSTER[character_id].name)
            for character_id in character_ids
        ],
    )


def make_state():
    p1 = make_player("p1", ["yuji_itadori", "nobara_kugisaki", "megumi_fushiguro"])
    p2 = make_player("p2", ["satoru_gojo", "ryomen_sukuna", "mahito"])
    return BattleState(players={"p1": p1, "p2": p2}, turn_player_id="p1")


def give_all_energy(player, amount=5):
    for energy in EnergyType:
        player.energy[energy] = amount


def queue_and_resolve(state, action):
    state.pending_actions[action.player_id] = [action]
    state.queue_order[action.player_id] = [action.id]
    return resolve_queue(state, action.player_id, SKILLS_BY_ID)


def test_starter_roster_contains_first_six_with_four_skills_each():
    assert list(STARTER_ROSTER) == [
        "yuji_itadori",
        "nobara_kugisaki",
        "megumi_fushiguro",
        "satoru_gojo",
        "ryomen_sukuna",
        "mahito",
        "aoi_todo",
        "maki_zenin",
        "yuta_okkotsu",
        "hiromi_higuruma",
    ]
    for character in STARTER_ROSTER.values():
        assert len(character.skills) == 4
        assert character.state
        for skill in character.skills:
            assert skill.id in SKILLS_BY_ID
            assert skill.name
            assert skill.text
            assert skill.classes
            assert skill.target_rule.kind


def test_yuji_black_flash_requires_prior_damage_marker_and_applies_momentum_to_self():
    state = make_state()
    give_all_energy(state.players["p1"])
    action = PendingAction(
        id="a1",
        player_id="p1",
        caster_slot=0,
        skill_id="black_flash",
        target_player_id="p2",
        target_slot=0,
        wildcard_pays=[EnergyType.GREEN],
    )

    with pytest.raises(ResolverError):
        validate_action(state, action, SKILLS_BY_ID)

    yuji = state.players["p1"].team[0]
    yuji.statuses.append(
        StatusEffect("damaged_enemy_last_turn", "Damaged Enemy Last Turn", "p1", 0, "p1", 0, duration=1)
    )
    queue_and_resolve(state, action)

    gojo = state.players["p2"].team[0]
    assert gojo.hp == 65
    assert any(status.id == "momentum" for status in yuji.statuses)
    assert not any(status.id == "momentum" for status in gojo.statuses)


def test_nobara_nail_mark_enables_resonance_payoff():
    state = make_state()
    give_all_energy(state.players["p1"])

    queue_and_resolve(
        state,
        PendingAction("mark", "p1", 1, "straw_doll_technique", "p2", 1),
    )
    sukuna = state.players["p2"].team[1]
    assert sukuna.hp == 90
    assert any(status.id == "nail_mark" for status in sukuna.statuses)

    give_all_energy(state.players["p1"])
    queue_and_resolve(
        state,
        PendingAction(
            "resonance",
            "p1",
            1,
            "resonance",
            "p2",
            1,
            wildcard_pays=[EnergyType.RED],
        ),
    )
    assert sukuna.hp == 60


def test_nobara_hammer_bonus_and_hairpin_consumes_marks():
    state = make_state()
    give_all_energy(state.players["p1"])
    sukuna = state.players["p2"].team[1]
    sukuna.statuses.append(StatusEffect("nail_mark", "Nail Mark", "p1", 1, "p2", 1, duration=3))

    queue_and_resolve(state, PendingAction("hammer", "p1", 1, "hammer_strike", "p2", 1))
    assert sukuna.hp == 70

    give_all_energy(state.players["p1"])
    sukuna.statuses.append(StatusEffect("nail_mark", "Nail Mark", "p1", 1, "p2", 1, duration=3))
    queue_and_resolve(
        state,
        PendingAction(
            "hairpin",
            "p1",
            1,
            "hairpin",
            "p2",
            target_slots=[1],
            wildcard_pays=[EnergyType.BLUE],
        ),
    )

    assert sukuna.hp == 50
    assert not any(status.id == "nail_mark" for status in sukuna.statuses)


def test_gojo_infinity_blocks_non_domain_damage():
    state = make_state()
    give_all_energy(state.players["p2"])

    queue_and_resolve(
        state,
        PendingAction(
            "infinity",
            "p2",
            0,
            "infinity",
            "self",
            0,
            wildcard_pays=[EnergyType.WHITE],
        ),
    )
    gojo = state.players["p2"].team[0]

    assert any(status.id == "infinity" and status.payload["invulnerable"] for status in gojo.statuses)
    assert apply_damage(gojo, 40, DamageType.NORMAL) == 0
    assert gojo.hp == 100


def test_invulnerable_target_is_illegal_without_bypass():
    state = make_state()
    give_all_energy(state.players["p1"])
    gojo = state.players["p2"].team[0]
    gojo.statuses.append(
        StatusEffect(
            "infinity",
            "Infinity",
            "p2",
            0,
            "p2",
            0,
            duration=1,
            payload={"invulnerable": True},
        )
    )

    with pytest.raises(ResolverError, match="invulnerable"):
        validate_action(
            state,
            PendingAction("strike", "p1", 0, "divergent_fist", "p2", 0),
            SKILLS_BY_ID,
        )

    validate_action(
        state,
        PendingAction("domain", "p1", 2, "chimera_shadow_garden", "p2", target_slots=[0], wildcard_pays=[EnergyType.BLUE]),
        SKILLS_BY_ID,
    )


def test_sukuna_binding_vow_is_free_and_records_tradeoff_payloads():
    binding_vow = SKILLS_BY_ID["binding_vow"]

    assert binding_vow.cost == []
    assert SkillClass.VOW in binding_vow.classes
    assert binding_vow.effects[0].payload["black_cost_delta"] == -1
    assert binding_vow.effects[0].payload["damage_bonus"] == 10
    assert binding_vow.effects[1].damage_type == DamageType.SOUL
    assert binding_vow.effects[1].amount == 10


def test_sukuna_cleave_scales_with_missing_hp_and_execute_threshold():
    state = make_state()
    give_all_energy(state.players["p2"])
    yuji = state.players["p1"].team[0]
    yuji.hp = 30

    queue_and_resolve(
        state,
        PendingAction(
            "cleave",
            "p2",
            1,
            "cleave",
            "p1",
            0,
            wildcard_pays=[EnergyType.RED],
        ),
    )

    assert yuji.hp == 0
    assert yuji.alive is False


def test_mahito_idle_transfiguration_requires_soul_distortion():
    state = make_state()
    give_all_energy(state.players["p2"])
    action = PendingAction(
        "idle",
        "p2",
        2,
        "idle_transfiguration",
        "p1",
        0,
        wildcard_pays=[EnergyType.RED],
    )

    with pytest.raises(ResolverError):
        validate_action(state, action, SKILLS_BY_ID)

    yuji = state.players["p1"].team[0]
    yuji.statuses.append(StatusEffect("soul_distortion", "Soul Distortion", "p2", 2, "p1", 0, duration=2))
    validate_action(state, action, SKILLS_BY_ID)


def test_todo_boogie_woogie_stuns_and_brotherly_assist_buffs_ally():
    state = BattleState(
        players={
            "p1": make_player("p1", ["aoi_todo", "yuji_itadori", "nobara_kugisaki"]),
            "p2": make_player("p2", ["satoru_gojo", "ryomen_sukuna", "mahito"]),
        },
        turn_player_id="p1",
    )
    give_all_energy(state.players["p1"])

    queue_and_resolve(state, PendingAction("boogie", "p1", 0, "boogie_woogie", "p2", 0))
    gojo = state.players["p2"].team[0]
    assert gojo.hp == 85
    assert any(status.id == "boogie_stun" for status in gojo.statuses)

    state.turn_player_id = "p1"
    give_all_energy(state.players["p1"])
    queue_and_resolve(
        state,
        PendingAction(
            "assist",
            "p1",
            0,
            "brotherly_assist",
            "p1",
            1,
            wildcard_pays=[EnergyType.WHITE],
        ),
    )
    yuji = state.players["p1"].team[1]
    assert any(status.id == "best_friend" and status.payload["damage_bonus"] == 10 for status in yuji.statuses)


def test_maki_soul_split_and_heavenly_restriction_ignore_stun():
    state = BattleState(
        players={
            "p1": make_player("p1", ["maki_zenin", "yuji_itadori", "nobara_kugisaki"]),
            "p2": make_player("p2", ["satoru_gojo", "ryomen_sukuna", "mahito"]),
        },
        turn_player_id="p1",
    )
    give_all_energy(state.players["p1"])
    maki = state.players["p1"].team[0]

    queue_and_resolve(state, PendingAction("hr", "p1", 0, "heavenly_restriction", "self", 0))
    state.turn_player_id = "p1"
    maki.statuses.append(
        StatusEffect(
            "stunned",
            "Stunned",
            "p2",
            0,
            "p1",
            0,
            duration=2,
            payload={"stun_classes": ["all"]},
        )
    )
    validate_action(state, PendingAction("slash", "p1", 0, "soul_split_katana", "p2", 0, wildcard_pays=[EnergyType.GREEN]), SKILLS_BY_ID)
    queue_and_resolve(
        state,
        PendingAction("slash", "p1", 0, "soul_split_katana", "p2", 0, wildcard_pays=[EnergyType.GREEN]),
    )
    assert state.players["p2"].team[0].hp == 70


def test_yuta_rct_heals_and_rika_gates_pure_love_beam():
    state = BattleState(
        players={
            "p1": make_player("p1", ["yuta_okkotsu", "yuji_itadori", "nobara_kugisaki"]),
            "p2": make_player("p2", ["satoru_gojo", "ryomen_sukuna", "mahito"]),
        },
        turn_player_id="p1",
    )
    give_all_energy(state.players["p1"])
    ally = state.players["p1"].team[1]
    ally.hp = 55

    queue_and_resolve(
        state,
        PendingAction(
            "rct",
            "p1",
            0,
            "reverse_cursed_technique",
            "p1",
            1,
            wildcard_pays=[EnergyType.WHITE],
        ),
    )
    assert ally.hp == 85

    state.turn_player_id = "p1"
    action = PendingAction(
        "beam",
        "p1",
        0,
        "pure_love_beam",
        "p2",
        0,
        wildcard_pays=[EnergyType.BLUE],
    )
    with pytest.raises(ResolverError):
        validate_action(state, action, SKILLS_BY_ID)

    queue_and_resolve(state, PendingAction("rika", "p1", 0, "rika_manifestation", "self", 0))
    state.turn_player_id = "p1"
    give_all_energy(state.players["p1"])
    queue_and_resolve(state, action)
    assert state.players["p2"].team[0].hp == 45


def test_higuruma_guilty_verdict_enables_confiscation_and_execution():
    state = BattleState(
        players={
            "p1": make_player("p1", ["hiromi_higuruma", "yuji_itadori", "nobara_kugisaki"]),
            "p2": make_player("p2", ["satoru_gojo", "ryomen_sukuna", "mahito"]),
        },
        turn_player_id="p1",
    )
    give_all_energy(state.players["p1"])
    confiscate = PendingAction(
        "confiscate",
        "p1",
        0,
        "confiscation",
        "p2",
        0,
        wildcard_pays=[EnergyType.WHITE],
    )

    with pytest.raises(ResolverError):
        validate_action(state, confiscate, SKILLS_BY_ID)

    queue_and_resolve(state, PendingAction("trial", "p1", 0, "deadly_sentencing", "p2", 0))
    gojo = state.players["p2"].team[0]
    assert any(status.id == "guilty_verdict" for status in gojo.statuses)

    state.turn_player_id = "p1"
    give_all_energy(state.players["p1"])
    queue_and_resolve(state, confiscate)
    assert any(status.id == "confiscated" for status in gojo.statuses)

    state.turn_player_id = "p1"
    give_all_energy(state.players["p1"])
    queue_and_resolve(
        state,
        PendingAction(
            "execute",
            "p1",
            0,
            "executioners_sword",
            "p2",
            0,
            wildcard_pays=[EnergyType.GREEN],
        ),
    )
    assert gojo.hp == 55
