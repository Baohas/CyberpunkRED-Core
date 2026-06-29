# LLM Configuration

This file provides guidance for AI assistants working on this codebase.

- **Base branch is `dev`**: When comparing against remote, creating PRs, or referencing the base branch, always use `dev` — never `main`.
- **Raising bugs/issues**: when you (an LLM agent) file an issue, label it with the existing **`Bug::LLM Discovered`** label. Do not create new label variants (e.g. a bare `LLM Discovered`) — use the scoped label that already exists. Keep the issue terse: state the bug and the reproduction steps, nothing else.
- **Opening merge requests**: open them as **Draft**, with **no labels**. Wait for the pipeline to finish, and only then add the **`Review::Ready for Review`** label. Do **not** remove the Draft status — leave that for a human. Keep the body and any comments terse — only what is absolutely needed: a brief description of the work, steps to test each change (when there are multiple changes, list the steps for each change separately), and links to any related issues. Nothing more.
- **Commits**: structure a branch's commits as clean, logical units that make review easier — group related changes together regardless of the order they were actually developed in. Do **not** mirror the development process ("how the sausage was made") with fix-up, step-by-step, or "regenerate X" follow-up commits. The reviewer should see the final logical shape of the change, not the path taken to get there. Keep commit messages to a single one-line subject; add a body only when it is absolutely needed.
**Before writing or changing any code, read [`STYLE_GUIDE.md`](STYLE_GUIDE.md).** It documents the conventions and patterns for this system — directory layout, ApplicationV2 sheets/apps, documents and data models, JavaScript patterns, styling (including CI-enforced template rules), hooks, localization, and `fallow` static analysis. Follow it, and keep it updated when conventions change.

**When implementing or verifying a game mechanic, consult the [`mechanics/`](mechanics/) catalog** (start at `index.md`) for the expected behaviour. Rules as Written is the default; where a value/ratio/threshold could vary, prefer a configurable implementation defaulting to RAW so homebrew is supported.

## Mechanics catalog (PDF extraction)

`mechanics/` is the project's **source of truth for game mechanics** — a catalog of *what every item and
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
add a new file when a new actor/item type or subsystem appears. `mechanics/sources.md` tracks which PDFs
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
   hash (`sha256sum "<file>"`) and look it up in `mechanics/sources.md`: **if the hash is already listed,
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
6. Update `mechanics/sources.md`: add a row for each newly-processed file with its **full `sha256`** in
   the Hash column (a present hash = processed). For a file with no extractable mechanics, still add the row and
   put `skipped — <reason>` in Notes so it isn't re-examined. **You (the LLM) compute each hash directly with the
   system `sha256sum` and edit the ledger by hand, one row per file — do not write or run a script to generate or
   regenerate it.**
7. Lint: `npx markdownlint-cli --config .markdownlint.yaml "mechanics/**/*.md"` must pass.

Reusable per-book extraction prompt (read-only; run one per new book, then fold the results in):

> Read `<PDF path>` (cache with `pdftotext -layout`; printed page = PDF index − 1). **Read every item's/ability's
> full description text, not just the summary stat/price tables** — rule modifications and exceptions hide in the
> prose (e.g. non-standard ammo stack size/price, battery power, bundled/free/gun-locked ammo). Return ONLY (a)
> new rules/subsystems and (b) exceptions that override a Cyberpunk RED core rule, as compact lines:
> `[TOPIC] <name> — <exact mechanic, in your own words, with numbers/DVs/dice> — overrides/adds-to: <core rule>
> — (<book>, p.N)`. Skip vanilla items, flavour/lore, NPC stat blocks, and verbatim tables. If the book is a
> bundle, list what it bundles so it can be deduped. Write nothing.

## Validating changes in a live Foundry (Playwright MCP)

Behavioural changes must be verified in a running Foundry world, not just by static checks. The workflow:

1. **Build & deploy:** `npm run build` (compiles and deploys the system into the configured Foundry data dir).
2. **Launch:** `npm run browser:serve` brings Foundry up with a fresh ephemeral world, launched, **ready, and unpaused**, then stays in the foreground and prints the URL (default `http://localhost:30001`). Ctrl-C stops Foundry cleanly and removes the ephemeral world. The harness lives in `tools/foundry-server/`; see also STYLE_GUIDE.md → "End-to-End Tests (Playwright)".
3. **Drive it live via the Playwright MCP** (`mcp__playwright__*`): navigate to the URL, join as **Gamemaster**, and exercise the change.

**Validate through the UI, never the API.** Drive real UI interactions — clicks, form fills, opening sheets/dialogs. Do **not** use the Foundry/system API (`game.*`, `Document.create`, importing system ES modules, etc.) to *perform* actions or shortcut a workflow; that bypasses the very code paths you are validating. Using `browser_evaluate` purely for *passive inspection* (reading the rendered DOM, asserting an element exists) is fine.

**Watch the console.** Use `mcp__playwright__browser_console_messages` to check for errors **and deprecation warnings**. For deprecation/compat work, the absence of the targeted warning *is* the success criterion — confirm it directly rather than inferring from "no crash". Note: the AppV1 framework deprecation warnings (`CPRActorSheet`/`CPRItemSheet`/`CPRDialog` → ApplicationV2) are expected until the separate AppV2 migration lands.

**Core source for reference:** the unpacked Foundry build is available at `.foundry/vXX.YYY/` (e.g. `.foundry/v13.351/`) — grep it to confirm exact API signatures, deprecation messages, and custom-element attributes.

## Updating the system to a new Foundry version

When asked to "update the codebase for vXX", follow this procedure so the scope is exhaustive and well-sourced:

1. **Read every release note for the major version.** Open <https://foundryvtt.com/releases/> and read **all** `XX.YYY` builds for that major (e.g. every 13.x), not just the latest — incremental API changes, deprecations, and renames land per-build and are **not** all captured in the consolidated migration issues.
2. **Cross-reference the consolidated deprecation issues** on GitHub (`foundryvtt/foundryvtt`): the "final deprecations" / "breaking changes" tracking issues for the prior majors (e.g. V11 removals enacted in V13, V12 deprecations targeting V14). For each change, **cite the specific GitHub issue/PR** so the rationale and replacement are traceable.
3. **Audit `src/` for every deprecated/removed symbol** (grep for the exact names). Refactor to the new API **even when the old one survives for several more versions** — we do not wait for removal.
4. **Confirm details against the unpacked core source** at `.foundry/vXX.YYY/` — exact signatures, deprecation strings, replacement element/attribute names.
5. **Validate in a live Foundry via the UI** (see the section above), confirming the targeted deprecation warnings are gone.
6. Then run the standard `STYLE_GUIDE.md` checks (lint/format/stylelint/`fallow audit`/build) and the CI pipeline before opening the MR.

<!--
  Shared-context imports. The lines below pull the full style guide and the
  entire mechanics catalog into context. Paths are relative to THIS file, so
  when this repo is vendored into a module under `.cprc-shared/`, they resolve
  to `.cprc-shared/STYLE_GUIDE.md` and `.cprc-shared/mechanics/…`. A consumer
  module therefore only needs a single `@.cprc-shared/CLAUDE.md` line to inherit
  everything below. Do NOT wrap these paths in backticks — that stops the import.
-->

@STYLE_GUIDE.md

@mechanics/index.md
@mechanics/actor/overview.md
@mechanics/actor/borg.md
@mechanics/actor/character.md
@mechanics/actor/cyberpet.md
@mechanics/actor/demon.md
@mechanics/actor/drone.md
@mechanics/actor/mook.md
@mechanics/actor/vehicle.md
@mechanics/item/overview.md
@mechanics/item/ammunition.md
@mechanics/item/armor.md
@mechanics/item/cyberware.md
@mechanics/item/drug.md
@mechanics/item/weapon.md
@mechanics/subsystems/achievements-loot-boxes.md
@mechanics/subsystems/acpa-power-armor.md
@mechanics/subsystems/bioexotics-the-zoo.md
@mechanics/subsystems/combat.md
@mechanics/subsystems/cyberchairs.md
@mechanics/subsystems/dice.md
@mechanics/subsystems/edgerunners-2070s.md
@mechanics/subsystems/effects.md
@mechanics/subsystems/elflines-online-base-game.md
@mechanics/subsystems/elflines-online-magic.md
@mechanics/subsystems/elo-tcg.md
@mechanics/subsystems/equipment-condition.md
@mechanics/subsystems/headquarters.md
@mechanics/subsystems/invented-gm-designed-tech-upgrades.md
@mechanics/subsystems/investigation-focus.md
@mechanics/subsystems/martial-arts-forms-special-moves.md
@mechanics/subsystems/medical.md
@mechanics/subsystems/netrunning.md
@mechanics/subsystems/optional-table-minigames.md
@mechanics/subsystems/punknaught-construction.md
@mechanics/subsystems/roller-derby.md
@mechanics/subsystems/salvaging.md
@mechanics/subsystems/stickball.md
@mechanics/subsystems/weather.md
@mechanics/sources.md
