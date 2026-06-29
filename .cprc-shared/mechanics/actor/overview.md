# Actors — shared rules

Mechanics here apply across actor types. STATs and derived values are **not** universal, so they live with the
types that have them (and are duplicated into each) — see the stat-model map below, then the per-type files.

## Actor types & stat models

- **Character (PC)** — full ten-STAT array + every derived value (HP, Humanity, LUCK Pool, Focus); Roles, IP
  advancement. See [character.md](character.md).
- **Mook / NPC** — same ten STATs, but **pre-summed into a Skill/Combat Number**; no Role/Role-Ability/LUCK/EMP
  tracking unless noted. See [mook.md](mook.md).
- **Drone** — no STAT array; HP (+SP for security), MOVE, finite battery, loadout slots, a Combat Number for
  security drones; uses the operator's skills under Direct Control. See [drone.md](drone.md).
- **Demon (NET)** — a Black ICE program-actor: **REZ** is its hit points + a Combat Number; **no SPD/PER/DEF**, no
  meat STATs/HP. See [demon.md](demon.md).
- **Cyberpet** — an animal **NPC stat block** (statted like a Mook); Animal-Handling obedience; tracks no Humanity
  of its own but installed cyberware still follows the normal install/HL rules. See [cyberpet.md](cyberpet.md).
- **Borg / FBC** — a Character whose **BODY/HP/Death Save come from the body** and **REF/DEX/MOVE from its
  cyberware**, keeping INT/COOL/TECH/WILL/LUCK/EMP & Skills. See [borg.md](borg.md).
- **Vehicle** — no STAT array; hit points are **SDP** (Destroyed at 0), plus SP/Seats/Combat Speed; acts on its
  operator's `REF + Control Skill`, and is also a purchasable item. See [vehicle.md](vehicle.md).

## Actors — skills & the check system

Applies to every actor that rolls; abstracted actors (Mook/Demon/security Drone) substitute their pre-summed
**Combat Number** for `STAT + Skill level`.

- **Skill Base** — `STAT + Skill level`; the linked STAT is per-skill [cfg] (Core, p.128).
- **Check** — `Skill Base + 1d10` vs **DV** (static; success ≥ DV) or **Opposed** (success strictly >; defender
  wins ties) (Core, p.128).
- **DV bands** — preset task-difficulty values: Simple 9 / Everyday 13 / Difficult 15 / Professional 17 / Heroic
  21 / Incredible 24 / Legendary 29 [cfg: band table] (Core, p.129).
- **Critical Success** — natural 10 explodes: +1d10 once (a second 10 does not re-explode) (Core, p.129).
- **Critical Failure** — natural 1 implodes: −1d10 once (Core, p.129).
- **Modifiers** — cumulative; GM-assigned negatives, gear/cyberware/role/drug positives [cfg: modifier values]
  (Core, p.129).
- **Complementary Skill** — +1, once, non-stacking [cfg] (Core, p.129).
- **Taking Extra Time** — +1 for `4*` the duration [cfg: multiplier, bonus] (Core, p.129).
- **LUCK spend** — +1 per point from the pool, declared before rolling (Core, p.129).
- **No-skill** — `STAT + 1d10` only (Core, p.129).
- **Trying Again** — blocked unless the odds improved (Core, p.130).
- **Skill model** — categories (Awareness/Body/Control/Education/Fighting/Performance/Ranged/Social/Technique);
  `*2-cost` flag (Autofire, Demolitions, Electronics/Security Tech, Heavy Weapons, Martial Arts, Paramedic, Pilot
  Air Vehicle); specialty skills carry a per-rank instance key (Language, Science, Tech, Play Instrument, Martial
  Arts Form) (Core, p.130–141). **Control skills (Drive/Pilot/Riding) pair with REF** [cfg] (*Errata*, corrects
  TECH).
- **Skills with their own subsystem hooks** — Conceal/Reveal finds Conceal/Reveal-hidden objects (Perception
  cannot); Perception vs Stealth finds hidden people; Evasion dodges melee, and **ranged/explosions only if REF ≥
  8** [cfg threshold] (Core, p.137); Forgery is opposed Forgery-vs-Forgery; Personal Grooming / Wardrobe & Style
  feed social checks as complementary; First Aid / Paramedic / Surgery treat Critical Injuries by tier; Demolitions
  sets/defuses/IDs explosives (Core, p.131–141).
- **Repair** — `STAT + Tech-Skill (+ Field-Expertise Rank) + 1d10` vs DV; DV & time scale by item **Price
  Category** (Cheap/Everyday 9, Costly 13, Premium 17, Expensive 21, Very Expensive 24, Luxury/Super Luxury 29) or
  by damage tier for vehicles (see [vehicle.md](vehicle.md)); a failed roll wastes half the time and restarts from
  scratch [cfg: price→(DV, time)] (Core, p.140).

## Actors — conditions & states

The shared condition library; each applies to whichever actor can enter that state.

- **Wound States** — Lightly/Seriously/Mortally Wounded by HP threshold; each **replaces** (not stacks) the prior;
  Seriously −2 all Actions; Mortally −4 Actions, −6 MOVE (min 1), Death Save each Turn, crit on every hit; ignore
  via Pain Editor / Berserk Implant / Stim / FBC (Core, p.186).
- **Prone** — no Move Action until Get Up (Core, p.168).
- **Unconscious** — out of fight; still Death-Saves if Mortally Wounded.
- **Grappled** — −2 to all Actions; lose your Move Action; dragged with the grappler; no 2-handed weapons; break
  with an opposed Grab (Core, p.177).
- **Choked** — being choked while grappled: BODY direct-to-HP; 3 successive rounds → Unconscious regardless of HP
  (Core, p.177).
- **Human Shield** — held as the grappler's cover; you can't dodge and can't be used to block melee or head-aimed
  shots (Core, p.184).
- **On Fire** — direct HP at end of Turn until an Action puts it out; intensity Mild 2 / Strong 4 / Deadly 6 [cfg];
  immune via Brimstone Coating / Insulated gear (Core, p.180).
- **Addiction** — per-drug penalty while not dosed (Core, p.356).
- **Intoxicated** — Drunk −4 / Buzzed −2 to Checks (Core, p.130).
- **Fatigued** — −2 to everything (poor or no sleep) (Core, p.377).
- **Fear** — −2 vs a specific opponent after a lost Facedown; clears on first win vs them (Core, p.194).
- **Stealth** — netrunning quiet/hidden state (see Stealth Netrunning).
- **Charged** — a Tech weapon's charge is held, ready to fire (Core).
- **On / atop a vehicle** — riding on or atop a moving vehicle (Core, p.191).
- **Cyberpsychosis** — EMP 2 borderline / 1 dissociative / 0 cyberpsychotic / 0 & negative HUM extreme (GM-run)
  (Core, p.232).
- **Cryostasis** — unconscious; no Death Saves; heals at `2*` (Core, p.226).

## Actors — Humanity (loss / recovery / cyberpsychosis)

Shared subsystem for actors that carry cyberware — Characters and Borgs track their own Humanity; a Cyberpet's
installed cyberware follows the same install/HL rules (the pet itself has no Humanity score). The Humanity score
and `EMP * 10` derivation live in [character.md](character.md).

- **Humanity Loss** — per item `preset (dice)`: **chargen uses the preset; in play roll the dice** [cfg: always-
  preset house rule]; 0-HL items never cost HUM (Core, p.111).
- **First-install vs re-install** — HL accrues on install; **Chipware and Cyberlimbs only cost HL the first time a
  brand-new piece is used** (re-attach is free) → engine tracks a per-actor "previously-used" set (Core, p.359,
  p.366).
- **Maximum-Humanity reduction** — `−2` per installed piece, `−4` per Borgware, **none** for 0-HL pieces or
  non-voluntary medical-grade/cloned replacements; restored only by removal; **Foundational Tuning** upgrade lowers
  an option's reduction by 1 (*Invented Tech Upgrades*) (Core, p.230).
- **Recovery (Therapy)** — Humanity is restored only by cyberware removal or **therapy**; the therapy mechanic
  (DVs, dice, addiction) lives in [medical](../subsystems/medical.md) (Core, p.229).
- **Trauma HL (GM)** — 1d6 / 2d6 by severity; Edgerunners adds Humanity **Gain** incidents (Core, p.231).
- **Role starting-package HL** — each Role's starting cyberware package has a fixed Humanity/EMP cost [cfg:
  per-Role values] (*Errata*).

## Reputation, Facedown & advancement

Reputation/Facedown apply to Characters and NPCs alike; Improvement Points are the Character advancement currency.

- **Reputation** — `1d10 < Rep` = an NPC has heard of you; a deed replaces Rep only if higher; a negative
  (cowardice) Rep can replace a positive (Core, p.193).
- **Facedown** — opposed `COOL + Rep + 1d10` (Rep applied **negative** if earned for cowardice); loser backs down
  or takes the −2 fear penalty vs that opponent until they beat them once (Core, p.194).
- **Improvement Points** — single advancement currency; per-session award banded 10–80 by playstyle/group column;
  spend with no skipping: Skill `Level*20`, `*2`-Skill `Level*40`, Role Rank `Rank*60` [cfg: multipliers] (Core,
  p.409).
