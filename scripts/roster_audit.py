"""Generate a compact Arena-style roster audit for JJK Arena."""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from jjk_bot.characters import CHARACTERS
from jjk_bot.portrait_assets import LOCAL_PORTRAIT_NAMES
from web.app import infer_character_role


BROKEN_PORTRAITS = LOCAL_PORTRAIT_NAMES


def skill_snapshot(skill):
    direct_damage = sum(
        e.value for e in skill.effects
        if getattr(e.kind, "name", "") in ("DAMAGE", "PIERCE", "AFFLICT")
    )
    dot_total = skill.dot_damage * skill.dot_turns
    strengthen_total = sum(
        e.value * max(1, min(e.turns, 4)) for e in skill.effects
        if getattr(e.kind, "name", "") == "STRENGTHEN"
    )
    weaken_total = sum(
        e.value * max(1, min(e.turns, 4)) for e in skill.effects
        if getattr(e.kind, "name", "") == "WEAKEN"
    )
    reduce_total = sum(
        e.value * max(1, min(e.turns, 4)) for e in skill.effects
        if getattr(e.kind, "name", "") == "REDUCE"
    )
    defend_total = sum(
        e.value for e in skill.effects
        if getattr(e.kind, "name", "") == "DEFEND"
    )
    trap_total = sum(
        e.trap_value for e in skill.effects
        if getattr(e.kind, "name", "") == "TRAP"
    )
    raw_value = (
        direct_damage
        + dot_total
        + skill.heal * 0.95
        + skill.stun_turns * 28
        + reduce_total * 0.5
        + skill.invuln_turns * 25
        + strengthen_total * 0.65
        + weaken_total * 0.55
        + defend_total * 0.75
        + trap_total * 0.7
    )
    if skill.is_aoe:
        raw_value *= 2.2
    cost_size = max(1, len(skill.cost))
    tempo_cost = cost_size + (skill.cooldown * 0.35)
    efficiency = round(raw_value / tempo_cost, 1)
    flags = []
    pressure = direct_damage + dot_total
    if skill.cooldown == 0 and (
        skill.is_aoe
        or skill.stun_turns
        or (cost_size == 1 and pressure > 30)
        or pressure > 40
    ):
        flags.append("spammable-pressure")
    if efficiency >= 36:
        flags.append("high-efficiency")
    if len(skill.cost) >= 2 and efficiency <= 5:
        flags.append("low-visible-value")
    if len(skill.description) > 135:
        flags.append("long-text")

    return {
        "name": skill.name,
        "cost": list(skill.cost),
        "cost_size": len(skill.cost),
        "cooldown": skill.cooldown,
        "target": skill.target_type,
        "aoe": skill.is_aoe,
        "damage": direct_damage,
        "heal": skill.heal,
        "stun": skill.stun_turns,
        "dot_total": dot_total,
        "defense": skill.damage_reduction,
        "reduce_total": reduce_total,
        "invuln": skill.invuln_turns,
        "strengthen_total": strengthen_total,
        "weaken_total": weaken_total,
        "trap": trap_total,
        "value_score": round(raw_value, 1),
        "efficiency": efficiency,
        "flags": flags,
        "classes": list(skill.classes),
    }


def main() -> None:
    rows = []
    roles = Counter()
    colors = Counter()
    costs = Counter()
    cooldowns = Counter()
    skill_outliers = []

    for char in CHARACTERS:
        role = infer_character_role(char)
        roles[role] += 1
        skill_rows = [skill_snapshot(s) for s in char.skills]
        for skill in char.skills:
            colors.update(skill.cost)
            costs[len(skill.cost)] += 1
            cooldowns[str(skill.cooldown)] += 1
        for row in skill_rows:
            for flag in row["flags"]:
                skill_outliers.append({
                    "flag": flag,
                    "character": char.name,
                    "skill": row["name"],
                    "efficiency": row["efficiency"],
                    "cost_size": row["cost_size"],
                    "cooldown": row["cooldown"],
                })

        rows.append({
            "name": char.name,
            "role": role,
            "rarity": char.rarity,
            "portrait_status": "local-generated" if char.name in BROKEN_PORTRAITS else "ok-remote",
            "skill_count": len(char.skills),
            "max_burst": max((
                sum(
                    e.value for e in s.effects
                    if getattr(e.kind, "name", "") in ("DAMAGE", "PIERCE", "AFFLICT")
                ) + s.dot_damage * s.dot_turns
                for s in char.skills
            ), default=0),
            "aoe_skills": sum(1 for s in char.skills if s.is_aoe),
            "control_turns": sum(s.stun_turns for s in char.skills),
            "support_skills": sum(1 for s in char.skills if s.heal or s.target_type == "ally"),
            "skills": skill_rows,
        })

    output = {
        "summary": {
            "characters": len(CHARACTERS),
            "skills": sum(len(c.skills) for c in CHARACTERS),
            "roles": dict(sorted(roles.items())),
            "cost_sizes": dict(sorted(costs.items())),
            "colors": dict(sorted(colors.items())),
            "cooldowns": dict(sorted(cooldowns.items())),
            "local_generated_portraits": sorted(BROKEN_PORTRAITS),
            "flag_counts": dict(sorted(Counter(o["flag"] for o in skill_outliers).items())),
        },
        "skill_outliers": sorted(
            skill_outliers,
            key=lambda item: (item["flag"], -item["efficiency"], item["character"], item["skill"]),
        ),
        "characters": rows,
    }

    out_path = Path("docs/roster_audit.json")
    out_path.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"Wrote {out_path} with {len(rows)} characters.")


if __name__ == "__main__":
    main()
