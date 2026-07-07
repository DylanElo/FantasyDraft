# JJK Arena — First Character Creation Manuscript

## Version 0.1 — Student Era + Hidden Inventory + JJK0

## Design purpose

The first character creation pool is the roster available immediately when a new player enters JJK Arena. It should teach the game's tactical language before players unlock adult Gojo, Sukuna, evolved curses, Shinjuku variants, awakened forms, or other endgame mission characters.

The starter roster is not "weak characters only." It is **readable characters first**.

The first creation identity is:

```text
Student Era / Early Sorcerer Era
```

The pool includes Tokyo students, Kyoto students, Junpei as the early outsider/proto-sorcerer, Hidden Inventory young sorcerers, and JJK0 Yuta only. Adult/endgame variants and disaster-level threats are mission unlocks.

## Core combat rules

```text
3v3
100 HP per character
Each living character may use 1 skill per turn
```

Energy keeps Naruto Arena logic with JJK labels:

- `B` — Body: physical combat, cursed tools, martial arts.
- `T` — Technique: cursed techniques, shikigami, cursed speech, puppet output.
- `F` — Focus: tactics, barriers, counters, reads, simple domain, support.
- `C` — Curse: cursed energy volatility, poison, blood, cursed spirit manipulation, risky output.
- `X` — Wild / Random Cost: a cost slot paid with any generated `B/T/F/C` energy during queue review.

`X` is **not** a generated fifth resource.

Damage rules:

- Normal damage is reduced by damage reduction and blocked by destructible defense.
- Piercing damage ignores damage reduction, but does **not** ignore destructible defense.
- Soul / Affliction damage ignores damage reduction and destructible defense.
- Health steal ignores damage reduction, does **not** ignore destructible defense, and heals only actual HP stolen.
- Sure-hit is domain-specific and bypasses normal targeting defenses unless anti-domain is active.

## First character creation roster

Total: 19 starter characters.

1. Yuji Itadori
2. Megumi Fushiguro
3. Nobara Kugisaki
4. Maki Zenin
5. Toge Inumaki
6. Panda
7. Aoi Todo
8. Noritoshi Kamo
9. Momo Nishimiya
10. Mai Zenin
11. Kasumi Miwa
12. Kokichi Muta / Mechamaru
13. Junpei Yoshino
14. Satoru Gojo (Young)
15. Suguru Geto (Young)
16. Shoko Ieiri (Young)
17. Utahime Iori (Young)
18. Mei Mei (Young)
19. Yuta Okkotsu (JJK 0)

This pool gives players Body bruisers, Technique controllers, Focus supports, Curse/affliction users, counters, reflects, healing, marks, shields, replacements, one beginner special grade, and two high-ceiling young legends without endgame Domain nonsense.

## Starter kit direction

Each first-creation kit should be implemented as a readable Arena-style starter kit with four primary skills and, where appropriate, replacement skills unlocked by states.

- Yuji Itadori: beginner bruiser / finisher; teaches damage sequencing with Momentum and Soul Bruise.
- Megumi Fushiguro: shikigami control / setup; teaches marks and soft control with Scent.
- Nobara Kugisaki: ranged mark / punish; teaches mark into payoff with Nail.
- Maki Zenin: weapon specialist / anti-defense; teaches destructible defense interactions.
- Toge Inumaki: cursed speech control / self-risk; teaches tempo at a health cost.
- Panda: tank / stance bruiser; teaches stance and destructible defense through Gorilla Core.
- Aoi Todo: bruiser / swap disruption; teaches prediction and redirect.
- Noritoshi Kamo: ranged bleed / resource pressure; teaches fair resource drain through Blood Mark.
- Momo Nishimiya: scout / evasive support; teaches information and team smoothing.
- Mai Zenin: precision ranged / ammo setup; teaches delayed threat with Hidden Bullet.
- Kasumi Miwa: defensive swordswoman / counter-control; teaches timing defense with Simple Domain.
- Kokichi Muta / Mechamaru: artillery / remote control; teaches protected backline threat.
- Junpei Yoshino: poison shikigami / fragile control; teaches damage-over-time and protection.
- Satoru Gojo (Young): high-ceiling control / expensive defense; no Unlimited Void or Hollow Purple starter base skill.
- Suguru Geto (Young): curse stock / summon pressure; earns Compressed Uzumaki through Curse Stock.
- Shoko Ieiri (Young): healer / cleanse / low offense; makes slow teams viable without carrying damage.
- Utahime Iori (Young): support chant / team amplifier; modest whole-team force multiplier.
- Mei Mei (Young): scout / crow pressure / efficient finisher; no one-shot Bird Strike.
- Yuta Okkotsu (JJK 0): unstable special-grade protector / Rika state; no Sendai, Shinjuku, EOS, or Gojo-body Yuta.

## First creation recommended team presets

- Story Tutorial: Yuji / Megumi / Nobara.
- Tokyo Second-Years: Maki / Toge / Panda.
- Kyoto Pressure: Todo / Kamo / Mai.
- Defensive Artillery: Miwa / Momo / Mechamaru.
- Poison Outsider: Junpei / Nobara / Megumi.
- Hidden Inventory: Young Gojo / Young Geto / Young Shoko.
- Young Sorcerer Support: Young Utahime / Young Mei Mei / Young Shoko.
- JJK0 Beginner Special: Yuta JJK0 / Maki / Toge.

## Locked variants and mission direction

Locked at first creation:

```text
Gojo Adult
Gojo Unsealed
Gojo Shinjuku
Geto JJK0
Kenjaku
Yuta Sendai
Yuta Shinjuku / EOS
Yuta in Gojo's Body
Awakened Yuji
Awakened Maki
Sukuna Incarnation
Meguna
Heian Sukuna
Mahito
Jogo
Dagon
Hanami
Choso
Hakari
Higuruma
Kashimo
Takaba
Angel
Uraume
Toji
Naoya
```

Later characters should be more complex, not strictly stronger. Starter characters must remain ladder-viable forever.

## Implementation constraints

The first creation roster should be tagged with:

```python
availability = "starter"
era = "student_era"
```

Suggested tags include `tokyo_student`, `kyoto_student`, `hidden_inventory`, `jjk0`, `outsider`, `support`, `control`, `bruiser`, `mark`, `healer`, and `counter`.

Do not add adult Gojo, Shinjuku Yuta, Sendai Yuta, starter domains, piercing that ignores destructible defense, `X` as a generated fifth energy type, or auto-win Young Gojo / JJK0 Yuta kits.

## Final design position

```text
The player starts as a young sorcerer entering the arena.
They first learn JJK combat through students, early allies, young mentors, Junpei, and JJK0 Yuta.
The apocalypse comes later.
```

The first roster should feel like "Welcome to Jujutsu High," not "Congratulations, here is the end of the manga."

## Runtime progression layer

First-creation mission progress is evaluated from Battle v2 room state and then merged into a lightweight player profile. The profile tracks completed mission ids, owned unlock ids, the first completion timestamp for each mission, and the player's most recent starter team. Unlock rewards are registry-driven so UI can distinguish implemented systems/routes/badges from planned character variants before those later kits exist.
