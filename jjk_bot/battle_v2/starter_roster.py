"""Starter character kits for Battle System v2.

The roster is intentionally data-only: these SkillSpec definitions describe the
first Naruto Arena-style JJK kits without adding character-specific resolver
branches.  Unsupported payoff details are carried in effect payloads so future
resolver PRs can implement them without changing the kit contract.
"""

from __future__ import annotations

from dataclasses import dataclass

from .models import (
    ConditionSpec,
    DamageType,
    EffectSpec,
    EnergyType,
    SkillClass,
    SkillSpec,
    TargetRule,
)


@dataclass(frozen=True, slots=True)
class CharacterSpec:
    """Data-only v2 roster entry."""

    id: str
    name: str
    role: str
    state: str
    skills: list[SkillSpec]


def enemy() -> TargetRule:
    return TargetRule(kind="enemy")


def enemy_team(required_status: str | None = None) -> TargetRule:
    return TargetRule(kind="enemy_team", min_targets=1, max_targets=3, required_status=required_status)


def self_target() -> TargetRule:
    return TargetRule(kind="self", allow_self=True)


def status_effect(
    status: str,
    name: str,
    duration: int,
    *,
    target: str = "target",
    classes: list[SkillClass] | None = None,
    **payload,
) -> EffectSpec:
    return EffectSpec(
        type="apply_status",
        status=status,
        duration=duration,
        target=target,
        classes=classes or [],
        payload={"name": name, **payload},
    )


def damage(amount: int, damage_type: DamageType = DamageType.NORMAL, *, target: str = "target", **payload) -> EffectSpec:
    return EffectSpec(
        type="damage",
        amount=amount,
        damage_type=damage_type,
        target=target,
        payload=payload,
    )


YUJI = CharacterSpec(
    id="yuji_itadori",
    name="Yuji Itadori",
    role="Bruiser / momentum / Black Flash payoff",
    state="Momentum",
    skills=[
        SkillSpec(
            id="divergent_fist",
            name="Divergent Fist",
            text="Deal 20 normal damage. Deals +10 if Yuji has Momentum.",
            cost=[EnergyType.GREEN],
            cooldown=0,
            target_rule=enemy(),
            classes=[SkillClass.PHYSICAL, SkillClass.INSTANT],
            effects=[damage(20, bonus_status="momentum", bonus_amount=10)],
        ),
        SkillSpec(
            id="black_flash",
            name="Black Flash",
            text="Deal 35 piercing damage if Yuji damaged an enemy last turn; apply Momentum.",
            cost=[EnergyType.GREEN, EnergyType.BLACK],
            cooldown=1,
            target_rule=enemy(),
            classes=[SkillClass.PHYSICAL, SkillClass.ACHIEVEMENT, SkillClass.INSTANT],
            effects=[
                damage(35, DamageType.PIERCING),
                status_effect("momentum", "Momentum", 2, target="self"),
            ],
            conditions=[ConditionSpec(type="user_damaged_enemy_last_turn")],
        ),
        SkillSpec(
            id="unbreakable_resolve",
            name="Unbreakable Resolve",
            text="Gain 20 damage reduction for 1 turn and ignore stun for 1 turn.",
            cost=[EnergyType.BLACK],
            cooldown=1,
            target_rule=self_target(),
            classes=[SkillClass.STRATEGIC, SkillClass.INSTANT],
            effects=[
                status_effect(
                    "unbreakable_resolve",
                    "Unbreakable Resolve",
                    2,
                    target="self",
                    damage_reduction=20,
                    ignore_stun=True,
                )
            ],
        ),
        SkillSpec(
            id="soul_seizing_blow",
            name="Soul-Seizing Blow",
            text="Deal 25 soul damage. Deals +15 if the target has Soul Bruise.",
            cost=[EnergyType.GREEN, EnergyType.RED],
            cooldown=1,
            target_rule=enemy(),
            classes=[SkillClass.PHYSICAL, SkillClass.SOUL, SkillClass.INSTANT],
            effects=[damage(25, DamageType.SOUL, bonus_status="soul_bruise", bonus_amount=15)],
        ),
    ],
)


NOBARA = CharacterSpec(
    id="nobara_kugisaki",
    name="Nobara Kugisaki",
    role="Mark / delayed burst",
    state="Nail Mark",
    skills=[
        SkillSpec(
            id="hammer_strike",
            name="Hammer Strike",
            text="Deal 20 normal damage. Deals +10 against Nail Mark.",
            cost=[EnergyType.GREEN],
            cooldown=0,
            target_rule=enemy(),
            classes=[SkillClass.PHYSICAL, SkillClass.INSTANT],
            effects=[damage(20, bonus_status="nail_mark", bonus_amount=10)],
        ),
        SkillSpec(
            id="straw_doll_technique",
            name="Straw Doll Technique",
            text="Apply Nail Mark for 3 turns and deal 10 piercing damage.",
            cost=[EnergyType.RED],
            cooldown=1,
            target_rule=enemy(),
            classes=[SkillClass.INNATE, SkillClass.STRATEGIC, SkillClass.INSTANT],
            effects=[
                status_effect("nail_mark", "Nail Mark", 3),
                damage(10, DamageType.PIERCING),
            ],
        ),
        SkillSpec(
            id="resonance",
            name="Resonance",
            text="Deal 30 soul damage to a marked enemy. Ignores destructible defense.",
            cost=[EnergyType.RED, EnergyType.BLACK],
            cooldown=1,
            target_rule=TargetRule(kind="enemy", required_status="nail_mark"),
            classes=[SkillClass.SOUL, SkillClass.INNATE, SkillClass.INSTANT],
            effects=[damage(30, DamageType.SOUL)],
            conditions=[ConditionSpec(type="target_has", status="nail_mark")],
        ),
        SkillSpec(
            id="hairpin",
            name="Hairpin",
            text="Deal 20 piercing damage to all marked enemies and consume Nail Mark.",
            cost=[EnergyType.BLUE, EnergyType.BLACK],
            cooldown=2,
            target_rule=enemy_team("nail_mark"),
            classes=[SkillClass.INNATE, SkillClass.INSTANT],
            effects=[damage(20, DamageType.PIERCING), EffectSpec(type="remove_status", status="nail_mark")],
        ),
    ],
)


MEGUMI = CharacterSpec(
    id="megumi_fushiguro",
    name="Megumi Fushiguro",
    role="Setup / shikigami / flexible targeting",
    state="Ten Shadows Setup",
    skills=[
        SkillSpec(
            id="divine_dog",
            name="Divine Dog",
            text="Deal 20 damage. Deals +10 if the target is stunned or marked.",
            cost=[EnergyType.GREEN],
            cooldown=0,
            target_rule=enemy(),
            classes=[SkillClass.PHYSICAL, SkillClass.CURSED_ENERGY, SkillClass.INSTANT],
            effects=[damage(20, bonus_statuses=["stunned", "nail_mark"], bonus_amount=10)],
        ),
        SkillSpec(
            id="nue",
            name="Nue",
            text="Deal 15 damage and stun Physical/CursedEnergy for 1 turn.",
            cost=[EnergyType.BLUE],
            cooldown=1,
            target_rule=enemy(),
            classes=[SkillClass.CURSED_ENERGY, SkillClass.INSTANT],
            effects=[
                damage(15),
                status_effect(
                    "nue_stun",
                    "Nue Stun",
                    2,
                    stun_classes=[SkillClass.PHYSICAL.value, SkillClass.CURSED_ENERGY.value],
                ),
            ],
        ),
        SkillSpec(
            id="rabbit_escape",
            name="Rabbit Escape",
            text="Counter the first harmful non-Domain skill next turn. Invisible.",
            cost=[EnergyType.WHITE],
            cooldown=1,
            target_rule=self_target(),
            classes=[SkillClass.STRATEGIC, SkillClass.INVISIBLE, SkillClass.INSTANT],
            effects=[
                status_effect(
                    "rabbit_escape",
                    "Rabbit Escape",
                    2,
                    target="self",
                    classes=[SkillClass.INVISIBLE],
                    counter="first_harmful_non_domain",
                    invisible=True,
                )
            ],
        ),
        SkillSpec(
            id="chimera_shadow_garden",
            name="Chimera Shadow Garden",
            text="Domain for 2 turns. Shikigami skills cost 1 less black; enemies deal -10 damage. Burnout after end.",
            cost=[EnergyType.BLUE, EnergyType.BLUE, EnergyType.BLACK],
            cooldown=4,
            target_rule=enemy_team(),
            classes=[SkillClass.DOMAIN, SkillClass.BARRIER, SkillClass.ACTION],
            effects=[
                status_effect("chimera_shadow_garden", "Chimera Shadow Garden", 3, domain=True, damage_output_delta=-10),
            ],
        ),
    ],
)


GOJO = CharacterSpec(
    id="satoru_gojo",
    name="Satoru Gojo",
    role="Expensive control / defense",
    state="Infinity",
    skills=[
        SkillSpec(
            id="blue",
            name="Blue",
            text="Deal 25 damage; increase target cooldowns by 1 if target has Pulled.",
            cost=[EnergyType.BLUE],
            cooldown=0,
            target_rule=enemy(),
            classes=[SkillClass.INNATE, SkillClass.CURSED_ENERGY, SkillClass.INSTANT],
            effects=[damage(25, bonus_status="pulled", cooldown_increase=1)],
        ),
        SkillSpec(
            id="red",
            name="Red",
            text="Deal 35 piercing damage.",
            cost=[EnergyType.BLUE, EnergyType.BLACK],
            cooldown=1,
            target_rule=enemy(),
            classes=[SkillClass.INNATE, SkillClass.CURSED_ENERGY, SkillClass.INSTANT],
            effects=[damage(35, DamageType.PIERCING)],
        ),
        SkillSpec(
            id="infinity",
            name="Infinity",
            text="Become invulnerable to harmful non-Domain skills for 1 turn.",
            cost=[EnergyType.WHITE, EnergyType.BLACK],
            cooldown=2,
            target_rule=self_target(),
            classes=[SkillClass.BARRIER, SkillClass.STRATEGIC, SkillClass.INSTANT],
            effects=[status_effect("infinity", "Infinity", 2, target="self", invulnerable=True)],
        ),
        SkillSpec(
            id="unlimited_void",
            name="Unlimited Void",
            text="Domain for 2 turns. Enemies using non-Domain skills become stunned next turn; burnout after end.",
            cost=[EnergyType.BLUE, EnergyType.BLUE, EnergyType.WHITE],
            cooldown=4,
            target_rule=enemy_team(),
            classes=[SkillClass.DOMAIN, SkillClass.BARRIER, SkillClass.ACTION],
            effects=[status_effect("unlimited_void", "Unlimited Void", 3, domain=True, punish_non_domain=True)],
        ),
    ],
)


SUKUNA = CharacterSpec(
    id="ryomen_sukuna",
    name="Ryomen Sukuna",
    role="Burst / execution / domain pressure",
    state="Shrine Pressure",
    skills=[
        SkillSpec(
            id="dismantle",
            name="Dismantle",
            text="Deal 25 piercing damage.",
            cost=[EnergyType.BLUE],
            cooldown=0,
            target_rule=enemy(),
            classes=[SkillClass.CURSED_ENERGY, SkillClass.INNATE, SkillClass.INSTANT],
            effects=[damage(25, DamageType.PIERCING)],
        ),
        SkillSpec(
            id="cleave",
            name="Cleave",
            text="Deal 20 damage plus 10 per missing 25 HP. If target is below 35 HP, deal +15.",
            cost=[EnergyType.RED, EnergyType.BLACK],
            cooldown=1,
            target_rule=enemy(),
            classes=[SkillClass.INNATE, SkillClass.INSTANT],
            effects=[damage(20, scaling="missing_hp_25", execute_threshold=35, execute_bonus=15)],
        ),
        SkillSpec(
            id="binding_vow",
            name="Binding Vow",
            text="Next damaging skill costs 1 less black and deals +10. Sukuna takes 10 soul damage.",
            cost=[],
            cooldown=2,
            target_rule=self_target(),
            classes=[SkillClass.VOW, SkillClass.STRATEGIC, SkillClass.INSTANT],
            effects=[
                status_effect("binding_vow", "Binding Vow", 2, target="self", black_cost_delta=-1, damage_bonus=10),
                damage(10, DamageType.SOUL, target="self"),
            ],
        ),
        SkillSpec(
            id="malevolent_shrine",
            name="Malevolent Shrine",
            text="Domain for 2 turns. Enemies take 15 sure-hit damage at turn end; non-Domain skills cost +1 black next turn.",
            cost=[EnergyType.BLUE, EnergyType.RED, EnergyType.BLACK],
            cooldown=4,
            target_rule=enemy_team(),
            classes=[SkillClass.DOMAIN, SkillClass.INNATE, SkillClass.ACTION],
            effects=[status_effect("malevolent_shrine", "Malevolent Shrine", 3, domain=True, turn_end_damage=15, turn_end_damage_type=DamageType.SURE_HIT.value)],
        ),
    ],
)


MAHITO = CharacterSpec(
    id="mahito",
    name="Mahito",
    role="Soul affliction / transformation",
    state="Transfigured",
    skills=[
        SkillSpec(
            id="soul_touch",
            name="Soul Touch",
            text="Deal 15 soul damage and apply Soul Distortion.",
            cost=[EnergyType.RED],
            cooldown=0,
            target_rule=enemy(),
            classes=[SkillClass.SOUL, SkillClass.INNATE, SkillClass.INSTANT],
            effects=[damage(15, DamageType.SOUL), status_effect("soul_distortion", "Soul Distortion", 3)],
        ),
        SkillSpec(
            id="idle_transfiguration",
            name="Idle Transfiguration",
            text="Deal 30 soul damage to an enemy with Soul Distortion and reduce healing received by 15 for 2 turns.",
            cost=[EnergyType.RED, EnergyType.BLACK],
            cooldown=1,
            target_rule=TargetRule(kind="enemy", required_status="soul_distortion"),
            classes=[SkillClass.SOUL, SkillClass.INNATE, SkillClass.INSTANT],
            effects=[damage(30, DamageType.SOUL), status_effect("warped_soul", "Warped Soul", 2, healing_received_delta=-15)],
            conditions=[ConditionSpec(type="target_has", status="soul_distortion")],
        ),
        SkillSpec(
            id="body_repel",
            name="Body Repel",
            text="Deal 20 damage. If target has Soul Distortion, stun Strategic for 1 turn.",
            cost=[EnergyType.GREEN],
            cooldown=1,
            target_rule=enemy(),
            classes=[SkillClass.PHYSICAL, SkillClass.INSTANT],
            effects=[
                damage(20),
                status_effect("body_repel_stun", "Body Repel Stun", 2, stun_classes=[SkillClass.STRATEGIC.value], condition_status="soul_distortion"),
            ],
        ),
        SkillSpec(
            id="self_embodiment_of_perfection",
            name="Self-Embodiment of Perfection",
            text="Domain for 2 turns. Mahito's Soul skills become sure-hit; burnout after end.",
            cost=[EnergyType.RED, EnergyType.BLUE, EnergyType.WHITE],
            cooldown=4,
            target_rule=enemy_team(),
            classes=[SkillClass.DOMAIN, SkillClass.SOUL, SkillClass.ACTION],
            effects=[status_effect("self_embodiment_of_perfection", "Self-Embodiment of Perfection", 3, domain=True, soul_skills_sure_hit=True)],
        ),
    ],
)


STARTER_ROSTER: dict[str, CharacterSpec] = {
    character.id: character
    for character in [YUJI, NOBARA, MEGUMI, GOJO, SUKUNA, MAHITO]
}

SKILLS_BY_ID: dict[str, SkillSpec] = {
    skill.id: skill
    for character in STARTER_ROSTER.values()
    for skill in character.skills
}


def get_character_spec(character_id: str) -> CharacterSpec:
    """Return a starter-roster character by id."""

    return STARTER_ROSTER[character_id]


def get_skill_spec(skill_id: str) -> SkillSpec:
    """Return a starter-roster skill by id."""

    return SKILLS_BY_ID[skill_id]
