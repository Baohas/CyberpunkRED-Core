# Mechanics Reference — Parameterised Rule Catalog

A map of **every Cyberpunk RED mechanic to its Foundry implementation**, split across the files below and
organised by type then by **rule**. Each rule is written as **parameters**: the rule names a behaviour, **RAW
(Rules as Written) sets each parameter's default**, and `[cfg]` marks a parameter the system should expose so
**homebrew** is supported. Exceptions are folded in as *parameter-widening* (a value becoming configurable, or a
new flag/function), each with **one** reference `(item/source, p.N)` — not a list of every item that shares it.
All editions/supplements (Core, Black Chrome, Interface RED, Edgerunners/2077, Elflines Online, DLCs) are **one
ruleset**.

Purpose: diff this against the codebase to find unimplemented features and missing configuration points. It
captures mechanics and the data tables that encode them (DV, Critical-Injury, NET-generation, price/stat tables)
and excludes only the books' prose, art/lore, and NPC stat blocks (see `CLAUDE.md` → "Mechanics catalog (PDF
extraction)"; scanned sources in `sources.md`). **Page refs are printed pages.** Convention:
`param = RAW-default [cfg: how it varies] (ref)`. **RAW is the priority** — the system must default to RAW;
configurability is added only where it preserves RAW and doesn't change RAW results.

## Actors

- [Shared rules](actor/overview.md) — actor types & stat models, skills & the check system, conditions & states,
  Humanity, Reputation/Facedown/advancement.
- [Character (PC)](actor/character.md) — STATs & derived values, Role Abilities, character creation / Lifepath.
- [Mook / NPC](actor/mook.md) — STATs/HP, NPC abstraction, adversary tiers, encounters.
- [Drone](actor/drone.md)
- [Demon (NET)](actor/demon.md)
- [Cyberpet](actor/cyberpet.md)
- [Borg / Full Body Conversion](actor/borg.md)
- [Vehicle](actor/vehicle.md)

## Items

- [Shared rules](item/overview.md) — price/category (& decoupling), availability, lifestyle, housing, condition,
  maintenance, crafting, gear, Agents, fashion, **price lists**.
- [Weapons](item/weapon.md)
- [Ammunition](item/ammunition.md)
- [Armor](item/armor.md)
- [Cyberware](item/cyberware.md)
- [Drugs & chemicals](item/drug.md)

## Subsystems

One file each in [`subsystems/`](subsystems/):

- [Dice & rolls](subsystems/dice.md) — the randomiser conventions (exploding/imploding d10, d6 damage pools,
  generation rolls).
- [Combat](subsystems/combat.md) — turn structure, actions, movement, attack resolution, fire modes, damage
  pipeline, Critical Injuries (+ the Body/Head tables).
- [Effects, damage types & hazards](subsystems/effects.md)
- [Medical](subsystems/medical.md) — stabilization, natural healing, Death Saves, Critical-Injury treatment,
  Humanity therapy, hospitalization & Trauma Team.
- [Netrunning](subsystems/netrunning.md) — the NET system + NET-architecture generation tables.
- Supplement / optional modules: ACPA power armor, Martial Arts Forms & Special Moves, Headquarters, Investigation
  / Focus, Weather, Equipment Condition, Salvaging, Punknaught construction, Roller Derby, Stickball, Achievements
  & Loot Boxes, Elflines Online (base game & Magic), ELO-TCG, Optional table minigames, Invented Tech Upgrades,
  Edgerunners / 2070s, Bioexotics / The Zoo, Cyberchairs.
