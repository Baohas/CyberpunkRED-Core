# Combat

## Combat — turn structure, actions, movement

- **Round/Turn** — ~3s; **Initiative** = `REF + 1d10` (ties re-rolled), queue restarts each Round; **MOVE + 1d10**
  in roller derby [cfg: initiative stat] (Core, p.167; derby *Chasing the Rabbit*).
- **Jump to top of queue** — started vehicle / Sandevistan / Black ICE / some drugs / Superior Stance (Core,
  p.191).
- **Turn budget** — `1 Move Action + 1 Action` (Core, p.168).
- **Action list** — Attack, Move, Run (a 2nd Move), Grab/Choke/Throw/Human Shield, Get Up, Hold Action (declared
  trigger), Reload (one ammo type/magazine), Equip/Drop Shield, Start/Get-into Vehicle, Vehicle Maneuver, Use NET
  Actions, Use Skill/Object, Stabilize; **Free** = draw an accessible weapon, drop a weapon, move, save a File
  (Core, p.168).
- **Attack-check cap** — never more than `2` Attack Checks per Action [cfg: 3 for Duel Caster] (Core, p.169).
- **Movement** — `MOVE * 2 m` or MOVE squares; Run = a 2nd Move; difficult terrain (swim/climb/running-jump) `*2`,
  standing jump ½; split movement allowed; **boosters** (Skate Foot/skates +6/+4 to Run, Grip/Web/Jump negate
  penalties, Zero-G thrusters; Rocket Runner +1 MOVE when paired, *Invented Tech Upgrades*) (Core, p.168).
- **Reach & cover** — melee reach `2 m` [cfg: extended by Monowire/Combat Tail]; two-handed in one hand needs BODY
  8 (Gorilla Arm 11); **cover** is binary, has HP by material/thickness, a 1-square section is attackable, **excess
  damage is lost except for explosives** (Core, p.182).

## Combat — attack resolution

- **Ranged** — `REF + Weapon Skill + 1d10` vs the weapon's **Range-band DV** (per weapon type) **or** the
  defender's `DEX + Evasion + 1d10` **only if REF ≥ 8** (else the range DV stands) [cfg: dodge threshold] (Core,
  p.172).
- **Melee** — `DEX + Melee Skill + 1d10` vs `DEX + Evasion + 1d10`; **ignores half the target's SP, round up**
  [cfg: fraction, default ½] (Core, p.175; round-up *Errata*).
- **Brawling** — damage by BODY band `{≤4:1d6, 5–6:2d6, 7–10:3d6, 11+:4d6}` (Cyberarm floor 2d6); **does not**
  halve armor (Core, p.176).
- **Martial Arts** — `DEX + Form + 1d10`; ROF 2; needs ≥1 in the Form; **halves armor** (round up); BODY-band
  damage (Core, p.178).
- **Grapple** — `DEX + Brawling` opposed; both −2 to all Actions, defender loses Move, no 2-handed weapons; **Choke**
  = BODY direct-to-HP (3 rounds → Unconscious); **Throw** = BODY direct-to-HP + Prone, ends grapple; **Human
  Shield** = counts as cover, shielded person can't dodge, can't block melee/head shots (Core, p.177).
- **ROF** — per type (ranged single-shot ROF per class; melee ROF 2 except Very Heavy = 1) (Core, p.169).
- **Critical Failure (fumble)** — a natural 1 on an Attack Check is a Critical Failure (−1d10; see the check
  system); on that fumble a **Poor Quality** weapon also **malfunctions**, costing an Action (no Check) to clear
  before it can fire again — Standard/Excellent never jam [cfg: worse per-weapon fumble effects, see weapon
  Quality]; the Solo's **Fumble Recovery** ignores attack 1s (still treated as 1) (Core, p.342, p.146).

## Combat — fire modes / firing behaviours

- **Single Shot** — 1 round at the weapon's single-shot dice, on the single-shot range DV (Core, p.172).
- **Autofire** — `bullets/burst = 10 [cfg: e.g. 20 (Tsunami Arms Helix, Core p.349); "all remaining"]`; `min ammo =
  10 [cfg → fewer]`; uses Autofire Skill + autofire range DV; damage `= 2d6 * margin over DV`, `cap = type (SMG 3 /
  AR 4) [cfg: e.g. 5 Helix]`; double-6 = a Critical Injury; no Aimed Shot; dodge only at REF ≥ 8 (Core, p.173);
  new firing categories — Machine Pistol & Machine Gun Autofire + Autofire-granting attachments (*Solo of Fortune
  2045*); can drain & destroy at min 2 bullets (Teen Dreem, *Black Chrome*).
- **Suppressive Fire** — Action + 10 bullets; foot targets within `25 m` out of cover roll `WILL + Concentration`
  vs `REF + Autofire` → forced to cover [cfg: range] (Core, p.174).
- **Aimed Shot** — 1 ROF, whole Action, `−8` [cfg: −6/−5 via gear; +1 scope]; areas Head (`*2` through-armor; `*3`
  with Cracked Skull), Held Item (drop), Leg (Broken Leg) — the Held-Item/Leg effects trigger **only if ≥1 damage
  penetrates body armor**; no Autofire/MA-special by default (Core, p.169).
- **Shotgun Shell** — `REF + Shoulder Arms` vs DV13; all visible targets within `6 m` cone take 3d6, one roll [cfg]
  (Core, p.174).
- **Explosive / area** — `10*10 m` AoE on a square; one roll; scatter on miss; dodge at REF ≥ 8; only blast that
  destroys cover passes it (Core, p.174).
- **Burst** — multi-round single attack at upgraded damage [cfg] (e.g. E-TACK).
- **Charged shot** (Tech) — sacrifice Move to Charge; ROF1 through thin cover, ignores half SP (Core).
- **Ricochet shot** (Power) — bounce off cover to hit out-of-LoS at −4 (Aimed waives) (Core).
- **Smart/homing** — +1 attack; needs a Smart weapon + Interface Plugs/Subdermal Grip; Smart/Improved Smart ammo
  re-rolls near misses (Core).
- **Mode shift** — rev / draw-turn / railgun / Combination toggle (free or an Action); a Combination weapon's modes
  jam independently (*Black Chrome*).
- **Thrown** — `DEX + Athletics`, max 25 m, grenade-launcher range row; thrown melee deals its damage but **does
  not** halve SP [cfg: some throwing-designed melee still halve SP when thrown — Kendachi Mono-Star, *Black
  Chrome*] (Core, p.177).
- **No-damage delivery** — applies a drug/poison/liquid/effect instead of damage (Gas Jet, Air Cannon, Microwaver
  = EMP, Shrieker = Damaged Ear, Fire Extinguisher); **net launchers grapple** instead (net HP, Contortionist/
  Brawling escape, −2 actions, no Move — Popup Net Launcher, *Black Chrome*) (Core, p.348).

## Combat — damage application & armor pipeline

- **Pipeline** — roll damage → subtract the SP of the **highest single armor source** at the hit location (head if
  head-Aimed, else body) → remainder to HP → if any HP lost, **ablate −1 SP** to all armor in that location [cfg:
  ablation only when damage penetrates to HP, *Errata*] (Core, p.186).
- **Intercepting layers** — a hit may pass through layers, each with its own params {own HP?, own SP?, ablates worn
  armor?, redirects Crits?, what bypasses it, melee-half applies?}: **worn armor** (ablates), **cover** (HP, excess
  lost), **shield** (HP, interpose = can't dodge), **vehicle** (SDP, weak points), **implanted armor** (Skin Weave/
  Subdermal — ablate, self-repair), **ACPA** (own HP/SP, redirects Crits to 5 direct HP, melee does *not* halve it,
  *Solo of Fortune 2045*). [Engine wants a layered/pluggable damage application, RAW default = one worn-armor
  layer.]
- **Location multiplier** — Head Aimed-Shot `*2` through-armor (`*3` Cracked Skull) (Core, p.169).
- **Direct-to-HP** — bypasses + does not ablate armor, no location mult: Choke, Throw, On Fire, Drowning, Poison,
  Critical-Injury bonus damage, brain damage (Core, p.187).
- **Non-lethal** — below-1-HP → Unconscious at 1 HP; no Crit; no ablation (Stun Gun, Core p.348).
- **SP defining axes** — SP & Armor Penalty are per armor type (only highest SP/location counts; one worst penalty
  to REF/DEX/MOVE) [cfg: values per type, not listed here] (Core, p.184).
- **Stabilization & Death Saves** — the Stabilize Action stops a Mortally Wounded actor's per-Turn Death Saves;
  full stabilization, Death-Save and healing rules are in [medical](medical.md) (Core, p.222).

## Combat — Critical Injuries

- **Trigger** — `≥2` of an attack's damage dice show 6 (Autofire: both of its 2d6); inflicted regardless of whether
  damage beat SP (Core, p.187).
- **Resolution** — roll `2d6` on the Body table (Head table if head-Aimed), re-roll duplicates; each = an Injury
  Effect + **5 bonus damage** direct-to-HP [cfg: bonus = 5] (Core, p.187). *Tables are data `{roll, name, effect,
  quickFixDV, treatDV, baseDeathSavePenalty}` — never transcribe cells.*
- **Treatment** — Quick Fix vs Treatment by skill tier (First Aid / Paramedic / Surgery / Cybertech); full
  treatment, healing and Trauma-Team rules are in [medical](medical.md) (Core, p.222).
- **Exception widenings** — roll the table `2–3*` keep attacker's pick (Vorpal Coating, *Invented Tech Upgrades*;
  Monowire Barbed Line `*3`, *Cyberware Enhancements*); +5 to bonus damage (Pneumatic Actuation, *Cyberware
  Enhancements*); **re-roll a Foreign-Object Crit until it's something else and apply both** (Shuriken Tornado,
  *Black Chrome*; also Expansive ammo, Core p.345); inflict a **named** Crit on a Special-Move hit (Martial Arts);
  immunity (Cyberskull head crits, Cyberspine spinal); **cannot cause Crits** — fire/radiation/poison/drug/biotoxin
  unless stated; ammo crit-riders — `+1` Base Death Save Penalty on the first Crit (Serrated/Hollow-Point) and a
  Crit that **cannot be Quick-Fixed** (Burrowing) (*Solo of Fortune 2045*) (Core, p.181).

## Critical Injury tables

Trigger: 2+ of an attack's damage dice show 6. Roll 2d6 on the matching table (Head only on a head Aimed Shot),
re-rolling duplicates. Every Critical Injury also deals **+5 Bonus Damage** direct to HP. Quick Fix = removes the
effect for the day (1 min, self-ok); Treatment = removes it permanently (4 h, not self). (Core, p.187–188.)

### Body (2d6)

| Roll | Injury | Effect | Quick Fix | Treatment |
| --- | --- | --- | --- | --- |
| 2 | Dismembered Arm | Arm gone; drop held items; +1 Base Death Save Penalty | N/A | Surgery DV17 |
| 3 | Dismembered Hand | Hand gone; drop held items; +1 BDSP | N/A | Surgery DV17 |
| 4 | Collapsed Lung | −2 to all Actions; +1 BDSP | Paramedic DV15 | Surgery DV15 |
| 5 | Broken Ribs | Re-suffer bonus damage if you move >4 m on foot | Paramedic DV13 | Paramedic DV15 / Surgery DV13 |
| 6 | Broken Arm | Arm unusable; drop held items | Paramedic DV13 | Paramedic DV15 / Surgery DV13 |
| 7 | Foreign Object | Re-suffer bonus damage if you move >4 m on foot | First Aid/Paramedic DV13 | (Quick Fix is permanent) |
| 8 | Broken Leg | −4 MOVE (min 1) | Paramedic DV13 | Paramedic DV15 / Surgery DV13 |
| 9 | Torn Muscle | −2 Melee Attacks | First Aid/Paramedic DV13 | (Quick Fix is permanent) |
| 10 | Spinal Injury | −2 to all Actions; +1 BDSP | Paramedic DV15 | Surgery DV15 |
| 11 | Crushed Fingers | −4 to Actions using that hand | Paramedic DV13 | Surgery DV15 |
| 12 | Dismembered Leg | Leg gone; −6 MOVE (min 1); can't dodge; +1 BDSP | N/A | Surgery DV17 |

### Head (2d6)

| Roll | Injury | Effect | Quick Fix | Treatment |
| --- | --- | --- | --- | --- |
| 2 | Lost Eye | Eye gone; −4 Ranged & vision Perception; +1 BDSP | N/A | Surgery DV17 |
| 3 | Brain Injury | −2 to all Actions; +1 BDSP | N/A | Surgery DV17 |
| 4 | Damaged Eye | −2 Ranged & vision Perception | Paramedic DV15 | Surgery DV13 |
| 5 | Concussion | −2 to all Actions | First Aid/Paramedic DV13 | (Quick Fix is permanent) |
| 6 | Broken Jaw | −4 to Actions involving speech | DV13 | DV13 |
| 7 | Foreign Object | Re-suffer bonus damage if you move >4 m on foot | First Aid/Paramedic DV13 | (Quick Fix is permanent) |
| 8 | Whiplash | +1 BDSP | DV13 | Surgery DV13 |
| 9 | Cracked Skull | Head Aimed Shots reduce SP by 3 (not 2); +1 BDSP | Paramedic DV15 | Surgery DV15 |
| 10 | Damaged Ear | Next Turn only a Move Action; −2 to hearing Perception | DV13 | Surgery DV13 |
| 11 | Crushed Windpipe | Cannot speak; +1 BDSP | N/A | Surgery DV15 |
| 12 | Lost Ear | Ear gone; +1 BDSP | N/A | Surgery DV17 |

## Range DV tables

A ranged attack's to-hit DV is read from these grids by weapon type and range band (a defender with REF ≥ 8 may
dodge instead of using the table). Ranges in m/yds.

### Single-shot range DVs (Core, p.172)

| Weapon | 0-6 | 7-12 | 13-25 | 26-50 | 51-100 | 101-200 | 201-400 | 401-800 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pistol | 13 | 15 | 20 | 25 | 30 | 30 | N/A | N/A |
| SMG | 15 | 13 | 15 | 20 | 25 | 25 | 30 | N/A |
| Shotgun (Slug) | 13 | 15 | 20 | 25 | 30 | 35 | N/A | N/A |
| Assault Rifle | 17 | 16 | 15 | 13 | 15 | 20 | 25 | 30 |
| Sniper Rifle | 30 | 25 | 25 | 20 | 15 | 16 | 17 | 20 |
| Bow/Crossbow | 15 | 13 | 15 | 17 | 20 | 22 | N/A | N/A |
| Grenade Launcher | 16 | 15 | 15 | 17 | 20 | 22 | 25 | N/A |
| Rocket Launcher | 17 | 16 | 15 | 15 | 20 | 20 | 25 | 30 |

### Autofire range DVs (Core, p.173; *Errata* values)

| Weapon | 0-6 | 7-12 | 13-25 | 26-50 | 51-100 |
| --- | --- | --- | --- | --- | --- |
| SMG | 20 | 17 | 20 | 25 | 30 |
| Assault Rifle | 22 | 20 | 17 | 20 | 25 |

### Expanded single-shot range DVs (*Solo of Fortune 2045*)

The Range-Table-Modification categories — a superset of the core single-shot table.

| Weapon Type | 0-6 | 7-12 | 13-25 | 26-50 | 51-100 | 101-200 | 201-400 | 401-800 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Snubnose Pistol | 12 | 14 | 20 | 26 | 35 | N/A | N/A | N/A |
| Pistol | 13 | 15 | 20 | 25 | 30 | 35 | N/A | N/A |
| Long Barrel Pistol | 15 | 13 | 14 | 19 | 20 | 22 | 30 | N/A |
| Subcompact SMG | 13 | 13 | 14 | 21 | 27 | 30 | N/A | N/A |
| SMG | 15 | 13 | 15 | 20 | 25 | 25 | 30 | N/A |
| Short Barrel Shotgun | 12 | 14 | 23 | 27 | 32 | N/A | N/A | N/A |
| Shotgun | 13 | 15 | 20 | 25 | 30 | 35 | N/A | N/A |
| Long Barrel Shotgun | 14 | 16 | 15 | 18 | 25 | 28 | N/A | N/A |
| Carbine | 16 | 15 | 13 | 15 | 20 | 25 | 30 | N/A |
| Assault Rifle | 17 | 16 | 15 | 13 | 15 | 20 | 25 | 30 |
| Battle Rifle | 18 | 16 | 16 | 14 | 14 | 19 | 24 | 29 |
| Marksman Rifle | 20 | 18 | 17 | 15 | 14 | 18 | 21 | 27 |
| Scout Rifle | 21 | 20 | 19 | 18 | 17 | 17 | 19 | 24 |
| Sniper Rifle | 30 | 25 | 25 | 20 | 15 | 16 | 17 | 20 |
| Anti-materiel Rifle | 30 | 30 | 28 | 22 | 15 | 15 | 16 | 17 |
| Shortbow | 13 | 14 | 16 | 21 | 22 | N/A | N/A | N/A |
| Bow | 15 | 13 | 15 | 17 | 20 | 22 | N/A | N/A |
| Longbow | 17 | 15 | 13 | 15 | 17 | 20 | 22 | N/A |
| Grenade Launcher | 16 | 15 | 15 | 17 | 20 | 22 | 25 | N/A |
| Rocket Launcher | 17 | 16 | 15 | 15 | 20 | 20 | 25 | 30 |
| Missile Launcher | 30 | 25 | 25 | 20 | 17 | 20 | 20 | 20 |

### Expanded autofire range DVs (*Solo of Fortune 2045*)

| Weapon Type | 0-6 | 7-12 | 13-25 | 26-50 | 51-100 |
| --- | --- | --- | --- | --- | --- |
| Machine Pistol | 17 | 20 | 22 | 27 | 30 |
| SMG | 20 | 17 | 20 | 25 | 30 |
| Assault Rifle | 22 | 20 | 17 | 20 | 25 |
| Machine Gun | 21 | 18 | 18 | 19 | 25 |
