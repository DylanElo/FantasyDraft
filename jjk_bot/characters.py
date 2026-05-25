import random
from dataclasses import dataclass, field
from typing import List, Optional
from jjk_bot.effects import (
    Effect, EffectKind, Target, PERMANENT,
    damage, pierce, afflict, heal, stun, invuln,
    reduce, ally_reduce, all_ally_reduce,
    strengthen, weaken, defend, dot, trap,
    mark, strip, dispel, cleanse,
)


@dataclass
class Skill:
    name: str
    desc: str
    cost: List[str]
    classes: List[str]
    effects: List[Effect]
    cooldown: int = 0
    target: Target = Target.ENEMY

    @property
    def description(self) -> str:
        return self.desc

    @property
    def energy(self) -> List[str]:
        return self.cost

    @property
    def cooldown_int(self) -> int:
        return self.cooldown

    @property
    def target_type(self) -> str:
        if self.target == Target.SELF:
            return 'self'
        if self.target in (Target.ALLY, Target.ALLIES, Target.XALLIES):
            return 'ally'
        return 'enemy'

    @property
    def is_aoe(self) -> bool:
        return self.target in (Target.ENEMIES, Target.ALLIES, Target.XALLIES)

    @property
    def damage(self) -> int:
        for e in self.effects:
            if e.kind == EffectKind.DAMAGE and e.target in (Target.ENEMY, Target.ENEMIES):
                return e.value
        return 0

    @property
    def heal(self) -> int:
        vals = [e.value for e in self.effects if e.kind == EffectKind.HEAL]
        return max(vals) if vals else 0

    @property
    def stun_turns(self) -> int:
        for e in self.effects:
            if e.kind == EffectKind.STUN:
                return e.turns
        return 0

    @property
    def invuln_turns(self) -> int:
        for e in self.effects:
            if e.kind == EffectKind.INVULN:
                return e.turns
        return 0

    @property
    def dot_damage(self) -> int:
        for e in self.effects:
            if e.kind == EffectKind.DOT:
                return e.value
        return 0

    @property
    def dot_turns(self) -> int:
        for e in self.effects:
            if e.kind == EffectKind.DOT:
                return e.turns
        return 0

    @property
    def damage_reduction(self) -> int:
        for e in self.effects:
            if e.kind == EffectKind.REDUCE and e.target in (Target.SELF, Target.ALLY, Target.ALLIES):
                return e.value
        return 0

    @property
    def is_piercing(self) -> bool:
        return any(e.kind == EffectKind.PIERCE for e in self.effects)

    @property
    def is_affliction(self) -> bool:
        return any(e.kind == EffectKind.AFFLICT for e in self.effects)

    @property
    def ignores_dr(self) -> bool:
        return self.is_piercing or self.is_affliction

    @property
    def ignores_invuln(self) -> bool:
        return self.is_affliction


@dataclass
class Character:
    name: str
    description: str
    image_url: str
    skills: List[Skill] = field(default_factory=list)
    rarity: str = "Rare"
    unique_mechanic: str = ""
    achievement_name: str = ""
    achievement_desc: str = ""


VARIANT_IDENTITIES = {
    "Satoru Gojo": "Gojo",
    "Gojo (Young)": "Gojo",
    "Gojo (Unsealed)": "Gojo",
    "Yuji Itadori": "Yuji",
    "Yuji (Black Flash)": "Yuji",
    "Yuji (Awakened)": "Yuji",
    "Yuta Okkotsu": "Yuta",
    "Yuta Okkotsu (JJK 0)": "Yuta",
    "Yuta Okkotsu (Sendai)": "Yuta",
    "Yuta (Gojo's Body)": "Yuta",
    "Sukuna (Incarnation)": "Sukuna",
    "Sukuna (Full Power)": "Sukuna",
    "Sukuna (Heian Era)": "Sukuna",
}


def character_identity(name: str) -> str:
    return VARIANT_IDENTITIES.get(name, name)


CHARACTERS: List[Character] = [

    # ─── TOKYO JUJUTSU HIGH ───────────────────────────────────────────────────

    Character(
        name="Satoru Gojo",
        description="The strongest jujutsu sorcerer. Limitless technique and Six Eyes grant him unparalleled control over space and cursed energy.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/e/ef/Satoru_Gojo_%28Anime_2%29.png",
        rarity="Legendary",
        unique_mechanic="Six Eyes: Gojo passively gains 1 blue energy at the start of each of his turns.",
        achievement_name="The Strongest",
        achievement_desc="Win a battle without taking any affliction damage. Grants Gojo +10 all damage for 3 turns.",
        skills=[
            Skill("Cursed Technique Lapse: Blue",
                  "Generates negative space, pulling the enemy in. Deals 15 damage and stuns for 1 turn.",
                  cost=["blue"], classes=["Energy", "Instant"], cooldown=1,
                  effects=[damage(15), stun(1)]),
            Skill("Cursed Technique Reversal: Red",
                  "Releases a repulsion blast. Deals 35 piercing damage and weakens the enemy by 10 for 1 turn.",
                  cost=["red", "blue"], classes=["Bloodline", "Instant"], cooldown=2,
                  effects=[pierce(35), weaken(10, 1)]),
            Skill("Hollow Technique: Purple",
                  "Merges Blue and Red into an imaginary mass. Deals 55 affliction damage, removing Gojo's own invulnerability.",
                  cost=["red", "blue", "white"], classes=["Energy", "Instant"], cooldown=4,
                  effects=[afflict(55)]),
            Skill("Infinity",
                  "Slows all matter approaching him to zero. Becomes invulnerable for 1 turn.",
                  cost=["black"], classes=["Strategic", "Instant"], cooldown=4,
                  target=Target.SELF,
                  effects=[invuln(1)]),
        ]
    ),

    Character(
        name="Yuji Itadori",
        description="Vessel of Ryomen Sukuna. Superhuman strength and the fearless will to protect everyone around him.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/3/35/Yuji_Itadori_%28Anime_4%29.png",
        unique_mechanic="Soul Resonance: When Yuji takes 30+ damage in a single hit, gains +15 damage for 1 turn (fighting spirit activates).",
        achievement_name="I Will Save Everyone",
        achievement_desc="Survive at or below 20 HP for 1 full turn. Grants +20 damage for 3 turns.",
        skills=[
            Skill("Divergent Fist",
                  "Strikes for 20 damage. The delayed cursed energy blast deals 10 affliction damage next turn.",
                  cost=["green"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(20), dot(10, 1)]),
            Skill("Black Flash",
                  "Spatial distortion at the moment of impact. Deals 45 damage and weakens the enemy by 15 for 1 turn.",
                  cost=["green", "blue"], classes=["Energy", "Instant"], cooldown=2,
                  effects=[damage(45), weaken(15, 1)]),
            Skill("Shrine: Dismantle",
                  "Sukuna's innate technique leaks through — an invisible slash. Deals 25 affliction damage.",
                  cost=["red", "black"], classes=["Bloodline", "Instant"], cooldown=1,
                  effects=[afflict(25)]),
            Skill("Unyielding Resolve",
                  "Endures all damage through sheer willpower. Gains 25 damage reduction for 2 turns.",
                  cost=["black"], classes=["Strategic", "Action"], cooldown=3,
                  target=Target.SELF,
                  effects=[reduce(25, 2)]),
        ]
    ),

    Character(
        name="Megumi Fushiguro",
        description="Ten Shadows Technique. Summons shikigami born from shadows — each with a unique combat role.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/6/6e/Megumi_Fushiguro_%28Anime_4%29.png",
        unique_mechanic="Shadow Pool: After Megumi uses any skill, his next skill this turn costs 1 less black energy.",
        achievement_name="Ten Shadows Mastery",
        achievement_desc="Use all four shikigami skills in a single battle. All skill costs reduced by 1 for 3 turns.",
        skills=[
            Skill("Divine Dogs: Totality",
                  "Fuses both Divine Dogs into one. Deals 25 damage and weakens the enemy by 10 for 2 turns.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(25), weaken(10, 2)]),
            Skill("Nue: Thunderstrike",
                  "The owl shikigami dives with a thunderclap. Stuns the enemy for 1 turn.",
                  cost=["blue"], classes=["Energy", "Instant"], cooldown=2,
                  effects=[stun(1)]),
            Skill("Toad: Reverse Summon",
                  "A giant toad swallows an ally, shielding them. Target ally becomes invulnerable for 1 turn.",
                  cost=["black"], classes=["Strategic", "Instant"], cooldown=2,
                  target=Target.ALLY,
                  effects=[invuln(1, Target.ALLY)]),
            Skill("Eight-Handled Sword: Mahoraga",
                  "Summons the uncontrollable divine shikigami. Deals 40 piercing damage to all enemies and Megumi becomes invulnerable for 1 turn.",
                  cost=["blue", "green", "white"], classes=["Bloodline", "Action"], cooldown=4,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.PIERCE, value=40, target=Target.ENEMIES), invuln(1, Target.SELF)]),
        ]
    ),

    Character(
        name="Nobara Kugisaki",
        description="Straw Doll Technique. Nails, a hammer, and cursed energy that attacks the soul directly.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/d/dd/Nobara_Kugisaki_%28Anime_2%29.png",
        unique_mechanic="Nail Mark: Targets hit by Nail Toss are marked for 2 turns; Nobara's affliction skills deal +15 to marked targets.",
        achievement_name="Resonance Complete",
        achievement_desc="Hit the same enemy with Nail Toss then Resonance. Grants +20 affliction damage for 3 turns.",
        skills=[
            Skill("Straw Doll: Nail Toss",
                  "Fires cursed nails for 15 damage and marks the target — resonance techniques deal +15 to marked enemies.",
                  cost=["black"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(15), mark()]),
            Skill("Hairpin",
                  "Detonates embedded nails with a snap. Deals 30 damage.",
                  cost=["blue", "black"], classes=["Energy", "Instant"], cooldown=1,
                  effects=[damage(30)]),
            Skill("Resonance",
                  "Channels cursed energy through the doll into the enemy's soul. Deals 25 affliction damage and weakens by 15 for 1 turn.",
                  cost=["red", "blue"], classes=["Bloodline", "Instant"], cooldown=2,
                  effects=[afflict(25), weaken(15, 1)]),
            Skill("Straw Doll: Resonance Finale",
                  "Drives Resonance to its limit through the enemy's soul. Deals 50 affliction damage.",
                  cost=["red", "red", "black"], classes=["Bloodline", "Instant"], cooldown=4,
                  effects=[afflict(50)]),
        ]
    ),

    Character(
        name="Kento Nanami",
        description="Ratio Technique. Creates a mandatory weak point at the 7:3 spot on any object, guaranteeing devastating strikes.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/b/b0/Kento_Nanami_%28Anime%29.png",
        unique_mechanic="Overtime: Starting from turn 4, all of Nanami's damage skills deal +10 bonus damage (no overtime cap).",
        achievement_name="Overtime Activated",
        achievement_desc="Use Overtime while at least 2 allies are alive. All allies gain +15 damage for 3 turns.",
        skills=[
            Skill("Ratio Technique: 7:3",
                  "Marks the mandatory weak point at the 7:3 position. Deals 20 damage and 15 affliction per turn for 2 turns.",
                  cost=["red", "black"], classes=["Bloodline", "Instant"], cooldown=2,
                  effects=[damage(20), dot(15, 2)]),
            Skill("Collapse",
                  "Destroys the environment, sending debris everywhere. Deals 20 damage to all enemies.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=2,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.DAMAGE, value=20, target=Target.ENEMIES)]),
            Skill("Overtime",
                  "Lifts his time restriction. Becomes invulnerable this turn and gains 20 bonus damage for the next skill used.",
                  cost=["white", "white"], classes=["Strategic", "Action"], cooldown=4,
                  target=Target.SELF,
                  effects=[invuln(1), strengthen(20, 1)]),
            Skill("Binding Vow: Work Ethic",
                  "Endures through sheer professionalism. Gains 20 damage reduction for 2 turns.",
                  cost=["white", "black"], classes=["Strategic", "Action"], cooldown=3,
                  target=Target.SELF,
                  effects=[reduce(20, 2)]),
        ]
    ),

    Character(
        name="Yuta Okkotsu",
        description="Special grade sorcerer. Commands Rika and copies any cursed technique he witnesses.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/e/e6/Yuta_Okkotsu_%28Anime_2%29.png",
        rarity="Epic",
        unique_mechanic="Rika's Devotion: When Yuta heals an ally, he gains +10 damage for 2 turns (Rika rewards kindness).",
        achievement_name="Promise Fulfilled",
        achievement_desc="Heal an ally from below 25 HP to above 60 HP in one skill. Grants Yuta +20 damage for 3 turns.",
        skills=[
            Skill("Cursed Sword: Rika's Edge",
                  "Channels Rika's energy into a sword strike. Deals 25 damage.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(25)]),
            Skill("Copy: Cursed Technique",
                  "Yuta copies the enemy's technique via Rika. Deals 20 piercing damage and weakens by 15 for 2 turns.",
                  cost=["blue", "black"], classes=["Energy", "Instant"], cooldown=1,
                  effects=[pierce(20), weaken(15, 2)]),
            Skill("Reverse Cursed Technique: Heal",
                  "Channels positive energy through Rika to mend an ally's wounds. Heals ally for 35 HP.",
                  cost=["white", "blue"], classes=["Strategic", "Instant"], cooldown=2,
                  target=Target.ALLY,
                  effects=[heal(35, Target.ALLY)]),
            Skill("True Form: Rika",
                  "Releases Rika's full power. Deals 50 piercing damage and Yuta becomes invulnerable for 1 turn.",
                  cost=["red", "blue", "white"], classes=["Bloodline", "Action"], cooldown=4,
                  effects=[pierce(50), invuln(1, Target.SELF)]),
        ]
    ),

    Character(
        name="Hakari Kinji",
        description="Idle Death Gamble Domain Expansion. A Pachinko machine that, on Jackpot, grants near-infinite cursed energy.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/c/cf/Kinji_Hakari_%28Anime%29.png",
        rarity="Epic",
        unique_mechanic="Domain Machine: While Idle Death Gamble is on cooldown, Hakari cannot be stunned (he's in the zone).",
        achievement_name="JACKPOT!",
        achievement_desc="Trigger the 40% Idle Death Gamble Jackpot — fully healed, invulnerable 2t, +30 damage 2t.",
        skills=[
            Skill("Restless Love",
                  "Reckless brawling strike. Deals 30 damage and heals Hakari for 15.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=1,
                  effects=[damage(30), heal(15)]),
            Skill("Pachinko Slam",
                  "Throws an enemy into the domain's steel machinery. Deals 15 damage and stuns for 1 turn.",
                  cost=["green"], classes=["Physical", "Instant"], cooldown=2,
                  effects=[damage(15), stun(1)]),
            Skill("Idle Death Gamble",
                  "Domain Expansion. The Pachinko machine runs for 4 turns. Hakari heals 10 HP per turn and gains 10 bonus damage. 40% chance: Jackpot!",
                  cost=["red", "blue", "black"], classes=["Bloodline", "Action"], cooldown=4,
                  target=Target.SELF,
                  effects=[heal(10, Target.SELF), strengthen(10, 4)]),
            Skill("Jackpot: Infinite Cursed Energy",
                  "Jackpot fires — infinite reverse cursed technique activates. Deals 25 affliction damage and heals Hakari for 20.",
                  cost=["red", "black"], classes=["Bloodline", "Instant"], cooldown=2,
                  effects=[afflict(25), heal(20)]),
        ]
    ),

    Character(
        name="Panda",
        description="Autonomous cursed corpse with three combat cores: Panda, Gorilla, and Trident. Each grants different capabilities.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/2/2b/Panda_%28Anime_2%29.png",
        unique_mechanic="Core Cycle: After using any Core skill, Panda's next attack this turn deals +15 pierce damage.",
        achievement_name="Three Cores Activated",
        achievement_desc="Use both Gorilla Core skills and Trident Core in the same battle. Gains 15 DR for 3 turns.",
        skills=[
            Skill("Drum Beat",
                  "Strikes from both arms simultaneously. Deals 20 damage to all enemies.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=1,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.DAMAGE, value=20, target=Target.ENEMIES)]),
            Skill("Gorilla Core: Unblockable",
                  "Activates Gorilla core — an unstoppable straight punch. Deals 30 piercing damage.",
                  cost=["red", "green"], classes=["Bloodline", "Instant"], cooldown=2,
                  effects=[pierce(30)]),
            Skill("Gorilla Core: Boost",
                  "Gorilla core enhances all strikes. Gains 20 bonus damage and 10 damage reduction for 2 turns.",
                  cost=["red"], classes=["Bloodline", "Action"], cooldown=3,
                  target=Target.SELF,
                  effects=[strengthen(20, 2), reduce(10, 2)]),
            Skill("Trident Core: Regeneration",
                  "Activates Trident core — stored energy flows as healing. Heals 35 HP and becomes invulnerable for 1 turn.",
                  cost=["white", "red"], classes=["Strategic", "Instant"], cooldown=4,
                  target=Target.SELF,
                  effects=[heal(35), invuln(1)]),
        ]
    ),

    Character(
        name="Shoko Ieiri",
        description="The only jujutsu sorcerer capable of healing others with Reverse Cursed Technique.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/a/af/Shoko_Ieiri_%28Anime_2%29.png",
        unique_mechanic="Living RCT: Shoko heals herself 5 HP at the end of each turn (her own body heals constantly).",
        achievement_name="Nobody Dies Today",
        achievement_desc="Heal an ally from below 20 HP to above 65 HP in one skill. Heals all allies for 15 HP.",
        skills=[
            Skill("Scalpel Strike",
                  "A surgical strike to a vital point. Deals 15 piercing damage.",
                  cost=["black"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[pierce(15)]),
            Skill("Emergency Treatment",
                  "Rapidly heals an ally's wounds mid-battle. Heals ally for 30 HP.",
                  cost=["white", "black"], classes=["Strategic", "Instant"], cooldown=1,
                  target=Target.ALLY,
                  effects=[heal(30, Target.ALLY)]),
            Skill("Reverse Cursed Technique",
                  "Full reversal healing — converts negative energy into positive life force. Heals ally for 40 HP.",
                  cost=["white", "white"], classes=["Strategic", "Instant"], cooldown=2,
                  target=Target.ALLY,
                  effects=[heal(40, Target.ALLY)]),
            Skill("Stabilize",
                  "Complete medical intervention: removes all debuffs, ally becomes invulnerable for 1 turn, gains 15 DR for 2 turns.",
                  cost=["white", "white"], classes=["Strategic", "Action"], cooldown=4,
                  target=Target.ALLY,
                  effects=[cleanse(), invuln(1, Target.ALLY), ally_reduce(15, 2)]),
        ]
    ),

    Character(
        name="Masamichi Yaga",
        description="Creator of autonomous cursed corpses. Deploys combat dolls with independent souls that fight on their own.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/e/ee/Masamichi_Yaga_%28Anime_3%29.png",
        unique_mechanic="Autonomous: Yaga's counter trap fires twice before expiring (the dolls keep fighting independently).",
        achievement_name="My Dolls Never Sleep",
        achievement_desc="Have the Gummy counter trap fire twice in one battle. Yaga gains +10 damage for 3 turns.",
        skills=[
            Skill("Cursed Corpse: Strike",
                  "Deploys a small combat doll to attack. Deals 20 damage and gains 10 damage reduction for 2 turns.",
                  cost=["blue"], classes=["Strategic", "Action"], cooldown=1,
                  effects=[damage(20), reduce(10, 2)]),
            Skill("Puppet Swarm",
                  "Unleashes multiple dolls to overwhelm one target. Deals 30 damage.",
                  cost=["blue", "black"], classes=["Strategic", "Instant"], cooldown=2,
                  effects=[damage(30)]),
            Skill("Gummy: Counter Trap",
                  "Plants the Gummy doll as a counter trap. Attackers take 20 damage when they strike Yaga.",
                  cost=["white", "black"], classes=["Strategic", "Action"], cooldown=2,
                  target=Target.SELF,
                  effects=[reduce(10, 2), trap("ON_HARM", 20)]),
            Skill("Autonomous Army",
                  "Activates all dolls simultaneously. Deals 35 damage to all enemies.",
                  cost=["blue", "blue", "white"], classes=["Strategic", "Action"], cooldown=4,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.DAMAGE, value=35, target=Target.ENEMIES)]),
        ]
    ),

    Character(
        name="Takuma Ino",
        description="Mythological Beast Worship — internalizes the powers of legendary beasts: Kaichi, Reiki, Kirin, and Ryu.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/9/9a/Takuma_Ino_%28Anime_2%29.png",
        unique_mechanic="Beast Manifestation: Each Beast skill used this battle stacks +5 DR permanently on Ino (max 20).",
        achievement_name="Four Beasts Manifested",
        achievement_desc="Use all four beast skills in a single battle. Grants immunity to stun for 2 turns.",
        skills=[
            Skill("Kaichi: Homing Horn",
                  "Manifests Kaichi's homing horn — a piercing shot that tracks its target. Deals 25 piercing damage.",
                  cost=["blue", "black"], classes=["Energy", "Instant"], cooldown=1,
                  effects=[pierce(25)]),
            Skill("Reiki: Water Cushion",
                  "Manifests Reiki's water shield. Gains 10 damage reduction for 2 turns; attackers take 15 counter-damage.",
                  cost=["white", "blue"], classes=["Strategic", "Action"], cooldown=2,
                  target=Target.SELF,
                  effects=[reduce(10, 2), trap("ON_HARM", 15)]),
            Skill("Kirin: Pain Nullifier",
                  "Gains 40 damage reduction for 1 turn. Kirin's intracerebral doping lets Ino ignore the hit.",
                  cost=["white", "black"], classes=["Strategic", "Action"], cooldown=3,
                  target=Target.SELF,
                  effects=[reduce(40, 1)]),
            Skill("Ryu: Dragon Crush",
                  "Manifests Ryu's full power — a crushing dragon strike. Deals 45 damage and weakens enemy by 20 for 2 turns.",
                  cost=["blue", "green", "blue"], classes=["Energy", "Instant"], cooldown=4,
                  effects=[damage(45), weaken(20, 2)]),
        ]
    ),

    Character(
        name="Arata Nitta",
        description="Pain Killer technique — halts all injury progression on allies. Cannot heal, but prevents wounds from worsening.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/3/33/Arata_Nitta_%28Anime%29.png",
        unique_mechanic="Halt All Injury: Once per battle, an ally with Nitta's DR active survives a lethal non-affliction hit with 1 HP.",
        achievement_name="Death Deferred",
        achievement_desc="Save an ally from a lethal hit with Pain Killer's passive. That ally gains 20 DR for 2 turns.",
        skills=[
            Skill("Pain Killer",
                  "Halts all injury progression on an ally. Ally gains 20 damage reduction for 2 turns.",
                  cost=["white"], classes=["Strategic", "Action"], cooldown=2,
                  target=Target.ALLY,
                  effects=[ally_reduce(20, 2)]),
            Skill("Emergency Stabilization",
                  "Complete injury suppression — ally becomes invulnerable for 1 turn.",
                  cost=["white", "white"], classes=["Strategic", "Instant"], cooldown=3,
                  target=Target.ALLY,
                  effects=[invuln(1, Target.ALLY)]),
            Skill("Wound Suppression",
                  "Suppresses bleeding and internal damage. Heals ally for 20 HP.",
                  cost=["white", "black"], classes=["Strategic", "Instant"], cooldown=2,
                  target=Target.ALLY,
                  effects=[heal(20, Target.ALLY)]),
            Skill("Precision Strike",
                  "Targets a vital point with surgical accuracy. Deals 20 piercing damage.",
                  cost=["black"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[pierce(20)]),
        ]
    ),

    # ─── KYOTO JUJUTSU HIGH ───────────────────────────────────────────────────

    Character(
        name="Aoi Todo",
        description="Grade 1 with overwhelming strength and Boogie Woogie — claps hands to swap positions, completely disrupting enemies.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/7/79/Aoi_Todo_%28Anime%29.png",
        unique_mechanic="Best Friend Instinct: After using Boogie Woogie, Todo's next Crushing Blow this turn costs 0 energy.",
        achievement_name="My Best Friend!",
        achievement_desc="Use Boogie Woogie then Crushing Blow on the same enemy in one turn. Grants +25 damage for 2 turns.",
        skills=[
            Skill("Boogie Woogie",
                  "Claps hands — swaps the enemy's position mid-action. Stuns the enemy for 1 turn.",
                  cost=["black"], classes=["Bloodline", "Instant"], cooldown=1,
                  effects=[stun(1)]),
            Skill("Crushing Blow",
                  "A strike with the weight of 1m+ of muscle behind it. Deals 25 damage.",
                  cost=["green"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(25)]),
            Skill("Disorienting Swap",
                  "Swaps and immediately counter-strikes. Deals 20 damage and weakens the enemy by 20 for 2 turns.",
                  cost=["red", "blue"], classes=["Bloodline", "Instant"], cooldown=2,
                  effects=[damage(20), weaken(20, 2)]),
            Skill("Best Friend Combo",
                  "Imagines fighting alongside his best friend — doubles the rhythm. Gains 25 bonus damage for 3 turns.",
                  cost=["white", "green"], classes=["Strategic", "Action"], cooldown=3,
                  target=Target.SELF,
                  effects=[strengthen(25, 3)]),
        ]
    ),

    Character(
        name="Maki Zenin",
        description="Heavenly Restriction strips all cursed energy for a superhuman body. Masters every cursed tool in existence.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/2/2c/Maki_Zen%27in_%28Anime_4%29.png",
        rarity="Epic",
        unique_mechanic="Heavenly Body: Maki is completely immune to DoT damage (no cursed energy means curse effects cannot linger).",
        achievement_name="Zero Cursed Energy, Maximum Strength",
        achievement_desc="Kill an enemy with a Physical skill. All physical skills deal +15 pierce damage for 3 turns.",
        skills=[
            Skill("Playful Cloud",
                  "Three-section staff of the highest grade — deals 25 damage.",
                  cost=["green"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(25)]),
            Skill("Dragon-Bone",
                  "Absorbs the enemy's force and adds it to the next strike. Gains 10 DR and 20 bonus damage for 1 turn.",
                  cost=["white"], classes=["Strategic", "Instant"], cooldown=1,
                  target=Target.SELF,
                  effects=[reduce(10, 1), strengthen(20, 1)]),
            Skill("Split Soul Katana",
                  "A special-grade cursed tool that cuts the soul. Deals 30 piercing damage.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=2,
                  effects=[pierce(30)]),
            Skill("Heavenly Restriction: Peak Form",
                  "Gains 15 damage reduction for 3 turns. Attackers take 30 counter-damage from Maki's peak body.",
                  cost=["red", "green"], classes=["Bloodline", "Action"], cooldown=4,
                  target=Target.SELF,
                  effects=[reduce(15, 3), trap("ON_HARM", 30)]),
        ]
    ),

    Character(
        name="Toge Inumaki",
        description="Cursed Speech — his words carry cursed energy, forcing reality to obey. Every command is a technique.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/c/cb/Toge_Inumaki_%28Anime_2%29.png",
        unique_mechanic="Voice Toll: Each Cursed Speech skill costs Toge 5 HP but permanently stacks +5 affliction damage (max +25).",
        achievement_name="The Price of Power",
        achievement_desc="Lose 15+ HP from self-damage in one battle. Grants +15 affliction damage for 3 turns.",
        skills=[
            Skill("Don't Move",
                  "Commands the enemy to halt. Stuns for 1 turn. Costs Toge 5 HP.",
                  cost=["blue"], classes=["Energy", "Instant"], cooldown=1,
                  effects=[stun(1)]),
            Skill("Blast Away",
                  "Commands the enemy to be repelled. Deals 20 damage. Costs Toge 5 HP.",
                  cost=["blue", "black"], classes=["Energy", "Instant"], cooldown=1,
                  effects=[damage(20)]),
            Skill("Explode",
                  "Commands the enemy's body to detonate from within. Deals 30 affliction damage. Costs Toge 5 HP.",
                  cost=["red", "blue"], classes=["Affliction", "Instant"], cooldown=2,
                  effects=[afflict(30)]),
            Skill("Throat Medicine",
                  "Soothes the damage Cursed Speech does to his own throat. Heals Toge 30 HP.",
                  cost=["white", "black"], classes=["Strategic", "Instant"], cooldown=2,
                  target=Target.SELF,
                  effects=[heal(30)]),
        ]
    ),

    Character(
        name="Noritoshi Kamo",
        description="Blood Manipulation technique. Controls blood as projectiles, blades, and ensnaring binds.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/d/d5/Noritoshi_Kamo_(Anime).png",
        unique_mechanic="Blood Reclaim: Noritoshi heals 5 HP whenever he deals piercing damage (blood returns to him).",
        achievement_name="Blood Art Mastery",
        achievement_desc="Apply both DoT and pierce damage in the same turn. Grants +10 damage and +10 affliction for 2 turns.",
        skills=[
            Skill("Convergence",
                  "Compresses blood into a dense sphere fired at extreme speed. Deals 30 piercing damage.",
                  cost=["red", "black"], classes=["Bloodline", "Instant"], cooldown=1,
                  effects=[pierce(30)]),
            Skill("Crimson Binding",
                  "Hardens blood into ropes that ensnare the enemy. Stuns for 1 turn and applies 10 affliction per turn for 2 turns.",
                  cost=["red", "blue"], classes=["Bloodline", "Action"], cooldown=2,
                  effects=[stun(1), dot(10, 2)]),
            Skill("Flowing Red Scale: Surge",
                  "Floods adrenaline through blood manipulation. Deals 20 damage and gains 20 bonus damage for 2 turns.",
                  cost=["red", "black"], classes=["Bloodline", "Instant"], cooldown=1,
                  effects=[damage(20), strengthen(20, 2)]),
            Skill("Blood Manipulation: Crimson Rain",
                  "Scatters compressed blood into a lethal shower. Deals 45 damage and 10 affliction per turn for 3 turns.",
                  cost=["red", "red", "blue"], classes=["Bloodline", "Action"], cooldown=4,
                  effects=[damage(45), dot(10, 3)]),
        ]
    ),

    Character(
        name="Kasumi Miwa",
        description="New Shadow Style iaijutsu. A single Batto Sword Draw can end a fight instantly. Simple Domain counters any Domain Expansion.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/6/64/Kasumi_Miwa_(Anime).png",
        unique_mechanic="Quick Draw Master: The first skill Miwa uses each turn costs 1 less energy (iaijutsu is about the first strike).",
        achievement_name="One Strike, One Kill",
        achievement_desc="Kill an enemy with Batto Sword Draw. Miwa becomes invulnerable for 1 turn.",
        skills=[
            Skill("Batto Sword Draw",
                  "A single iaijutsu draw — before the enemy can react. Deals 20 damage.",
                  cost=["green"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(20)]),
            Skill("Three-Flash Consecutive Sword Draw",
                  "Three rapid-fire draw-and-sheath strikes in succession. Deals 35 damage.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=1,
                  effects=[damage(35)]),
            Skill("Simple Domain",
                  "A miniature domain that neutralizes incoming techniques and disperses active domain expansions.",
                  cost=["white"], classes=["Strategic", "Instant"], cooldown=2,
                  effects=[stun(1), dispel()]),
            Skill("New Shadow Style: Zero Draw",
                  "A perfect draw that erases all momentum. Deals 40 damage and becomes invulnerable for 1 turn.",
                  cost=["green", "green", "black"], classes=["Physical", "Instant"], cooldown=4,
                  effects=[damage(40), invuln(1, Target.SELF)]),
        ]
    ),

    Character(
        name="Mai Zenin",
        description="Construction technique — creates one object from nothing per day. She uses it to conjure a perfect cursed bullet.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/8/86/Mai_Zen%27in_(Anime_4).png",
        unique_mechanic="One-a-Day: Construction: Special Bullet's bonus doesn't expire from turns — it persists until Mai uses a damage skill.",
        achievement_name="The Perfect Bullet",
        achievement_desc="Kill an enemy immediately after using Construction: Special Bullet. Gains +25 damage for 2 turns.",
        skills=[
            Skill("Revolver Shot",
                  "Standard cursed energy bullet. Deals 15 damage.",
                  cost=["black"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(15)]),
            Skill("Construction: Special Bullet",
                  "Creates one perfect bullet from nothing. Gains 20 bonus damage (persists until a damage skill is used).",
                  cost=["red"], classes=["Bloodline", "Instant"], cooldown=2,
                  target=Target.SELF,
                  effects=[strengthen(20, 2)]),
            Skill("Rapid Fire",
                  "Empties the revolver. Deals 20 damage to all enemies.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=2,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.DAMAGE, value=20, target=Target.ENEMIES)]),
            Skill("Construction: Armor-Piercing Round",
                  "The constructed bullet ignores all defenses — forged to pierce the soul. Deals 40 affliction damage.",
                  cost=["red", "green", "black"], classes=["Bloodline", "Instant"], cooldown=3,
                  effects=[afflict(40)]),
        ]
    ),

    Character(
        name="Utahime Iori",
        description="Solo Forbidden Area — a ritual performance that continuously amplifies all allies' cursed energy output.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/b/b0/Utahime_Iori_%28Anime_2%29.png",
        unique_mechanic="Amplification Field: All strengthen effects Utahime applies last 1 extra turn (her ritual sustains the boost).",
        achievement_name="Full Resonance",
        achievement_desc="Have all 3 allies buffed with strengthen simultaneously. All allies gain +20 damage for 2 turns.",
        skills=[
            Skill("Cursed Strike",
                  "A focused cursed energy strike. Deals 15 damage.",
                  cost=["black"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(15)]),
            Skill("Cursed Energy Boost",
                  "Channels amplified energy into one ally. Ally gains 20 bonus damage for 2 turns.",
                  cost=["white", "black"], classes=["Strategic", "Action"], cooldown=1,
                  target=Target.ALLY,
                  effects=[strengthen(20, 2, Target.ALLY)]),
            Skill("Ritual Incantation",
                  "Begins the ritual chant — all allies gain 10 bonus damage for 2 turns.",
                  cost=["white", "blue"], classes=["Strategic", "Action"], cooldown=2,
                  target=Target.ALLIES,
                  effects=[strengthen(10, 2, Target.ALLIES)]),
            Skill("Solo Forbidden Area",
                  "Full ritual performance — all allies gain 20 bonus damage for 1 turn.",
                  cost=["white", "white", "white"], classes=["Strategic", "Action"], cooldown=4,
                  target=Target.ALLIES,
                  effects=[strengthen(20, 1, Target.ALLIES)]),
        ]
    ),

    Character(
        name="Yoshinobu Gakuganji",
        description="Converts electric guitar sound waves into cursed energy shockwaves. The music is the weapon.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/3/3c/Yoshinobu_Gakuganji_%28Anime%29.png",
        unique_mechanic="Living Resonance: Gakuganji deals +5 bonus damage per living enemy (more bodies = more resonance chambers).",
        achievement_name="Concert at Maximum Volume",
        achievement_desc="Use Maximum Feedback while all 3 enemies are alive. All enemies are stunned for 1 additional turn.",
        skills=[
            Skill("Guitar Shockwave",
                  "Sound wave strikes one target. Deals 30 damage.",
                  cost=["blue", "black"], classes=["Energy", "Instant"], cooldown=0,
                  effects=[damage(30)]),
            Skill("Cursed Resonance",
                  "Wide sound wave engulfs all enemies. Deals 20 damage to all enemies.",
                  cost=["blue", "blue"], classes=["Energy", "Instant"], cooldown=1,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.DAMAGE, value=20, target=Target.ENEMIES)]),
            Skill("Feedback Loop",
                  "Sound waves build on each other for 3 turns. Deals 10 affliction per turn to all enemies.",
                  cost=["blue", "white"], classes=["Energy", "Action"], cooldown=3,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.DOT, value=10, turns=3, target=Target.ENEMIES)]),
            Skill("Maximum Feedback",
                  "Cranks the amp to maximum — a devastating sound burst. Deals 45 damage and stuns for 1 turn.",
                  cost=["blue", "blue", "black"], classes=["Energy", "Instant"], cooldown=4,
                  effects=[damage(45), stun(1)]),
        ]
    ),

    Character(
        name="Momo Nishimiya",
        description="Broomstick flight and Tool Manipulation. Aerial recon and wind blades make her both scout and attacker.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/9/98/Momo_Nishimiya_%28Anime%29.png",
        unique_mechanic="Aerial Intel: Broomstick Recon also weakens one random enemy by 10 for 2 turns (she identifies their weakness).",
        achievement_name="Perfect Aerial Survey",
        achievement_desc="Use Broomstick Recon while all 3 allies are alive. All allies gain 20 DR for 2 turns.",
        skills=[
            Skill("Broomstick Recon",
                  "Surveys the battlefield from above. All allies gain 15 damage reduction for 2 turns.",
                  cost=["white"], classes=["Strategic", "Action"], cooldown=1,
                  target=Target.ALLIES,
                  effects=[all_ally_reduce(15, 2)]),
            Skill("Wind Sickle",
                  "A precise wind blade aimed at one target. Deals 30 damage.",
                  cost=["blue", "black"], classes=["Energy", "Instant"], cooldown=1,
                  effects=[damage(30)]),
            Skill("Kamaitachi Barrage",
                  "Multiple wind blades fan out across all enemies. Deals 20 damage to all enemies.",
                  cost=["blue", "blue"], classes=["Energy", "Instant"], cooldown=2,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.DAMAGE, value=20, target=Target.ENEMIES)]),
            Skill("Aerial Evasion",
                  "Takes to the air on her broomstick — completely out of reach. Becomes invulnerable for 1 turn.",
                  cost=["black"], classes=["Strategic", "Instant"], cooldown=4,
                  target=Target.SELF,
                  effects=[invuln(1)]),
        ]
    ),

    # ─── OTHER SORCERERS ──────────────────────────────────────────────────────

    Character(
        name="Mei Mei",
        description="Grade 1 mercenary. Black Bird Manipulation commands crows — including using them as suicide bombs.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/a/a8/Mei_Mei_(Anime_2).png",
        unique_mechanic="Kill Bonus: Mei Mei permanently gains +5 damage each time any enemy dies (max +15 total).",
        achievement_name="Worth Every Coin",
        achievement_desc="Deal the killing blow with Bird Strike: Suicide Bomb. Gains +20 damage for 3 turns.",
        skills=[
            Skill("Crow Flock",
                  "Sends a flock of crows to harry the enemy. Deals 20 damage and weakens by 10 for 2 turns.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(20), weaken(10, 2)]),
            Skill("Avid Mercenary",
                  "Motivated by money — fights at peak efficiency. Gains 20 bonus damage for 2 turns.",
                  cost=["white", "black"], classes=["Strategic", "Action"], cooldown=2,
                  target=Target.SELF,
                  effects=[strengthen(20, 2)]),
            Skill("Dive Bomb",
                  "Commands a crow to dive bomb — high speed, guaranteed to hit. Deals 30 piercing damage.",
                  cost=["blue", "blue"], classes=["Energy", "Instant"], cooldown=1,
                  effects=[pierce(30)]),
            Skill("Bird Strike: Suicide Bomb",
                  "Sacrifices a crow — it detonates at point blank range. Cannot be blocked or evaded. Deals 45 affliction damage.",
                  cost=["blue", "blue", "black"], classes=["Affliction", "Instant"], cooldown=3,
                  effects=[afflict(45)]),
        ]
    ),

    Character(
        name="Naobito Zenin",
        description="Projection Sorcery maps 24-frame animations onto surfaces. Anything outside the frames is paralyzed. Fastest after Gojo.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/1/17/Naobito_Zenin_%28Anime_2%29.png",
        unique_mechanic="Frame Lock: While any enemy is stunned by Naobito, he cannot be stunned himself (he operates outside their frames).",
        achievement_name="Fastest in the World",
        achievement_desc="Stun an enemy with Projection Sorcery then deal 35+ damage in the same turn. Grants +20 damage for 2 turns.",
        skills=[
            Skill("Flash Strike",
                  "Moves faster than the eye can track. Deals 25 damage.",
                  cost=["green"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(25)]),
            Skill("Projection Sorcery",
                  "Maps the enemy into 24 animation frames — anything outside is paralyzed. Deals 20 damage and stuns for 1 turn.",
                  cost=["red", "black"], classes=["Bloodline", "Instant"], cooldown=1,
                  effects=[damage(20), stun(1)]),
            Skill("1/24 Frames: Maximum Speed",
                  "Moves within a single animation frame. Deals 35 piercing damage.",
                  cost=["red", "green"], classes=["Bloodline", "Instant"], cooldown=2,
                  effects=[pierce(35)]),
            Skill("Speed of Flash: Full Burst",
                  "Unleashes full Projection Sorcery speed. Becomes invulnerable for 1 turn and gains 15 bonus damage for 2 turns.",
                  cost=["red", "red", "green"], classes=["Bloodline", "Action"], cooldown=4,
                  target=Target.SELF,
                  effects=[invuln(1), strengthen(15, 2)]),
        ]
    ),

    Character(
        name="Toji Fushiguro",
        description="Sorcerer Killer. Heavenly Restriction strips all cursed energy for peak human physique. Cursed tools are his arsenal.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/d/db/Toji_Fushiguro_%28Anime%29.png",
        rarity="Epic",
        unique_mechanic="Technique Hunter: Toji deals +15 damage to any target with an active strengthen or damage buff effect.",
        achievement_name="Sorcerer Killer",
        achievement_desc="Kill a character who used a non-Physical skill this battle. Grants +15 pierce for 3 turns.",
        skills=[
            Skill("Inverted Spear of Heaven",
                  "A cursed tool that nullifies all cursed techniques on contact. Deals 25 affliction damage.",
                  cost=["black", "green"], classes=["Physical", "Instant"], cooldown=1,
                  effects=[afflict(25)]),
            Skill("Jinx: Worm Release",
                  "Deals 15 damage and 15 affliction per turn for 2 turns. The Jinx worm wears the target down.",
                  cost=["red", "black"], classes=["Affliction", "Action"], cooldown=2,
                  effects=[damage(15), dot(15, 2)]),
            Skill("Heavenly Restriction: Peak Body",
                  "Gains 20 bonus damage and 15 damage reduction for 2 turns.",
                  cost=["red", "green"], classes=["Bloodline", "Action"], cooldown=3,
                  target=Target.SELF,
                  effects=[strengthen(20, 2), reduce(15, 2)]),
            Skill("Playful Cloud: Finisher",
                  "The highest-grade non-cursed tool — three devastating strikes. Deals 65 damage.",
                  cost=["green", "green", "black"], classes=["Physical", "Instant"], cooldown=4,
                  effects=[damage(65)]),
        ]
    ),

    Character(
        name="Yuki Tsukumo",
        description="Special grade sorcerer. Star Rage adds virtual mass to anything she touches for crushing gravitational attacks.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/2/22/Yuki_Tsukumo_%28Anime_3%29.png",
        rarity="Legendary",
        unique_mechanic="Accumulating Mass: Every 2 turns, Yuki permanently gains +5 flat damage (virtual mass builds up, max +20).",
        achievement_name="Special Grade Gravity",
        achievement_desc="Deal 100+ total damage in a single turn. Gains +25 damage for 2 turns.",
        skills=[
            Skill("Star Rage: Impact",
                  "Adds virtual mass to her fist — crushing blow. Deals 25 damage.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(25)]),
            Skill("Star Rage: Slam",
                  "Concentrates virtual mass into a single point. Deals 35 piercing damage.",
                  cost=["red", "black"], classes=["Bloodline", "Instant"], cooldown=1,
                  effects=[pierce(35)]),
            Skill("Garuda: Continuous Crush",
                  "Commands shikigami Garuda to apply Star Rage continuously. All enemies take 10 affliction per turn for 3 turns.",
                  cost=["white", "blue"], classes=["Strategic", "Action"], cooldown=3,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.DOT, value=10, turns=3, target=Target.ENEMIES)]),
            Skill("Star Rage: Black Hole",
                  "Collapses overwhelming virtual mass. Deals 35 damage to all enemies and stuns for 1 turn.",
                  cost=["red", "red", "blue"], classes=["Bloodline", "Instant"], cooldown=4,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.DAMAGE, value=35, target=Target.ENEMIES), stun(1)]),
        ]
    ),

    Character(
        name="Kusakabe",
        description="Grade 1 New Shadow Style swordsman. Pragmatic, efficient, hardened. No flashy techniques — just perfect fundamentals.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/9/9f/Atsuya_Kusakabe_(Anime_2).png",
        unique_mechanic="Pragmatist: When Kusakabe targets an enemy already damaged this turn, the skill costs 1 less energy.",
        achievement_name="Veteran's Resolve",
        achievement_desc="Have counter trap kill an attacker in one hit. Grants immunity to weaken for 3 turns.",
        skills=[
            Skill("Sword Draw",
                  "A precise draw-and-strike. Deals 20 damage.",
                  cost=["green"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(20)]),
            Skill("New Shadow Style: Batto",
                  "Lightning-fast draw that leaves no opening. Deals 30 damage.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=1,
                  effects=[damage(30)]),
            Skill("Counter Stance",
                  "Hardened guard — attackers take 20 counter-damage and Kusakabe gains 15 DR for 2 turns.",
                  cost=["white", "black"], classes=["Strategic", "Action"], cooldown=2,
                  target=Target.SELF,
                  effects=[reduce(15, 2), trap("ON_HARM", 20)]),
            Skill("New Shadow Style: Full Form",
                  "Veteran's complete form — no openings, no hesitation. Deals 40 damage and gains 15 DR for 2 turns.",
                  cost=["green", "green", "white"], classes=["Physical", "Action"], cooldown=4,
                  effects=[damage(40), reduce(15, 2)]),
        ]
    ),

    Character(
        name="Kokichi Muta",
        description="Heavenly Restriction stores 17 years of cursed energy in his immobile body. Remotely pilots Mechamaru.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/e/ea/Kokichi_Muta_%28Anime%29.png",
        unique_mechanic="Stored Reserves: Mechamaru starts battle with 2 extra blue energy (17 years of accumulation released at once).",
        achievement_name="17 Years Unleashed",
        achievement_desc="Use Mode: Absolute. All of Mechamaru's skills deal +15 damage for 2 turns.",
        skills=[
            Skill("Ultra Cannon",
                  "Concentrated energy blast from the palm. Deals 25 damage.",
                  cost=["blue", "black"], classes=["Energy", "Instant"], cooldown=0,
                  effects=[damage(25)]),
            Skill("Ultra Spin",
                  "Rapid spinning strikes from the puppet's bladed limbs. Deals 30 damage.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=1,
                  effects=[damage(30)]),
            Skill("Mode: Albatross",
                  "Mouth opens into a wide-bore cannon — devastating spread shot. Deals 35 damage and weakens by 15 for 1 turn.",
                  cost=["blue", "blue"], classes=["Energy", "Instant"], cooldown=2,
                  effects=[damage(35), weaken(15, 1)]),
            Skill("Mode: Absolute",
                  "Releases 17 years of stored cursed energy. Deals 55 damage and stuns for 1 turn.",
                  cost=["blue", "blue", "blue"], classes=["Energy", "Instant"], cooldown=4,
                  effects=[damage(55), stun(1)]),
        ]
    ),

    Character(
        name="Ui Ui",
        description="Instantaneous long-range teleportation. Can move anyone anywhere in an instant — nearly zero offensive power.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/8/88/Ui_Ui_%28Anime%29.png",
        unique_mechanic="Perfect Escape: Once per battle, when an ally's HP reaches 0, if Ui Ui is alive and unstunned, that ally survives with 1 HP.",
        achievement_name="I've Got You",
        achievement_desc="Save an ally's life with the Perfect Escape passive. Both Ui Ui and the saved ally gain 15 DR for 2 turns.",
        skills=[
            Skill("Teleport: Evade",
                  "Teleports an ally away from danger in an instant. Ally becomes invulnerable for 1 turn.",
                  cost=["blue", "white"], classes=["Strategic", "Instant"], cooldown=1,
                  target=Target.ALLY,
                  effects=[invuln(1, Target.ALLY)]),
            Skill("Teleport: Intercept",
                  "Teleports himself in front of an ally, taking the hit. Ally gains 30 damage reduction for 1 turn.",
                  cost=["white", "black"], classes=["Strategic", "Instant"], cooldown=2,
                  target=Target.ALLY,
                  effects=[ally_reduce(30, 1)]),
            Skill("Disorienting Warp",
                  "Warps the enemy to a disorienting location. Enemy weakened by 25 for 2 turns and takes 15 affliction per turn for 2 turns.",
                  cost=["red", "blue", "white"], classes=["Strategic", "Instant"], cooldown=4,
                  effects=[weaken(25, 2), dot(15, 2)]),
            Skill("Desperate Punch",
                  "Ui Ui's last resort — a completely untrained punch. Deals 10 damage.",
                  cost=["black"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(10)]),
        ]
    ),

    Character(
        name="Miguel Oduol",
        description="African sorcerer with the Black Rope — a cursed tool so powerful it negates even Gojo's Infinity.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/8/8e/Miguel_%28Anime%29.png",
        unique_mechanic="Black Rope: Miguel's piercing attacks strip the target's active strengthen effects (the Rope negates technique enhancements).",
        achievement_name="Even Infinity Falls",
        achievement_desc="Strip a strengthen effect from an enemy with Black Rope Lash. Gains +20 damage for 3 turns.",
        skills=[
            Skill("Black Rope Lash",
                  "Strikes with the cursed Black Rope — negates cursed energy on contact. Deals 20 piercing damage, weakens by 15 for 2 turns, and strips active buffs.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[pierce(20), weaken(15, 2), strip()]),
            Skill("Prayer Song: Hakuna Rana",
                  "The ritual dance amplifies his strength while diminishing the enemy's. Gains 20 bonus damage and weakens enemy by 15 for 2 turns.",
                  cost=["green", "blue"], classes=["Physical", "Action"], cooldown=2,
                  effects=[strengthen(20, 2), weaken(15, 2)]),
            Skill("Black Rope: Binding",
                  "Wraps the enemy in the cursed rope — all their techniques are suppressed. Deals 25 damage and stuns for 1 turn.",
                  cost=["blue", "white"], classes=["Energy", "Instant"], cooldown=2,
                  effects=[damage(25), stun(1)]),
            Skill("War Rhythm: Full Power",
                  "Full combat tempo reached — every strike lands at peak power. Deals 45 damage.",
                  cost=["green", "green", "blue"], classes=["Physical", "Instant"], cooldown=4,
                  effects=[damage(45)]),
        ]
    ),

    Character(
        name="Master Tengen",
        description="Immortal sorcerer over 1000 years old. Maintains Japan's barrier network through the Immortality technique.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/1/16/Tengen_%28Anime%29.png",
        unique_mechanic="Thousand-Year Body: Once per battle, when Tengen would be defeated, he instead survives with 5 HP.",
        achievement_name="A Thousand Years of Battle",
        achievement_desc="Survive to turn 7 with Tengen alive. All allies gain 15 DR for 3 turns.",
        skills=[
            Skill("Barrier Pulse",
                  "Fires a compressed barrier as a projectile. Deals 20 piercing damage.",
                  cost=["blue", "black"], classes=["Energy", "Instant"], cooldown=0,
                  effects=[pierce(20)]),
            Skill("Barrier Reinforcement",
                  "Strengthens the barrier around all allies. All allies gain 20 damage reduction for 2 turns.",
                  cost=["white", "white"], classes=["Strategic", "Action"], cooldown=2,
                  target=Target.ALLIES,
                  effects=[all_ally_reduce(20, 2)]),
            Skill("Pure Barrier",
                  "A perfect, absolute barrier. One ally becomes invulnerable for 1 turn.",
                  cost=["white", "white", "blue"], classes=["Strategic", "Instant"], cooldown=3,
                  target=Target.ALLY,
                  effects=[invuln(1, Target.ALLY)]),
            Skill("Immortal Body",
                  "Over 1000 years of evolution — the body refuses to die. Heals 30 HP and becomes invulnerable for 1 turn.",
                  cost=["white", "red", "white"], classes=["Strategic", "Instant"], cooldown=4,
                  target=Target.SELF,
                  effects=[heal(30), invuln(1)]),
        ]
    ),

    # ─── MULTI-VERSION CHARACTERS ─────────────────────────────────────────────

    Character(
        name="Yuta Okkotsu (JJK 0)",
        description="Before he mastered her. Rika clings to him as an unstoppable cursed spirit — raw, unrefined, overwhelming.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/7/7d/Yuta_Okkotsu_%28JJK0_Anime%29.png",
        rarity="Rare",
        unique_mechanic="Rika's Wrath: When Yuta (JJK 0) takes damage, his next offensive skill deals +10 damage (Rika reacts to his pain).",
        achievement_name="Rika, I'll Protect Everyone",
        achievement_desc="Use Rika: True Manifestation for the first time. Grants +20 pierce for 2 turns.",
        skills=[
            Skill("Basic Slash",
                  "Yuta strikes with his sword — still learning, but determined. Deals 20 damage.",
                  cost=["green"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(20)]),
            Skill("Rika: Lunge",
                  "Rika lunges at the enemy with ferocious cursed energy. Deals 35 piercing damage.",
                  cost=["red", "black"], classes=["Bloodline", "Instant"], cooldown=1,
                  effects=[pierce(35)]),
            Skill("Rika: Scream",
                  "Rika's cursed energy erupts — uncontrollable. Deals 25 affliction damage to the enemy and 10 affliction to Yuta.",
                  cost=["red", "blue"], classes=["Bloodline", "Instant"], cooldown=2,
                  effects=[afflict(25), Effect(EffectKind.AFFLICT, value=10, target=Target.SELF)]),
            Skill("Rika: True Manifestation",
                  "Rika appears in full — a special grade cursed spirit with no restraint. Deals 60 piercing damage.",
                  cost=["red", "red", "blue"], classes=["Bloodline", "Action"], cooldown=4,
                  effects=[pierce(60)]),
        ]
    ),

    Character(
        name="Yuta Okkotsu (Sendai)",
        description="Sendai Colony Culling Game. Peak Copy technique and Black Flash mastery — a one-man army.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/4/4e/Yuta_Okkotsu_%28Culling_Game%29.png",
        rarity="Epic",
        unique_mechanic="Peak Copy: After using Copy: Broadcast, Yuta's next offensive skill deals +15 damage (technique mastery compounds).",
        achievement_name="Special Grade Solo",
        achievement_desc="Kill 2 enemies using Copy skills in one battle. Rika: Maximum Output cooldown reduced by 2 turns.",
        skills=[
            Skill("Cursed Sword: Full Draw",
                  "Full-power draw strike. Deals 25 damage.",
                  cost=["green"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(25)]),
            Skill("Copy: Broadcast",
                  "Deals 20 piercing damage to all enemies and weakens them by 10 for 2 turns.",
                  cost=["blue", "blue"], classes=["Energy", "Instant"], cooldown=2,
                  target=Target.ENEMIES,
                  effects=[
                      Effect(EffectKind.PIERCE, value=20, target=Target.ENEMIES),
                      Effect(EffectKind.WEAKEN, value=10, turns=2, target=Target.ENEMIES),
                  ]),
            Skill("Black Flash: Sendai",
                  "Black Flash mastery — spatial distortion at impact. Deals 40 damage and gains 20 bonus damage for 1 turn.",
                  cost=["green", "blue"], classes=["Energy", "Instant"], cooldown=2,
                  effects=[damage(40), strengthen(20, 1)]),
            Skill("Rika: Maximum Output",
                  "Deals 40 piercing damage to all enemies. Yuta becomes invulnerable for 1 turn.",
                  cost=["red", "blue", "white"], classes=["Bloodline", "Action"], cooldown=4,
                  target=Target.ENEMIES,
                  effects=[
                      Effect(EffectKind.PIERCE, value=40, target=Target.ENEMIES),
                      invuln(1, Target.SELF),
                  ]),
        ]
    ),

    Character(
        name="Yuta (Gojo's Body)",
        description="Yuta Okkotsu wearing Satoru Gojo's corpse — channeling Infinity and Six Eyes through borrowed flesh.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/b/b5/Yuta_Gojo_Body.png",
        rarity="Legendary",
        unique_mechanic="Borrowed Power: Using Infinity: Borrowed while already invulnerable extends invuln by 2 turns instead of resetting to 1.",
        achievement_name="The Weight of Borrowed Power",
        achievement_desc="Become invulnerable 3 times in one battle. Gains +20 damage for 3 turns.",
        skills=[
            Skill("Copied Technique: Slash",
                  "A technique copied through Six Eyes — the optimal strike point revealed. Deals 20 piercing damage.",
                  cost=["blue", "black"], classes=["Energy", "Instant"], cooldown=0,
                  effects=[pierce(20)]),
            Skill("Cursed Speech: Don't Move",
                  "Copied from Inumaki — commands the enemy to halt. Stuns for 1 turn and deals 15 affliction damage.",
                  cost=["blue", "white"], classes=["Energy", "Instant"], cooldown=2,
                  effects=[stun(1), afflict(15)]),
            Skill("Rika: AoE Burst",
                  "Rika expands outward from Gojo's body. Deals 35 damage to all enemies.",
                  cost=["red", "blue"], classes=["Bloodline", "Instant"], cooldown=2,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.DAMAGE, value=35, target=Target.ENEMIES)]),
            Skill("Infinity: Borrowed",
                  "Channels Infinity through Six Eyes and Gojo's corpse. Becomes invulnerable for 1 turn and gains 15 DR for 2 turns.",
                  cost=["black"], classes=["Strategic", "Instant"], cooldown=3,
                  target=Target.SELF,
                  effects=[invuln(1), reduce(15, 2)]),
        ]
    ),

    Character(
        name="Gojo (Young)",
        description="Before mastery. Near-death against Toji awakened Infinity — an instinctual survival response. Blue is all he has.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/6/6e/Young_Gojo_%28Anime%29.png",
        rarity="Epic",
        unique_mechanic="Near-Death Awakening: Each time Gojo (Young) takes damage, he gains +5 cumulative damage (max +25). Resets on kill.",
        achievement_name="Limitless Awakened",
        achievement_desc="Use Limitless Awakening. Grants +15 damage for 3 turns as the true potential surfaces.",
        skills=[
            Skill("Cursed Technique Lapse: Blue",
                  "Pulls the enemy in with negative space. Deals 15 damage and stuns for 1 turn.",
                  cost=["blue"], classes=["Energy", "Instant"], cooldown=1,
                  effects=[damage(15), stun(1)]),
            Skill("Blue: Cascade",
                  "A powerful Blue wave sweeps through the enemy line. Deals 25 damage to all enemies.",
                  cost=["blue", "black"], classes=["Energy", "Instant"], cooldown=2,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.DAMAGE, value=25, target=Target.ENEMIES)]),
            Skill("Infinity: Awakened Reflex",
                  "Infinity activates instinctually — the near-death survival response. Becomes invulnerable for 1 turn.",
                  cost=["black"], classes=["Strategic", "Instant"], cooldown=3,
                  target=Target.SELF,
                  effects=[invuln(1)]),
            Skill("Limitless Awakening",
                  "Near-death has fully awakened the Limitless — true potential begins to surface. Gains 25 bonus damage for 3 turns.",
                  cost=["blue", "white", "black"], classes=["Energy", "Action"], cooldown=4,
                  target=Target.SELF,
                  effects=[strengthen(25, 3)]),
        ]
    ),

    Character(
        name="Gojo (Unsealed)",
        description="Returned from Prison Realm — furious, fully calibrated, holding nothing back.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/5/5c/Gojo_Unsealed_%28Anime%29.png",
        rarity="Legendary",
        unique_mechanic="Unbridled Fury: Gojo (Unsealed) cannot be stunned — his rage and absolute focus override all paralysis.",
        achievement_name="Welcome Back",
        achievement_desc="Use Blue: Maximum while all 3 enemies are alive. All enemies are stunned for 1 additional turn.",
        skills=[
            Skill("Blue: Maximum",
                  "Blue at full power — pulls in all enemies simultaneously. Deals 20 damage to all enemies and stuns all for 1 turn.",
                  cost=["blue", "black"], classes=["Energy", "Instant"], cooldown=3,
                  target=Target.ENEMIES,
                  effects=[
                      Effect(EffectKind.DAMAGE, value=20, target=Target.ENEMIES),
                      Effect(EffectKind.STUN, turns=1, target=Target.ENEMIES),
                  ]),
            Skill("Cursed Technique Reversal: Red",
                  "Releases a repulsion blast. Deals 35 piercing damage and weakens by 10 for 1 turn.",
                  cost=["red", "blue"], classes=["Bloodline", "Instant"], cooldown=2,
                  effects=[pierce(35), weaken(10, 1)]),
            Skill("Hollow Technique: Purple",
                  "Full-power Purple — no longer restrained. Deals 55 affliction damage.",
                  cost=["red", "blue", "white"], classes=["Energy", "Instant"], cooldown=4,
                  effects=[afflict(55)]),
            Skill("Infinity: Maximum Efficiency",
                  "Six Eyes operating at full calibration. Becomes invulnerable for 1 turn.",
                  cost=["black"], classes=["Strategic", "Instant"], cooldown=3,
                  target=Target.SELF,
                  effects=[invuln(1)]),
        ]
    ),

    Character(
        name="Sukuna (Incarnation)",
        description="Ryomen Sukuna possessing Yuji Itadori — not at full power, but even a fraction is catastrophic.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/3/3c/Sukuna_%28Anime_2%29.png",
        rarity="Legendary",
        unique_mechanic="First Awakening: The very first use of Dismantle each battle costs 0 energy (Sukuna wakes up and immediately strikes).",
        achievement_name="Even a Fraction",
        achievement_desc="Deal 75+ total affliction damage in one battle. All skills deal +10 for 2 turns.",
        skills=[
            Skill("Innate Technique: Dismantle",
                  "An invisible, formless slash cutting through space itself. Deals 25 affliction damage — cannot be blocked.",
                  cost=["red"], classes=["Bloodline", "Instant"], cooldown=0,
                  effects=[afflict(25)]),
            Skill("Innate Technique: Cleave",
                  "Adapts cursed energy to the target's defenses. Deals 35 piercing damage.",
                  cost=["red", "black"], classes=["Bloodline", "Instant"], cooldown=1,
                  effects=[pierce(35)]),
            Skill("Vessel's Strength",
                  "Uses Yuji's extraordinary body at full force. Deals 30 damage and weakens by 15 for 2 turns.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=2,
                  effects=[damage(30), weaken(15, 2)]),
            Skill("Shrine: Limited Domain",
                  "Opens a fragment of the Shrine domain. Deals 40 affliction damage to all enemies.",
                  cost=["red", "red", "black"], classes=["Bloodline", "Action"], cooldown=4,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.AFFLICT, value=40, target=Target.ENEMIES)]),
        ]
    ),

    Character(
        name="Sukuna (Full Power)",
        description="Twenty fingers. Megumi's body. Shrine domain, Mahoraga at his command — Sukuna at the apex of his reincarnated power.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/f/fa/Sukuna_Megumi_Body_%28Anime%29.png",
        rarity="Legendary",
        unique_mechanic="No Restraint: When any enemy character dies, all of Sukuna's active cooldowns decrease by 1 turn.",
        achievement_name="The King Has No Mercy",
        achievement_desc="Kill 2 enemies in a single turn. All cooldowns immediately decrease by 2 additional turns.",
        skills=[
            Skill("Dismantle: Cascade",
                  "Formless slashes fan out across all enemies. Deals 25 affliction damage to all enemies.",
                  cost=["red", "black"], classes=["Bloodline", "Instant"], cooldown=1,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.AFFLICT, value=25, target=Target.ENEMIES)]),
            Skill("Cleave: Maximum",
                  "Full-power Cleave adapted for maximum penetration. Deals 45 piercing damage.",
                  cost=["red", "red"], classes=["Bloodline", "Instant"], cooldown=2,
                  effects=[pierce(45)]),
            Skill("Adaptation: Wheel Guard",
                  "Channels Mahoraga's adaptation. Gains 15 DR for 3 turns; attackers take 20 counter-damage.",
                  cost=["red", "blue"], classes=["Bloodline", "Action"], cooldown=3,
                  target=Target.SELF,
                  effects=[reduce(15, 3), trap("ON_HARM", 20)]),
            Skill("Malevolent Shrine",
                  "Domain Expansion. Shrine fills the entire area with Dismantle and Cleave. Deals 55 affliction damage to all enemies.",
                  cost=["red", "red", "blue"], classes=["Bloodline", "Action"], cooldown=4,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.AFFLICT, value=55, target=Target.ENEMIES)]),
        ]
    ),

    Character(
        name="Sukuna (Heian Era)",
        description="The King of Curses in his true body — four arms, two faces, the most powerful sorcerer in history.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/9/9a/Sukuna_True_Form_%28Anime%29.png",
        rarity="Legendary",
        unique_mechanic="Ancient Dominance: Sukuna (Heian Era) deals +10 damage to any target with an active weaken effect.",
        achievement_name="Bow Before the King",
        achievement_desc="Have all 3 enemies weakened simultaneously. Sukuna deals +15 pierce AoE for 1 turn.",
        skills=[
            Skill("Four-Arm Strike",
                  "Strikes simultaneously with all four arms. Deals 25 damage to all enemies.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=1,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.DAMAGE, value=25, target=Target.ENEMIES)]),
            Skill("Dismantle: Ancient Form",
                  "The original Dismantle — refined over centuries. Deals 40 affliction damage.",
                  cost=["red", "black"], classes=["Bloodline", "Instant"], cooldown=1,
                  effects=[afflict(40)]),
            Skill("King's Aura",
                  "Overwhelming pressure makes lesser beings freeze. Stuns all enemies for 1 turn and gains 20 DR for 2 turns.",
                  cost=["red", "white"], classes=["Bloodline", "Action"], cooldown=3,
                  target=Target.ENEMIES,
                  effects=[
                      Effect(EffectKind.STUN, turns=1, target=Target.ENEMIES),
                      reduce(20, 2),
                  ]),
            Skill("World Slash",
                  "A slash so vast it carves the landscape. Deals 45 piercing damage to all enemies.",
                  cost=["red", "red", "red"], classes=["Bloodline", "Instant"], cooldown=4,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.PIERCE, value=45, target=Target.ENEMIES)]),
        ]
    ),

    Character(
        name="Yuji (Black Flash)",
        description="Four consecutive Black Flashes in Shibuya — Yuji's raw cursed energy resonance unlocked at an unprecedented level.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/c/ce/Yuji_Shibuya_%28Anime%29.png",
        rarity="Epic",
        unique_mechanic="Consecutive Resonance: Each successive damage skill this turn deals +5 more (stacks up to +20; resets each turn).",
        achievement_name="Four Consecutive Flashes",
        achievement_desc="Use 4 or more damage skills in a single battle turn across all characters. The next skill used deals +30 damage.",
        skills=[
            Skill("Divergent Fist",
                  "Strikes for 20 damage. The delayed cursed energy blast deals 10 affliction damage next turn.",
                  cost=["green"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(20), dot(10, 1)]),
            Skill("Black Flash: Consecutive",
                  "Chains multiple Black Flashes in rapid succession. Deals 40 damage and gains 15 bonus damage for 2 turns.",
                  cost=["green", "blue"], classes=["Energy", "Instant"], cooldown=2,
                  effects=[damage(40), strengthen(15, 2)]),
            Skill("Shrine Affinity",
                  "Sukuna's technique resonates — affliction slashes erupt outward. Deals 20 affliction damage to all enemies.",
                  cost=["red", "black"], classes=["Bloodline", "Instant"], cooldown=2,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.AFFLICT, value=20, target=Target.ENEMIES)]),
            Skill("Peak Output: Black Flash",
                  "Maximum resonance — the perfect Black Flash at peak cursed energy output. Deals 55 damage and stuns for 1 turn.",
                  cost=["green", "green", "blue"], classes=["Energy", "Instant"], cooldown=4,
                  effects=[damage(55), stun(1)]),
        ]
    ),

    Character(
        name="Yuji (Awakened)",
        description="Yuji's connection to Kenjaku and Choso surfaces. Blood Manipulation awakens, letting him fight with his own blood.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/a/a3/Yuji_Awakened_%28Anime%29.png",
        rarity="Epic",
        unique_mechanic="Blood Trauma Awakening: First time this battle Yuji takes 20+ affliction damage, permanently gains +10 damage.",
        achievement_name="I Am No Longer Alone",
        achievement_desc="Use Blood Manipulation: Convergence Burst. Heals 20 HP as Choso's blood technique remembers the bond.",
        skills=[
            Skill("Divergent Fist",
                  "Strikes for 20 damage. The delayed cursed energy blast deals 10 affliction damage next turn.",
                  cost=["green"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(20), dot(10, 1)]),
            Skill("Piercing Blood",
                  "Compresses blood into a needle at extreme speed. Deals 35 piercing damage.",
                  cost=["red", "black"], classes=["Bloodline", "Instant"], cooldown=1,
                  effects=[pierce(35)]),
            Skill("Blood Edge",
                  "Forms hardened blood into a blade. Deals 25 damage and applies 10 affliction per turn for 2 turns.",
                  cost=["red", "green"], classes=["Bloodline", "Instant"], cooldown=2,
                  effects=[damage(25), dot(10, 2)]),
            Skill("Blood Manipulation: Convergence Burst",
                  "Compresses his blood to the limit and detonates it at close range. Deals 50 affliction damage.",
                  cost=["red", "red", "black"], classes=["Bloodline", "Instant"], cooldown=4,
                  effects=[afflict(50)]),
        ]
    ),

    # ─── NEW CHARACTERS ──────────────────────────────────────────────────────

    Character(
        name="Kenjaku",
        description="An ancient sorcerer who has switched bodies for over a thousand years. Currently in Suguru Geto's body.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/3/31/Kenjaku_%28Anime%29.png",
        rarity="Legendary",
        unique_mechanic="Chaos Harvest: Kenjaku gains 1 random energy each time any character dies (either team). He profits from all death.",
        achievement_name="A Thousand Years of Plotting",
        achievement_desc="Survive to turn 10 with Kenjaku alive. Prison Realm fires again, stunning a random enemy for 1 turn.",
        skills=[
            Skill("Cursed Spirit: Deploy",
                  "Deploys a captured cursed spirit to attack. Deals 20 damage and applies 10 affliction per turn for 2 turns.",
                  cost=["black"], classes=["Energy", "Instant"], cooldown=1,
                  effects=[damage(20), dot(10, 2)]),
            Skill("Cursed Spirit: Swarm",
                  "Releases multiple captured spirits simultaneously. Deals 30 damage to all enemies.",
                  cost=["blue", "black"], classes=["Energy", "Instant"], cooldown=2,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.DAMAGE, value=30, target=Target.ENEMIES)]),
            Skill("Prison Realm",
                  "Deploys the Prison Realm — a special grade cursed object that seals everything. Stuns one enemy for 2 turns.",
                  cost=["blue", "white", "black"], classes=["Strategic", "Action"], cooldown=4,
                  effects=[stun(2)]),
            Skill("Maximum: Uzumaki",
                  "Absorbs all captured spirits and fires their combined power. Deals 50 affliction damage to all enemies.",
                  cost=["red", "blue", "blue"], classes=["Bloodline", "Action"], cooldown=4,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.AFFLICT, value=50, target=Target.ENEMIES)]),
        ]
    ),

    Character(
        name="Hiromi Higuruma",
        description="A lawyer dragged into the Culling Game. Deadly Sentencing domain renders a verdict — Guilty means death.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/e/e8/Hiromi_Higuruma_%28Anime%29.png",
        rarity="Epic",
        unique_mechanic="Final Verdict: When Higuruma lands the killing blow, all remaining enemies are weakened by 10 for 2 turns.",
        achievement_name="Guilty",
        achievement_desc="Use Executioner's Sword on a target already weakened by Confiscation. Grants +30 pierce for 2 turns.",
        skills=[
            Skill("Judicial Gavel",
                  "Strikes with the cursed Gavel — the implement of judgment. Deals 20 damage.",
                  cost=["black"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(20)]),
            Skill("Confiscation",
                  "The court rules: technique confiscated. Weakens the enemy by 25 for 2 turns.",
                  cost=["white", "black"], classes=["Strategic", "Instant"], cooldown=2,
                  effects=[weaken(25, 2)]),
            Skill("Executioner's Sword",
                  "The sentence is carried out — a sword that erases the condemned. Deals 60 piercing damage.",
                  cost=["blue", "blue", "black"], classes=["Energy", "Instant"], cooldown=3,
                  effects=[pierce(60)]),
            Skill("Deadly Sentencing",
                  "The courtroom renders its judgment. Stuns for 1 turn and weakens by 20 for 2 turns.",
                  cost=["blue", "white", "black"], classes=["Strategic", "Action"], cooldown=4,
                  effects=[stun(1), weaken(20, 2)]),
        ]
    ),

    Character(
        name="Uraume",
        description="Sukuna's devoted retainer for over a thousand years. Ice Formation technique — absolute mastery of cold.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/e/ec/Uraume_%28Anime%29.png",
        rarity="Epic",
        unique_mechanic="Eternal Cold: Uraume's DoT effects cannot be removed by cleanse or dispel effects (the ice cannot be thawed).",
        achievement_name="The King's Retainer",
        achievement_desc="Apply DoT to all 3 enemies in a single battle. DoT damage increases to 25 per tick for 3 turns.",
        skills=[
            Skill("Ice Shard",
                  "Fires a sharpened ice shard at the enemy. Deals 20 piercing damage.",
                  cost=["blue"], classes=["Energy", "Instant"], cooldown=0,
                  effects=[pierce(20)]),
            Skill("Frost Calm",
                  "Encases the enemy in a perfect layer of ice — complete stillness. Stuns for 1 turn.",
                  cost=["blue", "white"], classes=["Energy", "Instant"], cooldown=2,
                  effects=[stun(1)]),
            Skill("Icefall",
                  "A cascade of ice continuously forms over the target. Deals 15 affliction per turn for 3 turns.",
                  cost=["blue", "black"], classes=["Energy", "Action"], cooldown=2,
                  effects=[dot(15, 3)]),
            Skill("Ice Formation: Absolute Zero",
                  "Temperature drops to absolute zero. Deals 35 damage to all enemies and stuns all for 1 turn.",
                  cost=["blue", "blue", "white"], classes=["Energy", "Action"], cooldown=4,
                  target=Target.ENEMIES,
                  effects=[
                      Effect(EffectKind.DAMAGE, value=35, target=Target.ENEMIES),
                      Effect(EffectKind.STUN, turns=1, target=Target.ENEMIES),
                  ]),
        ]
    ),
]


def get_random_character(exclude: list = None) -> Character:
    pool = CHARACTERS
    if exclude:
        pool = [c for c in CHARACTERS if c.name not in exclude]
    if not pool:
        pool = CHARACTERS

    num_legendary = sum(1 for c in pool if c.rarity == "Legendary")
    num_epic = sum(1 for c in pool if c.rarity == "Epic")
    num_rare = sum(1 for c in pool if c.rarity == "Rare")

    w_legendary = 5.0 / num_legendary if num_legendary > 0 else 0.0
    w_epic = 20.0 / num_epic if num_epic > 0 else 0.0
    w_rare = 75.0 / num_rare if num_rare > 0 else 0.0

    weights = []
    for c in pool:
        if c.rarity == "Legendary":
            weights.append(w_legendary)
        elif c.rarity == "Epic":
            weights.append(w_epic)
        else:
            weights.append(w_rare)

    return random.choices(pool, weights=weights, k=1)[0]
