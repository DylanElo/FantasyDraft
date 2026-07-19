"""Starter character kits for Battle System v2.

The roster is intentionally data-only: these SkillSpec definitions describe the
first Naruto Arena-style JJK kits without adding character-specific resolver
branches.  Unsupported payoff details are carried in effect payloads so future
resolver PRs can implement them without changing the kit contract.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .first_creation_missions import first_creation_missions_payload
from .first_creation_unlocks import first_creation_unlocks_payload

from .models import (
    ConditionSpec,
    DamageType,
    DurationClock,
    EffectSpec,
    EnergyType,
    SkillClass,
    SkillSpec,
    StatusFamily,
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
    availability: str = "battle_v2"
    era: str = "modern"
    tags: list[str] = field(default_factory=list)
    difficulty: str = "Medium"


def enemy() -> TargetRule:
    return TargetRule(kind="enemy")


def ally() -> TargetRule:
    return TargetRule(kind="ally", allow_self=True)


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
    duration_clock: DurationClock | str | None = None,
    families: list[StatusFamily] | None = None,
    **payload,
) -> EffectSpec:
    if duration_clock is None:
        duration_clock = DurationClock.SOURCE_TURN if target == "self" else DurationClock.TARGET_TURN
    clock = DurationClock(duration_clock)
    if payload.get("invisible") and "reveal_mode" not in payload:
        payload["reveal_mode"] = (
            "trigger_or_expiry"
            if payload.get("controlled_redirect") or payload.get("watch_target_player_id")
            else "never"
        )
    if families is None:
        control_payload = any(
            payload.get(key)
            for key in (
                "stun_classes", "stun_harmful", "block_non_damaging_skills",
                "block_counters", "cannot_target_allies", "controlled_redirect",
            )
        )
        harmful_payload = (
            control_payload
            or int(payload.get("turn_end_damage", 0)) > 0
            or int(payload.get("damage_output_delta", 0)) < 0
            or int(payload.get("physical_damage_output_delta", 0)) < 0
            or int(payload.get("healing_received_delta", 0)) < 0
        )
        mark_ids = {"soul_bruise", "scent", "nail", "blood_mark", "revealed", "exposed", "pulled", "crow_mark"}
        families = []
        if status == "soul_bruise":
            families.extend([StatusFamily.SOUL, StatusFamily.MARK])
        elif payload.get("turn_end_damage") or status == "poison":
            families.append(StatusFamily.AFFLICTION)
        if payload.get("stun_classes") or payload.get("stun_harmful"):
            families.extend([StatusFamily.STUN, StatusFamily.CONTROL])
        elif control_payload:
            families.append(StatusFamily.CONTROL)
        if status in mark_ids:
            families.append(StatusFamily.MARK)
        if not harmful_payload and not families:
            families.append(StatusFamily.BUFF)
        elif harmful_payload:
            families.append(StatusFamily.DEBUFF)
        if not families:
            families.append(StatusFamily.BUFF)
    return EffectSpec(
        type="apply_status",
        status=status,
        duration=duration,
        target=target,
        classes=classes or [],
        payload={"name": name, "duration_clock": clock.value, "families": [family.value for family in dict.fromkeys(families)], **payload},
    )


def damage(amount: int, damage_type: DamageType = DamageType.NORMAL, *, target: str = "target", **payload) -> EffectSpec:
    return EffectSpec(
        type="damage",
        amount=amount,
        damage_type=damage_type,
        target=target,
        payload=payload,
    )


def heal(amount: int, *, target: str = "target", **payload) -> EffectSpec:
    return EffectSpec(
        type="heal",
        amount=amount,
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
            text="Become untargetable for 1 turn; bypass skills can ignore it.",
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
                status_effect("binding_vow", "Binding Vow", 2, target="self", black_cost_delta=-1, damage_bonus=10, consume_after_damage=True),
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


AOI_TODO = CharacterSpec(
    id="aoi_todo",
    name="Aoi Todo",
    role="Disruptor / setup partner / position control",
    state="Best Friend",
    skills=[
        SkillSpec(
            id="todo_crushing_kick",
            name="Crushing Kick",
            text="Deal 25 normal damage. Deals +10 if Todo has Best Friend.",
            cost=[EnergyType.GREEN],
            cooldown=0,
            target_rule=enemy(),
            classes=[SkillClass.PHYSICAL, SkillClass.INSTANT],
            effects=[damage(25, bonus_status="best_friend", bonus_amount=10)],
        ),
        SkillSpec(
            id="boogie_woogie",
            name="Boogie Woogie",
            text="Deal 15 damage and stun Physical/CursedEnergy for 1 turn.",
            cost=[EnergyType.WHITE],
            cooldown=1,
            target_rule=enemy(),
            classes=[SkillClass.STRATEGIC, SkillClass.INSTANT],
            effects=[
                damage(15),
                status_effect(
                    "boogie_stun",
                    "Boogie Woogie",
                    2,
                    stun_classes=[SkillClass.PHYSICAL.value, SkillClass.CURSED_ENERGY.value],
                ),
            ],
        ),
        SkillSpec(
            id="brotherly_assist",
            name="Brotherly Assist",
            text="Give an ally 10 damage reduction and +10 damage on their next offensive skill.",
            cost=[EnergyType.WHITE, EnergyType.BLACK],
            cooldown=2,
            target_rule=ally(),
            classes=[SkillClass.STRATEGIC, SkillClass.INSTANT],
            effects=[
                status_effect(
                    "best_friend",
                    "Best Friend",
                    2,
                    damage_reduction=10,
                    damage_bonus=10,
                    consume_after_damage=True,
                )
            ],
        ),
        SkillSpec(
            id="clap_feint",
            name="Clap Feint",
            text="Counter the first harmful non-Domain skill against Todo. Invisible.",
            cost=[EnergyType.WHITE, EnergyType.BLACK],
            cooldown=2,
            target_rule=self_target(),
            classes=[SkillClass.STRATEGIC, SkillClass.INVISIBLE, SkillClass.INSTANT],
            effects=[
                status_effect(
                    "clap_feint",
                    "Clap Feint",
                    2,
                    target="self",
                    classes=[SkillClass.INVISIBLE],
                    counter="first_harmful_non_domain",
                    invisible=True,
                )
            ],
        ),
    ],
)


MAKI = CharacterSpec(
    id="maki_zenin",
    name="Maki Zenin",
    role="Physical pressure / anti-technique bruiser",
    state="Heavenly Restriction",
    skills=[
        SkillSpec(
            id="maki_cursed_tool_combo",
            name="Cursed Tool Combo",
            text="Deal 25 normal damage.",
            cost=[EnergyType.GREEN],
            cooldown=0,
            target_rule=enemy(),
            classes=[SkillClass.PHYSICAL, SkillClass.INSTANT],
            effects=[damage(25)],
        ),
        SkillSpec(
            id="soul_split_katana",
            name="Soul Split Katana",
            text="Deal 30 soul damage.",
            cost=[EnergyType.GREEN, EnergyType.BLACK],
            cooldown=1,
            target_rule=enemy(),
            classes=[SkillClass.PHYSICAL, SkillClass.SOUL, SkillClass.INSTANT],
            effects=[damage(30, DamageType.SOUL)],
        ),
        SkillSpec(
            id="heavenly_restriction",
            name="Heavenly Restriction",
            text="Gain 15 damage reduction and ignore stun for 1 turn.",
            cost=[EnergyType.WHITE],
            cooldown=2,
            target_rule=self_target(),
            classes=[SkillClass.PHYSICAL, SkillClass.STRATEGIC, SkillClass.INSTANT],
            effects=[
                status_effect(
                    "heavenly_restriction",
                    "Heavenly Restriction",
                    2,
                    target="self",
                    damage_reduction=15,
                    ignore_stun=True,
                )
            ],
        ),
        SkillSpec(
            id="perfect_preparation",
            name="Perfect Preparation",
            text="Next damaging skill costs 1 less black and deals +10.",
            cost=[EnergyType.GREEN, EnergyType.WHITE],
            cooldown=2,
            target_rule=self_target(),
            classes=[SkillClass.PHYSICAL, SkillClass.STRATEGIC, SkillClass.INSTANT],
            effects=[
                status_effect(
                    "perfect_preparation",
                    "Perfect Preparation",
                    2,
                    target="self",
                    black_cost_delta=-1,
                    damage_bonus=10,
                    consume_after_damage=True,
                )
            ],
        ),
    ],
)


YUTA = CharacterSpec(
    id="yuta_okkotsu",
    name="Yuta Okkotsu",
    role="Support / sustain / copied pressure",
    state="Rika Manifested",
    skills=[
        SkillSpec(
            id="yuta_katana_slash",
            name="Katana Slash",
            text="Deal 20 normal damage. Deals +10 if Yuta has Rika Manifested.",
            cost=[EnergyType.GREEN],
            cooldown=0,
            target_rule=enemy(),
            classes=[SkillClass.PHYSICAL, SkillClass.INSTANT],
            effects=[damage(20, bonus_status="rika_manifested", bonus_amount=10)],
        ),
        SkillSpec(
            id="reverse_cursed_technique",
            name="Reverse Cursed Technique",
            text="Heal an ally for 30 HP.",
            cost=[EnergyType.WHITE, EnergyType.BLACK],
            cooldown=2,
            target_rule=ally(),
            classes=[SkillClass.STRATEGIC, SkillClass.INSTANT],
            effects=[heal(30)],
        ),
        SkillSpec(
            id="rika_manifestation",
            name="Rika Manifestation",
            text="Gain Rika Manifested for 2 turns: +10 outgoing damage.",
            cost=[EnergyType.BLUE],
            cooldown=2,
            target_rule=self_target(),
            classes=[SkillClass.CURSED_ENERGY, SkillClass.INSTANT],
            effects=[
                status_effect(
                    "rika_manifested",
                    "Rika Manifested",
                    3,
                    target="self",
                    damage_output_delta=10,
                )
            ],
        ),
        SkillSpec(
            id="pure_love_beam",
            name="Pure Love Beam",
            text="Deal 45 piercing damage. Requires Rika Manifested.",
            cost=[EnergyType.BLUE, EnergyType.BLUE, EnergyType.BLACK],
            cooldown=3,
            target_rule=enemy(),
            classes=[SkillClass.CURSED_ENERGY, SkillClass.INSTANT],
            effects=[damage(45, DamageType.PIERCING)],
            conditions=[ConditionSpec(type="user_has", status="rika_manifested")],
        ),
    ],
)


HIGURUMA = CharacterSpec(
    id="hiromi_higuruma",
    name="Hiromi Higuruma",
    role="Judgment / suppression / execution",
    state="Guilty Verdict",
    skills=[
        SkillSpec(
            id="gavel_strike",
            name="Gavel Strike",
            text="Deal 20 normal damage. Deals +10 against Guilty Verdict.",
            cost=[EnergyType.GREEN],
            cooldown=0,
            target_rule=enemy(),
            classes=[SkillClass.PHYSICAL, SkillClass.INSTANT],
            effects=[damage(20, bonus_status="guilty_verdict", bonus_amount=10)],
        ),
        SkillSpec(
            id="deadly_sentencing",
            name="Deadly Sentencing",
            text="Apply Guilty Verdict and reduce target damage by 10 for 2 turns.",
            cost=[EnergyType.WHITE],
            cooldown=1,
            target_rule=enemy(),
            classes=[SkillClass.BARRIER, SkillClass.STRATEGIC, SkillClass.INSTANT],
            effects=[
                status_effect(
                    "guilty_verdict",
                    "Guilty Verdict",
                    3,
                    damage_output_delta=-10,
                )
            ],
        ),
        SkillSpec(
            id="confiscation",
            name="Confiscation",
            text="Stun Innate/CursedEnergy skills for 1 turn on a guilty target.",
            cost=[EnergyType.WHITE, EnergyType.BLACK],
            cooldown=2,
            target_rule=TargetRule(kind="enemy", required_status="guilty_verdict"),
            classes=[SkillClass.BARRIER, SkillClass.CONTROL, SkillClass.INSTANT],
            effects=[
                status_effect(
                    "confiscated",
                    "Confiscated",
                    2,
                    stun_classes=[SkillClass.INNATE.value, SkillClass.CURSED_ENERGY.value],
                )
            ],
            conditions=[ConditionSpec(type="target_has", status="guilty_verdict")],
        ),
        SkillSpec(
            id="executioners_sword",
            name="Executioner's Sword",
            text="Deal 45 soul damage to a guilty enemy.",
            cost=[EnergyType.GREEN, EnergyType.WHITE, EnergyType.BLACK],
            cooldown=3,
            target_rule=TargetRule(kind="enemy", required_status="guilty_verdict"),
            classes=[SkillClass.SOUL, SkillClass.BARRIER, SkillClass.INSTANT],
            effects=[damage(45, DamageType.SOUL)],
            conditions=[ConditionSpec(type="target_has", status="guilty_verdict")],
        ),
    ],
)


STARTER_ROSTER: dict[str, CharacterSpec] = {
    character.id: character
    for character in [YUJI, NOBARA, MEGUMI, GOJO, SUKUNA, MAHITO, AOI_TODO, MAKI, YUTA, HIGURUMA]
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


FIRST_CREATION_CHARACTER_IDS: tuple[str, ...] = (
    "yuji_itadori",
    "megumi_fushiguro",
    "nobara_kugisaki",
    "maki_zenin",
    "toge_inumaki",
    "panda",
    "aoi_todo",
    "noritoshi_kamo",
    "momo_nishimiya",
    "mai_zenin",
    "kasumi_miwa",
    "kokichi_muta_mechamaru",
    "junpei_yoshino",
    "satoru_gojo_young",
    "suguru_geto_young",
    "shoko_ieiri_young",
    "utahime_iori_young",
    "mei_mei_young",
    "yuta_okkotsu_jjk0",
)

FIRST_CREATION_CHARACTER_NAMES: dict[str, str] = {
    "yuji_itadori": "Yuji Itadori",
    "megumi_fushiguro": "Megumi Fushiguro",
    "nobara_kugisaki": "Nobara Kugisaki",
    "maki_zenin": "Maki Zenin",
    "toge_inumaki": "Toge Inumaki",
    "panda": "Panda",
    "aoi_todo": "Aoi Todo",
    "noritoshi_kamo": "Noritoshi Kamo",
    "momo_nishimiya": "Momo Nishimiya",
    "mai_zenin": "Mai Zenin",
    "kasumi_miwa": "Kasumi Miwa",
    "kokichi_muta_mechamaru": "Kokichi Muta / Mechamaru",
    "junpei_yoshino": "Junpei Yoshino",
    "satoru_gojo_young": "Satoru Gojo (Young)",
    "suguru_geto_young": "Suguru Geto (Young)",
    "shoko_ieiri_young": "Shoko Ieiri (Young)",
    "utahime_iori_young": "Utahime Iori (Young)",
    "mei_mei_young": "Mei Mei (Young)",
    "yuta_okkotsu_jjk0": "Yuta Okkotsu (JJK 0)",
}

FIRST_CREATION_TAGS: dict[str, tuple[str, ...]] = {
    "yuji_itadori": ("tokyo_student", "bruiser"),
    "megumi_fushiguro": ("tokyo_student", "control", "mark"),
    "nobara_kugisaki": ("tokyo_student", "mark"),
    "maki_zenin": ("tokyo_student", "bruiser", "counter"),
    "toge_inumaki": ("tokyo_student", "control"),
    "panda": ("tokyo_student", "bruiser"),
    "aoi_todo": ("kyoto_student", "bruiser", "counter"),
    "noritoshi_kamo": ("kyoto_student", "control", "mark"),
    "momo_nishimiya": ("kyoto_student", "support"),
    "mai_zenin": ("kyoto_student", "mark"),
    "kasumi_miwa": ("kyoto_student", "counter"),
    "kokichi_muta_mechamaru": ("kyoto_student", "control"),
    "junpei_yoshino": ("outsider", "control"),
    "satoru_gojo_young": ("hidden_inventory", "control"),
    "suguru_geto_young": ("hidden_inventory", "control"),
    "shoko_ieiri_young": ("hidden_inventory", "support", "healer"),
    "utahime_iori_young": ("hidden_inventory", "support"),
    "mei_mei_young": ("hidden_inventory", "mark"),
    "yuta_okkotsu_jjk0": ("jjk0", "support", "bruiser"),
}

FIRST_CREATION_PRESETS: dict[str, tuple[str, str, str]] = {
    "story_tutorial": ("yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"),
    "tokyo_second_years": ("maki_zenin", "toge_inumaki", "panda"),
    "kyoto_pressure": ("aoi_todo", "noritoshi_kamo", "mai_zenin"),
    "defensive_artillery": ("kasumi_miwa", "momo_nishimiya", "kokichi_muta_mechamaru"),
    "poison_outsider": ("junpei_yoshino", "nobara_kugisaki", "megumi_fushiguro"),
    "hidden_inventory": ("satoru_gojo_young", "suguru_geto_young", "shoko_ieiri_young"),
    "young_sorcerer_support": ("utahime_iori_young", "mei_mei_young", "shoko_ieiri_young"),
    "jjk0_beginner_special": ("yuta_okkotsu_jjk0", "maki_zenin", "toge_inumaki"),
}

FIRST_CREATION_LOCKED_VARIANTS: tuple[str, ...] = (
    "gojo_adult", "gojo_unsealed", "gojo_shinjuku", "geto_jjk0", "kenjaku",
    "yuta_sendai", "yuta_shinjuku", "yuta_gojo_body", "awakened_yuji",
    "awakened_maki", "sukuna_incarnation", "meguna", "heian_sukuna", "mahito",
    "jogo", "dagon", "hanami", "choso", "hakari", "higuruma", "kashimo",
    "takaba", "angel", "uraume", "toji", "naoya",
)

FIRST_CREATION_AVAILABILITY = "starter"
FIRST_CREATION_ERA = "student_era"
GENERATED_ENERGY_TYPES: tuple[EnergyType, ...] = (
    EnergyType.GREEN,
    EnergyType.RED,
    EnergyType.BLUE,
    EnergyType.WHITE,
)
WILDCARD_COST_TYPE = EnergyType.BLACK


def first_creation_metadata(character_id: str) -> dict[str, object]:
    """Return first-character-creation metadata for UI and account setup."""

    if character_id not in FIRST_CREATION_CHARACTER_NAMES:
        raise KeyError(character_id)
    return {
        "id": character_id,
        "name": FIRST_CREATION_CHARACTER_NAMES[character_id],
        "availability": FIRST_CREATION_AVAILABILITY,
        "era": FIRST_CREATION_ERA,
        "tags": list(FIRST_CREATION_TAGS[character_id]),
    }


BODY = EnergyType.GREEN
TECHNIQUE = EnergyType.BLUE
FOCUS = EnergyType.WHITE
CURSE = EnergyType.RED
WILD = EnergyType.BLACK


def first_creation_skill(
    character_id: str,
    slug: str,
    name: str,
    text: str,
    cost: list[EnergyType],
    cooldown: int,
    target_rule: TargetRule,
    classes: list[SkillClass],
    effects: list[EffectSpec] | None = None,
    conditions: list[ConditionSpec] | None = None,
) -> SkillSpec:
    """Build a namespaced first-creation skill spec."""

    return SkillSpec(
        id=f"fc_{character_id}_{slug}",
        name=name,
        text=text,
        cost=cost,
        cooldown=cooldown,
        target_rule=target_rule,
        classes=classes,
        effects=effects or [],
        conditions=conditions or [],
    )


def starter_character(
    character_id: str,
    role: str,
    state: str,
    difficulty: str,
    skills: list[SkillSpec],
) -> CharacterSpec:
    """Build a first-character-creation roster entry."""

    return CharacterSpec(
        id=character_id,
        name=FIRST_CREATION_CHARACTER_NAMES[character_id],
        role=role,
        state=state,
        skills=skills,
        availability=FIRST_CREATION_AVAILABILITY,
        era=FIRST_CREATION_ERA,
        tags=list(FIRST_CREATION_TAGS[character_id]),
        difficulty=difficulty,
    )


def s(
    cid: str,
    slug: str,
    name: str,
    text: str,
    cost: list[EnergyType],
    cooldown: int,
    target: TargetRule,
    classes: list[SkillClass],
    effects: list[EffectSpec] | None = None,
    conditions: list[ConditionSpec] | None = None,
) -> SkillSpec:
    if effects is None:
        raise ValueError(f"first-creation skill {cid}.{slug} requires an explicit effect contract")
    melee_skills = {
        ("yuji_itadori", "divergent_fist"),
        ("yuji_itadori", "black_flash_attempt"),
        ("maki_zenin", "cursed_tool_combo"),
        ("maki_zenin", "spear_sweep"),
        ("panda", "panda_jab"),
        ("panda", "drumming_beat"),
        ("aoi_todo", "brutal_palm_strike"),
        ("aoi_todo", "brotherly_beatdown"),
        ("kasumi_miwa", "new_shadow_quick_draw"),
        ("kasumi_miwa", "earnest_slash"),
        ("mei_mei_young", "axe_sweep"),
        ("yuta_okkotsu_jjk0", "cursed_katana"),
    }
    ranged_skills = {
        ("mai_zenin", "revolver_shot"),
        ("mei_mei_young", "black_bird_strike"),
    }
    classes = list(classes)
    if (cid, slug) in melee_skills and SkillClass.MELEE not in classes:
        classes.append(SkillClass.MELEE)
    if (cid, slug) in ranged_skills and SkillClass.RANGED not in classes:
        classes.append(SkillClass.RANGED)
    return first_creation_skill(
        cid,
        slug,
        name,
        text,
        cost,
        cooldown,
        target,
        classes,
        effects,
        conditions,
    )


def kit(character_id: str, role: str, state: str, difficulty: str, rows: list[SkillSpec]) -> CharacterSpec:
    return starter_character(character_id, role, state, difficulty, rows)


FIRST_CREATION_ROSTER: dict[str, CharacterSpec] = {
    "yuji_itadori": kit("yuji_itadori", "Beginner bruiser / finisher", "Soul Bruise / Momentum milestone", "Easy", [
        s("yuji_itadori", "divergent_fist", "Divergent Fist", "Deal 20 damage and 10 delayed damage; Soul Bruise triggers the delayed hit immediately.", [BODY], 0, enemy(), [SkillClass.PHYSICAL, SkillClass.INSTANT], [damage(20), damage(10, condition_recipient_has_status="soul_bruise"), status_effect("soul_bruise", "Soul Bruise", 1, condition_recipient_missing_status="soul_bruise", turn_end_damage=10), EffectSpec(type="remove_status", status="soul_bruise", payload={"condition_recipient_has_status": "soul_bruise"})]),
        s("yuji_itadori", "cursed_energy_reinforcement", "Cursed Energy Reinforcement", "Yuji gains 20 damage reduction for 1 turn and his next damaging skill deals +10 damage.", [FOCUS], 2, self_target(), [SkillClass.STRATEGIC, SkillClass.INSTANT], [status_effect("yuji_reinforced", "Cursed Energy Reinforcement", 2, target="self", damage_reduction=20, damage_bonus=10, consume_after_damage=True)]),
        s("yuji_itadori", "black_flash_attempt", "Black Flash Attempt", "Deal 35 damage. Against a Stunned, Exposed, or Soul Bruised target, also deal 10 piercing damage and gain Momentum for First Creation mission progress.", [BODY, FOCUS], 3, enemy(), [SkillClass.PHYSICAL, SkillClass.STRATEGIC, SkillClass.INSTANT], [damage(35), damage(10, DamageType.PIERCING, condition_statuses=["stunned", "exposed", "soul_bruise"]), status_effect("momentum", "Momentum", 2, target="self", condition_scope="original_target", condition_statuses=["stunned", "exposed", "soul_bruise"])]),
        s("yuji_itadori", "reflexive_guard", "Reflexive Guard", "Yuji becomes untargetable for 1 turn.", [WILD], 4, self_target(), [SkillClass.STRATEGIC, SkillClass.INSTANT], [status_effect("reflexive_guard", "Reflexive Guard", 2, target="self", invulnerable=True)]),
    ]),
    "megumi_fushiguro": kit("megumi_fushiguro", "Shikigami control / setup", "Scent", "Easy-Medium", [
        s("megumi_fushiguro", "divine_dogs", "Divine Dogs", "Deal 20 damage and apply Scent for 2 turns; next shikigami hit against Scent deals +10.", [TECHNIQUE], 0, enemy(), [SkillClass.CURSED_ENERGY, SkillClass.INSTANT], [damage(20, bonus_status="scent", bonus_amount=10), EffectSpec(type="remove_status", status="scent", payload={"condition_status": "scent"}), status_effect("scent", "Scent", 2)]),
        s("megumi_fushiguro", "nue_dive", "Nue Dive", "Deal 25 damage; Scented targets have Taijutsu and Jujutsu skills stunned, otherwise they deal -15 damage.", [TECHNIQUE, WILD], 2, enemy(), [SkillClass.CURSED_ENERGY, SkillClass.CONTROL, SkillClass.INSTANT], [damage(25, bonus_status="scent", bonus_amount=10), status_effect("nue_shock", "Nue Shock", 2, stun_classes=[SkillClass.PHYSICAL.value, SkillClass.CURSED_ENERGY.value], condition_status="scent"), status_effect("nue_fallback", "Nue Fallback", 2, damage_output_delta=-15, condition_missing_status="scent"), EffectSpec(type="remove_status", status="scent", payload={"condition_status": "scent"})]),
        s("megumi_fushiguro", "toad_snare", "Toad Snare", "Snare one enemy for 1 turn; Snared enemies cannot gain damage reduction or destructible defense.", [FOCUS], 2, enemy(), [SkillClass.STRATEGIC, SkillClass.CONTROL], [status_effect("snared", "Snared", 2, block_damage_reduction=True, block_destructible_defense=True)]),
        s("megumi_fushiguro", "shadow_retreat", "Shadow Retreat", "Megumi or one ally becomes untargetable for 1 turn; below 50 HP also gains 10 destructible defense.", [WILD], 4, ally(), [SkillClass.STRATEGIC, SkillClass.INSTANT], [status_effect("shadow_retreat", "Shadow Retreat", 2, invulnerable=True, low_hp_destructible_defense=10)]),
    ]),
    "nobara_kugisaki": kit("nobara_kugisaki", "Ranged mark / punish", "Nail", "Easy-Medium", [
        s("nobara_kugisaki", "nail_barrage", "Nail Barrage", "Deal 20 damage and apply Nail for 3 turns.", [TECHNIQUE], 0, enemy(), [SkillClass.INNATE, SkillClass.INSTANT], [damage(20), status_effect("nail", "Nail", 3)]),
        s("nobara_kugisaki", "straw_doll_resonance", "Straw Doll Resonance", "Deal 25 soul damage to an enemy with Nail; otherwise deal 15 normal damage.", [TECHNIQUE, CURSE], 1, enemy(), [SkillClass.INNATE, SkillClass.SOUL, SkillClass.INSTANT], [damage(25, DamageType.SOUL, condition_status="nail"), damage(15)]),
        s("nobara_kugisaki", "hairpin", "Hairpin", "Deal 15 piercing damage to all enemies with Nail and consume Nail; single marked targets take 25 instead.", [TECHNIQUE, WILD], 3, enemy_team("nail"), [SkillClass.INNATE, SkillClass.INSTANT], [damage(15, DamageType.PIERCING, single_target_amount=25), EffectSpec(type="remove_status", status="nail")]),
        s("nobara_kugisaki", "hammer_guard", "Hammer Guard", "Nobara becomes untargetable for 1 turn; melee attackers receive Nail.", [WILD], 4, self_target(), [SkillClass.STRATEGIC, SkillClass.INSTANT], [status_effect("hammer_guard", "Hammer Guard", 2, target="self", invulnerable=True, punish_melee_status="nail")]),
    ]),
    "maki_zenin": kit("maki_zenin", "Weapon specialist / anti-defense", "Weapon Specialist", "Easy", [
        s("maki_zenin", "cursed_tool_combo", "Cursed Tool Combo", "Destroy up to 15 destructible defense on one enemy, then deal 20 damage.", [BODY], 0, enemy(), [SkillClass.PHYSICAL, SkillClass.INSTANT], [damage(20, destroy_defense_first=15)]),
        s("maki_zenin", "spear_sweep", "Spear Sweep", "Deal 15 damage to all enemies and Disarm them for 1 turn, reducing Taijutsu damage by 10.", [BODY, WILD], 2, enemy_team(), [SkillClass.PHYSICAL, SkillClass.INSTANT], [damage(15), status_effect("disarmed", "Disarmed", 2, physical_damage_output_delta=-10)]),
        s("maki_zenin", "weapon_specialist", "Weapon Specialist", "For 3 turns Maki gains 10 damage reduction; next Cursed Tool Combo gains +10 damage and defense break.", [FOCUS], 3, self_target(), [SkillClass.STRATEGIC, SkillClass.INSTANT], [status_effect("weapon_specialist", "Weapon Specialist", 3, target="self", damage_reduction=10, next_skill_modifiers={"fc_maki_zenin_cursed_tool_combo": {"damage": 10, "destroy_defense_first": 10}}, consume_on_skill_id="fc_maki_zenin_cursed_tool_combo")]),
        s("maki_zenin", "tool_parry_stance", "Tool-Parry Stance", "Maki becomes untargetable for 1 turn and her next damaging skill deals +10.", [WILD], 4, self_target(), [SkillClass.STRATEGIC, SkillClass.INSTANT], [status_effect("tool_parry", "Tool-Parry Stance", 2, target="self", invulnerable=True, damage_bonus=10, consume_after_damage=True)]),
    ]),
    "toge_inumaki": kit("toge_inumaki", "Cursed speech control / self-risk", "Throat Strain", "Medium", [
        s("toge_inumaki", "stop", "Stop.", "Stun one enemy's harmful skills for 1 turn. Toge takes 5 soul damage.", [FOCUS], 1, enemy(), [SkillClass.STRATEGIC, SkillClass.CONTROL, SkillClass.INSTANT], [status_effect("stopped", "Stop", 2, stun_harmful=True), damage(5, DamageType.SOUL, target="self")]),
        s("toge_inumaki", "blast_away", "Blast Away.", "Deal 30 damage; stunned targets take +10. Toge takes 5 soul damage.", [TECHNIQUE, WILD], 2, enemy(), [SkillClass.CURSED_ENERGY, SkillClass.INSTANT], [damage(30, bonus_status="stunned", bonus_amount=10), damage(5, DamageType.SOUL, target="self")]),
        s("toge_inumaki", "dont_move", "Don't Move.", "Lock one enemy for 1 turn so they cannot use skills that target allies. Toge takes 10 soul damage.", [FOCUS, WILD], 3, enemy(), [SkillClass.STRATEGIC, SkillClass.CONTROL, SkillClass.INSTANT], [status_effect("locked", "Locked", 2, cannot_target_allies=True), damage(10, DamageType.SOUL, target="self")]),
        s("toge_inumaki", "throat_medicine", "Throat Medicine", "Toge becomes untargetable for 1 turn and removes one self-damage or affliction effect from himself.", [WILD], 4, self_target(), [SkillClass.STRATEGIC, SkillClass.INSTANT], [status_effect("throat_medicine", "Throat Medicine", 2, target="self", invulnerable=True, cleanse_self_damage_or_affliction=True)]),
    ]),
    "panda": kit("panda", "Tank / stance bruiser", "Gorilla Core", "Easy", [
        s("panda", "panda_jab", "Panda Jab", "Deal 20 damage and gain 5 destructible defense; Gorilla Core makes it 30 damage.", [BODY], 0, enemy(), [SkillClass.PHYSICAL, SkillClass.INSTANT], [damage(20, bonus_user_status="gorilla_core", bonus_amount=10), status_effect("panda_guard", "Panda Guard", 2, target="self", destructible_defense=5)]),
        s("panda", "gorilla_core", "Gorilla Core", "Panda gains 25 destructible defense and enters Gorilla Core for 3 turns.", [BODY, FOCUS], 4, self_target(), [SkillClass.PHYSICAL, SkillClass.STRATEGIC, SkillClass.INSTANT], [status_effect("gorilla_core", "Gorilla Core", 3, target="self", destructible_defense=25)]),
        s("panda", "drumming_beat", "Drumming Beat", "Deal 25 piercing damage.", [BODY, WILD], 2, enemy(), [SkillClass.PHYSICAL, SkillClass.INSTANT], [damage(25, DamageType.PIERCING)]),
        s("panda", "cursed_corpse_guard", "Cursed Corpse Guard", "Panda becomes untargetable for 1 turn; Gorilla Core grants an ally 10 destructible defense.", [WILD], 4, self_target(), [SkillClass.STRATEGIC, SkillClass.INSTANT], [status_effect("cursed_corpse_guard", "Cursed Corpse Guard", 2, target="self", invulnerable=True, ally_destructible_defense=10)]),
    ]),
}

# Add the remaining first-creation kits in compact data form. These still use
# resolver-friendly payloads for future implementation while giving the UI and
# tests real SkillSpec contracts now.
_FIRST_CREATION_EXTRA_ROWS: dict[str, tuple[str, str, str, list[tuple[str, str, str, list[EnergyType], int, TargetRule, list[SkillClass]]]]] = {
    "aoi_todo": ("Bruiser / swap disruption", "Clap Read", "Medium-Hard", [("brutal_palm_strike", "Brutal Palm Strike", "Deal 25 damage; Boogie Woogie targets take +10.", [BODY], 0, enemy(), [SkillClass.PHYSICAL, SkillClass.INSTANT]), ("boogie_woogie", "Boogie Woogie", "Redirect the next harmful direct skill from one enemy to an alternate target; no redirect grants Todo 15 defense.", [TECHNIQUE, FOCUS], 3, enemy(), [SkillClass.CURSED_ENERGY, SkillClass.STRATEGIC, SkillClass.INVISIBLE, SkillClass.INSTANT]), ("brotherly_beatdown", "Brotherly Beatdown", "Deal 30 damage; if an ally damaged the same target this turn, stun harmful skills for 1 turn.", [BODY, WILD], 2, enemy(), [SkillClass.PHYSICAL, SkillClass.CONTROL, SkillClass.INSTANT]), ("clap_feint", "Clap Feint", "Todo becomes untargetable for 1 turn.", [WILD], 4, self_target(), [SkillClass.STRATEGIC, SkillClass.INSTANT])]),
    "noritoshi_kamo": ("Ranged bleed / resource pressure", "Blood Mark", "Medium", [("blood_tipped_arrow", "Blood-Tipped Arrow", "Deal 20 damage and apply Blood Mark for 2 turns.", [CURSE], 0, enemy(), [SkillClass.CURSED_ENERGY, SkillClass.INSTANT]), ("flowing_red_scale", "Flowing Red Scale", "For 3 turns Kamo gains 10 damage reduction and harmful skills deal +10 damage.", [FOCUS, CURSE], 4, self_target(), [SkillClass.STRATEGIC, SkillClass.CURSED_ENERGY, SkillClass.INSTANT]), ("crimson_binding", "Crimson Binding", "Deal 15 damage and stun harmful skills; Blood Mark also drains 1 random energy at turn end.", [CURSE, WILD], 3, enemy(), [SkillClass.CURSED_ENERGY, SkillClass.CONTROL]), ("blood_veil", "Blood Veil", "Kamo becomes untargetable for 1 turn and removes one affliction from himself.", [WILD], 4, self_target(), [SkillClass.STRATEGIC, SkillClass.INSTANT])]),
    "momo_nishimiya": ("Scout / evasive support", "Revealed", "Medium", [("wind_scythe", "Wind Scythe", "Deal 15 damage to all enemies; choose one damaged enemy to become Exposed.", [TECHNIQUE, WILD], 2, enemy_team(), [SkillClass.CURSED_ENERGY, SkillClass.INSTANT]), ("aerial_scout", "Aerial Scout", "Reveal one enemy for 2 turns; Revealed enemies take +5 damage and can grant your team energy.", [FOCUS], 3, enemy(), [SkillClass.STRATEGIC, SkillClass.INSTANT]), ("broom_rescue", "Broom Rescue", "One ally becomes untargetable for 1 turn. Momo gains 10 destructible defense.", [FOCUS, WILD], 4, ally(), [SkillClass.STRATEGIC, SkillClass.INSTANT]), ("high_altitude_evasion", "High-Altitude Evasion", "Momo becomes untargetable for 1 turn.", [WILD], 4, self_target(), [SkillClass.STRATEGIC, SkillClass.INSTANT])]),
    "mai_zenin": ("Precision ranged / ammo setup", "Hidden Bullet", "Medium", [("revolver_shot", "Revolver Shot", "Deal 20 normal damage. Hidden Bullet adds 20 piercing damage, then is consumed.", [BODY], 0, enemy(), [SkillClass.PHYSICAL, SkillClass.INSTANT]), ("rubber_round_feint", "Rubber Round Feint", "For 2 turns, reduce one enemy's Taijutsu damage by 20. If they target Mai while affected, they become Exposed.", [FOCUS], 1, enemy(), [SkillClass.STRATEGIC, SkillClass.INSTANT]), ("construction_hidden_bullet", "Construction: Hidden Bullet", "Mai gains Hidden Bullet for 3 turns. Her next Revolver Shot deals an additional 20 piercing damage, then consumes Hidden Bullet. Mai takes 5 soul damage.", [CURSE, WILD], 3, self_target(), [SkillClass.CURSED_ENERGY, SkillClass.STRATEGIC, SkillClass.INVISIBLE, SkillClass.INSTANT]), ("cover_position", "Cover Position", "Mai becomes untargetable for 1 turn; if Hidden Bullet is active, one enemy becomes Exposed.", [WILD], 4, self_target(), [SkillClass.STRATEGIC, SkillClass.INSTANT])]),
    "kasumi_miwa": ("Defensive swordswoman / counter-control", "Simple Domain", "Easy-Medium", [("new_shadow_quick_draw", "New Shadow Quick Draw", "Deal 20 damage; Simple Domain also stuns harmful skills for 1 turn.", [BODY], 1, enemy(), [SkillClass.PHYSICAL, SkillClass.INSTANT]), ("simple_domain_batto_stance", "Simple Domain: Batto Stance", "Until Miwa's next turn, she gains 20 damage reduction, counters the first harmful melee skill targeting her, and marks its caster with Quick Draw Wound.", [FOCUS, WILD], 4, self_target(), [SkillClass.BARRIER, SkillClass.STRATEGIC, SkillClass.INSTANT]), ("earnest_slash", "Earnest Slash", "Deal 30 damage; Stunned or Exposed targets deal 10 less damage.", [BODY, FOCUS], 2, enemy(), [SkillClass.PHYSICAL, SkillClass.STRATEGIC, SkillClass.INSTANT]), ("useful_retreat", "Useful Retreat", "Miwa becomes untargetable for 1 turn; Simple Domain gives an ally 10 damage reduction.", [WILD], 4, self_target(), [SkillClass.STRATEGIC, SkillClass.INSTANT])]),
    "kokichi_muta_mechamaru": ("Artillery / remote control", "Remote Position", "Medium", [("puppet_beam", "Puppet Beam", "Deal 20 damage to one enemy.", [TECHNIQUE], 0, enemy(), [SkillClass.CURSED_ENERGY, SkillClass.INSTANT]), ("cannon_charge", "Cannon Charge", "Deal 35 damage; if Mechamaru was not damaged last turn, deal +10.", [TECHNIQUE, WILD], 2, enemy(), [SkillClass.CURSED_ENERGY, SkillClass.INSTANT]), ("remote_puppet_net", "Remote Puppet Net", "One enemy cannot use non-damaging skills or counters for 1 turn.", [FOCUS, TECHNIQUE], 2, enemy(), [SkillClass.STRATEGIC, SkillClass.CURSED_ENERGY, SkillClass.CONTROL]), ("withdraw_signal", "Withdraw Signal", "For 2 turns, Mechamaru cannot be targeted by harmful enemy skills and has 10 destructible defense.", [WILD], 4, self_target(), [SkillClass.STRATEGIC, SkillClass.INSTANT])]),
    "junpei_yoshino": ("Poison shikigami / fragile control", "Poison", "Easy-Medium", [("moon_dregs_sting", "Moon Dregs Sting", "Deal 15 soul damage and apply Poison, which deals 10 soul damage at the end of each of the target's next 2 turns.", [CURSE], 0, enemy(), [SkillClass.CURSED_ENERGY, SkillClass.SOUL, SkillClass.INSTANT]), ("jellyfish_screen", "Jellyfish Screen", "One ally gains 15 destructible defense for 2 turns; enemies who damage that ally take poison damage.", [FOCUS], 2, ally(), [SkillClass.STRATEGIC, SkillClass.CURSED_ENERGY, SkillClass.INSTANT]), ("venom_bloom", "Venom Bloom", "Deal 20 damage to a poisoned enemy and spread 10 poison; without poison, apply 5 poison to all enemies.", [CURSE, WILD], 3, enemy(), [SkillClass.CURSED_ENERGY, SkillClass.SOUL, SkillClass.INSTANT]), ("shikigami_veil", "Shikigami Veil", "Junpei becomes untargetable for 1 turn. Existing poison effects on enemies last 1 additional turn.", [WILD], 4, self_target(), [SkillClass.STRATEGIC, SkillClass.INSTANT])]),
    "satoru_gojo_young": ("High-ceiling control / expensive defense", "Six Eyes Read", "Hard", [("lapse_blue", "Lapse Blue", "Deal 20 damage and apply Pulled for 1 turn.", [TECHNIQUE], 0, enemy(), [SkillClass.INNATE, SkillClass.CURSED_ENERGY, SkillClass.INSTANT]), ("six_eyes_read", "Six Eyes Read", "Choose one enemy. If they use a harmful Jujutsu-class skill on their next turn, Gojo gains 1 random core energy and his next damaging skill deals +10 damage.", [FOCUS], 2, enemy(), [SkillClass.STRATEGIC, SkillClass.INVISIBLE, SkillClass.INSTANT]), ("infinity_maintenance", "Infinity Maintenance", "Gojo becomes untargetable for 1 turn. His next skill costs +1 X.", [FOCUS, WILD], 4, self_target(), [SkillClass.BARRIER, SkillClass.STRATEGIC, SkillClass.INSTANT]), ("reversal_red", "Reversal Red", "Deal 35 piercing damage; Pulled targets take +10.", [TECHNIQUE, WILD], 2, enemy(), [SkillClass.INNATE, SkillClass.CURSED_ENERGY, SkillClass.INSTANT])]),
    "suguru_geto_young": ("Curse stock / summon pressure", "Curse Stock", "Hard", [("swarm_curse", "Swarm Curse", "Deal 15 damage and gain 1 Curse Stock, max 3.", [CURSE], 0, enemy(), [SkillClass.CURSED_ENERGY, SkillClass.INSTANT]), ("hookworm_curse", "Hookworm Curse", "Deal 20 damage and stun Taijutsu skills; spend Curse Stock to also stun Strategic skills.", [CURSE, WILD], 2, enemy(), [SkillClass.CURSED_ENERGY, SkillClass.CONTROL]), ("rainbow_dragon_guard", "Rainbow Dragon Guard", "Geto or an ally gains 25 destructible defense; 2+ Curse Stock also grants 10 damage reduction.", [FOCUS, CURSE], 3, ally(), [SkillClass.STRATEGIC, SkillClass.CURSED_ENERGY, SkillClass.INSTANT]), ("curse_screen", "Curse Screen", "Geto becomes untargetable for 1 turn; consume Curse Stock to protect an ally with 10 defense.", [WILD], 4, ally(), [SkillClass.STRATEGIC, SkillClass.CURSED_ENERGY, SkillClass.INSTANT]), ("compressed_uzumaki", "Compressed Uzumaki", "Replacement: at 3 Curse Stock, consume all stock, remove 20 defense, and deal 45 piercing damage.", [CURSE, CURSE, WILD], 2, enemy(), [SkillClass.CURSED_ENERGY, SkillClass.INSTANT])]),
    "shoko_ieiri_young": ("Healer / cleanse / low offense", "Medical Focus", "Easy", [("scalpel_feint", "Scalpel Feint", "Deal 10 damage and reduce healing received by 10 for 1 turn.", [FOCUS], 0, enemy(), [SkillClass.STRATEGIC, SkillClass.INSTANT]), ("reverse_cursed_treatment", "Reverse Cursed Treatment", "Heal one ally for 25 HP.", [TECHNIQUE], 0, ally(), [SkillClass.CURSED_ENERGY, SkillClass.STRATEGIC, SkillClass.INSTANT]), ("cleanse_protocol", "Cleanse Protocol", "Remove affliction/soul effects from one ally and heal them for 10.", [TECHNIQUE, FOCUS], 2, ally(), [SkillClass.CURSED_ENERGY, SkillClass.STRATEGIC, SkillClass.INSTANT]), ("emergency_step", "Emergency Step", "Shoko becomes untargetable for 1 turn; allies below 35 HP gain 10 damage reduction.", [WILD], 4, self_target(), [SkillClass.STRATEGIC, SkillClass.INSTANT])]),
    "utahime_iori_young": ("Support chant / team amplifier", "Ritual Rhythm", "Medium", [("talisman_strike", "Talisman Strike", "Deal 15 damage; Ritual Rhythm reduces the target's damage by 10.", [FOCUS], 0, enemy(), [SkillClass.STRATEGIC, SkillClass.INSTANT]), ("solo_solo_kinku", "Solo Solo Kinku", "One ally's next damaging skill deals +15.", [FOCUS, WILD], 3, ally(), [SkillClass.STRATEGIC, SkillClass.INSTANT]), ("ritual_rhythm", "Ritual Rhythm", "For 3 turns, allies deal +5 damage and receive 5 less damage. Ends if Utahime dies.", [TECHNIQUE, FOCUS], 4, self_target(), [SkillClass.CURSED_ENERGY, SkillClass.STRATEGIC, SkillClass.INSTANT]), ("curtain_step", "Curtain Step", "Utahime becomes untargetable for 1 turn; Ritual Rhythm gives an ally 10 destructible defense.", [WILD], 4, ally(), [SkillClass.BARRIER, SkillClass.STRATEGIC, SkillClass.INSTANT])]),
    "mei_mei_young": ("Scout / crow pressure / efficient finisher", "Crow Mark", "Medium-Hard", [("axe_sweep", "Axe Sweep", "Deal 20 damage; Crow Mark targets take +10.", [BODY], 0, enemy(), [SkillClass.PHYSICAL, SkillClass.INSTANT]), ("crow_scout", "Crow Scout", "Apply Crow Mark for 3 turns; if the enemy uses a new skill next turn, Mei Mei gains energy.", [FOCUS], 2, enemy(), [SkillClass.STRATEGIC, SkillClass.INVISIBLE, SkillClass.INSTANT]), ("black_bird_strike", "Black Bird Strike", "Deal 40 piercing to a Crow Mark target, otherwise 25 damage. Mei Mei takes 5 soul damage.", [BODY, TECHNIQUE, WILD], 3, enemy(), [SkillClass.PHYSICAL, SkillClass.CURSED_ENERGY, SkillClass.INSTANT]), ("crow_screen", "Crow Screen", "Mei Mei becomes untargetable for 1 turn; a Crow Mark enemy becomes Exposed.", [WILD], 4, self_target(), [SkillClass.STRATEGIC, SkillClass.INSTANT])]),
    "yuta_okkotsu_jjk0": ("Unstable special-grade protector / Rika state", "Rika's Curse", "Medium-Hard", [("cursed_katana", "Cursed Katana", "Deal 20 damage; Rika's Curse adds +10.", [BODY], 0, enemy(), [SkillClass.PHYSICAL, SkillClass.INSTANT]), ("reverse_cursed_technique", "Reverse Cursed Technique", "Heal one ally for 25 HP and remove one affliction effect.", [TECHNIQUE, FOCUS], 1, ally(), [SkillClass.CURSED_ENERGY, SkillClass.STRATEGIC, SkillClass.INSTANT]), ("rikas_curse", "Rika's Curse", "For 3 turns Yuta gains 15 defense and Cursed Katana deals +10; replaced by Cursed Speech Megaphone.", [CURSE, WILD], 4, self_target(), [SkillClass.CURSED_ENERGY, SkillClass.STRATEGIC, SkillClass.INSTANT]), ("rika_protects", "Rika Protects", "Yuta becomes untargetable for 1 turn; Rika's Curse gives one ally 15 destructible defense.", [WILD], 4, ally(), [SkillClass.STRATEGIC, SkillClass.CURSED_ENERGY, SkillClass.INSTANT]), ("cursed_speech_megaphone", "Cursed Speech Megaphone", "Replacement: stun one enemy's harmful skills for 1 turn. Yuta takes 5 soul damage.", [FOCUS, WILD], 1, enemy(), [SkillClass.STRATEGIC, SkillClass.CURSED_ENERGY, SkillClass.CONTROL, SkillClass.INSTANT])]),
}

_EXPLICIT_EXTRA_EFFECTS: dict[tuple[str, str], list[EffectSpec]] = {
    ("aoi_todo", "brutal_palm_strike"): [damage(25, bonus_status="boogie_woogie_redirect", bonus_amount=10)],
    ("aoi_todo", "boogie_woogie"): [status_effect("boogie_woogie_redirect", "Boogie Woogie", 1, controlled_redirect=True, redirect_next_harmful_direct=True, invisible=True)],
    ("aoi_todo", "brotherly_beatdown"): [damage(30), status_effect("brotherly_stun", "Brotherly Stun", 2, stun_harmful=True, condition_ally_damaged_target_this_turn=True)],
    ("aoi_todo", "clap_feint"): [status_effect("clap_feint", "Clap Feint", 2, target="self", invulnerable=True)],
    ("noritoshi_kamo", "blood_tipped_arrow"): [damage(20), status_effect("blood_mark", "Blood Mark", 2)],
    ("noritoshi_kamo", "flowing_red_scale"): [status_effect("flowing_red_scale", "Flowing Red Scale", 3, target="self", damage_reduction=10, harmful_damage_output_delta=10)],
    ("noritoshi_kamo", "crimson_binding"): [damage(15), status_effect("crimson_binding", "Crimson Binding", 2, stun_harmful=True), status_effect("blood_mark_drain", "Blood Mark Drain", 2, condition_status="blood_mark", turn_end_drain_energy=1, duration_clock="target_turn")],
    ("noritoshi_kamo", "blood_veil"): [status_effect("blood_veil", "Blood Veil", 2, target="self", invulnerable=True), EffectSpec(type="cleanse", target="self")],
    ("momo_nishimiya", "wind_scythe"): [damage(15), status_effect("exposed", "Exposed", 2, selected_target_only=True)],
    ("momo_nishimiya", "aerial_scout"): [status_effect("revealed", "Revealed", 2, damage_taken_delta=5), status_effect("aerial_scout_watch", "Aerial Scout", 1, target="self", duration_clock=DurationClock.ROUND, watch_target_player_id="target", watch_target_slot="target", reward_energy=1, consume_on_trigger=True, invisible=True)],
    ("momo_nishimiya", "broom_rescue"): [status_effect("broom_rescue", "Broom Rescue", 2, invulnerable=True), status_effect("broom_defense", "Broom Defense", 2, target="self", destructible_defense=10)],
    ("momo_nishimiya", "high_altitude_evasion"): [status_effect("high_altitude_evasion", "High-Altitude Evasion", 2, target="self", invulnerable=True)],
    ("mai_zenin", "revolver_shot"): [damage(20), damage(20, DamageType.PIERCING, condition_user_status="hidden_bullet")],
    ("mai_zenin", "rubber_round_feint"): [status_effect("rubber_round_feint", "Rubber Round Feint", 2, physical_damage_output_delta=-20, expose_if_targets_source=True)],
    ("mai_zenin", "construction_hidden_bullet"): [status_effect("hidden_bullet", "Hidden Bullet", 3, target="self", consume_on_skill_id="fc_mai_zenin_revolver_shot", invisible=True), damage(5, DamageType.SOUL, target="self")],
    ("mai_zenin", "cover_position"): [status_effect("cover_position", "Cover Position", 2, target="self", invulnerable=True), status_effect("exposed", "Exposed", 2, condition_user_status="hidden_bullet")],
    ("kasumi_miwa", "new_shadow_quick_draw"): [damage(20), status_effect("quick_draw_stun", "Quick Draw Stun", 2, stun_harmful=True, condition_user_status="simple_domain")],
    ("kasumi_miwa", "simple_domain_batto_stance"): [status_effect("simple_domain", "Simple Domain", 1, target="self", counter="first_harmful_melee", damage_reduction=20, punish_melee_status="quick_draw_wound")],
    ("kasumi_miwa", "earnest_slash"): [damage(30), status_effect("earnest_debuff", "Earnest Debuff", 2, damage_output_delta=-10, condition_statuses=["stunned", "exposed"])],
    ("kasumi_miwa", "useful_retreat"): [status_effect("useful_retreat", "Useful Retreat", 2, target="self", invulnerable=True), status_effect("simple_domain_support", "Simple Domain Support", 2, damage_reduction=10, condition_user_status="simple_domain")],
    ("kokichi_muta_mechamaru", "puppet_beam"): [damage(20)],
    ("kokichi_muta_mechamaru", "cannon_charge"): [damage(35, bonus_user_missing_status="damaged_last_turn", bonus_amount=10)],
    ("kokichi_muta_mechamaru", "remote_puppet_net"): [status_effect("remote_puppet_net", "Remote Puppet Net", 2, block_non_damaging_skills=True, block_counters=True)],
    ("kokichi_muta_mechamaru", "withdraw_signal"): [status_effect("withdraw_signal", "Withdraw Signal", 2, target="self", invulnerable=True, destructible_defense=10)],
    ("junpei_yoshino", "moon_dregs_sting"): [damage(15, DamageType.SOUL), status_effect("poison", "Poison", 2, turn_end_damage=10, turn_end_damage_type=DamageType.SOUL.value)],
    ("junpei_yoshino", "jellyfish_screen"): [status_effect("jellyfish_screen", "Jellyfish Screen", 2, destructible_defense=15, retaliate_damage=10, retaliate_status="poison")],
    ("junpei_yoshino", "venom_bloom"): [damage(20, target_scope="primary", condition_scope="original_target", condition_original_has_status="poison", conditional_targeting="venom_bloom"), status_effect("poison", "Poison", 1, target_scope="secondary", condition_original_has_status="poison", turn_end_damage=10, turn_end_damage_type=DamageType.SOUL.value), status_effect("poison", "Poison", 1, target_scope="all", condition_original_missing_status="poison", turn_end_damage=5, turn_end_damage_type=DamageType.SOUL.value)],
    ("junpei_yoshino", "shikigami_veil"): [status_effect("shikigami_veil", "Shikigami Veil", 2, target="self", invulnerable=True), EffectSpec(type="extend_status", status="poison", amount=1)],
    ("satoru_gojo_young", "lapse_blue"): [damage(20), status_effect("pulled", "Pulled", 2)],
    ("satoru_gojo_young", "six_eyes_read"): [status_effect("six_eyes_read", "Six Eyes Read", 1, target="self", duration_clock=DurationClock.ROUND, watch_target_player_id="target", watch_target_slot="target", watch_skill_classes=[SkillClass.CURSED_ENERGY.value], watch_harmful=True, reward_energy=1, reward_buff={"id": "six_eyes_insight", "name": "Six Eyes Insight", "duration": 1, "damage_bonus": 10, "consume_after_damage": True}, consume_on_trigger=True, invisible=True)],
    ("satoru_gojo_young", "infinity_maintenance"): [status_effect("infinity_maintenance", "Infinity Maintenance", 2, target="self", invulnerable=True, black_cost_delta=1, consume_on_next_skill=True)],
    ("satoru_gojo_young", "reversal_red"): [damage(35, DamageType.PIERCING, bonus_status="pulled", bonus_amount=10)],
    ("suguru_geto_young", "swarm_curse"): [damage(15), status_effect("curse_stock", "Curse Stock", 4, target="self", max_stacks=3, unlock_replacements_at_stacks=3, skill_replacements={"fc_suguru_geto_young_swarm_curse": "fc_suguru_geto_young_compressed_uzumaki"})],
    ("suguru_geto_young", "hookworm_curse"): [damage(20), status_effect("hookworm_body_stun", "Hookworm Taijutsu Stun", 2, stun_classes=[SkillClass.PHYSICAL.value]), status_effect("hookworm_focus_stun", "Hookworm Strategic Stun", 2, stun_classes=[SkillClass.STRATEGIC.value], condition_user_status="curse_stock"), EffectSpec(type="consume_status_stacks", status="curse_stock", amount=1, target="self")],
    ("suguru_geto_young", "rainbow_dragon_guard"): [status_effect("rainbow_dragon_guard", "Rainbow Dragon Guard", 2, destructible_defense=25), status_effect("rainbow_dragon_reduction", "Rainbow Dragon Reduction", 2, damage_reduction=10, condition_user_stacks=("curse_stock", 2))],
    ("suguru_geto_young", "curse_screen"): [status_effect("curse_screen", "Curse Screen", 2, target="self", invulnerable=True), status_effect("curse_screen_guard", "Curse Screen Guard", 2, destructible_defense=10, condition_user_status="curse_stock"), EffectSpec(type="consume_status_stacks", status="curse_stock", amount=1, target="self")],
    ("suguru_geto_young", "compressed_uzumaki"): [damage(45, DamageType.PIERCING, destroy_defense_first=20), EffectSpec(type="consume_status_stacks", status="curse_stock", amount=3, target="self")],
    ("shoko_ieiri_young", "scalpel_feint"): [damage(10), status_effect("reduced_healing", "Reduced Healing", 2, healing_received_delta=-10)],
    ("shoko_ieiri_young", "reverse_cursed_treatment"): [heal(25)],
    ("shoko_ieiri_young", "cleanse_protocol"): [EffectSpec(type="cleanse"), heal(10)],
    ("shoko_ieiri_young", "emergency_step"): [status_effect("emergency_step", "Emergency Step", 2, target="self", invulnerable=True), status_effect("emergency_reduction", "Emergency Reduction", 2, damage_reduction=10, condition_target_hp_below=35)],
    ("utahime_iori_young", "talisman_strike"): [damage(15), status_effect("talisman_debuff", "Talisman Debuff", 2, damage_output_delta=-10, condition_user_status="ritual_rhythm")],
    ("utahime_iori_young", "solo_solo_kinku"): [status_effect("solo_solo_kinku", "Solo Solo Kinku", 2, damage_bonus=15, consume_after_damage=True)],
    ("utahime_iori_young", "ritual_rhythm"): [EffectSpec(type="apply_team_status", status="ritual_rhythm", duration=3, target="self", payload={"name": "Ritual Rhythm", "duration_clock": DurationClock.SOURCE_TURN.value, "families": [StatusFamily.BUFF.value], "damage_output_delta": 5, "damage_reduction": 5, "ends_if_source_dies": True})],
    ("utahime_iori_young", "curtain_step"): [status_effect("curtain_step", "Curtain Step", 2, target="self", invulnerable=True), status_effect("ritual_guard", "Ritual Guard", 2, destructible_defense=10, condition_user_status="ritual_rhythm")],
    ("mei_mei_young", "axe_sweep"): [damage(20, bonus_status="crow_mark", bonus_amount=10)],
    ("mei_mei_young", "crow_scout"): [status_effect("crow_mark", "Crow Mark", 3), status_effect("crow_scout_watch", "Crow Scout", 1, target="self", duration_clock=DurationClock.ROUND, watch_target_player_id="target", watch_target_slot="target", reward_energy=1, consume_on_trigger=True, invisible=True)],
    ("mei_mei_young", "black_bird_strike"): [damage(40, DamageType.PIERCING, condition_status="crow_mark"), damage(25, condition_missing_status="crow_mark"), damage(5, DamageType.SOUL, target="self")],
    ("mei_mei_young", "crow_screen"): [status_effect("crow_screen", "Crow Screen", 2, target="self", invulnerable=True), status_effect("exposed", "Exposed", 2)],
    ("yuta_okkotsu_jjk0", "cursed_katana"): [damage(20, bonus_user_status="rikas_curse", bonus_amount=10)],
    ("yuta_okkotsu_jjk0", "reverse_cursed_technique"): [heal(25), EffectSpec(type="cleanse")],
    ("yuta_okkotsu_jjk0", "rikas_curse"): [status_effect("rikas_curse", "Rika's Curse", 3, target="self", destructible_defense=15, skill_replacements={"fc_yuta_okkotsu_jjk0_rikas_curse": "fc_yuta_okkotsu_jjk0_cursed_speech_megaphone"})],
    ("yuta_okkotsu_jjk0", "rika_protects"): [status_effect("rika_protects", "Rika Protects", 2, target="self", invulnerable=True), status_effect("rika_ally_guard", "Rika Ally Guard", 2, destructible_defense=15, condition_user_status="rikas_curse")],
    ("yuta_okkotsu_jjk0", "cursed_speech_megaphone"): [status_effect("cursed_speech_stun", "Cursed Speech", 2, stun_harmful=True), damage(5, DamageType.SOUL, target="self")],
}

for _character_id, (_role, _state, _difficulty, _rows) in _FIRST_CREATION_EXTRA_ROWS.items():
    FIRST_CREATION_ROSTER[_character_id] = kit(
        _character_id,
        _role,
        _state,
        _difficulty,
        [
            s(_character_id, slug, name, text, cost, cooldown, target, classes, _EXPLICIT_EXTRA_EFFECTS[(_character_id, slug)])
            for slug, name, text, cost, cooldown, target, classes in _rows
        ],
    )



def _first_creation_skill(character_id: str, slug: str) -> SkillSpec:
    return next(skill for skill in FIRST_CREATION_ROSTER[character_id].skills if skill.id == f"fc_{character_id}_{slug}")


def _set_first_creation_effects(character_id: str, slug: str, effects: list[EffectSpec], *, target_rule: TargetRule | None = None, conditions: list[ConditionSpec] | None = None) -> None:
    skill = _first_creation_skill(character_id, slug)
    skill.effects = effects
    if target_rule is not None:
        skill.target_rule = target_rule
    if conditions is not None:
        skill.conditions = conditions


# Explicit first-creation payoff hooks.  These replace text-inferred fallback
# effects for the kits whose mechanics drive onboarding lessons.
_set_first_creation_effects("nobara_kugisaki", "straw_doll_resonance", [damage(25, DamageType.SOUL, condition_status="nail"), damage(15, condition_missing_status="nail")])
_set_first_creation_effects("utahime_iori_young", "ritual_rhythm", _EXPLICIT_EXTRA_EFFECTS[("utahime_iori_young", "ritual_rhythm")], target_rule=TargetRule(kind="ally_team", min_targets=1, max_targets=3, allow_self=True))
_set_first_creation_effects("mai_zenin", "cover_position", _EXPLICIT_EXTRA_EFFECTS[("mai_zenin", "cover_position")], target_rule=enemy())
_set_first_creation_effects("kasumi_miwa", "useful_retreat", _EXPLICIT_EXTRA_EFFECTS[("kasumi_miwa", "useful_retreat")], target_rule=ally())
_set_first_creation_effects("junpei_yoshino", "venom_bloom", _EXPLICIT_EXTRA_EFFECTS[("junpei_yoshino", "venom_bloom")], target_rule=enemy_team())
_set_first_creation_effects("junpei_yoshino", "shikigami_veil", _EXPLICIT_EXTRA_EFFECTS[("junpei_yoshino", "shikigami_veil")], target_rule=enemy_team("poison"))
_set_first_creation_effects("shoko_ieiri_young", "emergency_step", _EXPLICIT_EXTRA_EFFECTS[("shoko_ieiri_young", "emergency_step")], target_rule=TargetRule(kind="ally_team", min_targets=1, max_targets=3, allow_self=True))
_set_first_creation_effects("mei_mei_young", "crow_screen", _EXPLICIT_EXTRA_EFFECTS[("mei_mei_young", "crow_screen")], target_rule=TargetRule(kind="enemy", required_status="crow_mark"))

FIRST_CREATION_SKILLS_BY_ID: dict[str, SkillSpec] = {
    skill.id: skill
    for character in FIRST_CREATION_ROSTER.values()
    for skill in character.skills
}


def first_creation_catalog() -> dict[str, dict[str, object]]:
    """Serialize the full first-character-creation roster contract."""

    return {
        character_id: {
            **first_creation_metadata(character_id),
            "role": spec.role,
            "state": spec.state,
            "difficulty": spec.difficulty,
            "skills": [
                {
                    "id": skill.id,
                    "name": skill.name,
                    "text": skill.text,
                    "cost": [energy.value for energy in skill.cost],
                    "cooldown": skill.cooldown,
                    "target_rule": {
                        "kind": skill.target_rule.kind,
                        "min_targets": skill.target_rule.min_targets,
                        "max_targets": skill.target_rule.max_targets,
                        "allow_self": skill.target_rule.allow_self,
                        "allow_dead": skill.target_rule.allow_dead,
                        "required_status": skill.target_rule.required_status,
                    },
                    "classes": [skill_class.value for skill_class in skill.classes],
                }
                for skill in spec.skills
            ],
        }
        for character_id, spec in FIRST_CREATION_ROSTER.items()
    }


def first_creation_payload() -> dict[str, object]:
    """Return the complete first-character-creation setup payload."""

    return {
        "availability": FIRST_CREATION_AVAILABILITY,
        "era": FIRST_CREATION_ERA,
        "roster": first_creation_catalog(),
        "presets": {name: list(team) for name, team in FIRST_CREATION_PRESETS.items()},
        "locked_variants": list(FIRST_CREATION_LOCKED_VARIANTS),
        "generated_energy_types": [energy.value for energy in GENERATED_ENERGY_TYPES],
        "wildcard_cost_type": WILDCARD_COST_TYPE.value,
        "missions": first_creation_missions_payload(),
        "unlock_registry": first_creation_unlocks_payload(),
    }


def validate_first_creation_team(character_ids: list[str] | tuple[str, ...]) -> tuple[bool, str]:
    """Validate a first-character-creation preset or selected team."""

    if len(character_ids) != 3:
        return False, "First creation teams must contain exactly 3 characters."
    if len(set(character_ids)) != 3:
        return False, "First creation teams cannot contain duplicate characters."
    invalid = [character_id for character_id in character_ids if character_id not in FIRST_CREATION_ROSTER]
    if invalid:
        return False, f"Locked or unknown first creation character: {invalid[0]}"
    return True, ""
