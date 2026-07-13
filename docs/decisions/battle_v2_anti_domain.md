# Battle v2 anti-domain decision

Status: Approved, 2026-07-13.

Anti-domain uses a **universal automatic conversion rule**, not per-skill
anti-domain contracts. This ratifies the existing implementation as
intentional design, not an open question.

- `DamageType.SURE_HIT` damage against a target carrying an `anti_domain`
  status (or any active status with `payload["anti_domain"] = True`)
  automatically converts to `DamageType.NORMAL` and loses invulnerability
  bypass, unconditionally, with no per-skill opt-in required.
- Every future Domain-granting skill respects this rule automatically with no
  extra code; a skill does not need to declare how it interacts with
  anti-domain unless it deliberately deviates from the default.
- No skill currently ships with a documented exception. If a future character
  needs a genuinely uncounterable Domain, that requires a new, explicit,
  separately-decided override — not a silent per-skill contract.

Implemented in `jjk_arena/battle_v2/effects.py` (`apply_damage`,
`_has_anti_domain`) and `jjk_arena/battle_v2/targeting.py`
(`skill_bypasses_invulnerability`, `target_has_anti_domain`).

As of this decision, zero First Creation characters grant a real Domain
(`SkillClass.DOMAIN` / `domain=True`) or `anti_domain`; the mechanic exists
only for four excluded legacy characters (adult Geto, adult Gojo, Sukuna,
Mahito) and is unit-tested but unshipped in First Creation content. This
decision locks the rule before any First Creation character receives a real
Domain, rather than reconciling inconsistent live content after the fact.
Domain-vs-domain interaction and a domain's own vulnerability window remain
separate, still-open questions with no code or decision yet — they are not
addressed by this record.
