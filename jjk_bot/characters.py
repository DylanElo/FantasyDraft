from dataclasses import dataclass, field
from typing import List
import random

@dataclass
class Skill:
    name: str
    description: str
    cooldown: str
    energy: List[str] # e.g. ["black", "blue", "none"]
    classes: str # e.g. "Physical,Instant"

@dataclass
class Character:
    name: str
    description: str
    image_url: str
    skills: List[Skill] = field(default_factory=list)


CHARACTERS = [
    Character(
        name="Satoru Gojo",
        description="The strongest jujutsu sorcerer in the world. He possesses both the Limitless cursed technique and the Six Eyes.",
        image_url="https://i.imgur.com/K1iZJqP.jpeg",
        skills=[
            Skill(name="Cursed Technique Lapse: Blue", description="Gojo creates a vacuum that pulls in everything around it, dealing 20 damage to an enemy and stunning them for 1 turn.", cooldown="1", energy=["blue", "random"], classes="Strategic,Instant"),
            Skill(name="Cursed Technique Reversal: Red", description="Gojo creates a repelling force, dealing 35 damage to one enemy. This ignores damage reduction.", cooldown="2", energy=["red", "red"], classes="Physical,Instant"),
            Skill(name="Hollow Technique: Purple", description="Gojo combines Blue and Red to erase everything in its path, dealing 60 damage to one enemy. If the enemy dies, they cannot be resurrected.", cooldown="4", energy=["blue", "red", "black"], classes="Ninjutsu,Instant"),
            Skill(name="Infinity", description="Gojo becomes completely invulnerable to all damage and negative effects for 1 turn. While active, he cannot use 'Hollow Technique: Purple'.", cooldown="3", energy=["white"], classes="Mental,Instant")
        ]
    ),
    Character(
        name="Ryomen Sukuna",
        description="The undisputed King of Curses. An immensely powerful cursed spirit from the Heian Era.",
        image_url="https://i.imgur.com/6U6z9fG.jpeg",
        skills=[
            Skill(name="Dismantle", description="Sukuna sends a slashing attack at his target, dealing 25 damage to one enemy. This deals an additional 10 damage to summoned entities.", cooldown="None", energy=["black"], classes="Physical,Instant"),
            Skill(name="Cleave", description="Sukuna adjusts the strength of his slash to the target's toughness, dealing 30 damage that ignores invulnerability.", cooldown="1", energy=["black", "random"], classes="Physical,Instant"),
            Skill(name="Malevolent Shrine", description="Sukuna opens his Domain, applying 'Shrine' to all enemies. While 'Shrine' is active, all enemies take 15 damage at the start of their turn for 3 turns.", cooldown="4", energy=["black", "red", "white"], classes="Strategic,Action"),
            Skill(name="Fire Arrow", description="Sukuna unleashes a devastating arrow of flames. Deals 40 damage to one enemy. If 'Malevolent Shrine' is active, this deals 70 damage instead.", cooldown="2", energy=["red", "random", "random"], classes="Ninjutsu,Instant")
        ]
    ),
    Character(
        name="Yuta Okkotsu",
        description="A special grade jujutsu sorcerer who possesses immense cursed energy and is accompanied by the vengeful cursed spirit Rika.",
        image_url="https://i.imgur.com/5V3wKzH.jpeg",
        skills=[
            Skill(name="Katana Strike", description="Yuta strikes the enemy with his katana infused with cursed energy, dealing 15 damage. If 'Rika Manifestation' is active, this deals 25 damage instead.", cooldown="None", energy=["green"], classes="Physical,Instant"),
            Skill(name="Cursed Speech", description="Yuta uses a copied cursed technique to command his target. The target enemy is stunned for 1 turn.", cooldown="2", energy=["blue"], classes="Mental,Instant"),
            Skill(name="Reverse Cursed Technique", description="Yuta uses positive energy to heal. Restores 30 health to one allied character or himself.", cooldown="1", energy=["white", "random"], classes="Strategic,Instant"),
            Skill(name="Rika Manifestation", description="Yuta fully manifests Rika for 3 turns. During this time, he gains 15 damage reduction, his skills are enhanced, and he reflects 10 damage back to attackers.", cooldown="4", energy=["black", "green", "random"], classes="Strategic,Action")
        ]
    ),
    Character(
        name="Megumi Fushiguro",
        description="A grade 2 jujutsu sorcerer and descendant of the Zenin Clan, using the Ten Shadows Technique.",
        image_url="https://i.imgur.com/placeholder.png",
        skills=[
            Skill(name="Divine Dogs", description="Megumi summons his Divine Dogs to attack, dealing 20 damage to one enemy. This skill costs 1 less energy if a summon is already active.", cooldown="None", energy=["green", "random"], classes="Physical,Instant"),
            Skill(name="Nue", description="Megumi summons Nue, shocking one enemy for 15 damage and stunning them for 1 turn.", cooldown="1", energy=["blue", "green"], classes="Ninjutsu,Instant"),
            Skill(name="Toad", description="Megumi summons a Toad to protect an ally. The target ally becomes invulnerable to the next enemy skill.", cooldown="2", energy=["green", "random"], classes="Strategic,Instant"),
            Skill(name="Chimera Shadow Garden", description="Megumi expands his incomplete Domain. For 3 turns, all of Megumi's skills cost 1 random energy less, and he deals an extra 10 damage with every attack.", cooldown="4", energy=["black", "green", "random", "random"], classes="Strategic,Action")
        ]
    ),
    Character(
        name="Yuji Itadori",
        description="A physically gifted high school student who became the vessel of Ryomen Sukuna.",
        image_url="https://i.imgur.com/placeholder.png",
        skills=[
            Skill(name="Martial Arts", description="Yuji uses his incredible physical prowess to strike an enemy, dealing 20 damage.", cooldown="None", energy=["green"], classes="Physical,Instant"),
            Skill(name="Divergent Fist", description="Yuji strikes an enemy, dealing 15 damage. The enemy receives an additional 15 damage at the start of their next turn.", cooldown="1", energy=["black", "random"], classes="Physical,Instant"),
            Skill(name="Black Flash", description="Yuji unleashes a strike with a spatial distortion, dealing 45 damage to one enemy. This skill has a 25% chance to cost 0 energy.", cooldown="2", energy=["black", "green", "random"], classes="Physical,Instant"),
            Skill(name="Unyielding Resolve", description="Yuji's sheer willpower keeps him fighting. For 2 turns, any damage that would reduce Yuji's health below 1 instead leaves him at 1 health.", cooldown="3", energy=["white", "random"], classes="Mental,Instant")
        ]
    ),
    Character(
        name="Nobara Kugisaki",
        description="A confident grade 3 jujutsu sorcerer who uses a hammer, nails, and straw dolls for her Straw Doll Technique.",
        image_url="https://i.imgur.com/placeholder.png",
        skills=[
            Skill(name="Nail Toss", description="Nobara throws cursed energy-infused nails, dealing 15 damage to one enemy.", cooldown="None", energy=["random"], classes="Physical,Instant"),
            Skill(name="Hairpin", description="Nobara detonates her cursed energy. Deals 25 damage to an enemy. If 'Nail Toss' was used on the target last turn, this deals 15 additional damage.", cooldown="1", energy=["red", "random"], classes="Ninjutsu,Instant"),
            Skill(name="Resonance", description="Nobara strikes her straw doll. Deals 30 damage to one enemy and ignores invulnerability and damage reduction.", cooldown="2", energy=["black", "red"], classes="Ninjutsu,Instant"),
            Skill(name="Straw Doll Connection", description="Nobara links herself to an enemy for 2 turns. Any damage Nobara takes is also dealt to the linked enemy.", cooldown="3", energy=["black", "white"], classes="Strategic,Instant")
        ]
    ),
    Character(
        name="Maki Zenin",
        description="A student with a Heavenly Restriction that grants her immense physical strength in exchange for having no cursed energy.",
        image_url="https://i.imgur.com/placeholder.png",
        skills=[
            Skill(name="Playful Cloud", description="Maki strikes with her three-section staff, dealing 25 damage to one enemy.", cooldown="None", energy=["green", "random"], classes="Physical,Instant"),
            Skill(name="Dragon-Bone", description="Maki absorbs force to unleash it. She gains 10 damage reduction this turn, and her next attack deals 15 additional damage.", cooldown="1", energy=["white"], classes="Strategic,Instant"),
            Skill(name="Split Soul Katana", description="Maki slashes her target, dealing 30 damage. This attack reduces the target's maximum health by the damage dealt.", cooldown="2", energy=["black", "green"], classes="Physical,Instant"),
            Skill(name="Heavenly Restriction", description="Maki's physical senses peak. For 3 turns, she evades all non-Physical skills and counter-attacks any Physical skills aimed at her for 15 damage.", cooldown="3", energy=["white", "green", "random"], classes="Physical,Action")
        ]
    ),
    Character(
        name="Toge Inumaki",
        description="A semi-grade 1 jujutsu sorcerer and descendant of the Inumaki clan who uses Cursed Speech.",
        image_url="https://i.imgur.com/placeholder.png",
        skills=[
            Skill(name="Don't Move", description="Toge commands an enemy to halt, stunning them for 1 turn. Toge takes 5 damage in recoil.", cooldown="1", energy=["blue"], classes="Mental,Instant"),
            Skill(name="Blast Away", description="Toge unleashes a shockwave, dealing 25 damage to one enemy. Toge takes 10 damage in recoil.", cooldown="1", energy=["blue", "random"], classes="Ninjutsu,Instant"),
            Skill(name="Plummet", description="Toge creates an intense gravitational force, dealing 15 damage to all enemies. Toge takes 15 damage in recoil.", cooldown="2", energy=["blue", "black"], classes="Ninjutsu,Instant"),
            Skill(name="Throat Medicine", description="Toge drinks cough syrup to soothe his throat, restoring 25 health to himself and curing all negative effects.", cooldown="2", energy=["white", "random"], classes="Strategic,Instant")
        ]
    ),
    Character(
        name="Kento Nanami",
        description="A grade 1 jujutsu sorcerer who uses the Ratio Technique to divide his target with a 7:3 ratio to create a weak spot.",
        image_url="https://i.imgur.com/placeholder.png",
        skills=[
            Skill(name="Blunt Strike", description="Nanami strikes the enemy with his wrapped cleaver, dealing 20 damage.", cooldown="None", energy=["green"], classes="Physical,Instant"),
            Skill(name="Ratio Technique: 7:3", description="Nanami forcibly creates a weak spot. For 2 turns, all damage dealt to the target enemy is increased by 15.", cooldown="1", energy=["black"], classes="Strategic,Instant"),
            Skill(name="Collapse", description="Nanami strikes the ground to destroy the environment. Deals 20 damage to all enemies. If a target has a '7:3' weak spot, they are stunned for 1 turn.", cooldown="2", energy=["green", "black"], classes="Physical,Instant"),
            Skill(name="Overtime", description="Nanami unleashes his restricted cursed energy. For 3 turns, all of his skills deal double damage.", cooldown="4", energy=["white", "random", "random"], classes="Strategic,Action")
        ]
    ),
    Character(
        name="Aoi Todo",
        description="A grade 1 jujutsu sorcerer from Kyoto High who possesses immense physical strength and the Boogie Woogie technique.",
        image_url="https://i.imgur.com/placeholder.png",
        skills=[
            Skill(name="Crushing Blow", description="Todo delivers a heavy punch, dealing 25 damage to one enemy.", cooldown="None", energy=["green", "random"], classes="Physical,Instant"),
            Skill(name="Boogie Woogie", description="Todo claps his hands to swap positions. One target ally swaps places with another, removing all negative effects from both and evading all attacks aimed at them this turn.", cooldown="1", energy=["blue", "random"], classes="Strategic,Instant"),
            Skill(name="Disorienting Swap", description="Todo swaps places with the enemy right before attacking, confusing them. Deals 20 damage and makes the enemy's next skill cost 1 random energy more.", cooldown="1", energy=["green", "blue"], classes="Physical,Instant"),
            Skill(name="Best Friend", description="Todo fights alongside his 'brother'. For 3 turns, whenever an ally attacks, Todo performs a follow-up attack dealing 10 damage to the same target.", cooldown="3", energy=["white", "green"], classes="Strategic,Action")
        ]
    ),
    Character(
        name="Mahito",
        description="A special grade cursed spirit born from humanity's hatred and fear of each other.",
        image_url="https://i.imgur.com/placeholder.png",
        skills=[
            Skill(name="Soul Strike", description="Mahito attacks the enemy's soul directly, dealing 20 damage. This damage cannot be healed.", cooldown="None", energy=["black", "random"], classes="Ninjutsu,Instant"),
            Skill(name="Idle Transfiguration", description="Mahito alters the shape of the enemy's soul. Deals 30 damage. If the target's health drops below 20%, they are instantly killed.", cooldown="2", energy=["black", "red"], classes="Ninjutsu,Instant"),
            Skill(name="Body Repel", description="Mahito manipulates his own soul to regenerate. He heals 25 health and removes all negative effects.", cooldown="1", energy=["white", "random"], classes="Strategic,Instant"),
            Skill(name="Self-Embodiment of Perfection", description="Mahito expands his Domain. For 3 turns, he becomes invulnerable, and 'Idle Transfiguration' targets all enemies and costs no energy.", cooldown="4", energy=["black", "red", "white", "random"], classes="Strategic,Action")
        ]
    ),
    Character(
        name="Jogo",
        description="A special grade cursed spirit born from the fear of the earth, possessing intense fire and lava abilities.",
        image_url="https://i.imgur.com/placeholder.png",
        skills=[
            Skill(name="Ember Bugs", description="Jogo summons explosive insects. Deals 15 damage to one enemy. The insects explode again next turn for 15 damage.", cooldown="None", energy=["red"], classes="Ninjutsu,Instant"),
            Skill(name="Disaster Flames", description="Jogo unleashes a torrent of fire, dealing 30 damage to one enemy and applying a burn that deals 10 damage for 2 turns.", cooldown="1", energy=["red", "random"], classes="Ninjutsu,Instant"),
            Skill(name="Maximum: Meteor", description="Jogo summons a massive fiery meteor. After 1 turn delay, deals 60 damage to all enemies. Enemies can spend 1 random energy to evade this.", cooldown="3", energy=["red", "red", "black"], classes="Ninjutsu,Action"),
            Skill(name="Coffin of the Iron Mountain", description="Jogo expands his Domain. For 3 turns, all enemies take 20 fire damage at the end of their turn, and all of Jogo's skills deal 10 extra damage.", cooldown="4", energy=["red", "black", "white"], classes="Strategic,Action")
        ]
    ),
    Character(
        name="Hanami",
        description="A special grade cursed spirit born from the fear of nature.",
        image_url="https://i.imgur.com/placeholder.png",
        skills=[
            Skill(name="Wooden Roots", description="Hanami attacks with roots, dealing 15 damage and healing Hanami for 15 health.", cooldown="None", energy=["green"], classes="Physical,Instant"),
            Skill(name="Cursed Buds", description="Hanami launches buds that drain energy. Deals 10 damage. The target loses 1 random energy and Hanami gains 1 random energy.", cooldown="1", energy=["green", "blue"], classes="Ninjutsu,Instant"),
            Skill(name="Flower Field", description="Hanami releases a scent that pacifies enemies. All enemies have their damage reduced by 50% for 2 turns.", cooldown="2", energy=["white", "random"], classes="Mental,Instant"),
            Skill(name="Ceremonial Sea of Light", description="Hanami expands a Domain of light. Deals 40 damage to one enemy and stuns them for 1 turn. This skill cannot be evaded.", cooldown="3", energy=["white", "green", "black"], classes="Ninjutsu,Action")
        ]
    ),
    Character(
        name="Choso",
        description="A Death Painting Womb who uses Blood Manipulation to protect his brothers.",
        image_url="https://i.imgur.com/placeholder.png",
        skills=[
            Skill(name="Slicing Exorcism", description="Choso forms a wheel of blood and hurls it. Deals 20 damage to one enemy and applies bleeding (5 damage per turn for 3 turns).", cooldown="None", energy=["red", "random"], classes="Physical,Instant"),
            Skill(name="Piercing Blood", description="Choso fires a highly pressurized beam of blood. Deals 35 damage to one enemy. This skill ignores all damage reduction and invulnerability.", cooldown="1", energy=["red", "black"], classes="Ninjutsu,Instant"),
            Skill(name="Supernova", description="Choso scatters blood orbs that detonate like buckshot. Deals 20 damage to all enemies.", cooldown="2", energy=["red", "red", "random"], classes="Ninjutsu,Instant"),
            Skill(name="Flowing Red Scale", description="Choso manipulates his blood to enhance his body. For 3 turns, he gains 15 damage reduction, and all his skills cost 1 random energy less.", cooldown="3", energy=["white", "red"], classes="Strategic,Action")
        ]
    )
]

def get_random_character() -> Character:
    return random.choice(CHARACTERS)
