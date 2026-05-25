from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any

@dataclass
class Synergy:
    name: str
    description: str
    bonus_energy: Dict[str, int] = field(default_factory=dict)
    bonus_damage: int = 0
    bonus_affliction: int = 0
    immune_to_stun: bool = False
    physical_cost_reduction: int = 0
    hp_bonus: int = 0
    # Custom effect flags
    all_damage_bonus_while_alive: bool = False  # Tokyo First Years (+5 damage while all 3 alive)
    physical_immune_weaken: bool = False       # Heavenly Restriction
    todo_yuji_best_friends: bool = False       # Best Friends
    sorcerer_killers_pierce: bool = False      # Sorcerer Killers
    death_paintings_dot: bool = False          # Death Paintings
    black_flash_masters_reduction: bool = False # Black Flash Masters
    tokyo_faculty_dr: bool = False             # Tokyo Faculty
    jjk0_unit_yuta: bool = False               # JJK 0 Unit
    vessel_and_curse_soul_battle: bool = False # Vessel and Curse
    culling_game_energy: bool = False          # Culling Game Champions
    kyoto_alliance_discount: bool = False      # Kyoto Alliance
    blood_manipulation_upgrade: bool = False   # Blood Manipulation
    prison_realm_stun: bool = False            # Prison Realm

def matches_name(char_name: str, req: str) -> bool:
    name_lower = char_name.lower()
    req_lower = req.lower()
    return req_lower in name_lower

def is_villain(char_name: str) -> bool:
    villain_keywords = ["jogo", "hanami", "mahito", "choso", "geto", "kenjaku", "sukuna"]
    name_lower = char_name.lower()
    return any(kw in name_lower for kw in villain_keywords)

def check_synergies(team_names: List[str]) -> List[Synergy]:
    active = []
    
    # Helper sets/checks
    has_yuji = any(matches_name(n, "Yuji") for n in team_names)
    has_megumi = any(matches_name(n, "Megumi") for n in team_names)
    has_nobara = any(matches_name(n, "Nobara") for n in team_names)
    has_yuta_normal = any(matches_name(n, "Yuta Okkotsu") and "jjk 0" not in n.lower() and "sendai" not in n.lower() and "gojo" not in n.lower() for n in team_names)
    has_yuta_jjk0 = any("jjk 0" in n.lower() for n in team_names)
    has_yuta_any = any(matches_name(n, "Yuta") for n in team_names)
    has_toji = any(matches_name(n, "Toji") for n in team_names)
    has_maki = any(matches_name(n, "Maki") for n in team_names)
    has_gojo = any(matches_name(n, "Gojo") for n in team_names)
    has_yuki = any(matches_name(n, "Yuki") for n in team_names)
    has_hakari = any(matches_name(n, "Hakari") for n in team_names)
    has_mai = any(matches_name(n, "Mai") for n in team_names)
    has_naobito = any(matches_name(n, "Naobito") for n in team_names)
    has_todo = any(matches_name(n, "Todo") for n in team_names)
    has_jogo = any(matches_name(n, "Jogo") for n in team_names)
    has_hanami = any(matches_name(n, "Hanami") for n in team_names)
    has_mahito = any(matches_name(n, "Mahito") for n in team_names)
    has_miguel = any(matches_name(n, "Miguel") for n in team_names)
    has_choso = any(matches_name(n, "Choso") for n in team_names)
    has_nanami = any(matches_name(n, "Nanami") for n in team_names)
    has_shoko = any(matches_name(n, "Shoko") for n in team_names)
    has_yaga = any(matches_name(n, "Yaga") for n in team_names)
    has_mei_mei = any(matches_name(n, "Mei Mei") for n in team_names)
    has_sukuna = any(matches_name(n, "Sukuna") for n in team_names)
    has_kashimo = any(matches_name(n, "Kashimo") for n in team_names)
    has_higuruma = any(matches_name(n, "Higuruma") for n in team_names)
    has_hana = any(matches_name(n, "Hana") for n in team_names)
    has_momo = any(matches_name(n, "Momo") for n in team_names)
    has_noritoshi = any(matches_name(n, "Noritoshi") for n in team_names)
    has_miwa = any(matches_name(n, "Miwa") for n in team_names)
    has_gakuganji = any(matches_name(n, "Gakuganji") for n in team_names)
    has_utahime = any(matches_name(n, "Utahime") for n in team_names)
    has_kenjaku = any(matches_name(n, "Kenjaku") for n in team_names)

    # 1. Tokyo First Years
    if has_yuji and has_megumi and has_nobara:
        active.append(Synergy(
            name="Tokyo First Years",
            description="Start with 3 black energy; all damage +5 while all 3 alive.",
            bonus_energy={"black": 3},
            all_damage_bonus_while_alive=True
        ))

    # 2. Gojo's Favourites
    fav_count = sum([has_yuji, has_megumi, has_nobara, has_yuta_any])
    if fav_count >= 2:
        active.append(Synergy(
            name="Gojo's Favourites",
            description="All damage +5.",
            bonus_damage=5
        ))

    # 3. Heavenly Restriction
    if has_toji and has_maki:
        active.append(Synergy(
            name="Heavenly Restriction",
            description="Physical skills cost 1 less energy; immune to Weaken.",
            physical_cost_reduction=1,
            physical_immune_weaken=True
        ))

    # 4. Special Grade Sorcerers
    sg_count = sum([has_gojo, has_yuta_any, has_yuki, has_hakari])
    if sg_count >= 2:
        active.append(Synergy(
            name="Special Grade Sorcerers",
            description="Start with +1 of each colour energy.",
            bonus_energy={"green": 1, "red": 1, "blue": 1, "white": 1, "black": 1}
        ))

    # 5. Zenin Clan
    zenin_count = sum([has_maki, has_mai, has_naobito])
    if zenin_count >= 2:
        active.append(Synergy(
            name="Zenin Clan",
            description="Start with 2 red energy; physical damage +10.",
            bonus_energy={"red": 2}
            # Custom logic in game engine will check Zenin Clan for +10 physical damage
        ))

    # 6. Best Friends
    if has_todo and has_yuji:
        active.append(Synergy(
            name="Best Friends",
            description="Yuji physical skills deal +20 damage; Todo stun skills last +1 turn.",
            todo_yuji_best_friends=True
        ))

    # 7. Disaster Curses
    dc_count = sum([has_jogo, has_hanami, has_mahito])
    if dc_count >= 2:
        active.append(Synergy(
            name="Disaster Curses",
            description="Affliction damage +15; immune to Stun.",
            bonus_affliction=15,
            immune_to_stun=True
        ))

    # 8. Sorcerer Killers
    if has_toji and has_miguel:
        active.append(Synergy(
            name="Sorcerer Killers",
            description="All physical skills are also Piercing; affliction +10.",
            bonus_affliction=10,
            sorcerer_killers_pierce=True
        ))

    # 9. Death Paintings
    has_brother = any(matches_name(n, req) for req in ["Kechizu", "Eso", "Yuji", "Noritoshi"] for n in team_names if not matches_name(n, "Choso"))
    if has_choso and has_brother:
        active.append(Synergy(
            name="Death Paintings",
            description="DoT damage +10 per tick; Choso affliction skills +10.",
            death_paintings_dot=True
        ))

    # 10. Black Flash Masters
    bf_count = sum([has_yuji, has_nanami, has_hakari, has_todo])
    if bf_count >= 2:
        active.append(Synergy(
            name="Black Flash Masters",
            description="Start with 2 extra black energy; energy costs -1 black for all.",
            bonus_energy={"black": 2},
            black_flash_masters_reduction=True
        ))

    # 11. Tokyo Faculty
    tf_count = sum([has_nanami, has_gojo, has_shoko, has_yaga, has_mei_mei])
    if tf_count >= 2:
        active.append(Synergy(
            name="Tokyo Faculty",
            description="All allies start with 15 DR for turn 1.",
            tokyo_faculty_dr=True
        ))

    # 12. JJK 0 Unit
    if has_yuta_jjk0 and has_miguel and has_yaga:
        active.append(Synergy(
            name="JJK 0 Unit",
            description="Yuta gains 1 blue energy per turn; +10 damage on all Copy skills.",
            jjk0_unit_yuta=True
        ))

    # 13. Vessel and Curse
    if has_yuji and has_sukuna:
        active.append(Synergy(
            name="Vessel and Curse",
            description="Yuji affliction +20; takes 10 affliction damage per turn.",
            vessel_and_curse_soul_battle=True
        ))

    # 14. Culling Game Champions
    cg_count = sum([has_kashimo, has_higuruma, has_hana])
    if cg_count >= 3:
        active.append(Synergy(
            name="Culling Game Champions",
            description="Each living character generates +1 extra energy per turn.",
            culling_game_energy=True
        ))

    # 15. Kyoto Alliance
    ka_count = sum([has_todo, has_momo, has_noritoshi, has_miwa, has_gakuganji, has_utahime])
    if ka_count >= 2:
        active.append(Synergy(
            name="Kyoto Alliance",
            description="Start with 2 white energy; first draw costs 0 energy.",
            bonus_energy={"white": 2},
            kyoto_alliance_discount=True
        ))

    # 16. Blood Manipulation
    if has_choso and has_noritoshi:
        active.append(Synergy(
            name="Blood Manipulation",
            description="All DoT effects upgraded to affliction type; +5 affliction per tick.",
            blood_manipulation_upgrade=True
        ))

    # 17. Authentic Mutual Love
    if has_yuta_normal and has_yuta_jjk0:
        active.append(Synergy(
            name="Authentic Mutual Love",
            description="Cannot be in the same team (lore: Yuta is only one person). Blocked by UI.",
        ))

    # 18. Prison Realm
    has_other_villain = any(is_villain(n) for n in team_names if not matches_name(n, "Kenjaku"))
    if has_kenjaku and has_other_villain:
        active.append(Synergy(
            name="Prison Realm",
            description="At battle start, one random enemy character is stunned for 1 turn.",
            prison_realm_stun=True
        ))

    return active
