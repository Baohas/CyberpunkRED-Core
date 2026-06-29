# Actor: Character — Roles & character creation

## STATs & derived values

- **STATs** — INT, REF, DEX, TECH, COOL, WILL, LUCK, MOVE, BODY, EMP; rated 1–8 at chargen (humans 2–8), can go
  higher in play [cfg: min/max] (Core, p.72).
- **HP** — `10 + 5 * ((BODY + WILL) / 2, round up)` [cfg: formula] (Core, p.79).
- **Seriously-Wounded threshold** — `½ max HP` round up [cfg] (Core, p.79).
- **Death Save target** — `= BODY`; roll-under on 1d10 (natural 10 auto-fails); **fail = death**, and each save
  adds a cumulative +1 penalty — full death-spiral rules in [medical](../subsystems/medical.md) (Core, p.79,
  p.222).
- **Humanity** — `EMP * 10` [cfg: humanity-per-EMP = 10]; current EMP = `HUM / 10, round down`, so EMP drops 1 each
  time the tens digit of HUM falls; HUM may go **negative** (Core, p.80).
- **Maximum Humanity** — `EMP_base * 10 − (sum of cyberware penalties)` (see Cyberware) (Core, p.230).
- **LUCK Pool** — size = LUCK; refills each session (Core, p.129); **Flash of Luck** — spend LUCK to retro-buy
  prep/gear into existence (≤3/mission, an Action in combat, tiered cost) (*Going Quiet* / *Hope Reborn*).
- **Focus** — `10 + 5 * ((INT + WILL) / 2, round up)` (investigation subsystem) (*Did Someone Say Murder?*).
- **Stat-set / boost effects the engine applies** — `+BODY` (Grafted Muscle & Bone Lace: +2, stacks, cap BODY 10,
  recomputes HP/Wound/Death Save) (Core, p.114; cap *Errata*); `BODY set` to a fixed value (Linear Frames
  Sigma/Beta/Omega = 12/14/16; internal changes HP & Death Save, external/worn does not; Omega needs 3 Interface
  Plugs, *Solo of Fortune 2045*) (Core, p.116); `REF/DEX/MOVE set` (Internal Hydraulics, FBC); `MOVE set`
  (Cyberchairs); drug stat bonuses (some exceed 8); EMP drop on Humanity tens-digit fall.

## Actors — Role Abilities

A starting character's Role Ability begins at **Rank 4**; ranks scale **1–10**, bought up with IP. A **multiclass
(additional) Role** may only be taken once your current Role reaches Rank 4, and its ability **starts at Rank 1**
(Core, p.142). Each ability below: what scales by Rank is the `[cfg]` axis.

- **Charismatic Impact** (Rockerboy) — recruit/influence Fans: `Rank + 1d10` vs group-size DV; favour ceiling &
  venue reach = f(Rank) [cfg]; failed favour locks that group 1 week (Core, p.144).
- **Combat Awareness** (Solo) — a `Rank`-sized point pool reallocated across {Damage Deflection, Fumble Recovery,
  Initiative Reaction, Precision Attack, Spot Weakness, Threat Detection}; per-ability cost→effect fixed [cfg]
  (Core, p.146).
- **Interface** (Netrunner) — enables Netrunning; **NET Actions/turn = f(Rank)** (2/3/4/5 across rank bands) [cfg];
  grants the full Interface-ability suite (Core, p.147).
- **Maker** (Tech) — `2 * Rank` specialty-rank budget across {Field, Upgrade, Fabrication, Invention} Expertise;
  Specialty-Rank adds to craft/repair rolls; Field Expertise jury-rigs for `10 min * Rank` (Core, p.147).
- **Medicine** (Medtech) — `Rank` points across {Surgery, Pharmaceuticals, Cryosystem}; conversions/caps fixed
  [cfg] (Core, p.149).
- **Credibility** (Media) — passive rumor feed (`Rank + 1d10` vs rumor DV) + publishing Access/Audience/Impact and
  **Believability** (roll-under chance the audience buys it = f(Rank), +1/+2 for evidence, no LUCK) [cfg] (Core,
  p.151).
- **Teamwork** (Exec) — rank-gated corporate perks + Team Members (max 3 at Rank 9) governed by **Loyalty** (start
  1d6+1, cap 10; per-task Loyalty Save = roll 1d6 under Loyalty; ≤0 betrayal) [cfg] (Core, p.153).
- **Backup** (Lawman) — `d10 ≤ Rank` to summon a Rank-tier group; `1d6` rounds to arrive; tier = f(Rank); backup
  can't dodge [cfg] (Core, p.158).
- **Operator** (Fixer) — Reach (max price category sourceable), Haggle (a deal of Rank or lower), Contacts, Grease
  all = f(Rank) [cfg] (Core, p.159).
- **Moto** (Nomad) — adds Rank to vehicle Drive/Pilot/Tech checks; per Rank add a stock vehicle (≤ Rank) or upgrade
  a Family vehicle; one Family vehicle out at a time (all at once at Rank 10); **Nomad Access** value ≤ Rank lets a
  stock vehicle (with listed upgrades free) join the Motorpool (Core, p.161; Nomad Access keyword *Black Chrome*).

## Lifepath / character creation

- **Lifepath / character creation** (Core) — Streetrat/Edgerunner/Complete-Package generation; random d10 life-path
  & Role tables (the one mechanical output is a Cultural-Origin Language at Rank 4; *Errata* sets What Kind of Corp
  to 1d10).
