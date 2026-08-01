import CPR from "../../../system/config.js";
import CPRSystemDataModel from "../../system-data-model.js";
import SystemUtils from "../../../utils/cpr-systemUtils.js";
import StatSchema from "./stat-schema.js";
import HpSchema from "./hp-schema.js";

/**
 * Resolve a display skill name from its slug: the localized name, or — for a custom/untranslated
 * skill — the matching owned skill item's name.
 *
 * @param {Actor} actorData - the actor being checked
 * @param {string} skillSlug - the slugified skill name
 * @returns {string}
 */
function getHardenedSkillName(actorData, skillSlug) {
  const translatedSkill = SystemUtils.Localize(
    `CPR.global.itemType.skill.${skillSlug}`,
  );
  // A mismatch means a custom skill with no translation; fall back to the owned item's name.
  if (SystemUtils.slugify(translatedSkill) !== skillSlug) {
    const skillItem = actorData.items.find(
      (item) => SystemUtils.slugify(item.name) === skillSlug,
    );
    return skillItem.name;
  }
  return translatedSkill;
}

/** Hardened reason: REF ≥ 8 and Evasion ≥ 6. */
function hardenedRefEvasion(actorData) {
  const { evasion } = actorData.system.skills;
  if (
    actorData.system.stats.ref.value >= 8 &&
    evasion &&
    evasion.level + evasion.mods >= 6
  )
    return [
      SystemUtils.Format(
        "CPR.characterSheet.leftPane.hardened.reasons.refAndEvasion",
        {
          ref: SystemUtils.Localize("CPR.global.stats.ref"),
          evasion: SystemUtils.Localize("CPR.global.itemType.skill.evasion"),
        },
      ),
    ];
  return [];
}

/** Hardened reasons: any attack skill with STAT + level + mods ≥ 15. */
function hardenedAttackSkills(actorData) {
  const reasons = [];
  for (const skill of SystemUtils.GetAttackableSkills(actorData)) {
    const s = actorData.system.skills[skill];
    if (s.level + s.stat + s.mods >= 15)
      reasons.push(
        SystemUtils.Format(
          "CPR.characterSheet.leftPane.hardened.reasons.canAttack",
          { skillName: getHardenedSkillName(actorData, skill) },
        ),
      );
  }
  return reasons;
}

/** Hardened reason: WILL + BODY ≥ 16. */
function hardenedWillBody(actorData) {
  if (
    actorData.system.stats.will.value + actorData.system.stats.body.value >=
    16
  )
    return [
      SystemUtils.Format(
        "CPR.characterSheet.leftPane.hardened.reasons.willBody",
        {
          will: SystemUtils.Localize("CPR.global.stats.will"),
          body: SystemUtils.Localize("CPR.global.stats.body"),
        },
      ),
    ];
  return [];
}

/** Hardened reasons: any owned weapon worth ≥ 5000eb. */
function hardenedWeaponValue(actorData) {
  const reasons = [];
  for (const weapon of actorData.system.weapons.available) {
    if (weapon.system.price.market >= 5000)
      reasons.push(
        SystemUtils.Format(
          "CPR.characterSheet.leftPane.hardened.reasons.weaponValue",
          { weaponName: weapon.name },
        ),
      );
  }
  return reasons;
}

/** Hardened reason: DEX ≥ 8 and MOVE ≥ 8. */
function hardenedDexMove(actorData) {
  if (
    actorData.system.stats.dex.value >= 8 &&
    actorData.system.stats.move.value >= 8
  )
    return [
      SystemUtils.Format(
        "CPR.characterSheet.leftPane.hardened.reasons.dexPlusMove",
        {
          dex: SystemUtils.Localize("CPR.global.stats.dex"),
          move: SystemUtils.Localize("CPR.global.stats.move"),
        },
      ),
    ];
  return [];
}

/** Hardened reasons: Autofire (if present) or any Martial Arts skill ≥ 6. */
function hardenedAutofireMartialArts(actorData) {
  const attackSkills = SystemUtils.GetAttackableSkills(actorData);
  const martialArtSkills = SystemUtils.GetMartialArtSkills(actorData);
  // Elflines characters lack the autofire skill, so only include it when present.
  const skillsToCheck = attackSkills.has("autofire")
    ? [...martialArtSkills, "autofire"]
    : martialArtSkills;
  const reasons = [];
  for (const skill of skillsToCheck) {
    const s = actorData.system.skills[skill];
    if (s.level + s.mods >= 6)
      reasons.push(
        SystemUtils.Format(
          "CPR.characterSheet.leftPane.hardened.reasons.autofireMartialArts",
          { skillName: getHardenedSkillName(actorData, skill) },
        ),
      );
  }
  return reasons;
}

/** Hardened reason: a Solo role of rank ≥ 4. */
function hardenedSolo(actorData) {
  const reasons = [];
  for (const role of actorData.itemTypes.role) {
    if (SystemUtils.slugify(role.name) === "solo" && role.system.rank >= 4)
      reasons.push(
        SystemUtils.Format(
          "CPR.characterSheet.leftPane.hardened.reasons.solo",
          {
            roleName: SystemUtils.Localize("CPR.global.role.solo.name"),
          },
        ),
      );
  }
  return reasons;
}

export default class StatsSchema extends CPRSystemDataModel {
  static defineSchema() {
    const { fields } = foundry.data;
    const includeMax = true;
    return {
      /**
       *  !IMPORTANT!
       *
       *  Do not alphabetise these, we need them in this order to order them
       *  correctly on the character sheet.
       */
      int: new fields.SchemaField(StatSchema.defineSchema()),
      ref: new fields.SchemaField(StatSchema.defineSchema()),
      dex: new fields.SchemaField(StatSchema.defineSchema()),
      tech: new fields.SchemaField(StatSchema.defineSchema()),
      cool: new fields.SchemaField(StatSchema.defineSchema()),
      will: new fields.SchemaField(StatSchema.defineSchema()),
      luck: new fields.SchemaField(StatSchema.defineSchema({ includeMax })),
      move: new fields.SchemaField(StatSchema.defineSchema()),
      body: new fields.SchemaField(StatSchema.defineSchema()),
      emp: new fields.SchemaField(
        StatSchema.defineSchema({ includeMax, min: -10 }),
      ),
      currentWoundState: new fields.StringField({
        choices: Object.keys(CPR.woundState),
      }),
      deathSave: new fields.SchemaField({
        basePenalty: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: false,
          initial: 0,
          min: 0,
        }),
        penalty: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: false,
          initial: 0,
          min: 0,
        }),
        value: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: false,
          initial: 0,
          min: 0,
        }),
      }),
      hp: new fields.SchemaField(HpSchema.defineSchema()),
      humanity: new fields.SchemaField({
        max: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: false,
          initial: 60,
          min: 0,
        }),
        transactions: new fields.ArrayField(
          new fields.ArrayField(
            new fields.StringField({ required: true, blank: true }),
          ),
        ),
        value: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: false,
          initial: 60,
          min: -100, // Humanity can be negative. See Tales of the Red
        }),
      }),
      run: new fields.SchemaField({
        value: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: false,
          initial: 24,
          min: 0,
        }),
      }),
      seriouslyWounded: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        positive: false,
        initial: 20,
        min: 0,
      }),
      walk: new fields.SchemaField({
        value: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: false,
          initial: 12,
          min: 0,
        }),
      }),
    };
  }

  /**
   * Calculates if the character is 'Hardened' based on various stats, skills,
   * or item properties.
   *
   * @returns {Object} An object containing a boolean `value` indicating if
   *                   the character is hardened, and an array of `reasons`
   *                   explaining why this status was granted.
   */
  get isHardened() {
    const actorData = this.parent.parent;
    const reasons = [
      ...hardenedRefEvasion(actorData),
      ...hardenedAttackSkills(actorData),
      ...hardenedWillBody(actorData),
      ...hardenedWeaponValue(actorData),
      ...hardenedDexMove(actorData),
      ...hardenedAutofireMartialArts(actorData),
      ...hardenedSolo(actorData),
    ];
    return { value: reasons.length > 0, reasons };
  }
}
