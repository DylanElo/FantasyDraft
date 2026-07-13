"""Mission-unlock roadmap data for the first-character-creation era."""

from __future__ import annotations

FIRST_CREATION_MISSIONS: tuple[dict[str, object], ...] = (
    {
        "id": "welcome_to_jujutsu_high",
        "title": "Welcome to Jujutsu High",
        "description": "Win a match with the Story Tutorial trio to prove the starter fundamentals.",
        "recommended_team": ["yuji_itadori", "megumi_fushiguro", "nobara_kugisaki"],
        "objectives": ["Win one first-creation match", "Resolve at least three queued skills", "Land a Black Flash with Yuji"],
        "unlocks": ["mission_board"],
        "tier": "starter",
    },
    {
        "id": "hidden_inventory_echoes",
        "title": "Hidden Inventory Echoes",
        "description": "Win a match with Young Gojo, Young Geto, and Young Shoko to begin mentor-era unlocks.",
        "recommended_team": ["satoru_gojo_young", "suguru_geto_young", "shoko_ieiri_young"],
        "objectives": [
            "Win the match",
            "Trigger Gojo's Six Eyes Read payoff",
            "Consume Curse Stock with Geto's Compressed Uzumaki",
            "Heal an ally with Shoko's Reverse Cursed Treatment",
            "Keep one ally alive below 50 HP",
        ],
        "unlocks": ["gojo_adult", "geto_jjk0"],
        "tier": "mission_unlock",
    },
    {
        "id": "cursed_child_bond",
        "title": "Cursed Child Bond",
        "description": "Win with JJK0 Yuta's Rika state alongside Maki's tool mastery and Toge's cursed speech to unlock the first JJK0 mission branch.",
        "recommended_team": ["yuta_okkotsu_jjk0", "maki_zenin", "toge_inumaki"],
        "objectives": [
            "Win the match",
            "Activate Rika's Curse",
            "Use a replacement skill",
            "Buff up with Maki's Weapon Specialist",
            "Stun an enemy with Toge's Stop.",
        ],
        "unlocks": ["jjk0_geto_route", "rika_mastery_badge"],
        "tier": "mission_unlock",
    },
    {
        "id": "outsider_poison_path",
        "title": "Outsider Poison Path",
        "description": "Win through Junpei's poison and protection route, backed by Nobara's marks and Megumi's shikigami, to begin curse-affliction unlocks.",
        "recommended_team": ["junpei_yoshino", "nobara_kugisaki", "megumi_fushiguro"],
        "objectives": [
            "Apply poison twice",
            "Win with Junpei alive",
            "Apply Nail with Nobara's Nail Barrage",
            "Apply Scent with Megumi's Divine Dogs",
        ],
        "unlocks": ["mahito_intro_mission"],
        "tier": "mission_unlock",
    },
    {
        "id": "kyoto_pressure_gauntlet",
        "title": "Kyoto Pressure Gauntlet",
        "description": "Win with Todo, Kamo, and Mai leaning on redirects, marks, and ranged pressure to prove Kyoto-side fundamentals.",
        "recommended_team": ["aoi_todo", "noritoshi_kamo", "mai_zenin"],
        "objectives": [
            "Win the match",
            "Apply Blood Mark with Noritoshi's Blood-Tipped Arrow",
            "Fire Mai's Revolver Shot",
            "Set up a redirect with Todo's Boogie Woogie",
        ],
        "unlocks": ["kyoto_pressure_badge"],
        "tier": "mission_unlock",
    },
    {
        "id": "defensive_artillery_drill",
        "title": "Defensive Artillery Drill",
        "description": "Win with Miwa, Momo, and Mechamaru to prove the counter/control defensive line.",
        "recommended_team": ["kasumi_miwa", "momo_nishimiya", "kokichi_muta_mechamaru"],
        "objectives": [
            "Win the match",
            "Trigger Quick Draw Stun with Miwa's New Shadow Quick Draw",
            "Reveal an enemy with Momo's Aerial Scout",
            "Lock down an enemy with Mechamaru's Remote Puppet Net",
        ],
        "unlocks": ["defensive_artillery_badge"],
        "tier": "mission_unlock",
    },
    {
        "id": "student_reserves_trial",
        "title": "Student Reserves Trial",
        "description": "Win with Panda, Utahime, and Mei Mei to close out the second-year roster.",
        "recommended_team": ["panda", "utahime_iori_young", "mei_mei_young"],
        "objectives": [
            "Win the match",
            "Enter Gorilla Core with Panda",
            "Apply Crow Mark with Mei Mei's Crow Scout",
            "Activate Utahime's Solo Solo Kinku",
        ],
        "unlocks": ["student_reserves_badge"],
        "tier": "mission_unlock",
    },
)


def first_creation_missions_payload() -> list[dict[str, object]]:
    """Return JSON-serializable first-creation mission roadmap entries."""

    return [
        {
            **mission,
            "recommended_team": list(mission["recommended_team"]),
            "objectives": list(mission["objectives"]),
            "unlocks": list(mission["unlocks"]),
        }
        for mission in FIRST_CREATION_MISSIONS
    ]
