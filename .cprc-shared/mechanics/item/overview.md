# Items — shared rules (economy, prices, gear)

## Items — economy, lifestyle, gear

- **Price Category** — 8 tiers Cheap→Super Luxury → fixed market price; sets Fixer Reach / availability. The
  Category and the eb price are **usually correlated but can be decoupled** — an item may carry a specific eb
  cost while using a *different* Category for availability (e.g. a 4,500eb Bioexotic treated as Very Expensive)
  (Core, p.385; decoupling *Exotics of 2045*).
- **Availability** — without a Fixer/Night Market only ≤ Premium is buyable; Expensive+ needs a Fixer; discounts
  are Fixer-only; Night Market is Fixer-gated (Core, p.385).
- **Night Market generation** — procedure (table-as-mechanic): roll goods categories (`1d6` ×2, reroll dupes),
  item-types per category (`1d10`), then `d100` per type on the goods columns; cyberware bought here installs
  **free at the seller's Ripperdoc** (Fashionware on-site) (Core, p.338). **Midnight Market** — a Rank 9+ Fixer's
  invite-only flash market of `1d10+5` rare items, nestable inside a Night Market (Core, p.340).
- **Lifestyle (food)** — monthly cost by tier gates perks; non-payment = 1-week grace then a Death Save per unpaid
  day [cfg] (Core, p.377).
- **Housing** — rent/buy by tier gates parking, security badges, storage, zone-legality, and **sleep comfort**;
  uncomfortable sleep (crammed > `1 + bedrooms`, street/wilderness/vehicle without a DV15 Endurance/Survival check)
  → Fatigued (−2 to everything next day); sleeping in a vehicle needs full enclosure and is zone-restricted to
  Combat Zone/Outskirts; <6 h sleep → −2/day [cfg] (Core, p.377).
- **Income** — Jobs pay-per-person by danger (Easy/Typical/Dangerous); the **Hustle** = 7 free days → `f(Role, Rank
  band, 1d6)`; Fixer arbitrage (Core, p.380).
- **Condition** — Functional / Damaged / Destroyed / Destroyed Beyond Repair (the Damaged state + malfunctions are
  the *Breaking Your Stuff* subsystem) (Core, p.342).
- **Maintenance** — Lifestyle-gated upkeep; jury-rig (Field Expertise: works `10 min * Rank`) (Core).
- **Upgrades / crafting (Maker)** — Upgrade Expertise (one per item), Fabrication, Invention; DV, time & cost by
  Price Category; vehicle upgrades count as Very Expensive (*Errata*); itemUpgrade as modifier/override; invented
  upgrades carry a power-tiered second material cost (*Invented Tech Upgrades*) (Core, p.148).
- **Gear with special rules** — sensors/comms/tools that grant a fixed skill bonus (Medscanner +2 First Aid/
  Paramedic; Techscanner +2 Tech skills; no stacking); environment immunities (Anti-Smog mask, ear protectors);
  Cryopump/Cryotank (stasis; cover HP 15/30; Medtech-only); Smart Glasses (2 paired Cybereye slots); Grapple Gun
  (line 10 HP, `2*` body weight, ≤30 m); instrument granting a conditional skill bonus (KillStrom, *Hope Reborn
  Plus*) (Core, p.351).
- **Fashion** — clothing = `{trend, slot, price}`, no inherent bonus; ties to Wardrobe & Style; Fashionware = 7
  slots, 0 HL, Night-Market/Mall install (Core, p.356).
- **Apps** — run on an Agent; grant their own mechanical effects (Core).
- **Agents** — smartphone running a SAAI (learns user; personality templates); comms/data/Device-Manager (AltLink,
  Agent-to-Agent within 20 m); +2 Library Search & +2 Wardrobe & Style (conditional); Internal Agent (Cyberaudio
  option) can't be Breacher-hacked; **hacking** needs a Breacher within 20 m + LoS, Electronics/Security Tech (DV
  by quality: remote 17/21/24, physical 15/17/21; +2 recon; SAAI alerts at halfway); success implants 1 command
  ≤24 h, tiered Basic 3s / Core 1 min / Secure 5 min (lockout, tap, 24 h backdoor); detect via counter-check; 5-min
  reboot clears commands (*All About Agents*; Core p.319).

## Price lists

Everything has a **Price Category** → fixed market price; round to the nearest tier. Category (which gates Fixer
Reach / availability) is usually correlated with the eb price but **can be decoupled** — an item may list an eb
cost yet use a different Category for availability (Core, p.385; *Exotics of 2045*).

| Price Category | Market price (eb) |
| --- | --- |
| Cheap | 10 |
| Everyday | 20 |
| Costly | 50 |
| Premium | 100 |
| Expensive | 500 |
| Very Expensive | 1,000 |
| Luxury | 5,000 |
| Super Luxury | 10,000+ |

- **Lifestyle (monthly food)** — Kibble 100, Generic Prepak 300, Good Prepak 600, Fresh Food 1,500 (Core, p.377).
- **Housing (rent / buy, eb)** — Cube Hotel 500 / —; Cargo Container 1,000 / 15,000; Studio Apartment 1,500 /
  25,000; Two-Bedroom Apartment 2,500 / 35,000; Upscale Conapt 7,500 / 85,000; Luxury Penthouse 15,000 / 150,000;
  Beaverville House — / 200,000; McMansion — / 500,000 (Corporate Conapt = corp-given) (Core, p.378).
- **Jobs (pay per person)** — Easy 500, Typical 1,000, Dangerous 2,000 (Core, p.380).
- **Services (eb)** — Braindance 20 / Interactive 50; bars 10/10/20/50; restaurant meals 10/20/50/500; hotel
  100 (Luxury 500/night); cyberware install Mall 100 / Clinic 500 / Hospital 1,000; Trauma Team Silver 500 /
  Executive 1,000 per month; therapy Standard 500 / Extreme 1,000 / Addiction 1,000; bodysculpt 500 / 1,000; taxi
  20; professional services Good 100 / Excellent 500 / World-class 5,000 (Core, p.376).
- **Per-item prices** — each weapon/armor/cyberware/gear entry carries its own eb price; those live with the item
  data rather than being relisted here.

(Hospital treatment cost-by-DV and the Trauma Team subscription are part of the medical system — see
[medical](../subsystems/medical.md).)
