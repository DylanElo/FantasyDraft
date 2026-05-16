from dataclasses import dataclass, field
from typing import List, Dict, Union
import random

@dataclass
class Skill:
    name: str
    description: str
    cooldown: Union[int, str]
    energy: List[str]  # green, red, blue, white, black
    classes: str       # e.g. "Physical,Instant"
    target_type: str = "enemy" # enemy, team, self, all_enemies, all_team
    effects: List[Dict] = field(default_factory=list)

@dataclass
class Character:
    name: str
    description: str
    image_url: str
    skills: List[Skill] = field(default_factory=list)
    hp: int = 100 # Base HP for all characters

# ─── ENERGY LEGEND ────────────────────────────────────────────────────────────
#  green  = Physical techniques (punches, weapon strikes, body-based)
#  red    = Bloodline / inherited cursed techniques (innate clan abilities)
#  blue   = Curse Energy output (direct CE attacks, projections)
#  white  = Strategic / tactical (defense, healing, buffs, setups)
#  black  = General purpose (basic versatile, non-specialized)
# ──────────────────────────────────────────────────────────────────────────────

CHARACTERS = [
    Character(
        name="Satoru Gojo",
        description="The strongest jujutsu sorcerer. Possesses the Limitless and Six Eyes.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/e/ef/Satoru_Gojo_%28Anime_2%29.png",
        skills=[
            Skill(
                name="Cursed Technique Lapse: Blue",
                description="Deals 20 damage and stuns for 1 turn.",
                cooldown=1,
                energy=["blue", "black"],
                classes="Energy,Instant",
                target_type="enemy",
                effects=[{"type": "damage", "amount": 20}, {"type": "stun", "duration": 1}]
            ),
            Skill(
                name="Cursed Technique Reversal: Red",
                description="Deals 35 damage. Ignores reduction.",
                cooldown=2,
                energy=["red", "blue"],
                classes="Bloodline,Instant",
                target_type="enemy",
                effects=[{"type": "damage", "amount": 35, "ignore_armor": True}]
            ),
            Skill(
                name="Hollow Technique: Purple",
                description="Deals 60 damage.",
                cooldown=4,
                energy=["red", "blue", "white"],
                classes="Energy,Instant",
                target_type="enemy",
                effects=[{"type": "damage", "amount": 60}]
            ),
            Skill(
                name="Infinity",
                description="Invulnerable for 1 turn.",
                cooldown=3,
                energy=["white", "white"],
                classes="Strategic,Instant",
                target_type="self",
                effects=[{"type": "invulnerable", "duration": 1}]
            ),
        ]
    ),
    Character(
        name="Yuji Itadori",
        description="Physically gifted vessel of Sukuna.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/3/35/Yuji_Itadori_%28Anime_4%29.png",
        skills=[
            Skill(
                name="Martial Arts",
                description="Strikes an enemy for 20 damage.",
                cooldown=0,
                energy=["green"],
                classes="Physical,Instant",
                target_type="enemy",
                effects=[{"type": "damage", "amount": 20}]
            ),
            Skill(
                name="Black Flash",
                description="Spatial distortion strike, 45 damage.",
                cooldown=2,
                energy=["blue", "green", "black"],
                classes="Energy,Instant",
                target_type="enemy",
                effects=[{"type": "damage", "amount": 45}]
            ),
            Skill(
                name="Divergent Fist",
                description="Deals 15 damage, then 15 more next turn.",
                cooldown=1,
                energy=["green", "blue"],
                classes="Physical,Instant",
                target_type="enemy",
                effects=[{"type": "damage", "amount": 15}, {"type": "delayed_damage", "amount": 15, "delay": 1}]
            ),
            Skill(
                name="Unyielding Resolve",
                description="Stay at 1 health for 2 turns.",
                cooldown=3,
                energy=["white", "black"],
                classes="Strategic,Instant",
                target_type="self",
                effects=[{"type": "endure", "duration": 2}]
            ),
        ]
    ),
    Character(
        name="Ryomen Sukuna",
        description="The King of Curses.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/0/05/Sukuna_%28Anime_4%29.png",
        skills=[
            Skill(
                name="Dismantle",
                description="Slashes an enemy for 25 damage.",
                cooldown=0,
                energy=["blue", "black"],
                classes="Energy,Instant",
                target_type="enemy",
                effects=[{"type": "damage", "amount": 25}]
            ),
            Skill(
                name="Cleave",
                description="Adjustment slash, 40 damage.",
                cooldown=1,
                energy=["blue", "red"],
                classes="Energy,Instant",
                target_type="enemy",
                effects=[{"type": "damage", "amount": 40}]
            ),
            Skill(
                name="Fire Arrow",
                description="Massive incineration, 55 damage.",
                cooldown=3,
                energy=["red", "blue", "black"],
                classes="Energy,Instant",
                target_type="enemy",
                effects=[{"type": "damage", "amount": 55}]
            ),
            Skill(
                name="Malevolent Shrine",
                description="Slashes all enemies for 30 damage for 2 turns.",
                cooldown=5,
                energy=["red", "blue", "white"],
                classes="Energy,Action",
                target_type="all_enemies",
                effects=[{"type": "dot", "amount": 30, "duration": 2}]
            ),
        ]
    ),
    Character(
        name="Megumi Fushiguro",
        description="Ten Shadows Technique user.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/6/6e/Megumi_Fushiguro_%28Anime_4%29.png",
        skills=[
            Skill(
                name="Divine Dogs",
                description="Summons dogs for 20 damage.",
                cooldown=0,
                energy=["green", "black"],
                classes="Physical,Instant",
                target_type="enemy",
                effects=[{"type": "damage", "amount": 20}]
            ),
            Skill(
                name="Nue",
                description="Shock one enemy for 15 damage and stun.",
                cooldown=1,
                energy=["blue", "black"],
                classes="Energy,Instant",
                target_type="enemy",
                effects=[{"type": "damage", "amount": 15}, {"type": "stun", "duration": 1}]
            ),
            Skill(
                name="Toad",
                description="Protects ally with invulnerability to 1 skill.",
                cooldown=2,
                energy=["white", "black"],
                classes="Strategic,Instant",
                target_type="team",
                effects=[{"type": "protect", "count": 1}]
            ),
            Skill(
                name="Chimera Shadow Garden",
                description="Boosts damage by 10 and reduces costs.",
                cooldown=4,
                energy=["blue", "green", "white"],
                classes="Strategic,Action",
                target_type="self",
                effects=[{"type": "buff_damage", "amount": 10, "duration": 3}]
            ),
        ]
    )
]

def get_random_character():
    return random.choice(CHARACTERS)
