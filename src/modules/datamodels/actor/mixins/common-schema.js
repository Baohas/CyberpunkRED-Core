import CPRSystemDataModel from "../../system-data-model.js";
import SystemUtils from "../../../utils/cpr-systemUtils.js";
import CPRMod from "../../../rolls/cpr-modifiers.js";

import StatsSchema from "../components/stats-schema.js";
import ExternalResourceSchema from "../components/external-resource-schema.js";
import LedgerSchema from "../components/ledger-schema.js";
import ActorWeaponsSchema from "../components/weapons-schema.js";

export default class CommonSchema extends CPRSystemDataModel {
  static mixinName = "common";

  static defineSchema() {
    const { fields } = foundry.data;
    return {
      /**
       *  !IMPORTANT!
       *
       *  Do not alphabetise these, we need them in this order to order them
       *  correctly on the character sheet.
       */
      stats: new fields.EmbeddedDataField(StatsSchema),
      externalData: new fields.SchemaField({
        currentArmorBody: new fields.SchemaField(
          ExternalResourceSchema.defineSchema(),
        ),
        currentArmorHead: new fields.SchemaField(
          ExternalResourceSchema.defineSchema(),
        ),
        currentArmorShield: new fields.SchemaField(
          ExternalResourceSchema.defineSchema(),
        ),
        currentWeapon: new fields.SchemaField(
          ExternalResourceSchema.defineSchema(),
        ),
      }),
      information: new fields.SchemaField({
        alias: new fields.HTMLField({ initial: "" }),
        description: new fields.HTMLField({ initial: "" }),
        history: new fields.HTMLField({ initial: "" }),
        notes: new fields.HTMLField({ initial: "" }),
      }),
      reputation: new fields.SchemaField(LedgerSchema.defineSchema()),
      roleInfo: new fields.SchemaField({
        activeNetRole: new fields.DocumentIdField({
          required: true,
          blank: true,
        }),
        activeRole: new fields.StringField({
          required: true,
          blank: true,
        }),
      }),
      weapons: new fields.EmbeddedDataField(ActorWeaponsSchema),
    };
  }

  /**
   * Fold the former `system.derivedStats.*` fields into `system.stats.*` — they now sit alongside the
   * ten base STATs in a single `stats` object.
   *
   * This runs during data cleaning, which happens BEFORE Foundry v13 strips the now-unknown
   * `derivedStats` key from the source, so existing actors keep their values. A version-gated migration
   * cannot do this on its own: it reads `document.toObject()`, by which point `derivedStats` is already
   * gone. Idempotent — a no-op once an actor is folded.
   *
   * @param {object} source - the actor's `system` source data
   * @returns {object} the migrated source
   */
  static migrateData(source) {
    if (source.derivedStats) {
      source.stats ??= {};
      for (const [key, value] of Object.entries(source.derivedStats)) {
        source.stats[key] ??= value;
      }
      delete source.derivedStats;
    }
    return super.migrateData(source);
  }

  /**
   * Retrieves a structured collection of skills from the actor to display
   * level, base, and modifier totals.
   *
   * `level` is the level of the skill item
   * `base` is the level of the relevant STAT
   * `mods` are the total relevant mods applied by Active Effects.
   *        We only count those that add/subtract from a skill and if an
   *        Active Effect is situational we only count the ones that are
   *        on by default.
   *
   * NOTE: This may need refactoring if/when we introduce overrides
   *       like `set` for things like `Skill Chips`.
   *
   * @returns {Object} An object representing the collection of skills.
   * Each key in this object is a slugified version of the skill name,
   *
   * Example of returned object structure:
   * {
   *   "skillName": {
   *     level: Number,
   *     base: Number,
   *     mods: Number
   *   },
   *   ...
   * }
   */
  get skills() {
    const skills = this.parent.itemTypes.skill;

    const effects = Array.from(this.parent.allApplicableEffects());
    const allMods = CPRMod.getAllModifiers(effects);
    const filteredMods = allMods.filter(
      (m) => !m.isSituational || (m.isSituational && m.onByDefault),
    );

    const output = {};

    // Get the level and base (STAT) of each Skill
    for (const skill of skills) {
      // Get the total Mods from Active Effects
      const skillMods = CPRMod.getRelevantMods(
        filteredMods,
        SystemUtils.slugify(skill.name),
      ).reduce((acc, mod) => {
        if (mod.changeMode === 2) {
          return acc + mod.value;
        }
        return acc;
      }, 0);

      output[SystemUtils.slugify(skill.name)] = {
        level: skill.system.level,
        stat: this.parent.system.stats[skill.system.stat].value,
        mods: skillMods,
      };
    }

    return output;
  }
}
