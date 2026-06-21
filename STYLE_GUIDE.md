# Code Style Guide

This guide documents the coding conventions and patterns for the Cyberpunk RED FoundryVTT system.

The system is written in **JavaScript** (ES modules) and uses **Handlebars** templates with Foundry's **ApplicationV2** application framework. It is linted with **ESLint** (flat config — `@eslint/js` recommended, `eslint-plugin-import-x`, and Prettier), formatted with **Prettier**, styled with plain **CSS** (linted by **stylelint**), analyzed with **fallow** (dead-code / unused-dependency auditing), and built with **gulp**.

## Table of Contents

- [Foundational Principles](#foundational-principles)
- [Directory Structure](#directory-structure)
- [File Naming Conventions](#file-naming-conventions)
- [Documents and Data Models](#documents-and-data-models)
- [Sheets and Templates](#sheets-and-templates)
- [JavaScript Patterns](#javascript-patterns)
- [State and Persistence](#state-and-persistence)
- [Imports and Exports](#imports-and-exports)
- [Styling](#styling)
- [Hooks](#hooks)
- [Localization](#localization)
- [Testing and Quality](#testing-and-quality)
- [FoundryVTT Integration](#foundryvtt-integration)
- [Code Quality Checklist](#code-quality-checklist)
- [Quick Reference](#quick-reference)
- [Shared Code Inventory](#shared-code-inventory)

---

## Foundational Principles

### 1. Write Self-Documenting Code

Code should be self-explanatory through clear organization and naming. Well-named code reduces the need for comments and makes the codebase easier to navigate.

#### Naming Conventions

| Element               | Convention                                           | Examples                                                   |
| --------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| **Variables**         | Descriptive names that convey purpose                | `isCharacterDead`, `totalDamageDealt`, `formattedModifier` |
| **Functions/methods** | Verbs that describe the action                       | `calculateArmorSP`, `applyDamage`, `getBestInit`           |
| **Classes**           | PascalCase nouns, `CPR`-prefixed for system classes  | `CPRCharacterActor`, `WeaponDataModel`, `CPRSystemUtils`   |
| **Constants**         | SCREAMING_SNAKE_CASE for true module-level constants | `MAX_STAT_VALUE`, `DEFAULT_AUTOFIRE_ROF`                   |

**Avoid abbreviated or unclear names:**

```javascript
// Bad
const d = new Date();
const fn = (a) => a.s + a.m;
const x = items.filter((i) => i.a && !i.d);

// Good
const currentDate = new Date();
const calculateTotalBonus = (stat) => stat.value + stat.modifier;
const activeItems = items.filter((item) => item.isActive && !item.isDeleted);
```

#### Code Organization Principles

Code should be:

- **Well-organized**, Group related logic together, separate concerns appropriately
- **Easy to reason about**, A developer should understand the flow without extensive documentation
- **Easy to understand**, Prefer clarity over cleverness; straightforward code is better than clever one-liners
- **Clear for humans to follow**, Structure code so the intent is obvious at a glance

Where intent cannot be made obvious by names alone, document it with a JSDoc block (see [JavaScript Patterns](#javascript-patterns)).

---

### 2. Don't Repeat Yourself

Look for existing utilities and helpers before building new ones. If you find yourself copying logic from one module into another, extract it into a shared abstraction.

See the [Shared Code Inventory](#shared-code-inventory) section for utilities that already exist.

#### When to Extract

Use these trigger rules to decide when to extract code:

| Situation                               | Action                                                                                         |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Same literal/enum repeated in 2+ files  | Add it to the `CPR` config object in `src/modules/system/config.js`                            |
| Pure helper used by 2+ files            | Extract to a static utility class in `src/modules/utils/`                                      |
| Same data-shape reused across documents | Extract a schema mixin/component under `src/modules/datamodels/.../mixins` or `.../components` |

#### Promotion Rules (Local → Shared)

Use this rule to decide where code should live:

##### A) Default: Keep code local

If a helper is only used in one place, keep it as a private (`_`-prefixed) method on the class that uses it. Don't pre-emptively extract.

##### B) Promote when it becomes shared

When code is reused, promote it to the narrowest common location:

1. **Shared within a feature** — keep it as a static helper on the feature's class, e.g. a method on `CPRActorUtils` used by multiple actor types.
2. **Shared across features** — move it to a general utility class (e.g. `src/modules/utils/TextUtils.js`, used by sheets AND dialogs AND chat).

##### C) Import smell heuristic

If a file imports from a distant, unrelated directory for a helper that seems feature-specific, consider moving that helper closer to the feature that uses it most, or promoting it to a true shared utility if multiple features need it.

**Avoid over-extraction:**

- Keep small private helpers in the same file unless there's a clear domain boundary.
- Don't create micro-files for single helpers; prefer one cohesive utility class per domain (e.g. `CPRCombatUtils`, `CPRSystemUtils`).

---

### 3. Avoid Premature Optimization

Write clear, correct code first. Optimize only when you have evidence of a performance problem.

> "Premature optimization is the root of all evil", Donald Knuth

#### Principles

- **Correctness first**, Code that works correctly but slowly is better than fast code that's wrong or unmaintainable
- **Measure before optimizing**, Use browser profilers or `LOGGER.debug`/`LOGGER.trace` to identify actual bottlenecks
- **Optimize the right thing**, The perceived slow spot is often not the actual bottleneck
- **Readability matters**, Optimized code is often harder to understand and maintain

#### When NOT to Optimize

```javascript
// Unnecessary — a trivial derivation. Don't cache or memoize this.
const fullName = `${firstName} ${lastName}`;
```

#### When TO Optimize

Optimize when you have:

- **Measured evidence** of a performance problem (profiler data, slow sheet renders)
- **Expensive computations** that run on every `prepareData`/`_prepareContext` (complex filtering, sorting large item lists)
- **Sheets re-rendering excessively** due to redundant updates

**Rule of thumb:** If you can't articulate what performance problem you're solving, you probably don't need the optimization.

---

## Directory Structure

### Overview

```text
src/
├── cpr.js                  # Main entry point — boots the system and imports every module
├── environment.js          # Dev/debug flags (e.g. force migration); reloaded on F5
├── system.json             # Foundry system manifest (id, version, packs, compatibility)
├── template.json           # Foundry document type definitions (types, HTML fields)
│
├── modules/                # All JavaScript source — the only code tree, reached from cpr.js
│   ├── actor/              # Actor document classes (character, mook, demon, black-ice, container)
│   │   └── sheet/          # Actor sheet application classes
│   ├── api/                # Public system API for macros and modules
│   │   └── actor/          # Actor-related API helpers
│   ├── apps/               # Standalone application windows (e.g. compendia settings)
│   ├── chat/               # Chat card rendering and message logic
│   ├── combat/             # Combat tracker and combatant logic
│   ├── datamodels/         # DataModel schemas for actors and items
│   │   ├── actor/          # Actor data schemas (+ components/, mixins/)
│   │   ├── item/           # Item data schemas (+ components/, mixins/)
│   │   └── shared/         # Schemas shared across document types
│   ├── dialog/             # Dialog and prompt application classes
│   ├── extern/             # Wrappers for external module integrations (dice)
│   ├── hooks/              # Foundry lifecycle and system hook registrations
│   ├── hud/                # Token HUD interface extensions
│   ├── item/               # Item document classes
│   │   ├── mixins/         # Reusable item behaviour mixins (loadable, installable, ...)
│   │   ├── sheet/          # Item sheet application classes
│   │   └── types/          # Per-type item implementations (weapon, armor, cyberware, ...)
│   ├── rolls/              # Roll construction and modifier handling
│   ├── system/             # System bootstrap: config, settings, helpers, template preload
│   │   └── migrate/        # Data migration framework and versioned scripts
│   └── utils/              # Shared utility and helper functions
│
├── templates/              # Handlebars templates (sheets, dialogs, chat, HUD)
│   ├── actor/              # Actor sheet templates
│   │   ├── character/      # Character sheet (left/right/bottom panes and tabs)
│   │   ├── container/      # Container sheet
│   │   ├── mook/           # Mook sheet
│   │   └── mixin/          # Shared actor partials (fight, netrunning, actions)
│   ├── apps/               # Standalone app templates (compendia settings)
│   ├── chat/               # Chat card and roll-card templates
│   ├── dialog/             # Dialog and prompt templates
│   │   ├── hud/            # HUD dialog templates
│   │   └── rolls/          # Roll dialog templates
│   ├── effects/            # Active effect sheet templates
│   ├── hud/                # Token HUD templates (DV labels)
│   ├── item/               # Item sheet templates
│   │   ├── description/    # Item description partials
│   │   └── settings/       # Item settings partials
│   └── migration/          # Migration app and UI templates
├── css/                    # Source CSS, compiled by gulp
├── lang/                   # Localization string files
├── babele/                 # Babele translation packs for compendium content, auto generated
├── packs/                  # Compendium source data (core/, internal/, other/)
├── icons/                  # System and compendium icon art
├── images/                 # UI and banner images
├── fonts/                  # Bundled webfonts
├── maps/                   # Battlemap image assets
├── tiles/                  # Tile artwork (netrunning net architecture)
└── assets/                 # Miscellaneous bundled assets (scenes)
```

### Key Principles

1. **Code under `modules/`, markup under `templates/`.** All JavaScript lives in `src/modules`; all Handlebars markup lives in `src/templates`. The two trees mirror each other (e.g. `modules/item/sheet` ↔ `templates/item`).

2. **Feature-based organization.** Group by what the code does (actor, item, combat, chat) rather than by file type.

3. **Shared logic in `utils/`, shared constants in `system/config.js`.** Only truly reusable helpers belong in `src/modules/utils`. Feature-specific helpers stay with their feature.

4. **Compose data models from mixins.** Reusable schema fragments live under `datamodels/.../mixins` (named composable schemas) and `datamodels/.../components` (small reusable field factories).

5. **Single entry point.** All JavaScript must be reachable from `src/cpr.js` via imports — don't add new entry points. The runtime entry tree is audited by fallow (see [Static Analysis (fallow)](#static-analysis-fallow)).

### Where to Put New Code

| Code Type                     | Location                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------- |
| New actor type class          | `src/modules/actor/`                                                            |
| New item type class           | `src/modules/item/types/`                                                       |
| New data model                | `src/modules/datamodels/actor/` or `src/modules/datamodels/item/`               |
| New schema mixin / component  | `src/modules/datamodels/**/mixins/` or `.../components/`                        |
| New sheet class               | `src/modules/actor/sheet/` or `src/modules/item/sheet/`                         |
| New Handlebars template       | `src/templates/<feature>/`                                                      |
| New dialog / prompt           | `src/modules/dialog/`                                                           |
| Utility function/class        | `src/modules/utils/`                                                            |
| FoundryVTT hook               | `src/modules/hooks/<group>/` (and register it in `src/modules/system/hooks.js`) |
| Handlebars helper             | `src/modules/system/register-helpers.js`                                        |
| System configuration constant | `src/modules/system/config.js`                                                  |
| System setting                | `src/modules/system/settings.js`                                                |
| Localization string           | `src/lang/en.json` (English source only — flag for human review)                |
| Migration script              | `src/modules/system/migrate/scripts/`                                           |

---

## File Naming Conventions

### Summary Table

| Type                         | Convention                                  | Example                         |
| ---------------------------- | ------------------------------------------- | ------------------------------- |
| JavaScript source files      | kebab-case, `cpr-` prefix                   | `cpr-actor.js`, `cpr-logger.js` |
| Classes                      | PascalCase, `CPR` prefix for system classes | `CPRActor`, `CPRItemSheet`      |
| Data model files             | kebab-case, `-datamodel` suffix             | `character-datamodel.js`        |
| Data model classes           | PascalCase, `DataModel` suffix              | `CharacterDataModel`            |
| Schema mixin/component files | kebab-case, `-schema` suffix                | `attackable-schema.js`          |
| Schema classes               | PascalCase, `Schema` suffix                 | `AttackableSchema`              |
| Handlebars templates         | kebab-case, `cpr-` prefix                   | `cpr-character-sheet.hbs`       |
| Directories                  | lowercase / kebab-case                      | `actor/`, `datamodels/`         |
| Private methods              | `_`-prefixed camelCase                      | `_onRoll`, `_renderItemCard`    |

> **Legacy note:** a few older utility files use PascalCase names (`ActorUtils.js`, `TextUtils.js`, `SheetUtils.js`). The preferred convention for new files is kebab-case with a `cpr-` prefix (`cpr-system-utils.js`). Match the surrounding directory if it is consistent; otherwise prefer the kebab-case form.

### Class Naming

Use descriptive PascalCase names. System document and application classes carry a `CPR` prefix; data model and schema classes carry a descriptive `DataModel` / `Schema` suffix instead.

```text
# Good
CPRCharacterActor        # Character actor document
CPRItemSheet             # Item sheet application
WeaponDataModel          # Weapon item data model
AttackableSchema         # Reusable "can attack" schema mixin

# Avoid
Sheet                    # Too generic
CPRW                     # Unclear abbreviation
weaponDataModel          # Should be PascalCase
```

### Class Suffixes

Use consistent suffixes to indicate a class's role:

| Suffix      | Usage                             | Example             |
| ----------- | --------------------------------- | ------------------- |
| `Actor`     | Actor document classes            | `CPRCharacterActor` |
| `Item`      | Item document classes             | `CPRWeaponItem`     |
| `Sheet`     | Sheet application classes         | `CPRMookActorSheet` |
| `DataModel` | Document data models              | `ArmorDataModel`    |
| `Schema`    | Reusable schema mixins/components | `StatSchema`        |
| `Utils`     | Static utility classes            | `CPRSystemUtils`    |

---

## Documents and Data Models

### Document Classes

Actor and Item documents extend Foundry's base classes directly. Shared behaviour lives on a base `CPRActor` / `CPRItem`; per-type behaviour lives in subclasses.

```javascript
// src/modules/actor/cpr-actor.js
import LOGGER from "../utils/cpr-logger.js";
import { Container } from "./cpr-container.js";

/**
 * CPRActor contains common code shared between mooks and characters.
 *
 * @extends {Actor}
 */
export default class CPRActor extends Actor {
  /** @override */
  prepareData() {
    super.prepareData();
    this.loadMixins();
  }

  /** Behavioural mixins are mixed in at prepare time via Function.prototype.call. */
  loadMixins() {
    const mixins = ["container"];
    mixins.forEach((mixin) => {
      if (mixin === "container") Container.call(this);
    });
  }
}
```

```javascript
// src/modules/actor/cpr-character.js
export default class CPRCharacterActor extends CPRActor {
  static async create(data, options) {
    const createData = data;
    if (typeof data.system === "undefined") {
      createData.prototypeToken = { actorLink: true, disposition: 1 };
    }
    return super.create(createData, options);
  }
}
```

Document classes are wired to types through the proxy factory in `src/modules/entity-factory.js`, which routes construction to the correct subclass based on `data.type` and is assigned to `CONFIG.Actor.documentClass` / `CONFIG.Item.documentClass` during `init`.

### Behavioural Mixins (Documents)

Item behaviours (`loadable`, `installable`, `attackable`, etc.) are implemented as functions that augment `this`, then mixed in inside `loadMixins()`:

```javascript
// src/modules/item/mixins/cpr-loadable.js
const Loadable = function Loadable() {
  this.load = async function load() {
    /* ... */
  };
  this.unload = async function unload() {
    /* ... */
  };
};

export default Loadable;
```

```javascript
// src/modules/item/cpr-item.js — loadMixins()
loadMixins() {
  const mixins = SystemUtils.getMixins(this.type);
  mixins.forEach((mixin) => {
    switch (mixin) {
      case "attackable": Attackable.call(this); break;
      case "loadable": Loadable.call(this); break;
      case "installable": Installable.call(this); break;
      default: break;
    }
  });
}
```

### Data Models

Persistent document data is described by `DataModel` schemas composed from reusable mixins via `CPRSystemDataModel.mixin(...)`. Each mixin declares a `static mixinName` and a `static defineSchema()` returning `foundry.data.fields`.

```javascript
// src/modules/datamodels/item/ammo-datamodel.js
import CPRSystemDataModel from "../system-data-model.js";
import CommonSchema from "./mixins/common-schema.js";
import InstallableSchema from "./mixins/installable-schema.js";
import CPR from "../../system/config.js";

export default class AmmoDataModel extends CPRSystemDataModel.mixin(
  CommonSchema,
  InstallableSchema
) {
  static defineSchema() {
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      type: new fields.StringField({
        blank: false,
        initial: "basic",
        choices: Object.keys(CPR.ammoTypes),
      }),
      ablationValue: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 1,
        min: 0,
      }),
    });
  }
}
```

Small, repeated field groups are factored into **component** schemas with a parameterised `defineSchema`:

```javascript
// src/modules/datamodels/actor/components/stat-schema.js
export default class StatSchema extends CPRSystemDataModel {
  static defineSchema({ includeMax = false, min = 0 } = {}) {
    const { fields } = foundry.data;
    const schema = {
      value: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 6,
        min,
      }),
    };
    if (includeMax) {
      schema.max = new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 6,
        min: 0,
      });
    }
    return schema;
  }
}
```

Data models are registered per type during `init`:

```javascript
CONFIG.Actor.dataModels.character = CharacterDataModel;
CONFIG.Item.dataModels.weapon = WeaponDataModel;
```

**Guidelines:**

- Always set explicit field options (`required`, `nullable`, `initial`, and `min`/`choices` where relevant). Don't rely on implicit defaults.
- Reference enums by `Object.keys(CPR.someEnum)` for `choices` rather than hardcoding lists.
- Put derived (non-persisted) values in getters on the data model or in the document's `prepareDerivedData`, not in the schema.

---

## Sheets and Templates

The system is migrating its windows to Foundry's **ApplicationV2** framework with the `HandlebarsApplicationMixin`. There is no Svelte/reactive layer. The migration is only partly done, so the codebase currently contains two patterns:

- **V2 (target pattern):** standalone apps only — `apps/cpr-compendia-settings.js` and `system/migrate/migration-app.js` extend `foundry.applications.api.ApplicationV2` with static `DEFAULT_OPTIONS`/`PARTS`, an async `_prepareContext`, and declarative `actions`.
- **V1 (legacy, not yet migrated):** **every document sheet and dialog.** All actor sheets (`actor/sheet/*`), the item sheet (`item/sheet/cpr-item-sheet.js`), and the dialogs (`dialog/*`) still extend the legacy `ActorSheet` / `ItemSheet` / `FormApplication` bases and use `getData()`, a `defaultOptions` getter, `activateListeners()`, and jQuery.

> Existing document sheets are **not** a reference for new code — they are the old pattern awaiting migration. New and migrated applications **must** follow the V2 pattern below: static `DEFAULT_OPTIONS` and `PARTS`, an async `_prepareContext`, and declarative `actions`. When migrating a document sheet, target the V2 document-sheet bases (`foundry.applications.sheets.ActorSheetV2` / `ItemSheetV2`).

### Application Structure

```javascript
// src/modules/apps/cpr-compendia-settings.js
import CPR from "../system/config.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class CPRCompendiaSettings extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  /** Static configuration, merged with the parent defaults. */
  static DEFAULT_OPTIONS = {
    id: "compendia-config",
    tag: "form",
    position: { width: 540, height: "auto" },
    window: {
      icon: "fa-solid fa-book",
      title: "CPR.settings.compendiumMenu.title",
      resizable: false,
    },
    // Declarative click handlers, keyed by data-action (see below).
    actions: {},
    // Form submission handler (for tag: "form").
    form: { handler: CPRCompendiaSettings.#onSubmit, closeOnSubmit: true },
  };

  /** Templates that compose this application, concatenated in declared order. */
  static PARTS = {
    form: {
      template: `systems/${CPR.systemId}/templates/apps/compendia-settings.hbs`,
    },
    footer: { template: "templates/generic/form-footer.hbs" },
  };

  /**
   * Prepare the data object consumed by the templates. Always async; merge
   * the parent context first via super.
   *
   * @override
   * @param {object} options
   * @returns {Promise<object>}
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.choices = SystemUtils.GetCompendiaByType("world", "RollTable");
    return context;
  }

  /**
   * Imperative DOM wiring after each render. `this.element` is a native
   * HTMLElement — use the DOM API, not jQuery. Prefer declarative `actions`.
   *
   * @override
   */
  _onRender(context, options) {
    this.element
      .querySelector(".some-control")
      ?.addEventListener("change", this.#onChange.bind(this));
  }

  /**
   * Static form handler.
   *
   * @this {CPRCompendiaSettings}
   * @param {SubmitEvent} event
   * @param {HTMLFormElement} form
   * @param {FormDataExtended} formData
   */
  static async #onSubmit(event, form, formData) {
    const data = formData.object;
    await game.settings.set(game.system.id, "someSetting", data.someChoice);
  }
}
```

### Event Handling: Declarative Actions

Prefer declarative actions over manual listeners. Add `data-action` (and any `data-*` payload) in the template, and map the action name to a static handler in `DEFAULT_OPTIONS.actions`:

```handlebars
<button type="button" data-action="navigate" data-direction="next">Next</button>
```

```javascript
static DEFAULT_OPTIONS = {
  actions: { navigate: MigrationApp.navigateMessages },
};

/** @param {PointerEvent} event @param {HTMLElement} target the clicked element */
static navigateMessages(event, target) {
  const { direction } = target.dataset;
  // ...
}
```

Reach for `_onRender` + `addEventListener` only for interactions that `actions` can't express (keydown, drag, transitionend, etc.).

**Sheet/application guidelines:**

- Configure with **static** `DEFAULT_OPTIONS`; declare templates with **static** `PARTS`.
- Build context in `_prepareContext`, merging `await super._prepareContext(options)` first.
- Enrich HTML fields with `TextEditor.enrichHTML(..., { async: true })` inside `_prepareContext`.
- `this.element` is a native `HTMLElement`; use DOM APIs (`querySelector`, `addEventListener`).
- Prefer declarative `actions`; fall back to `_onRender` only when necessary.
- Keep ephemeral UI state (collapsed sections, active tab) on the application instance — not in document data.
- Reference templates and assets with `systems/${game.system.id}/...` (or `${CPR.systemId}`), never a hardcoded id.

### Templates

Templates are Handlebars (`.hbs`) files under `src/templates`, mirroring the `modules/` layout. Templates declared in an application's `PARTS` are loaded automatically by the mixin. Shared **partials** (referenced with `{{> ...}}`) and any template rendered outside the `PARTS` mechanism must be preloaded in `src/modules/system/preload-templates.js`:

```javascript
// src/modules/system/preload-templates.js
export default function preloadHandlebarsTemplates() {
  return foundry.applications.handlebars.loadTemplates([
    `systems/${game.system.id}/templates/actor/character/cpr-left-pane.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-item-description.hbs`,
    // ...
  ]);
}
```

Custom Handlebars helpers are registered in `src/modules/system/register-helpers.js`:

```javascript
Handlebars.registerHelper("cprCompare", (v1, operator, v2) => {
  switch (operator) {
    case "===":
      return v1 === v2;
    case "<":
      return v1 < v2;
    // ...
    default:
      return false;
  }
});
```

In markup, localize user-facing strings with the built-in helper and use system helpers for logic:

```handlebars
<label>{{localize "CPR.sheets.character.hitPoints"}}</label>
{{#if (cprCompare actor.system.derivedStats.hp.value "<" seriouslyWounded)}}
  <span class="wounded">{{localize
      "CPR.sheets.character.seriouslyWounded"
    }}</span>
{{/if}}
```

---

## JavaScript Patterns

### Modules and Exports

- Source files are ES modules using `import` / `export`.
- **Relative imports must include the `.js` extension** (enforced by ESLint `import/extensions: always`).
- **Default export** is the norm for a file's primary class. **Named exports** are used for utility collections, mixins, and re-exports.

```javascript
import CPR from "../system/config.js";
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";
import * as CPRRolls from "../rolls/cpr-rolls.js";
```

### Static Utility Classes

Shared helpers are grouped as static methods on a utility class rather than scattered free functions:

```javascript
// src/modules/utils/cpr-combatUtils.js
import LOGGER from "./cpr-logger.js";

/** Helpers for combat and initiative. */
export default class CPRCombatUtils {
  /**
   * Find the highest initiative value in the active combat.
   *
   * @returns {number} the best initiative, or 0 if no combat is active
   */
  static GetBestInit() {
    /* ... */
  }
}
```

### JSDoc

Document classes and non-trivial methods with JSDoc blocks. Note `@param`, `@returns`, and `@override`/`@async` where applicable.

```javascript
/**
 * Gets the SP value for a given armor and location, including any upgrades.
 *
 * @param {Item} armor - the armor item to check
 * @param {string} location - the body location to check
 * @param {boolean} [withAblation=false] - include ablation in the calculation
 * @returns {Promise<number>} the total SP for the location
 */
static async calculateArmorSP(armor, location, withAblation = false) {
  /* ... */
}
```

> Only `src/modules/api` is published as generated docs (`jsdoc.json`), but JSDoc is expected throughout the codebase for readability.

### Foundry Globals

Foundry globals (`game`, `CONFIG`, `Hooks`, `Roll`, `Actor`, `Item`, `ui`, `canvas`, `foundry`, `Handlebars`, `$`, …) are declared in the ESLint config. **Access them directly — never import them.**

```javascript
// Good — direct access
const theme = game.settings.get(game.system.id, "theme");
CONFIG.Item.documentClass = itemConstructor;
```

### Logging

Use the shared `LOGGER` (default export of `src/modules/utils/cpr-logger.js`) instead of bare `console.*`. `LOGGER.debug` / `LOGGER.trace` are gated behind the `debugLogs` / `traceLogs` settings.

```javascript
import LOGGER from "../utils/cpr-logger.js";

LOGGER.debug(`raw initiatives: ${initiatives}`);
LOGGER.warn("adjustFontSizeToFit | no input element found");
LOGGER.error(error);
```

### Private Methods

Mark internal methods with a leading underscore (`_onRoll`, `_renderItemCard`). ESLint's `no-underscore-dangle` is intentionally disabled to allow this and Foundry's own `_`-prefixed overrides.

Likewise, prefix **unused function parameters** with an underscore (`_event`) rather than deleting them — ESLint's `argsIgnorePattern` skips `_`-prefixed args, and keeping the parameter preserves the signature (important for Foundry overrides and callbacks where position matters).

---

## State and Persistence

Choose the narrowest storage that fits the data's lifetime:

| Need                                                    | Mechanism                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| Transient value within one function/render              | Local variable                                               |
| Ephemeral sheet UI state (open tab, collapsed sections) | Property on the sheet instance / `this.options`              |
| Persistent document data                                | DataModel `system.*` fields, written via `document.update()` |
| Per-document ad-hoc state not worth a schema field      | Document flags (`setFlag`/`getFlag`)                         |
| World/client configuration                              | System settings (`game.settings`)                            |

### Document Mutations

Never assign to document data directly — it won't persist and won't trigger updates. Use the document update API:

```javascript
// Good
await actor.update({ "system.derivedStats.hp.value": newValue });
await item.update({ "system.equipped": "equipped" });

// Bad — does not persist, bypasses hooks/validation
actor.system.derivedStats.hp.value = newValue;
```

### Flags

Scope flags to the system id:

```javascript
await actor.setFlag(game.system.id, `firetype-${item._id}`, rollType);
const firetype = actor.getFlag(game.system.id, `firetype-${item._id}`);
```

### Settings

Register settings in `src/modules/system/settings.js` and read them with `game.settings.get(game.system.id, "...")`:

```javascript
game.settings.register(game.system.id, "invertRollCtrlFunction", {
  name: "CPR.settings.invertRollCtrlFunction.name",
  scope: "client",
  config: true,
  type: Boolean,
  default: false,
});
```

---

## Imports and Exports

### Default vs Named Exports

**Default export** for the file's primary class:

```javascript
// src/modules/utils/cpr-systemUtils.js
export default class CPRSystemUtils {
  static Localize(string) {
    return game.i18n.localize(string);
  }
}

// Usage
import SystemUtils from "../utils/cpr-systemUtils.js";
```

**Named exports** for utility collections, mixins, and re-exports:

```javascript
// src/modules/item/mixins/cpr-container.js
export class ContainerUtils {
  /* ... */
}
export { default as Container } from "./cpr-container.js";
```

### Import Rules

- Always include the `.js` extension on relative imports.
- There are **no path aliases** — use relative paths (`../utils/cpr-logger.js`).
- Group imports logically (object/class imports, then function imports, then data models), as in `src/cpr.js`.
- Avoid import cycles (ESLint warns on `import/no-cycle`). Prefer importing the specific module you need over a barrel.

```javascript
import CPR from "../system/config.js";
import CPRChat from "../chat/cpr-chat.js";
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";
```

---

## Styling

Styles are plain **CSS** in `src/css`, compiled and bundled by gulp and linted with **stylelint**. There is no SCSS/preprocessor and no component-scoped styling — selectors are global, so class names must be specific.

### CSS Organization

```text
css/
├── apps/                 # Standalone application window styles
├── chat/                 # Chat card styles
├── compatability/        # Overrides for Foundry core and other modules
│   ├── foundry/
│   └── modules/
├── elements/             # Reusable UI element styles (buttons, inputs, ...)
├── layout/               # Page/sheet layout
├── sheets/               # Actor and item sheet styles
│   ├── actor/
│   └── item/
└── variables/            # Custom properties and theme definitions
    └── themes/           # Per-theme variable sets
```

### CSS Class Naming

Use descriptive, kebab-case class names. Because styles are global, avoid short or ambiguous names that could collide with Foundry or other modules.

```handlebars
{{! Good }}
<div class="cpr-ability-score-container">
  <span class="cpr-ability-score-value">{{score}}</span>
</div>

{{! Avoid }}
<div class="asc"><span class="val">{{score}}</span></div>
```

### CSS Custom Properties and Theming

Define colours and spacing as custom properties under `css/variables`, and provide per-theme overrides under `css/variables/themes`. The active theme is applied by `CPRSystemUtils.SetTheme()` (driven by the `theme` setting and `CPR.themes`).

```css
:root {
  --cpr-surface-primary: #ffffff;
  --cpr-text-primary: #1a1a1a;
  --cpr-spacing-md: 0.5rem;
}

.cpr-panel {
  color: var(--cpr-text-primary);
  background: var(--cpr-surface-primary);
  padding: var(--cpr-spacing-md);
}
```

**Best practices:**

1. **Never hardcode colours** in component selectors — use custom properties so themes can override them.
2. **Add theme overrides** under `css/variables/themes` rather than scattering theme-specific rules.
3. **Keep selectors specific** (`cpr-`-prefixed) to avoid leaking into Foundry's UI.
4. Run `npm run stylelint` (or `npm run stylelint:fix`) before committing.

### Style in Markup (enforced by CI)

Because styling is CSS-driven, presentation must not be baked into templates. Two shell-based pipeline checks scan `src/templates/**` and fail the build on violations:

**No inline presentational tags or entities** (`.gitlab/pipeline_tests/test-handlebars-inelinestyles.sh`). The following are **blocked** — apply a CSS class instead:

| Banned in `.hbs`                                                                          | Use instead                                                         |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `style="..."` (inline styles)                                                             | A `cpr-`-prefixed CSS class styled in `src/css`                     |
| `<b>`, `<strong>`, `<i>`, `<em>`, `<mark>`, `<small>`, `<del>`, `<ins>`, `<sub>`, `<sup>` | A semantic element with a `cpr-`-prefixed class styled in `src/css` |
| `&nbsp;`                                                                                  | CSS spacing (`margin`/`padding`/`gap`)                              |

**Inline `style="..."` attributes are not allowed.** All styling must live in `src/css` behind a class — no exceptions for new markup.

```handlebars
{{! Bad — presentation baked into markup }}
<b style="margin-left: 4px">{{localize
    "CPR.sheets.character.hp"
  }}</b>&nbsp;{{hp}}

{{! Good — classes drive the styling }}
<span class="cpr-stat-label">{{localize "CPR.sheets.character.hp"}}</span>
<span class="cpr-stat-value">{{hp}}</span>
```

> **Enforcement note:** the `style=` check is present in `test-handlebars-inelinestyles.sh` but temporarily commented out because of a few unresolved legacy uses that bind a CSS value to dynamic data — currently `progress-bar.hbs` (`width: {{percent}}%`) and `hud/waypoint-label-dv.hbs` (a dynamic `background-image` URL). It is therefore enforced **in review** rather than by CI for now. This does not soften the rule — new inline `style=` must not be added, and the check should be re-enabled once that legacy markup is migrated to CSS.

**Tooltips use `data-tooltip`, not `title`** (`.gitlab/pipeline_tests/test-handlebars-tooltips.sh`). A `title="..."` attribute anywhere in `src/templates/**` fails the build; use Foundry's `data-tooltip` attribute, which is themed and localizable.

```handlebars
{{! Bad }}
<a title="{{localize 'CPR.sheets.item.edit'}}"><i
    class="fa-solid fa-pen"
  ></i></a>

{{! Good }}
<a data-tooltip="{{localize 'CPR.sheets.item.edit'}}"><i
    class="fa-solid fa-pen"
  ></i></a>
```

---

## Hooks

Each hook lives in its own module under `src/modules/hooks/<group>/`, as a default-exported function that registers one or more `Hooks.on`/`Hooks.once` callbacks. There is no base hook class.

```javascript
// src/modules/hooks/actor/check-emp-and-luck.js
import SystemUtils from "../../utils/cpr-systemUtils.js";

/**
 * Warn if a stat is set to an implausibly large value.
 *
 * @public
 * @memberof hookEvents
 */
const CheckEmpAndLuck = () => {
  Hooks.on("preUpdateActor", async (actor, updatedData) => {
    const stat =
      updatedData.system?.stats?.emp ?? updatedData.system?.stats?.luck;
    if (stat && Number(stat.value) > 99) {
      SystemUtils.DisplayMessage(
        "warn",
        SystemUtils.Localize("CPR.messages.tripleDigitStatValueWarn")
      );
    }
  });
};

export default CheckEmpAndLuck;
```

Register a new hook by adding its relative path to the list in `src/modules/system/hooks.js`, which dynamically imports each module and invokes its default export:

```javascript
// src/modules/system/hooks.js
const hooksImports = [
  "actor/check-emp-and-luck.js",
  "actor/sheet/persist-section-views.js",
  "chat/add-glyphs.js",
  // add new hook paths here
];
```

`registerHooks()` is called once at module load time from `src/cpr.js`.

---

## Localization

All user-facing strings must be localized. Keys are namespaced under the `CPR.` prefix and defined in `src/lang/en.json` (the English source of truth).

Localization spans two directories:

- **`src/lang/`** — UI string files. `en.json` is the hand-authored English source. The other files (`de.json`, `fr.json`, `ja-JP.json`, …) are **translations**.
- **`src/babele/<lang>/`** — [Babele](https://gitlab.com/riccisi/foundryvtt-babele) translation packs for **compendium content**. These are **generated**, not authored.

In JavaScript, use the `CPRSystemUtils` helpers (commonly imported as `SystemUtils`):

```javascript
import SystemUtils from "../utils/cpr-systemUtils.js";

// Simple lookup — wraps game.i18n.localize
const label = SystemUtils.Localize("CPR.sheets.character.hitPoints");

// With interpolation — wraps game.i18n.format
const msg = SystemUtils.Format("CPR.messages.appliedDamage", { amount: 10 });

// Localize + notify the user (and log) in one call
SystemUtils.DisplayMessage(
  "error",
  SystemUtils.Localize("CPR.combatUtils.noCombatSelected")
);
```

In Handlebars templates, use the built-in helper:

```handlebars
<label>{{localize "CPR.sheets.character.hitPoints"}}</label>
```

**Rules:**

- Never hardcode display text — add a `CPR.*` key and reference it.
- **Only English is hand-edited, and only in `src/lang/en.json`.** Adding or changing a string means editing `en.json` and nothing else. Flag those changes for human review.
- **Never translate.** Do not add, edit, or populate the non-English files in `src/lang/` (`de.json`, `fr.json`, etc.) — translations are handled by the translation workflow, not by contributors or agents.
- **Never edit `src/babele/` files.** They are generated by an automated process (`npx gulp generateBabele`); hand edits will be overwritten. Change the source content/translation pipeline instead, never the generated output.

---

## Testing and Quality

There is currently **no JavaScript unit-test framework** (no Jest/Vitest/Mocha suite) in the repository. Quality is enforced by static analysis, the build, CI pipeline checks, and manual testing in Foundry.

### Local Checks

Run these before committing (see [Code Quality Checklist](#code-quality-checklist)):

| Check                                   | Command                                                      |
| --------------------------------------- | ------------------------------------------------------------ |
| Lint JS (ESLint flat config + Prettier) | `npm run lint`                                               |
| Format check (Prettier)                 | `npm run prettier`                                           |
| Format fix                              | `npm run prettier:fix`                                       |
| Lint CSS (stylelint)                    | `npm run stylelint`                                          |
| Lint Markdown (markdownlint)            | `npx markdownlint-cli --config .markdownlint.yaml "**/*.md"` |
| Static analysis (fallow)                | `fallow audit`                                               |
| Build                                   | `npm run build` (`npx gulp build`)                           |

### Static Analysis (fallow)

[fallow](https://github.com/fallow-rs/fallow) is a static analyzer that finds **unreachable code, unused files, and unused dependencies**, scoped to the runtime entry tree starting at `src/cpr.js`. It is configured in `.fallowrc.json`, which declares:

- `entry` — `src/cpr.js` (Foundry's real entry is `system.json`'s `esmodules`, which fallow can't auto-detect).
- `dynamicallyLoaded` — `src/modules/hooks/**/*.js`, since hooks are loaded via a computed dynamic `import()` that static analysis can't follow (see [Hooks](#hooks)).
- `ignorePatterns` / `ignoreDependencies` — the gulp build tooling and its build-time-only dependencies, which the runtime-scoped analysis would otherwise report as unused.

A repo hook (`.claude/hooks/fallow-gate.sh`) runs `fallow audit --gate-marker agent` and **blocks `git commit` / `git push` when the audit verdict is `fail`** (it requires `jq`, and fails open with a stderr notice on runtime errors).

> **Important — fallow was only recently configured, and the codebase still has many outstanding findings.** A fully clean audit is an aspiration, not the current state. The expectation is therefore directional: **don't introduce new findings**, and clear existing ones where you're already working. Don't treat a non-empty audit as a blanket reason to stop, and don't silence findings by broadening the ignore lists in `.fallowrc.json` unless the entry is genuinely build-tooling or dynamically loaded.

### Markdown

All Markdown files (`STYLE_GUIDE.md`, `CLAUDE.md`, `README`, docs) must lint clean under **markdownlint** using the repo's `.markdownlint.yaml`. The config is `default: true` with a few relaxations: `line-length` is disabled, `MD059` (descriptive link text) is off, and `MD026` allows a wider set of trailing heading punctuation. There is no npm script — run it directly:

```bash
npx markdownlint-cli --config .markdownlint.yaml "**/*.md"
```

This is enforced in CI by `.gitlab/pipeline_tests/test-markdown.sh`, which lints every `*.md` in the repo except generated/vendored trees (`dist/`, `node_modules/`, `.claude/`), the GitLab template directories, and `CHANGELOG.*.md`.

### CI Pipeline Checks

The GitLab pipeline runs the lint/format/build checks above plus shell-based validations in `.gitlab/pipeline_tests/` (template/handlebars validation, Markdown linting, localization key checks, JSON/YAML/CSS linting, compendium pack integrity, changelog checks). Keep these green; they are the system's regression net in the absence of unit tests.

### Manual Testing

Behavioural changes (sheets, rolls, combat, migrations) must be verified by hand in a running Foundry world. When changing persisted data shapes, test the migration path from a pre-change world, not just a fresh one.

### End-to-End Tests (Playwright)

Browser-level regression tests drive a real Foundry world to catch breakages like a sheet failing to render. They are **opt-in** locally (require a local Foundry install) and also run in CI (see **CI** below). The pieces:

- `tools/foundry-server/` — the harness (plain Node, _not_ tests): starts/stops Foundry and drives the startup gates.
- `tests/browser/` — the Playwright suite: lifecycle hooks (`setup.mjs`/`teardown.mjs`), a shared `fixtures.mjs`, and specs grouped by feature (`actors/`, `items/`, …).
- `.playwright/` — the Playwright + MCP config files and all generated output (the output is gitignored; the two config files are not).

**Setup.** Copy `foundryconfig.json.example` to `foundryconfig.json` and fill in the `foundry` block:

- `foundry.dataPath` — Foundry **user data** dir (where `Data/`, `Config/` live); the build also deploys the system here.
- `foundry.appPath` — your Foundry **application** install (the dir whose `resources/app/main.js` — or root `main.js` for older layouts — the launcher runs).
- `foundry.versionPrefix` — prefix for the `{VERSION}` placeholder (below); omit it to default to `v`, or set it to `""` for a bare version like `13`.
- `foundry.licenseKey` — your Foundry license key (used to pass the activation screen on a cold data dir).

**`{VERSION}` placeholder.** `dataPath` and `appPath` may contain `{VERSION}`, replaced anywhere it appears by `<versionPrefix><version>` (version from `src/system.json`'s `compatibility.verified`, overridable with `FOUNDRY_VERSION`) — so devs with different layouts can put the version wherever they keep per-version installs, e.g. `appPath: "/foundry/{VERSION}"` → `/foundry/v13`. For backwards compatibility, if `appPath` has **no** `{VERSION}`, the `<versionPrefix><version>` subdir is appended automatically (the historical `<appPath>/v13` behaviour).

Path values must be **absolute and literal** — `~`, `$HOME`, and `%LOCALAPPDATA%` are not expanded (`{VERSION}` is the only substitution). Each can be overridden by an env var: `FOUNDRY_DATA_PATH`, `FOUNDRY_APP_PATH`, `FOUNDRY_LICENSE_KEY`, `FOUNDRY_TEST_PORT` (default `30001`).

**Install browsers.** On most OSes: `npm run browser:install` (Linux may also need OS libs — `npx playwright install --with-deps chromium`). **On NixOS do _not_ run that** — the browsers come from `pkgs.playwright-driver.browsers` in `shell.nix`; just enter the dev shell. The `@playwright/test` version in `package.json` is pinned to match the nixpkgs `playwright-driver` (`nix eval --raw nixpkgs#playwright-driver.version`); bump both together.

**Run.** `npm run test:browser` builds the system into `foundry.dataPath` and runs the suite in **Chromium only** (headless Firefox can't supply the WebGL context Foundry initialises at startup, so it never reaches `game.ready`). It starts Foundry on the test port, drives the license → EULA → decline-data-sharing → setup gates (dismissing onboarding tours), creates and launches a throwaway `cyberpunk-red-<randomhash>` world, runs the specs, then stops Foundry and deletes that world.

**CI.** The `test-browser` job (`.gitlab/ci/test/test-browser.yml`) runs the suite on MRs and `dev` that touch rendering code, templates, styles, or the specs/harness — and on release tags. CI has no Foundry, so `.gitlab/pipeline_utils/download-foundry.sh` fetches the latest Node build of the generation in `src/system.json` using the `FOUNDRY_USER` / `FOUNDRY_PASS` / `FOUNDRY_LICENSE_KEY` CI/CD variables; results surface as a JUnit report.

**Lock constraint.** Foundry holds **exclusive LevelDB locks** on the open world _and_ on the system's compendium packs, so you cannot run the browser suite while a dev Foundry has the same `dataPath` open, and `gulp extractPacks` (or any pack-reading task) must run with **all** Foundry instances stopped.

**Writing specs.** Drive the **real UI** — create actors/items through the sidebar's create dialog rather than `Actor.create()`, so the system's own creation logic runs (created that way, a `character` gets its full skill/cyberware loadout; a bare `Actor.create()` produces an empty actor). The scene canvas is WebGL (Pixi) and invisible to the DOM, so assert on the resulting **HTML sheet**, not the canvas. CPR sheets are ApplicationV1, so open windows live in `ui.windows` (not `foundry.applications.instances`) — close them when done. Resolve document subtypes from `game.documentTypes` rather than hard-coding them.

**Driving Foundry live.** `npm run browser:serve` brings up a ready throwaway world and stays in the foreground; combined with the `playwright` MCP server in `.mcp.json`, an AI assistant can open sheets, click, and screenshot against it. The MCP drives a standalone Chromium via `PLAYWRIGHT_MCP_EXECUTABLE_PATH` (exported by `shell.nix`), so on NixOS launch the editor/agent from inside the dev shell.

### If You Add Unit Tests

There is no unit-test harness, so introducing one is a deliberate decision — discuss it with maintainers first. Pure helpers in `src/modules/utils` (which avoid Foundry globals) are the most natural candidates.

---

## FoundryVTT Integration

### Bootstrap Flow

`src/cpr.js` is the single entry point. The `init` hook registers everything; the `ready` hook runs migrations; `registerHooks()` wires the rest at module load.

```javascript
// src/cpr.js (abridged)
const { Actors, Items } = foundry.documents.collections;

Hooks.once("init", async () => {
  // 1. Register CPR document sheets and make them default for their types
  Actors.registerSheet(game.system.id, CPRCharacterActorSheet, {
    label: SystemUtils.Localize("CPR.sheets.characterSheet"),
    types: ["character"],
    makeDefault: true,
  });
  Items.registerSheet(game.system.id, CPRItemSheet, {
    types: [
      /* ... */
    ],
    makeDefault: true,
  });

  // 2. Document classes (routed by the entity-factory proxies)
  CONFIG.Actor.documentClass = actorConstructor;
  CONFIG.Item.documentClass = itemConstructor;
  CONFIG.Combat.documentClass = CPRCombat;

  // 3. Data models, per type
  CONFIG.Actor.dataModels.character = CharacterDataModel;
  CONFIG.Item.dataModels.weapon = WeaponDataModel;

  // 4. The public API namespace
  game.cpr = {
    apps: {
      /* sheets */
    },
    macro: CPRMacro,
    api: initalizeAPI(),
  };

  // 5. Templates, helpers, settings — then migrations
  preloadHandlebarsTemplates();
  registerHandlebarsHelpers();
  registerSystemSettings();
  MigrationRunner.instantiate();
});

Hooks.once("ready", async () => {
  // GM-only world migration
  if (!game.user.isGM) return;
  const MR = game.cpr.MigrationRunner;
  if (MR.needsMigration) await MR.migrateWorld();
});

registerHooks();
```

### The `game.cpr` Namespace

The system exposes its public surface on `game.cpr` (sheets, macro helpers, and the API returned by `initalizeAPI()`). Macros and other modules consume the system through this namespace; the generated JSDoc docs cover `src/modules/api`.

### Migrations

Data-shape changes are handled by versioned scripts under `src/modules/system/migrate/scripts/`, orchestrated by the `MigrationRunner`. When you change a DataModel in a way that affects existing worlds, add a migration script rather than relying on field defaults alone.

---

## Code Quality Checklist

### Before Committing

- [ ] `npm run lint` passes (ESLint flat config + Prettier)
- [ ] `npm run prettier` passes (or run `npm run prettier:fix`)
- [ ] `npm run stylelint` passes for any CSS changes
- [ ] Markdown files lint clean (`npx markdownlint-cli --config .markdownlint.yaml`) for any `.md` changes
- [ ] `npm run build` succeeds
- [ ] `fallow audit` introduces no new findings (the commit/push gate enforces this; the existing backlog is expected)
- [ ] New code follows existing patterns and naming conventions
- [ ] Relative imports include the `.js` extension
- [ ] No Foundry globals are imported (`game`, `CONFIG`, `Hooks`, …)
- [ ] Public classes/methods have JSDoc blocks
- [ ] No hardcoded user-facing strings — all via `CPR.*` localization keys
- [ ] New `CPR.*` keys added to `src/lang/en.json` only — no other `src/lang/` translation files edited, no `src/babele/` files touched (flagged for review)
- [ ] Persisted data shape changes ship with a migration script
- [ ] Manually verified in a running Foundry world

### Pre-Review Extraction Checks

Use these as a pre-review gate to keep files focused:

**Constants:**

- [ ] No magic numbers or repeated enum literals → add to the `CPR` config object in `src/modules/system/config.js`
- [ ] Schema `choices` reference `Object.keys(CPR.someEnum)` rather than inline arrays

**Utilities:**

- [ ] Pure helpers used by 2+ files are extracted to a static class in `src/modules/utils/`
- [ ] Cohesive clusters of related helpers live in one utility class (not micro-files)

**Data models:**

- [ ] Repeated field groups are factored into schema mixins/components
- [ ] Fields set explicit `required`/`nullable`/`initial` options

**Sheets / Applications (ApplicationV2):**

- [ ] Configured via static `DEFAULT_OPTIONS` / `PARTS`, context built in `_prepareContext`
- [ ] HTML fields are enriched via `TextEditor.enrichHTML`
- [ ] Click interactions use declarative `actions` rather than manual `_onRender` listeners where possible
- [ ] Shared partials are preloaded in `preload-templates.js`
- [ ] No inline `style=`, presentational tags (`<b>`, `<i>`, `&nbsp;`, …), or `title=` in templates — use CSS classes and `data-tooltip`

---

## Quick Reference

### Document Class Template

```javascript
import LOGGER from "../utils/cpr-logger.js";

/**
 * Brief description of this document type.
 *
 * @extends {CPRActor}
 */
export default class CPRExampleActor extends CPRActor {
  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    this._prepareExampleData();
  }

  /** @private */
  _prepareExampleData() {
    // ...
  }
}
```

### Application / Sheet Template (ApplicationV2)

```javascript
import CPR from "../system/config.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class CPRExampleApp extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: "cpr-example",
    tag: "div",
    position: { width: 715, height: "auto" },
    window: { title: "CPR.example.title", resizable: true },
    actions: { roll: CPRExampleApp.onRoll },
  };

  static PARTS = {
    body: {
      template: `systems/${CPR.systemId}/templates/apps/cpr-example.hbs`,
    },
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    // context.* = ...
    return context;
  }

  /** @param {PointerEvent} event @param {HTMLElement} target */
  static onRoll(event, target) {
    // ...
  }
}
```

### Data Model Template

```javascript
import CPRSystemDataModel from "../system-data-model.js";
import CommonSchema from "./mixins/common-schema.js";

export default class ExampleDataModel extends CPRSystemDataModel.mixin(
  CommonSchema
) {
  static defineSchema() {
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      quantity: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 1,
        min: 0,
      }),
    });
  }
}
```

### Utility Class Template

```javascript
import LOGGER from "./cpr-logger.js";

/** Brief description of what this utility group does. */
export default class CPRExampleUtils {
  /**
   * Brief description.
   *
   * @param {InputType} input - description
   * @returns {OutputType} description
   */
  static doSomething(input) {
    // ...
  }
}
```

### Hook Template

```javascript
import SystemUtils from "../../utils/cpr-systemUtils.js";

const ExampleHook = () => {
  Hooks.on("someFoundryHook", (document) => {
    // ...
  });
};

export default ExampleHook;
// Remember to register the path in src/modules/system/hooks.js
```

---

## Shared Code Inventory

> **Note:** This list is a snapshot. Check the actual directories for the current inventory before creating something new. Utilities are static classes (default exports) unless noted; the common import alias is shown where it differs from the class name.

### Shared Utilities

| Utility                                | Location                                    | Purpose                                                                                                                                     |
| -------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `LOGGER`                               | `src/modules/utils/cpr-logger.js`           | Prefixed console logging; `debug`/`trace` gated behind the `debugLogs`/`traceLogs` settings. Use instead of `console.*`                     |
| `CPRSystemUtils` (alias `SystemUtils`) | `src/modules/utils/cpr-systemUtils.js`      | Broad system helpers: `Localize()`, `Format()`, `DisplayMessage()`, compendium/folder lookups, themes (`GetThemes`/`SetTheme`), `slugify()` |
| `CPRActorUtils`                        | `src/modules/utils/ActorUtils.js`           | Actor calculations and creation, e.g. `calculateArmorSP()`, `createBlackIceActor()`                                                         |
| `CPRSheetUtils`                        | `src/modules/utils/SheetUtils.js`           | Sheet/UI sizing helpers: `setCssClassWidth()`, `adjustFontSizeToFit()`                                                                      |
| `CPRTextUtils` (alias `TextUtils`)     | `src/modules/utils/TextUtils.js`            | Text sanitization: `stripHTML()`, `sanitizeEnrichedText()`, `toTitleCase()`                                                                 |
| `CPRCombatUtils`                       | `src/modules/utils/cpr-combatUtils.js`      | Combat/initiative helpers, e.g. `GetBestInit()`                                                                                             |
| `CPRMacro`                             | `src/modules/utils/cpr-macros.js`           | Macro execution, e.g. `rollItemMacro()`                                                                                                     |
| `createImageContextMenu`               | `src/modules/utils/cpr-imageContextMenu.js` | Builds the image right-click context menu (named function export)                                                                           |
| `Rules`                                | `src/modules/utils/cpr-rules.js`            | Rule validation: `lawyer(rule, msg)` warns when a rule condition fails                                                                      |
| `Progress`                             | `src/modules/utils/Progress.js`             | Instantiable progress-bar UI (`advance()`, `close()`, `Progress.createElement()`)                                                           |

### Configuration

| Symbol | Location                       | Purpose                                                                                                                                           |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CPR`  | `src/modules/system/config.js` | System config namespace object: `systemId`, stat/role/skill enums, themes, and other localization-keyed lists. Imported where needed (not global) |

### Rolls

| Symbol                     | Location                             | Purpose                                                                |
| -------------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| `CPRRoll` (and subclasses) | `src/modules/rolls/cpr-rolls.js`     | Generic CPR roll object layering crit success/failure on Foundry rolls |
| `CPRMod`                   | `src/modules/rolls/cpr-modifiers.js` | Roll modifier construction and aggregation                             |

### System Bootstrap Helpers

| Symbol                                | Location                                  | Purpose                                                                        |
| ------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------ |
| `registerHooks`                       | `src/modules/system/hooks.js`             | Dynamically imports and registers every hook module; called once from `cpr.js` |
| `preloadHandlebarsTemplates`          | `src/modules/system/preload-templates.js` | Preloads partial/dynamic templates                                             |
| `registerHandlebarsHelpers`           | `src/modules/system/register-helpers.js`  | Registers custom Handlebars helpers (`cprCompare`, `cprIsEmpty`, …)            |
| `registerSystemSettings`              | `src/modules/system/settings.js`          | Registers all `game.settings` entries                                          |
| `actorConstructor`, `itemConstructor` | `src/modules/entity-factory.js`           | Proxies routing document construction to the correct type subclass             |
| `MigrationRunner`                     | `src/modules/system/migrate/migration.js` | Orchestrates versioned world data migrations                                   |

### Document Data Model Base

| Symbol               | Location                                      | Purpose                                                                                                                    |
| -------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `CPRSystemDataModel` | `src/modules/datamodels/system-data-model.js` | Base data model providing `.mixin()` composition, `mergeSchema()`, and `migrateData()` chaining for all actor/item schemas |
