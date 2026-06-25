# LLM Configuration

This file provides guidance for AI assistants working on this codebase.

- **Base branch is `dev`**: When comparing against remote, creating PRs, or referencing the base branch, always use `dev` — never `main`.
- **Raising bugs/issues**: when you (an LLM agent) file an issue, label it with the existing **`Bug::LLM Discovered`** label. Do not create new label variants (e.g. a bare `LLM Discovered`) — use the scoped label that already exists.
- **Opening merge requests**: open them as **Draft**, with **no labels**. Wait for the pipeline to finish, and only then add the **`Review::Ready for Review`** label. Do **not** remove the Draft status — leave that for a human.
- **Commits**: structure a branch's commits as clean, logical units that make review easier — group related changes together regardless of the order they were actually developed in. Do **not** mirror the development process ("how the sausage was made") with fix-up, step-by-step, or "regenerate X" follow-up commits. The reviewer should see the final logical shape of the change, not the path taken to get there.
**Before writing or changing any code, read [`STYLE_GUIDE.md`](STYLE_GUIDE.md).** It documents the conventions and patterns for this system — directory layout, ApplicationV2 sheets/apps, documents and data models, JavaScript patterns, styling (including CI-enforced template rules), hooks, localization, and `fallow` static analysis. Follow it, and keep it updated when conventions change.

**When implementing or verifying a game mechanic, consult the [`tests/mechanics/`](tests/mechanics/) catalog** (start at `index.md`) for the expected behaviour. Rules as Written is the default; where a value/ratio/threshold could vary, prefer a configurable implementation defaulting to RAW so homebrew is supported.

## Mechanics catalog (PDF extraction)

`tests/mechanics/` is the project's **source of truth for game mechanics** — a catalog of *what every item and
actor can do* (type → rule → parameters), used to verify the system implements the rules. It is generated from
the official Cyberpunk RED PDFs and **split by type**: `index.md` is the overview/TOC; `actor/` has a file per
actor type (`overview.md` for shared rules, then `character.md`, `mook.md`, `drone.md`, `demon.md`, `cyberpet.md`,
`borg.md`, `vehicle.md` — vehicles are treated as actors); `item/` likewise (`overview.md` + `weapon.md`,
`ammunition.md`, `armor.md`, `cyberware.md`, `drug.md`); each subsystem — including core ones like `combat.md`,
`dice.md`, `effects.md`, `medical.md` and `netrunning.md` — is a file in `subsystems/`. **Data tables live with the mechanic they encode**
(range DVs in `combat.md`, NET-generation tables in `netrunning.md`, price lists in `item/overview.md`), not in a
central tables file. A mechanic shared by
several actor types is **duplicated into each** type's file (the reference is per-type complete), not centralised
behind a cross-reference. Put each finding in the file for its type/system;
add a new file when a new actor/item type or subsystem appears. `tests/mechanics/sources.md` tracks which PDFs
have been processed, **keyed by each file's full `sha256` content hash** (rename-proof; a hash in the ledger =
done).

**Model — parameterised rules, not exception lists.** Every entry in the catalog is a *rule expressed as
parameters*: the rule names a behaviour, **RAW sets each parameter's default**, and a parameter is marked
configurable (`[cfg]`) where the rules vary it, so the Foundry implementation can support homebrew. When you meet
an **exception**, do **not** catalog the item — widen the rule it breaks: turn the varying value into a
configurable parameter (or add a flag/function), keep the RAW default, and cite **one** item as the reference,
`(Item Name, Book, p.N)`. Convention: `param = RAW-default [cfg: how it varies] (Item Name, Book, p.N)`. Example:
core "Autofire = 10 bullets, min 10" plus its exceptions →
`bullets/burst = 10 [cfg: e.g. 20] (Tsunami Arms Helix, Black Chrome, p.N)` and `min bullets = 10 [cfg → 0]
(<item>, <book>, p.N)`. One reference per parameter — never a list of every item that shares it. (Use the page
only if you actually have it; never invent one.)

**Licensing.** Game mechanics/rules are not copyrightable; the books' *expression* (prose, art) is. The catalog
captures **mechanics and data** — rules, formulas, and the tables that encode them: DV tables, Critical-Injury
tables, NET-Architecture generation tables, and price/stat lists are all in scope. Keep **out** only the books'
**prose, flavour/lore, art, and NPC stat blocks** (the expressive, non-mechanical content). The **source PDFs
must never be committed** — they are each contributor's own legally-owned copies.
Contributors still need the official books for exact values; that is intentional.

**Updating the catalog when PDFs are added/changed:**

1. The PDFs live at `foundryconfig.json → pdfPath` (a gitignored local path). For each file compute its full
   hash (`sha256sum "<file>"`) and look it up in `tests/mechanics/sources.md`: **if the hash is already listed,
   it's processed — skip it** (filenames don't matter, the hash is the key, so renames are safe). Process
   **only** files whose hash is absent. The **Interface RED** volumes bundle most standalone DLCs; don't
   double-process a DLC and the volume that reprints it.
2. Tooling: `pdftotext -layout "<book>.pdf" /tmp/x.txt` (poppler-utils, in `shell.nix`); pages are form-feed
   delimited (`awk 'BEGIN{RS="\f"} NR==N'`); **printed page = PDF index − 1** (cite printed pages).
3. Extract **only** (a) new rules/subsystems and (b) exceptions that override a general rule. Skip vanilla items,
   flavour, and everything in the licensing ❌ list above. **A table *is* a mechanic:** capture what it varies by
   (its axes/structure), never the cells. **Always read each item's/ability's full prose description, not just the
   summary stat/price tables** — the per-item descriptions are where rule modifications and exceptions hide (e.g.
   non-standard ammo stack sizes/prices, battery power sources, bundled or free ammo, gun-locked ammo). A summary
   table tells you a value exists; only the description tells you when an item *breaks* the general rule. When an
   item/ability is an **exception**, identify the **parameter of which rule** it changes and widen that rule (one
   item reference `(Name, Book, p.N)`) — never add a per-item entry.
4. Fold each finding by adding or widening a **parameter** on the matching rule — RAW default, mark configurable
   `[cfg]` where it varies, one item reference — not a per-item line. If an entry is really an override of a core
   resolution (initiative, damage application, a Critical Injury, 0-HP handling, a check modifier, crafting,
   Humanity, item condition…), put it on that **core axis**, not in a subsystem bullet. **Treat all editions as
   one ruleset** — 2077/Edgerunners sits alongside Core. Add a new axis/section only for a genuinely new subsystem.
5. Reconcile Core values against the CRB FAQ.
6. Update `tests/mechanics/sources.md`: add a row for each newly-processed file with its **full `sha256`** in
   the Hash column (a present hash = processed). For a file with no extractable mechanics, still add the row and
   put `skipped — <reason>` in Notes so it isn't re-examined. **You (the LLM) compute each hash directly with the
   system `sha256sum` and edit the ledger by hand, one row per file — do not write or run a script to generate or
   regenerate it.**
7. Lint: `npx markdownlint-cli --config .markdownlint.yaml "tests/mechanics/**/*.md"` must pass.

Reusable per-book extraction prompt (read-only; run one per new book, then fold the results in):

> Read `<PDF path>` (cache with `pdftotext -layout`; printed page = PDF index − 1). **Read every item's/ability's
> full description text, not just the summary stat/price tables** — rule modifications and exceptions hide in the
> prose (e.g. non-standard ammo stack size/price, battery power, bundled/free/gun-locked ammo). Return ONLY (a)
> new rules/subsystems and (b) exceptions that override a Cyberpunk RED core rule, as compact lines:
> `[TOPIC] <name> — <exact mechanic, in your own words, with numbers/DVs/dice> — overrides/adds-to: <core rule>
> — (<book>, p.N)`. Skip vanilla items, flavour/lore, NPC stat blocks, and verbatim tables. If the book is a
> bundle, list what it bundles so it can be deduped. Write nothing.
