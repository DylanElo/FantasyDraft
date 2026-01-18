from dataclasses import dataclass
from typing import List
import random

@dataclass
class Character:
    name: str
    tier: str
    score: int

CHARACTERS = [
    # S+ Tier (12 points)
    Character("Satoru Gojo", "S+", 12),
    Character("Ryomen Sukuna", "S+", 12),

    # S Tier (10 points)
    Character("Yuta Okkotsu", "S", 10),
    Character("Kenjaku", "S", 10),
    Character("Yuki Tsukumo", "S", 10),
    Character("Suguru Geto", "S", 10),

    # A Tier (8 points)
    Character("Yorozu", "A", 8),
    Character("Toji Fushiguro", "A", 8),
    Character("Maki Zenin (Awakened)", "A", 8),
    Character("Jogo", "A", 8),
    Character("Mahito", "A", 8),
    Character("Hajime Kashimo", "A", 8),
    Character("Kinji Hakari", "A", 8),
    Character("Uraume", "A", 8),
    Character("Ryu Ishigori", "A", 8),
    Character("Takako Uro", "A", 8),
    Character("Naoya Zenin (Cursed Spirit)", "A", 8),
    Character("Fumihiko Takaba", "A", 8),
    Character("Angel (Hana Kurusu)", "A", 8),

    # B Tier (6 points)
    Character("Choso", "B", 6),
    Character("Kento Nanami", "B", 6),
    Character("Aoi Todo", "B", 6),
    Character("Naobito Zenin", "B", 6),
    Character("Megumi Fushiguro", "B", 6),
    Character("Hiromi Higuruma", "B", 6),
    Character("Mei Mei", "B", 6),
    Character("Hanami", "B", 6),
    Character("Dagon", "B", 6),
    Character("Kokichi Muta (Mechamaru)", "B", 6),
    Character("Noritoshi Kamo", "B", 6),
    Character("Yuji Itadori", "B", 6),

    # C Tier (4 points)
    Character("Nobara Kugisaki", "C", 4),
    Character("Panda", "C", 4),
    Character("Momo Nishimiya", "C", 4),
    Character("Eso", "C", 4),
    Character("Kechizu", "C", 4),

    # D Tier (2 points)
    Character("Kasumi Miwa", "D", 2),
    Character("Mai Zenin", "D", 2),
    Character("Shoko Ieiri", "D", 2),
    Character("Utahime Iori", "D", 2),
    Character("Haruta Shigemo", "D", 2),
]

def get_random_character() -> Character:
    return random.choice(CHARACTERS)
