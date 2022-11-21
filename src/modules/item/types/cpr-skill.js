import * as CPRRolls from "../../rolls/cpr-rolls.js";
import CPR from "../../system/config.js";
import CPRItem from "../cpr-item.js";
import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import CPRMod from "../../rolls/cpr-modifiers.js";

/**
 * Extend the base CPRItem object with things specific to actor skills.
 * @extends {CPRItem}
 */
export default class CPRSkillItem extends CPRItem {
  /**
   * Set the skill value. Called when edited in the actor sheet.
   *
   * @callback
   * @param {Number} value
   */
  setSkillLevel(value) {
    LOGGER.trace("setSkillLevel | CPRSkillItem | Called.");
    this.getRollData().level = Math.clamped(-99, value, 99);
  }

  /**
   * Create a CPRRoll object with the right type and mods for this skill.
   *
   * @param {CPRActor} actor - the actor this skill is associated with
   * @returns {CPRRoll}
   */
  _createSkillRoll(actor) {
    LOGGER.trace("_createSkillRoll | CPRSkillItem | Called.");
    const cprItemData = this.system;
    const statName = cprItemData.stat;
    const niceStatName = SystemUtils.Localize(CPR.statList[statName]);
    const statValue = actor.getStat(statName);
    const skillName = this.name;
    const skillLevel = cprItemData.level;

    const effects = actor.effects.contents;
    const allMods = CPRMod.getAllModifiers(effects);
    const filteredMods = allMods.filter((m) => !m.isSituational || (m.isSituational && m.onByDefault));

    const skillMods = CPRMod.getRelevantMods(filteredMods, SystemUtils.slugify(skillName), "AeBonus");

    let roleSkillMods = [];
    actor.itemTypes.role.forEach((r) => {
      roleSkillMods = roleSkillMods.concat(r.getSkillBonuses(skillName));
    });

    const cprRoll = new CPRRolls.CPRSkillRoll(niceStatName, statValue, skillName, skillLevel);
    cprRoll.addMod([{ value: actor.getArmorPenaltyMods(statName), source: `Armor Penalty (${niceStatName})` }]);
    cprRoll.addMod([{ value: actor.getWoundStateMods(), source: "Wound State Penalty" }]);
    cprRoll.addMod(roleSkillMods);
    cprRoll.addMod(skillMods); // active effects
    return cprRoll;
  }
}
