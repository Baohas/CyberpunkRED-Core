# Dice & rolls

The randomiser conventions every roll in the system implements. Check *semantics* — DV bands, opposed vs DV,
modifiers, complementary skill, taking extra time, LUCK spend — live with the [check system](../actor/overview.md);
this file is the dice *behaviour* the roll engine needs.

## The check die (1d10)

- **Single d10** — every Check is `STAT + Skill + 1d10` vs a DV (or opposed) (Core, p.128).
- **Critical Success (explode)** — a **natural 10** adds another `1d10`, **once**; a second 10 does not re-explode
  [cfg: explode threshold] (Core, p.129).
- **Critical Failure (implode)** — a **natural 1** subtracts another `1d10`, **once**; a second 1 does not
  re-implode [cfg: implode threshold] (Core, p.130).
- **Other exploding d10 rolls** — Initiative `REF + 1d10`, Facedown `COOL + Rep + 1d10`, and any STAT/Skill roll
  use the same explode/implode behaviour (Core, p.167, p.194).

## Roll-under d10 (no explode)

- **Death Save** — `1d10` **under BODY**; a natural 10 auto-fails; does **not** explode; a single fail = death
  (full rules in [medical](medical.md)) (Core, p.222).
- **Loyalty Save** — `1d6` under a Team Member's Loyalty (Exec Teamwork) (Core, p.153).
- **Reputation recognition** — `1d10 < Rep` = an NPC has heard of you (Core, p.193).

## d6 damage pools

- **Damage** — rolled as `Nd6`: weapon class, BODY band for Brawling/Martial Arts, or a fixed pool (falling
  `2d6`/10 m, electrocution `6d6`, ram `6d6`) (Core, p.170).
- **Critical Injury trigger** — `2+` of an attack's damage dice show a **6** (Autofire: both of its `2d6`) → roll
  on the Critical Injury table (see [combat](combat.md)) (Core, p.187).
- **6-counting modifiers** [cfg] — some ammo makes **5s count as 6** for the Crit trigger (Expansive/Explosive);
  an Autofire **double-6** is a Crit (Core, p.345).
- **Margin-scaled** — Autofire damage = `2d6 * (margin over the DV)`, capped by weapon type (see
  [combat](combat.md)) (Core, p.173).

## Generation / random-table rolls

Each feeds a subsystem's table — the table itself lives with that subsystem:

- `3d6` — NET Architecture floor count (see [netrunning](netrunning.md)) (Core, p.210).
- `1d10` — NET branch (on `7+`) and most `1d10` lookup tables.
- `2d10` — random encounter table (see [mook](../actor/mook.md)) (Core, p.399).
- `d100` — Night Market / loot-box goods tables (see [item economy](../item/overview.md)) (Core, p.338).
- `Nd6` Humanity rolls — cyberware Humanity Loss `(dice)`, Therapy `2d6` / `4d6` (see [medical](medical.md))
  (Core, p.229).
