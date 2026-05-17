import random
from dataclasses import dataclass, field
from typing import List, Optional
from jjk_bot.effects import (
    Effect, EffectKind, Target, PERMANENT,
    damage, pierce, afflict, heal, stun, invuln,
    reduce, ally_reduce, all_ally_reduce,
    strengthen, weaken, defend, dot, trap,
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

    # ── Backward-compat properties for game.py + app.py ──

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


# ─────────────────────────────────────────────
#  TOKYO JUJUTSU HIGH
# ─────────────────────────────────────────────

CHARACTERS: List[Character] = [

    # ── SATORU GOJO ───────────────────────────────────────────────────────────
    # Identity: Infinity auto-defense + Blue/Red/Purple escalating technique.
    # Niche: Control + burst damage. Blue stuns to set up Red/Purple. Infinity is
    # his signature: 1 black = 1t invuln, the cheapest protection in the game,
    # reflecting how Gojo barely registers threats. Purple is a CD4 nuke that
    # bypasses all defenses — no enemy survives two full turns against him.
    Character(
        name="Satoru Gojo",
        description="The strongest jujutsu sorcerer. Limitless technique and Six Eyes grant him unparalleled control over space.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/e/ef/Satoru_Gojo_%28Anime_2%29.png/revision/latest?cb=20250726003655",
        skills=[
            Skill("Cursed Technique Lapse: Blue",
                  "Generates negative space, pulling the enemy in for 20 damage and stunning them for 1 turn.",
                  cost=["blue"], classes=["Energy", "Instant"], cooldown=1,
                  effects=[damage(20), stun(1)]),
            Skill("Cursed Technique Reversal: Red",
                  "Releases a repulsion blast for 35 piercing damage, ignoring damage reduction.",
                  cost=["red", "blue"], classes=["Bloodline", "Instant"], cooldown=2,
                  effects=[pierce(35)]),
            Skill("Hollow Technique: Purple",
                  "Merges Blue and Red into an imaginary mass that erases everything. Deals 60 affliction damage, bypassing all defenses.",
                  cost=["red", "blue", "white"], classes=["Energy", "Instant"], cooldown=4,
                  effects=[afflict(60)]),
            Skill("Infinity",
                  "Gojo slows all matter approaching him to zero. Becomes invulnerable for 1 turn.",
                  cost=["black"], classes=["Strategic", "Instant"], cooldown=2,
                  target=Target.SELF,
                  effects=[invuln(1)]),
        ]
    ),

    # ── YUJI ITADORI ─────────────────────────────────────────────────────────
    # Identity: Raw physical brawler with Black Flash as a payoff skill.
    # Divergent Fist punishes enemies who act on the following turn (DoT rider).
    # Shrine is Sukuna's technique leaking through — pure affliction, cheap.
    # Niche: Aggressive damage dealer. Trades defense for consistent output.
    Character(
        name="Yuji Itadori",
        description="Vessel of Ryomen Sukuna. Superhuman strength, cursed energy, and the fearless will to protect everyone.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/3/35/Yuji_Itadori_%28Anime_4%29.png/revision/latest?cb=20251230155050",
        skills=[
            Skill("Divergent Fist",
                  "Strikes for 20 damage. The delayed cursed energy blast deals 15 affliction damage next turn.",
                  cost=["green"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(20), dot(15, 1)]),
            Skill("Black Flash",
                  "Spatial distortion at the moment of impact. Deals 45 damage and weakens the enemy by 15 for 1 turn.",
                  cost=["green", "blue"], classes=["Energy", "Instant"], cooldown=2,
                  effects=[damage(45), weaken(15, 1)]),
            Skill("Shrine: Dismantle",
                  "Sukuna's innate technique leaks through — an invisible slash dealing 25 affliction damage.",
                  cost=["red", "black"], classes=["Bloodline", "Instant"], cooldown=1,
                  effects=[afflict(25)]),
            Skill("Unyielding Resolve",
                  "Yuji endures all damage through sheer willpower. Gains 20 damage reduction for 2 turns.",
                  cost=["white", "black"], classes=["Strategic", "Action"], cooldown=3,
                  target=Target.SELF,
                  effects=[reduce(20, 2)]),
        ]
    ),

    # ── MEGUMI FUSHIGURO ──────────────────────────────────────────────────────
    # Identity: Shikigami toolkit — each skill is a different summon with a
    # distinct purpose. Divine Dogs = damage, Nue = stun, Toad = ally shield,
    # Mahoraga = his ultimate (massive AoE, invuln rider — the one shikigami
    # that can't be fully controlled). Niche: Versatile support/control.
    Character(
        name="Megumi Fushiguro",
        description="Ten Shadows Technique. Summons and commands shikigami born from shadows — each with a unique role.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/6/6e/Megumi_Fushiguro_%28Anime_4%29.png/revision/latest?cb=20251230155327",
        skills=[
            Skill("Divine Dogs: Totality",
                  "Fuses both Divine Dogs into one. Deals 25 damage and weakens the enemy by 10 for 2 turns.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(25), weaken(10, 2)]),
            Skill("Nue: Thunderstrike",
                  "The owl shikigami dives with a thunderclap. Deals 20 damage and stuns for 1 turn.",
                  cost=["blue", "black"], classes=["Energy", "Instant"], cooldown=1,
                  effects=[damage(20), stun(1)]),
            Skill("Toad: Reverse Summon",
                  "A giant toad swallows an ally, shielding them. Target ally becomes invulnerable for 1 turn.",
                  cost=["black"], classes=["Strategic", "Instant"], cooldown=2,
                  target=Target.ALLY,
                  effects=[invuln(1, Target.ALLY)]),
            Skill("Eight-Handled Sword: Mahoraga",
                  "Summons the uncontrollable divine shikigami. Deals 35 piercing damage to all enemies and Megumi becomes invulnerable for 1 turn.",
                  cost=["blue", "green", "white"], classes=["Bloodline", "Action"], cooldown=4,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.PIERCE, value=35, target=Target.ENEMIES), invuln(1, Target.SELF)]),
        ]
    ),

    # ── NOBARA KUGISAKI ───────────────────────────────────────────────────────
    # Identity: Straw Doll Technique — the Resonance combo is her identity.
    # Nails plant a marker (Hairpin detonates for extra value), Resonance is the
    # payoff that bypasses all defenses by targeting the soul. Supernova is her
    # desperate all-in move. Niche: Affliction specialist / soul damage.
    Character(
        name="Nobara Kugisaki",
        description="Straw Doll Technique. Nails, a hammer, and cursed energy that attacks the soul directly.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/d/dd/Nobara_Kugisaki_%28Anime_2%29.png/revision/latest?cb=20240621133809",
        skills=[
            Skill("Straw Doll: Nail Toss",
                  "Fires cursed nails for 15 damage and applies a mark. Enemy takes 10 extra damage next turn.",
                  cost=["black"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(15), dot(10, 1)]),
            Skill("Hairpin",
                  "Detonates embedded nails with a snap. Deals 25 damage.",
                  cost=["blue", "black"], classes=["Energy", "Instant"], cooldown=1,
                  effects=[damage(25)]),
            Skill("Resonance",
                  "Channels cursed energy through the doll directly into the enemy's soul. Deals 25 affliction damage, bypassing all defenses.",
                  cost=["red", "blue"], classes=["Bloodline", "Instant"], cooldown=2,
                  effects=[afflict(25)]),
            Skill("Supernova",
                  "Drives a nail through her own face — channeling raw pain into unstoppable energy. Deals 40 affliction damage to one enemy. Nobara takes 15 affliction damage.",
                  cost=["red", "red", "black"], classes=["Bloodline", "Instant"], cooldown=4,
                  effects=[afflict(40)]),
        ]
    ),

    # ── KENTO NANAMI ─────────────────────────────────────────────────────────
    # Identity: Mandatory weak point. Ratio Technique marks a 7:3 weak spot —
    # in game terms, a multi-turn DoT that represents the accumulating damage.
    # Collapse uses the environment as a weapon (AoE). Overtime unlocks his
    # true power after work hours. Niche: Reliable DoT dealer + AoE.
    Character(
        name="Kento Nanami",
        description="Ratio Technique. Creates a mandatory weak point at the 7:3 spot on any object, guaranteeing devastating strikes.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/b/b0/Kento_Nanami_%28Anime%29.png/revision/latest?cb=20240618014214",
        skills=[
            Skill("Ratio Technique: 7:3",
                  "Marks the mandatory weak point at the 7:3 position. Deals 20 damage and 15 affliction damage per turn for 2 turns.",
                  cost=["red", "black"], classes=["Bloodline", "Instant"], cooldown=1,
                  effects=[damage(20), dot(15, 2)]),
            Skill("Collapse",
                  "Destroys the environment, sending debris everywhere. Deals 20 damage to all enemies.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=2,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.DAMAGE, value=20, target=Target.ENEMIES)]),
            Skill("Overtime",
                  "Lifts his time restriction. Gains 25 bonus damage for 3 turns and becomes invulnerable this turn.",
                  cost=["white", "white"], classes=["Strategic", "Action"], cooldown=4,
                  target=Target.SELF,
                  effects=[invuln(1), strengthen(25, 3)]),
            Skill("Binding Vow: Work Ethic",
                  "Endures through sheer professionalism. Gains 20 damage reduction for 2 turns.",
                  cost=["white", "black"], classes=["Strategic", "Action"], cooldown=3,
                  target=Target.SELF,
                  effects=[reduce(20, 2)]),
        ]
    ),

    # ── YUTA OKKOTSU ─────────────────────────────────────────────────────────
    # Identity: Copy + Rika. Yuta's defining trait by end of series is his ability
    # to COPY any cursed technique he witnesses. Rika is his power source.
    # True Form Rika is his ultimate — massive damage + invuln.
    # Copy gives him versatility (strengthen = borrowed technique boost).
    # RCT heals an ally. Cursed Speech copy = stun + DoT.
    # Niche: Versatile all-rounder — the "Copy Ninja" of JJK.
    Character(
        name="Yuta Okkotsu",
        description="Special grade sorcerer. Commands the cursed spirit Rika and can copy any cursed technique he witnesses.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/e/e6/Yuta_Okkotsu_%28Anime_2%29.png/revision/latest?cb=20251230155621",
        skills=[
            Skill("Copy: Cursed Technique",
                  "Yuta copies an enemy's cursed technique using Rika. Deals 20 piercing damage and gains 20 bonus damage for 2 turns.",
                  cost=["blue", "black"], classes=["Energy", "Instant"], cooldown=1,
                  effects=[pierce(20), strengthen(20, 2)]),
            Skill("Cursed Speech: Twist",
                  "Borrowed from Inumaki — a command that twists the enemy's body. Deals 20 damage, stuns for 1 turn, and applies 10 affliction per turn for 2 turns.",
                  cost=["blue", "white"], classes=["Energy", "Instant"], cooldown=2,
                  effects=[damage(20), stun(1), dot(10, 2)]),
            Skill("Reverse Cursed Technique: Heal",
                  "Channels positive energy through Rika to fully mend an ally's wounds. Heals ally for 35 HP.",
                  cost=["white", "blue"], classes=["Strategic", "Instant"], cooldown=2,
                  target=Target.ALLY,
                  effects=[heal(35, Target.ALLY)]),
            Skill("True Form: Rika",
                  "Releases Rika's full power. Deals 50 piercing damage to one enemy and Yuta becomes invulnerable for 1 turn.",
                  cost=["red", "blue", "white"], classes=["Bloodline", "Action"], cooldown=4,
                  effects=[pierce(50), invuln(1, Target.SELF)]),
        ]
    ),

    # ── HAKARI KINJI ─────────────────────────────────────────────────────────
    # Identity: Gambling domain — Jackpot = near-immortality.
    # Restless Love is his raw brawler move (drain + heal).
    # Idle Death Gamble sets up the Domain — on CD4, grants heal-over-time.
    # Jackpot Strike is what Jackpot looks like: affliction bypass + self-heal.
    # Niche: High-risk sustain fighter. Rewards aggressive play.
    Character(
        name="Hakari Kinji",
        description="Idle Death Gamble Domain Expansion. A Pachinko machine that, on Jackpot, grants near-infinite cursed energy and immortality.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/c/cf/Kinji_Hakari_%28Anime%29.png/revision/latest?cb=20251230185947",
        skills=[
            Skill("Restless Love",
                  "Reckless brawling strike. Deals 30 damage and heals Hakari for 15.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=1,
                  effects=[damage(30), heal(15)]),
            Skill("Pachinko Slam",
                  "Throws an enemy into the domain's steel machinery. Deals 20 damage and stuns for 1 turn.",
                  cost=["green"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(20), stun(1)]),
            Skill("Idle Death Gamble",
                  "Domain Expansion. The Pachinko machine runs for 4 turns. Hakari heals 15 HP per turn and gains 15 bonus damage.",
                  cost=["red", "blue", "black"], classes=["Bloodline", "Action"], cooldown=4,
                  target=Target.SELF,
                  effects=[heal(15, Target.SELF), strengthen(15, 4)]),
            Skill("Jackpot: Infinite Cursed Energy",
                  "Jackpot fires — infinite reverse cursed technique activates. Deals 35 affliction damage and heals Hakari for 20.",
                  cost=["red", "black"], classes=["Bloodline", "Instant"], cooldown=2,
                  effects=[afflict(35), heal(20)]),
        ]
    ),

    # ── PANDA ────────────────────────────────────────────────────────────────
    # Identity: Three cores (Panda / Gorilla / Trident) — core-swap mechanic
    # represented as stance skills. Gorilla core = raw power buff.
    # Trident core = self-heal (regeneration). Drum Beat = signature AoE.
    # Niche: Flexible bruiser. Swaps between offense and recovery.
    Character(
        name="Panda",
        description="Autonomous cursed corpse with three combat cores: Panda, Gorilla, and Trident. Each grants different capabilities.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/2/2b/Panda_%28Anime_2%29.png/revision/latest?cb=20211225181425",
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
                  cost=["red", "black"], classes=["Bloodline", "Action"], cooldown=3,
                  target=Target.SELF,
                  effects=[strengthen(20, 2), reduce(10, 2)]),
            Skill("Trident Core: Regeneration",
                  "Activates Trident core — stored cursed energy flows back as healing. Heals 35 HP and becomes invulnerable for 1 turn.",
                  cost=["white", "red"], classes=["Strategic", "Instant"], cooldown=4,
                  target=Target.SELF,
                  effects=[heal(35), invuln(1)]),
        ]
    ),

    # ── SHOKO IEIRI ───────────────────────────────────────────────────────────
    # Identity: The only person in the jujutsu world who can use Reverse Cursed
    # Technique to heal others. Her offense is minimal — a scalpel used as a
    # weapon. Her identity is pure support. Stabilize is her big play:
    # invuln + DR for an ally. Niche: Premier healer. Fragile but indispensable.
    Character(
        name="Shoko Ieiri",
        description="The only jujutsu sorcerer capable of healing others with Reverse Cursed Technique. Her surgery keeps allies alive.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/a/af/Shoko_Ieiri_%28Anime_2%29.png/revision/latest?cb=20231124131631",
        skills=[
            Skill("Scalpel Strike",
                  "A surgical strike to a vital point. Deals 15 piercing damage.",
                  cost=["black"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[pierce(15)]),
            Skill("Emergency Treatment",
                  "Rapidly heals an ally's wounds mid-battle. Heals ally for 25 HP.",
                  cost=["white", "black"], classes=["Strategic", "Instant"], cooldown=1,
                  target=Target.ALLY,
                  effects=[heal(25, Target.ALLY)]),
            Skill("Reverse Cursed Technique",
                  "Full reversal healing — converts negative energy into positive life force. Heals ally for 40 HP.",
                  cost=["white", "white"], classes=["Strategic", "Instant"], cooldown=2,
                  target=Target.ALLY,
                  effects=[heal(40, Target.ALLY)]),
            Skill("Stabilize",
                  "Complete medical intervention: ally becomes invulnerable for 1 turn and gains 15 damage reduction for 2 turns.",
                  cost=["white", "white", "blue"], classes=["Strategic", "Action"], cooldown=3,
                  target=Target.ALLY,
                  effects=[invuln(1, Target.ALLY), ally_reduce(15, 2)]),
        ]
    ),

    # ── MASAMICHI YAGA ────────────────────────────────────────────────────────
    # Identity: Cursed Corpse engineer. Deploys combat dolls.
    # His dolls fight independently — reflected as a DoT/trap mechanic.
    # Panda (his greatest creation) represents his flagship summon.
    # Niche: Setup/tempo character. Deploys pressure over multiple turns.
    Character(
        name="Masamichi Yaga",
        description="Creator of autonomous cursed corpses. Deploys combat dolls with independent souls that fight on their own.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/e/ee/Masamichi_Yaga_%28Anime_3%29.png/revision/latest?cb=20260129200521",
        skills=[
            Skill("Cursed Corpse: Strike",
                  "Deploys a combat doll to attack. Deals 20 damage and the doll guards him — gains 15 damage reduction for 2 turns.",
                  cost=["blue", "black"], classes=["Strategic", "Action"], cooldown=1,
                  effects=[damage(20), reduce(15, 2)]),
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
                  "Activates all dolls simultaneously. Deals 25 damage to all enemies.",
                  cost=["blue", "blue", "white"], classes=["Strategic", "Action"], cooldown=4,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.DAMAGE, value=25, target=Target.ENEMIES)]),
        ]
    ),

    # ── TAKUMA INO ────────────────────────────────────────────────────────────
    # Identity: Mythological Beast Worship — four beasts, four different effects.
    # Kaichi = pierce damage (homing horn), Reiki = defense + counter trap,
    # Kirin = pain resistance (high DR, his signature nullifier),
    # Ryu = his big damage + debuff. Niche: Tactical all-rounder.
    Character(
        name="Takuma Ino",
        description="Mythological Beast Worship — internalizes the powers of legendary beasts: Kaichi, Reiki, Kirin, and Ryu.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/9/9a/Takuma_Ino_%28Anime_2%29.png/revision/latest?cb=20231124134442",
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
                  "Manifests Kirin's intracerebral doping — completely nullifies pain. Gains 25 damage reduction for 2 turns.",
                  cost=["white", "black"], classes=["Strategic", "Action"], cooldown=3,
                  target=Target.SELF,
                  effects=[reduce(25, 2)]),
            Skill("Ryu: Dragon Crush",
                  "Manifests Ryu's full power — a crushing dragon strike. Deals 45 damage and weakens enemy by 20 for 2 turns.",
                  cost=["blue", "green", "blue"], classes=["Energy", "Instant"], cooldown=4,
                  effects=[damage(45), weaken(20, 2)]),
        ]
    ),

    # ── ARATA NITTA ───────────────────────────────────────────────────────────
    # Identity: Pain Killer — halts injury progression but cannot fully heal.
    # In gameplay: DR without healing. His technique is purely defensive.
    # Added a basic attack (he does fight) and a full stabilize option.
    # Niche: Pure damage mitigation support. The most defensive char in the game.
    Character(
        name="Arata Nitta",
        description="Pain Killer technique — halts all injury progression on allies. Cannot heal, but prevents wounds from getting worse.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/3/33/Arata_Nitta_%28Anime%29.png/revision/latest?cb=20231207183844",
        skills=[
            Skill("Pain Killer",
                  "Halts all injury progression on an ally. Ally gains 20 damage reduction for 2 turns.",
                  cost=["white"], classes=["Strategic", "Action"], cooldown=1,
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
                  "Targets a vital point with surgical accuracy. Deals 15 piercing damage.",
                  cost=["black"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[pierce(15)]),
        ]
    ),

    # ─────────────────────────────────────────────
    #  KYOTO JUJUTSU HIGH
    # ─────────────────────────────────────────────

    # ── AOI TODO ──────────────────────────────────────────────────────────────
    # Identity: Boogie Woogie (position swap by clapping). In game terms, Boogie
    # Woogie is a stun (disrupts enemy action), while the follow-up Disorienting
    # Swap debuffs them. Best Friend is Todo's synergy skill — empowers the next
    # ally skill. Niche: Disruptive control + physical bruiser.
    Character(
        name="Aoi Todo",
        description="Grade 1 with overwhelming strength and Boogie Woogie — claps hands to swap positions, completely disrupting enemies.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/7/79/Aoi_Todo_%28Anime%29.png/revision/latest?cb=20240621022047",
        skills=[
            Skill("Boogie Woogie",
                  "Claps hands — swaps the enemy's position mid-action. Stuns the enemy for 1 turn.",
                  cost=["red", "black"], classes=["Bloodline", "Instant"], cooldown=1,
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
                  "Imagines fighting alongside his best friend — doubles the rhythm. Gains 20 bonus damage for 3 turns.",
                  cost=["white", "green"], classes=["Strategic", "Action"], cooldown=3,
                  target=Target.SELF, effects=[strengthen(20, 3)]),
        ]
    ),

    # ── MAKI ZENIN ────────────────────────────────────────────────────────────
    # Identity: Heavenly Restriction — zero cursed energy, superhuman body.
    # She uses cursed tools because she can't use techniques.
    # Dragon-Bone absorbs force (damage reduction + boost for 1 turn, matches
    # how she counters and absorbs enemy strikes).
    # Heavenly Restriction activates her full potential — trap + DR.
    # Niche: Physical damage dealer + counter-trap.
    Character(
        name="Maki Zenin",
        description="Heavenly Restriction strips all cursed energy for a superhuman body. Masters every cursed tool in existence.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/2/2c/Maki_Zen%27in_%28Anime_4%29.png/revision/latest?cb=20251230144642",
        skills=[
            Skill("Playful Cloud",
                  "Three-section staff of the highest grade — deals 25 damage.",
                  cost=["green"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(25)]),
            Skill("Dragon-Bone",
                  "Absorbs the enemy's force and adds it to the next strike. Gains 10 damage reduction and 20 bonus damage for 1 turn.",
                  cost=["white"], classes=["Strategic", "Instant"], cooldown=1,
                  target=Target.SELF, effects=[reduce(10, 1), strengthen(20, 1)]),
            Skill("Split Soul Katana",
                  "A special-grade cursed tool that cuts the soul. Deals 30 piercing damage.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=2,
                  effects=[pierce(30)]),
            Skill("Heavenly Restriction: Peak Form",
                  "Activates full Heavenly Restriction — zero cursed energy, infinite physical potential. Gains 15 damage reduction for 3 turns; physical attackers take 20 counter-damage.",
                  cost=["red", "green"], classes=["Bloodline", "Action"], cooldown=4,
                  target=Target.SELF, effects=[reduce(15, 3), trap("ON_HARM", 20)]),
        ]
    ),

    # ── TOGE INUMAKI ─────────────────────────────────────────────────────────
    # Identity: Cursed Speech. His words ARE his techniques.
    # Each skill is a different command word. "Don't Move" = stun (1-pip, his
    # cheapest and most used). "Blast Away" = push damage. "Plummet" = AoE
    # gravitational. "Explode" = his big single-target affliction hit.
    # Throat Medicine = self-heal (because Cursed Speech damages him too).
    # Niche: Control/affliction specialist. Fragile but dangerous.
    Character(
        name="Toge Inumaki",
        description="Cursed Speech — his words carry cursed energy, forcing reality to obey. Every command is a technique.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/c/cb/Toge_Inumaki_%28Anime_2%29.png/revision/latest?cb=20240622024715",
        skills=[
            Skill("Don't Move",
                  "Commands the enemy to halt. Stuns for 1 turn.",
                  cost=["blue"], classes=["Energy", "Instant"], cooldown=1,
                  effects=[stun(1)]),
            Skill("Blast Away",
                  "Commands the enemy to be repelled. Deals 25 damage.",
                  cost=["blue", "blue"], classes=["Energy", "Instant"], cooldown=1,
                  effects=[damage(25)]),
            Skill("Explode",
                  "Commands the enemy's body to detonate from within. Deals 30 affliction damage.",
                  cost=["red", "blue"], classes=["Affliction", "Instant"], cooldown=2,
                  effects=[afflict(30)]),
            Skill("Throat Medicine",
                  "Soothes the damage Cursed Speech does to his own throat. Heals 25 HP.",
                  cost=["white", "black"], classes=["Strategic", "Instant"], cooldown=2,
                  target=Target.SELF, effects=[heal(25)]),
        ]
    ),

    # ── NORITOSHI KAMO ────────────────────────────────────────────────────────
    # Identity: Blood Manipulation. Controls his own blood as a weapon.
    # Flowing Red Scale = speed burst (strengthen). Convergence = his signature
    # high-speed sphere (pierce). Crimson Binding = the ensnaring stun + DoT.
    # Eight-Handled Sword Kumokiri = his massive ultimate.
    # Niche: Versatile bloodline fighter. Strong DoT + pierce combo.
    Character(
        name="Noritoshi Kamo",
        description="Blood Manipulation technique. Controls blood as projectiles, blades, and ensnaring binds.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/d/d5/Noritoshi_Kamo_(Anime).png/revision/latest?cb=20240620131805",
        skills=[
            Skill("Convergence",
                  "Compresses blood into a dense sphere fired at extreme speed. Deals 30 piercing damage.",
                  cost=["red", "black"], classes=["Bloodline", "Instant"], cooldown=1,
                  effects=[pierce(30)]),
            Skill("Crimson Binding",
                  "Hardens blood into ropes that ensnare the enemy. Stuns for 1 turn and applies 10 affliction damage per turn for 2 turns.",
                  cost=["red", "blue"], classes=["Bloodline", "Action"], cooldown=2,
                  effects=[stun(1), dot(10, 2)]),
            Skill("Flowing Red Scale: Surge",
                  "Floods adrenaline into his body through blood manipulation. Deals 20 damage and gains 20 bonus damage for 2 turns.",
                  cost=["red", "black"], classes=["Bloodline", "Instant"], cooldown=1,
                  effects=[damage(20), strengthen(20, 2)]),
            Skill("Eight-Handled Sword: Kumokiri",
                  "Summons the divine shikigami of blood. Deals 45 damage and 10 affliction damage per turn for 3 turns.",
                  cost=["red", "red", "blue"], classes=["Bloodline", "Action"], cooldown=4,
                  effects=[damage(45), dot(10, 3)]),
        ]
    ),

    # ── KASUMI MIWA ───────────────────────────────────────────────────────────
    # Identity: New Shadow Style iaijutsu — the Batto Sword Draw is her
    # signature: a single unsheathing strike. Simple Domain is her counter
    # to domain expansions (stun). Three Flashes = multi-strike combo.
    # Niche: Fast physical striker + anti-domain counter.
    Character(
        name="Kasumi Miwa",
        description="New Shadow Style iaijutsu. A single Batto Sword Draw can end a fight instantly. Simple Domain counters any Domain Expansion.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/6/64/Kasumi_Miwa_(Anime).png/revision/latest?cb=20240621021537",
        skills=[
            Skill("Batto Sword Draw",
                  "A single iaijutsu draw — before the enemy can react. Deals 25 damage.",
                  cost=["green"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(25)]),
            Skill("Three-Flash Consecutive Sword Draw",
                  "Three rapid-fire draw-and-sheath strikes in succession. Deals 35 damage.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=1,
                  effects=[damage(35)]),
            Skill("Simple Domain",
                  "Deploys a miniature domain that neutralizes incoming cursed techniques. Stuns the attacker for 1 turn.",
                  cost=["white", "blue"], classes=["Strategic", "Instant"], cooldown=2,
                  effects=[stun(1)]),
            Skill("New Shadow Style: Zero Draw",
                  "A perfect draw that erases all momentum. Deals 40 damage and becomes invulnerable for 1 turn.",
                  cost=["green", "green", "black"], classes=["Physical", "Instant"], cooldown=4,
                  effects=[damage(40), invuln(1, Target.SELF)]),
        ]
    ),

    # ── MAI ZENIN ─────────────────────────────────────────────────────────────
    # Identity: Construction technique — creates one bullet from nothing per day.
    # This is represented as a charged-shot mechanic: Construction builds up
    # a special bullet (strengthen), then the follow-up does extra damage.
    # Niche: Setup + payoff marksman. Low base damage but Construction makes
    # her next shot devastating.
    Character(
        name="Mai Zenin",
        description="Construction technique — creates one object from nothing per day. She uses it to conjure a perfect cursed bullet.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/8/86/Mai_Zen%27in_(Anime_4).png/revision/latest?cb=20260122164350",
        skills=[
            Skill("Revolver Shot",
                  "Standard cursed energy bullet. Deals 15 damage.",
                  cost=["black"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(15)]),
            Skill("Construction: Special Bullet",
                  "Creates one perfect bullet from nothing. Gains 25 bonus damage for 2 turns.",
                  cost=["red", "black"], classes=["Bloodline", "Action"], cooldown=2,
                  target=Target.SELF, effects=[strengthen(25, 2)]),
            Skill("Rapid Fire",
                  "Empties the revolver. Deals 15 damage to all enemies.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=2,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.DAMAGE, value=15, target=Target.ENEMIES)]),
            Skill("Construction: Armor-Piercing Round",
                  "The constructed bullet ignores all defenses — forged to pierce the soul. Deals 30 affliction damage.",
                  cost=["red", "green", "black"], classes=["Bloodline", "Instant"], cooldown=3,
                  effects=[afflict(30)]),
        ]
    ),

    # ── UTAHIME IORI ─────────────────────────────────────────────────────────
    # Identity: Solo Forbidden Area amplifies allies' cursed energy.
    # In Naruto Arena terms, this is a damage buff for allies — stacking use.
    # Her unique design: every buff skill has a different scope (single/AoE).
    # She DOES fight (she's a grade 1 sorcerer) so a basic attack is included.
    # Niche: Pure support buffer. Best with physical/energy heavy teams.
    Character(
        name="Utahime Iori",
        description="Solo Forbidden Area — a ritual performance that continuously amplifies all allies' cursed energy output.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/b/b0/Utahime_Iori_%28Anime_2%29.png/revision/latest?cb=20231124133701",
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
                  "Begins the ritual chant — all allies gain 15 bonus damage for 2 turns.",
                  cost=["white", "blue"], classes=["Strategic", "Action"], cooldown=2,
                  target=Target.ALLIES,
                  effects=[strengthen(15, 2, Target.ALLIES)]),
            Skill("Solo Forbidden Area",
                  "Full ritual performance — resonates cursed energy across the entire team. All allies gain 30 bonus damage for 2 turns.",
                  cost=["white", "white", "white"], classes=["Strategic", "Action"], cooldown=4,
                  target=Target.ALLIES,
                  effects=[strengthen(30, 2, Target.ALLIES)]),
        ]
    ),

    # ── YOSHINOBU GAKUGANJI ───────────────────────────────────────────────────
    # Identity: Converts his electric guitar's sound waves into cursed energy.
    # Attacks at range without direct contact — the sound IS the weapon.
    # His AoE is cheaper than single-target (sound hits everything).
    # Maximum Feedback is his amp-at-11 finisher. Niche: AoE sound attacker.
    Character(
        name="Yoshinobu Gakuganji",
        description="Converts electric guitar sound waves into cursed energy shockwaves. Attacks without direct contact — the music is the weapon.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/3/3c/Yoshinobu_Gakuganji_%28Anime%29.png/revision/latest?cb=20201025154546",
        skills=[
            Skill("Guitar Shockwave",
                  "Sound wave strikes one target. Deals 25 damage.",
                  cost=["blue", "black"], classes=["Energy", "Instant"], cooldown=0,
                  effects=[damage(25)]),
            Skill("Cursed Resonance",
                  "Wide sound wave that engulfs all enemies. Deals 20 damage to all enemies.",
                  cost=["blue", "blue"], classes=["Energy", "Instant"], cooldown=1,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.DAMAGE, value=20, target=Target.ENEMIES)]),
            Skill("Feedback Loop",
                  "Sound waves build on each other for 3 turns. Deals 10 affliction damage per turn to all enemies.",
                  cost=["blue", "white"], classes=["Energy", "Action"], cooldown=3,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.DOT, value=10, turns=3, target=Target.ENEMIES)]),
            Skill("Maximum Feedback",
                  "Cranks the amp to maximum — a devastating sound burst. Deals 45 damage and stuns for 1 turn.",
                  cost=["blue", "blue", "black"], classes=["Energy", "Instant"], cooldown=4,
                  effects=[damage(45), stun(1)]),
        ]
    ),

    # ── MOMO NISHIMIYA ────────────────────────────────────────────────────────
    # Identity: Aerial recon + Tool Manipulation (broomstick flight + wind blades).
    # Recon grants the team info advantage (DR). Wind Sickle = single precision
    # hit. Kamaitachi = AoE wind. Her broomstick makes her hard to catch —
    # reflected as a self-invuln. Niche: Support/AoE hybrid. Aerial mobility.
    Character(
        name="Momo Nishimiya",
        description="Broomstick flight and Tool Manipulation. Aerial recon and wind blades make her both scout and attacker.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/9/98/Momo_Nishimiya_%28Anime%29.png/revision/latest?cb=20240621021443",
        skills=[
            Skill("Broomstick Recon",
                  "Surveys the battlefield from above. All allies gain 15 damage reduction for 1 turn.",
                  cost=["white", "black"], classes=["Strategic", "Action"], cooldown=1,
                  target=Target.ALLIES,
                  effects=[all_ally_reduce(15, 1)]),
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
                  cost=["black"], classes=["Strategic", "Instant"], cooldown=3,
                  target=Target.SELF,
                  effects=[invuln(1)]),
        ]
    ),

    # ─────────────────────────────────────────────
    #  OTHER SORCERERS
    # ─────────────────────────────────────────────

    # ── MEI MEI ───────────────────────────────────────────────────────────────
    # Identity: Black Bird Manipulation + mercenary mindset.
    # Bird Strike is her signature — the crow SUICIDE BOMBS the target for
    # massive damage (this is canon — she sacrifices a crow for a guaranteed
    # hit). Represented as affliction (unstoppable). Crows provide scouting
    # (weaken = she found your weakness). Niche: Crow controller + burst damage.
    Character(
        name="Mei Mei",
        description="Grade 1 mercenary. Black Bird Manipulation commands crows — including using them as suicide bombs for guaranteed kills.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/a/a8/Mei_Mei_(Anime_2).png/revision/latest?cb=20231124134449",
        skills=[
            Skill("Crow Flock",
                  "Sends a flock of crows to harry the enemy. Deals 20 damage and weakens by 10 for 2 turns.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(20), weaken(10, 2)]),
            Skill("Avid Mercenary",
                  "Motivated by money — fights at peak efficiency. Gains 20 bonus damage for 2 turns.",
                  cost=["white", "black"], classes=["Strategic", "Action"], cooldown=2,
                  target=Target.SELF, effects=[strengthen(20, 2)]),
            Skill("Dive Bomb",
                  "Commands a crow to dive bomb — high speed, guaranteed to hit. Deals 30 piercing damage.",
                  cost=["blue", "blue"], classes=["Energy", "Instant"], cooldown=1,
                  effects=[pierce(30)]),
            Skill("Bird Strike: Suicide Bomb",
                  "Sacrifices a crow — it detonates at point blank range. Cannot be blocked or evaded. Deals 40 affliction damage.",
                  cost=["blue", "blue", "black"], classes=["Affliction", "Instant"], cooldown=3,
                  effects=[afflict(40)]),
        ]
    ),

    # ── NAOBITO ZENIN ─────────────────────────────────────────────────────────
    # Identity: Projection Sorcery — maps 24-frame animation frames onto a
    # surface. Anything outside those frames is frozen (stunned). He is the
    # fastest special grade after Gojo. His stun is his identity.
    # Full Burst = evade + empower. 1/24 Frames = multi-strike pierce.
    # Niche: Speed-based stun control + pierce damage.
    Character(
        name="Naobito Zenin",
        description="Projection Sorcery maps 24-frame animations onto surfaces. Anything outside the frames is paralyzed. Fastest special grade after Gojo.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/1/17/Naobito_Zenin_%28Anime_2%29.png/revision/latest?cb=20230903191639",
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
                  "Moves within a single animation frame — literally faster than thought. Deals 35 piercing damage.",
                  cost=["red", "green"], classes=["Bloodline", "Instant"], cooldown=2,
                  effects=[pierce(35)]),
            Skill("Speed of Flash: Full Burst",
                  "Unleashes full Projection Sorcery speed — evades all attacks. Becomes invulnerable for 1 turn and gains 15 bonus damage for 2 turns.",
                  cost=["red", "red", "green"], classes=["Bloodline", "Action"], cooldown=4,
                  target=Target.SELF, effects=[invuln(1), strengthen(15, 2)]),
        ]
    ),

    # ── TOJI FUSHIGURO ────────────────────────────────────────────────────────
    # Identity: Heavenly Restriction — zero cursed energy, superhuman physicality.
    # Inverted Spear of Heaven NULLIFIES all cursed techniques — affliction.
    # He stores curse spirits in his body (Jinx) — reflected as a trap.
    # Playful Cloud is his 3-section staff — his most powerful weapon.
    # Niche: Anti-technique physical assassin. Hard counters cursed energy users.
    Character(
        name="Toji Fushiguro",
        description="Sorcerer Killer. Heavenly Restriction strips all cursed energy for peak human physique. Carries cursed tools and spirits as his arsenal.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/d/db/Toji_Fushiguro_%28Anime%29.png/revision/latest?cb=20250726005401",
        skills=[
            Skill("Inverted Spear of Heaven",
                  "A cursed tool that nullifies all cursed techniques on contact. Deals 25 affliction damage, bypassing all defenses.",
                  cost=["black", "green"], classes=["Physical", "Instant"], cooldown=1,
                  effects=[afflict(25)]),
            Skill("Jinx: Worm Release",
                  "Releases the Jinx curse — a worm that latches onto and weathers the enemy. Deals 15 damage and applies 15 affliction damage per turn for 2 turns.",
                  cost=["red", "black"], classes=["Affliction", "Action"], cooldown=2,
                  effects=[damage(15), dot(15, 2)]),
            Skill("Heavenly Restriction: Peak Body",
                  "Activates full Heavenly Restriction — peak human body with zero cursed energy interference. Gains 20 bonus damage and 15 damage reduction for 2 turns.",
                  cost=["red", "green"], classes=["Bloodline", "Action"], cooldown=3,
                  target=Target.SELF, effects=[strengthen(20, 2), reduce(15, 2)]),
            Skill("Playful Cloud: Finisher",
                  "The highest-grade non-cursed tool — three devastating strikes. Deals 50 damage.",
                  cost=["green", "green", "black"], classes=["Physical", "Instant"], cooldown=4,
                  effects=[damage(50)]),
        ]
    ),

    # ── YUKI TSUKUMO ─────────────────────────────────────────────────────────
    # Identity: Star Rage — adds virtual mass to crush opponents with gravity.
    # Can apply it to herself or her shikigami Garuda.
    # Garuda DoT = Garuda continuously crushing enemies.
    # Anti-Gravity is her ultimate — mass-based shockwave. Niche: Slow but
    # crushing damage. High burst + DoT pressure.
    Character(
        name="Yuki Tsukumo",
        description="Special grade sorcerer. Star Rage adds virtual mass to anything she touches — including herself — for crushing gravitational attacks.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/2/22/Yuki_Tsukumo_%28Anime_3%29.png/revision/latest?cb=20251230190559",
        skills=[
            Skill("Star Rage: Impact",
                  "Adds virtual mass to her fist — crushing blow. Deals 25 damage.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(25)]),
            Skill("Star Rage: Slam",
                  "Concentrates virtual mass into a single point — a shattering strike. Deals 35 piercing damage.",
                  cost=["red", "black"], classes=["Bloodline", "Instant"], cooldown=1,
                  effects=[pierce(35)]),
            Skill("Garuda: Continuous Crush",
                  "Commands shikigami Garuda to apply Star Rage continuously. All enemies take 10 affliction damage per turn for 3 turns.",
                  cost=["white", "blue"], classes=["Strategic", "Action"], cooldown=3,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.DOT, value=10, turns=3, target=Target.ENEMIES)]),
            Skill("Anti-Gravity: Open to All",
                  "Releases Star Rage in all directions — gravitational shockwave. Deals 25 damage to all enemies and stuns for 1 turn.",
                  cost=["red", "red", "blue"], classes=["Bloodline", "Instant"], cooldown=4,
                  target=Target.ENEMIES,
                  effects=[Effect(EffectKind.DAMAGE, value=25, target=Target.ENEMIES), stun(1)]),
        ]
    ),

    # ── KUSAKABE ──────────────────────────────────────────────────────────────
    # Identity: New Shadow Style veteran swordsman + Simple Domain. Unlike Miwa,
    # Kusakabe is a pragmatic grade 1 — his kit is efficient and hard to disrupt.
    # Veteran's Resolve = the counter trap that reflects his experience.
    # Niche: Durable physical damage dealer with counter mechanic.
    Character(
        name="Kusakabe",
        description="Grade 1 New Shadow Style swordsman. Pragmatic, efficient, and hardened. Simple Domain neutralizes any Domain Expansion.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/9/9f/Atsuya_Kusakabe_(Anime_2).png/revision/latest?cb=20231124131252",
        skills=[
            Skill("Sword Draw",
                  "A precise draw-and-strike. Deals 20 damage.",
                  cost=["green"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(20)]),
            Skill("New Shadow Style: Batto",
                  "Lightning-fast draw that leaves no opening. Deals 30 damage.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=1,
                  effects=[damage(30)]),
            Skill("Simple Domain",
                  "Deploys a Simple Domain that neutralizes incoming techniques. Stuns the attacker for 1 turn.",
                  cost=["white", "blue"], classes=["Strategic", "Instant"], cooldown=2,
                  effects=[stun(1)]),
            Skill("Veteran's Resolve",
                  "The experience of countless battles — stance that counters any attack. Gains 20 damage reduction for 2 turns; attackers take 15 counter-damage.",
                  cost=["white", "green"], classes=["Strategic", "Action"], cooldown=3,
                  target=Target.SELF, effects=[reduce(20, 2), trap("ON_HARM", 15)]),
        ]
    ),

    # ── KOKICHI MUTA (MECHAMARU) ──────────────────────────────────────────────
    # Identity: Remote-controlled Mechamaru puppet body.
    # Heavenly Restriction gives him enormous cursed energy reserves — stored
    # for 17 years in his immobile body. Mode: Absolute is the payoff of all
    # that stored energy. Ultra Cannon, Ultra Spin, Mode: Albatross are the
    # escalating power levels of his puppet. Niche: Escalating energy attacker.
    Character(
        name="Kokichi Muta",
        description="Heavenly Restriction stores 17 years of cursed energy in his immobile body. Remotely pilots Mechamaru with overwhelming power.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/e/ea/Kokichi_Muta_%28Anime%29.png/revision/latest?cb=20230903190822",
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
                  "Converts the entire puppet body into a weapon — unleashes 17 years of stored cursed energy at once. Deals 55 damage and stuns for 1 turn.",
                  cost=["blue", "blue", "blue"], classes=["Energy", "Instant"], cooldown=4,
                  effects=[damage(55), stun(1)]),
        ]
    ),

    # ── UI UI ─────────────────────────────────────────────────────────────────
    # Identity: Instantaneous long-range teleportation — he can teleport anyone
    # anywhere instantly. Offensive capability is almost zero.
    # Soul Swap = debuffs enemy after teleport disorientation.
    # His strength is saving allies — two different protection skills.
    # Niche: Pure escape/protection support. Keeps allies alive, not enemies dead.
    Character(
        name="Ui Ui",
        description="Instantaneous long-range teleportation. Can move anyone anywhere in an instant — nearly zero offensive power but unmatched ally protection.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/8/88/Ui_Ui_%28Anime%29.png/revision/latest?cb=20230911015234",
        skills=[
            Skill("Teleport: Evade",
                  "Teleports an ally away from danger in an instant. Ally becomes invulnerable for 1 turn.",
                  cost=["blue", "white"], classes=["Strategic", "Instant"], cooldown=1,
                  target=Target.ALLY, effects=[invuln(1, Target.ALLY)]),
            Skill("Teleport: Intercept",
                  "Teleports himself in front of an ally, taking the hit. Ally gains 30 damage reduction for 1 turn.",
                  cost=["white", "black"], classes=["Strategic", "Instant"], cooldown=2,
                  target=Target.ALLY, effects=[ally_reduce(30, 1)]),
            Skill("Disorienting Warp",
                  "Warps the enemy to a disorienting location. Enemy weakened by 25 for 2 turns and takes 15 affliction damage per turn for 2 turns.",
                  cost=["red", "blue", "white"], classes=["Strategic", "Instant"], cooldown=4,
                  effects=[weaken(25, 2), dot(15, 2)]),
            Skill("Desperate Punch",
                  "Ui Ui's last resort — a completely untrained punch. Deals 10 damage.",
                  cost=["black"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[damage(10)]),
        ]
    ),

    # ── MIGUEL ODUOL ─────────────────────────────────────────────────────────
    # Identity: Black Rope (an African cursed tool that negates cursed techniques
    # — literally stopped Gojo's Infinity) + Prayer Song technique.
    # Black Rope = weaken/DR negation (represented as weaken + the rope whip dmg).
    # Prayer Song buffs self + debuffs enemy. War Rhythm is his physical peak.
    # Niche: Anti-technique disruptor + physical bruiser.
    Character(
        name="Miguel Oduol",
        description="African sorcerer with the Black Rope — a cursed tool so powerful it negates even Gojo's Infinity. Prayer Song technique.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/8/8e/Miguel_%28Anime%29.png/revision/latest?cb=20211129042928",
        skills=[
            Skill("Black Rope Lash",
                  "Strikes with the cursed Black Rope — negates cursed energy on contact. Deals 20 piercing damage and weakens by 15 for 2 turns.",
                  cost=["green", "black"], classes=["Physical", "Instant"], cooldown=0,
                  effects=[pierce(20), weaken(15, 2)]),
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
                  cost=["green", "green", "blue"], classes=["Physical", "Instant"], cooldown=3,
                  effects=[damage(45)]),
        ]
    ),

    # ── MASTER TENGEN ─────────────────────────────────────────────────────────
    # Identity: Immortality (evolves every 500 years) + barrier techniques.
    # Maintains the barrier network across Japan. His defense is impenetrable.
    # Star Corridor = barrier used offensively. His unique trait is AoE team DR
    # (best in the game for it). Niche: Immortal barrier master. Pure protection.
    Character(
        name="Master Tengen",
        description="Immortal sorcerer over 1000 years old. Maintains Japan's barrier network through the Immortality technique that evolves every 500 years.",
        image_url="https://static.wikia.nocookie.net/jujutsu-kaisen/images/1/16/Tengen_%28Anime%29.png/revision/latest?cb=20251119121513",
        skills=[
            Skill("Barrier Pulse",
                  "Fires a compressed barrier as a projectile. Deals 20 piercing damage.",
                  cost=["blue", "black"], classes=["Energy", "Instant"], cooldown=0,
                  effects=[pierce(20)]),
            Skill("Barrier Reinforcement",
                  "Strengthens the barrier around all allies. All allies gain 20 damage reduction for 2 turns.",
                  cost=["white", "white"], classes=["Strategic", "Action"], cooldown=2,
                  target=Target.ALLIES, effects=[all_ally_reduce(20, 2)]),
            Skill("Pure Barrier",
                  "A perfect, absolute barrier — nothing can pass through. One ally becomes invulnerable for 1 turn.",
                  cost=["white", "white", "blue"], classes=["Strategic", "Instant"], cooldown=3,
                  target=Target.ALLY, effects=[invuln(1, Target.ALLY)]),
            Skill("Immortal Body",
                  "Over 1000 years of evolution — the body simply refuses to die. Heals 30 HP and becomes invulnerable for 1 turn.",
                  cost=["white", "red", "white"], classes=["Strategic", "Instant"], cooldown=4,
                  target=Target.SELF, effects=[heal(30), invuln(1)]),
        ]
    ),
]


def get_random_character(exclude: list = None) -> Character:
    pool = CHARACTERS
    if exclude:
        pool = [c for c in CHARACTERS if c.name not in exclude]
    if not pool:
        pool = CHARACTERS
    return random.choice(pool)
