# Medical — stabilization, healing & treatment

Cross-cutting medical system for any actor with HP. Death Saves and the `Death Save = BODY` stat also appear in
the actor files; the Critical-Injury trigger, resolution and per-injury tables live in [combat.md](combat.md).

## Stabilization

- **Stabilization** — required before natural healing can start; an Action, `TECH + First Aid/Paramedic + 1d10`
  vs DV by wound state (Lightly 10 / Seriously 13 / Mortally 15) [cfg]; **Cybertech cannot stabilize** (Core,
  p.222).
- **Mortally-Wounded stabilization** — success heals to **1 HP** and leaves the target Unconscious for 1 minute;
  Death Saves still roll if re-Mortally-Wounded while unconscious (Core, p.224).
- **Reopening** — doing more than light activity before reaching Full HP = no HP that day, wounds reopen, and
  stabilization must be repeated to restart healing (Core, p.224).

## Natural healing

- **Natural healing** — once stabilized, heal `BODY` HP per **full day of rest** (light activity only) until Full
  HP [cfg: HP/day, rest period — e.g. `2 * BODY`/day via Enhanced Antibodies (Core, p.362); a Calibrated
  Medscanner treats BODY as +3 when guiding a Speedheal (*Invented Tech Upgrades*)] (Core, p.222).
- **Cryostasis healing** — held in a Cryotank/Cryopump: Unconscious, no Death Saves, heals at `2*` the normal rate
  (Core, p.226).
- **Medbay (HQ)** — heals as `BODY + 2` per day and enables Medtech crafting (see [headquarters](headquarters.md)).
- **Pharmaceutical assists** — Medtech drugs that accelerate or substitute (Speedheal; Stim ignores the Seriously
  Wounded penalty; Surge; Immunoblockers restore Humanity; Sedative grants `+2` to a Medtech's Treatment/Surgery on
  a willing patient) — item data in [drugs](../item/drug.md) (Core, p.226; Sedative *Hornet's Pharmacy*).

## Death Saves

- **Death Save** — at the start of each Turn while Mortally Wounded, roll `1d10` **under BODY**: success = you
  live and act this Turn; **failure (roll ≥ the target, or a natural 10) = death** — a single failed save kills,
  there is no pool. Each save taken raises the **Death Save Penalty** by 1 (cumulative +1 to every later save); it
  resets to the **Base Death Save Penalty** when stabilized to 1 HP (BDSP itself is raised by the nastiest Critical
  Injuries) (Core, p.222). *(The `Death Save target = BODY` stat is duplicated into the actor files.)*

## Treating Critical Injuries

- **Quick Fix vs Treatment** — Quick Fix removes the Injury Effect **for the day** (1 min, self-ok); Treatment
  removes it **permanently** (4 h, **not** on yourself); some injuries offer only one option [cfg] (Core, p.223).
  *(Trigger, resolution and the per-injury DV/effect tables live in [combat.md](combat.md).)*
- **Healing skills** — Cybertech (cyber-part Crits only; cannot stabilize), First Aid (stabilize + Quick-Fix the
  common Crits; always trained ≥ +2), Paramedic (`*2`-cost; stabilize + all but the deadliest), Surgery (the
  deadliest; Medtech-only via the Medicine Role Ability) (Core, p.223).
- **Crits to cyberware** — a Crit to a cybered location still inflicts its Effect + Bonus Damage, but **Cybertech**
  may Quick Fix/Treat it in place of First Aid/Paramedic/Surgery at the listed DV and time (Core, p.223).

## Humanity therapy

- **Therapy (Humanity recovery)** — the only restore short of cyberware removal: 1 week, a Medtech rolls Medical
  Tech vs DV; Standard HL DV15 → `2d6`, Extreme DV17 → `4d6`, capped by the reduced maximum; Addiction therapy
  DV15; the Immunoblockers drug also restores (risky) [cfg] (Core, p.229). *(Humanity score, loss and max live in
  [actor/overview.md](../actor/overview.md) / [character.md](../actor/character.md).)*

## Hospitalization & Trauma Team

- **Hospital** — outpatient, ≤ 4 h per Treatment; billed only for the **highest DV** stabilization/treatment of the
  visit: DV10 = 50eb, DV13 = 100eb, DV15 = 500eb, DV17+ = 1,000eb; the natural-healing start is included; in-patient
  bed 100eb (Premium) / night (Core, p.225).
- **Trauma Team** — subscription emergency response, Silver 500eb / Executive 1,000eb per month [cfg]; calling is
  an Action (or automatic via a Biomonitor-linked Agent when HP < BODY or on a dismembering Crit); `1d6` Rounds to
  arrive, then enters at the top of Initiative; a 5-member NPC crew (Combat Number, can't dodge bullets) in an AV-4
  stocked with Cryotanks; Executive covers Surgery, Silver bills Surgery at hospital rates (Core, p.224, p.279).
- **Cryosystem gear** — Cryopump (portable) / Cryotank place a patient in stasis (cover HP 15 / 30; Medtech-only)
  — item data in [item/overview.md](../item/overview.md) (Core).
- **Medicine (Medtech Role Ability)** — `Rank` points across {Surgery, Pharmaceuticals, Cryosystem}; gates Surgery
  and advanced care — see [actor/character.md](../actor/character.md) (Core, p.149).
