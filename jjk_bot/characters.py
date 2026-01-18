from dataclasses import dataclass
from typing import List

@dataclass
class Character:
    name: str
    tier: str
    score: int

CHARACTERS = [
    # S Tier (10 points)
    Character("Gojo Satoru", "S", 10),
    Character("Ryomen Sukuna", "S", 10),

    # A Tier (8 points)
    Character("Yuta Okkotsu", "A", 8),
    Character("Kenjaku", "A", 8),
    Character("Toji Fushiguro", "A", 8),
    Character("Suguru Geto", "A", 8),
    Character("Mahoraga", "A", 8),

    # B Tier (6 points)
    Character("Hakari Kinji", "B", 6),
    Character("Maki Zenin", "B", 6),
    Character("Choso", "B", 6),
    Character("Jogo", "B", 6),
    Character("Mahito", "B", 6),
    Character("Hanami", "B", 6),
    Character("Kento Nanami", "B", 6),

    # C Tier (4 points)
    Character("Yuji Itadori", "C", 4),
    Character("Megumi Fushiguro", "C", 4),
    Character("Nobara Kugisaki", "C", 4),
    Character("Todo Aoi", "C", 4),
    Character("Mei Mei", "C", 4),
    Character("Naoya Zenin", "C", 4),
    Character("Dagon", "C", 4),

    # D Tier (2 points)
    Character("Panda", "D", 2),
    Character("Toge Inumaki", "D", 2),
    Character("Kasumi Miwa", "D", 2),
    Character("Mai Zenin", "D", 2),
    Character("Momo Nishimiya", "D", 2),
]

def get_random_character() -> Character:
    import random
    return random.choice(CHARACTERS)
