# Netrunning

## NET system

- **Prerequisites** — Interface Role Ability + (Neural Link + Interface Plugs, or Neuroport) + a Cyberdeck;
  Virtuality Goggles to stay aware in Meatspace (else Unconscious until Jack Out); one deck at a time (switching
  decks = a Meat Action) (Core, p.196).
- **Action economy** — per turn either 1 Meat Action **or** `NET Actions = f(Interface Rank)` (2/3/4/5), plus the
  Move Action always; NET Actions: Jack In/Out, use Interface Ability (except Scanner = Meat), Activate/Deactivate
  a Program; moving floors & saving a File copy are free (Core, p.197).
- **Jack In/Out** — within `6 m` LoS [cfg: 8 m Range Upgrade]; unsafe jack-out applies every not-yet-Derezzed Black
  ICE; Jack Out resets the architecture; persistence only via a bottom-floor Virus (Core, p.198).
- **Interface Abilities** — each has {cost, check vs, effect}: Scanner (Meat; find access points), Backdoor (vs
  Password), Cloak (sets the Pathfinder DV to find you), Control (seize a Control Node; operate each device = a NET
  Action; lost on Jack Out), Eye-Dee (ID a File), Pathfinder (reveal floors = Check), Slide (flee one non-Demon
  ICE to an adjacent floor, once/turn), Virus (bottom floor, persistent), Zap (1d6 to REZ or brain) (Core, p.198).
- **Programs** — Class {Booster, Defender, Attacker, Black ICE: Anti-Personnel/Anti-Program/Demon}; stats ATK/DEF/
  REZ (+PER/SPD for ICE); **Derezzed** (0 REZ, restore with Deactivate+Activate) vs **Destroyed** (re-buy);
  activate once/Round; copies stack; **Attacker programs auto-deactivate after use** (*Errata*); install/uninstall
  1 h (Core, p.201).
- **Black ICE** — hunts until Derezzed/Destroyed/Slid; encounter = `Interface + SPEED vs ICE SPD`, on ICE win its
  effect hits + it enters Initiative at top; own Black ICE = 2 deck slots; **brain damage** = direct-HP, no armor,
  no Crit; fire effects ignite the deck unless Insulated. Anti-Personnel vs Anti-Program ICE are each only
  effective against their named target; Anti-Program ICE (and Zap) strike a **random** Rezzed program and keep
  hunting the runner even with none Rezzed; a runner's **own** Black ICE can be set to lie in wait on its floor
  (not in combat) or activated onto a target in combat (re-target = Deactivate + Activate) (Core, p.204).
- **Cyberdeck** — Option Slots shared by programs+hardware (Poor 5/Standard 7/Excellent 9; +1 from a Cyberdeck
  Cyberarm, +1 Hardware-only from a Bodyweight Suit) [cfg]; hardware
  {Backup Drive, DNA Lock, Hardened, Insulated, KRASH Barrier, Range, +supplement}; Function Driver upgrade adds a
  free non-ICE program that can't be destroyed, and Super Slide lets a movement program Slide twice/turn
  (*Invented Tech Upgrades*) (Core, p.208).
- **NET Architecture** — ordered floors (one node each: Password/File/Control Node/Program/Black ICE/Demon),
  branching; Difficulty Rating sets node DVs; non-architecture electronics & cyberware are countered with
  Electronics/Security Tech (Cybertech for cyberware) instead (Core, p.209).
- **Defenses** — Active (drones; need a Demon/Netrunner) / Emplaced (autonomous, Combat Number) / Environmental
  (toggle, fire on trigger); each counterable by Electronics/Security Tech at a DV/time (Core, p.213).
- **Stealth Netrunning** — Quiet Jack-In (an extra NET Action; contested Interface vs every Watcher) then evade:
  on each ICE/Watcher encounter roll Cloak vs ICE Perception / Watcher Pathfinder **instead of** a Speed check;
  break conditions (seize a Control Node, attack ICE); re-hide only by re-jacking (*Going Quiet*).
- **Cyberdeck Hardware (supplement)** — decks vary the base params: up to 9 slots, typed slots, Unsafe-as-Safe
  jack-out, +1 NET Action/turn, free first ability use, doubled brain damage, program restrictions; hardware can
  buff Black ICE SPD/damage or auto-rez a Defender (*Midnight With the Upload*).

## NET Architecture generation tables

Procedure (Core, p.210): floors = **3d6**; roll d10, on **7+** add a branch (re-roll for more, split floors as
desired); pick a **Difficulty Rating** (sets node DVs — Basic 6 / Standard 8 / Uncommon 10 / Advanced 12); roll
the first two floors on the Lobby table, remaining floors on the Difficulty column below, re-rolling duplicate
Program/Password results. Names below are Black ICE programs.

### First two floors — Lobby (1d6)

| Roll | Lobby floor |
| --- | --- |
| 1 | File DV6 |
| 2 | Password DV6 |
| 3 | Password DV8 |
| 4 | Skunk |
| 5 | Wisp |
| 6 | Killer |

### All other floors (3d6, by Difficulty)

| 3d6 | Basic | Standard | Uncommon | Advanced |
| --- | --- | --- | --- | --- |
| 3 | Hellhound | Hellhound x2 | Kraken | Hellhound x3 |
| 4 | Sabertooth | Hellhound, Killer | Hellhound, Scorpion | Asp x2 |
| 5 | Raven x2 | Skunk x2 | Hellhound, Killer | Hellhound, Liche |
| 6 | Hellhound | Sabertooth | Raven x2 | Wisp x3 |
| 7 | Wisp | Scorpion | Sabertooth | Hellhound, Sabertooth |
| 8 | Raven | Hellhound | Hellhound | Kraken |
| 9 | Password DV6 | Password DV8 | Password DV10 | Password DV12 |
| 10 | File DV6 | File DV8 | File DV10 | File DV12 |
| 11 | Control Node DV6 | Control Node DV8 | Control Node DV10 | Control Node DV12 |
| 12 | Password DV6 | Password DV8 | Password DV10 | Password DV12 |
| 13 | Skunk | Asp | Killer | Giant |
| 14 | Asp | Killer | Liche | Dragon |
| 15 | Scorpion | Liche | Dragon | Killer, Scorpion |
| 16 | Killer, Skunk | Asp | Asp, Raven | Kraken |
| 17 | Wisp x3 | Raven x3 | Dragon, Wisp | Raven, Wisp, Hellhound |
| 18 | Liche | Liche, Raven | Giant | Dragon x2 |
