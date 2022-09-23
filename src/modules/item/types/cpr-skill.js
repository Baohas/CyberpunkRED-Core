import * as CPRRolls from "../../rolls/cpr-rolls.js";
import CPR from "../../system/config.js";
import CPRItem from "../cpr-item.js";
import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";

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
    let roleName;
    let roleValue = 0;

    actor.itemTypes.role.forEach((r) => {
      const [rn, rv] = r.getSkillBonuses(skillName);
      if (rn) {
        if (roleName) {
          roleName += `, ${rn}`;
        } else {
          roleName = rn;
        }
        roleValue += rv;
      }
    });

    const cprRoll = new CPRRolls.CPRSkillRoll(niceStatName, statValue, skillName, skillLevel, roleName, roleValue);
    cprRoll.addMod(actor.getArmorPenaltyMods(statName));
    cprRoll.addMod(actor.getWoundStateMods());
    cprRoll.addMod(actor.getUpgradeMods(statName));
    cprRoll.addMod(actor.getUpgradeMods(skillName));
    cprRoll.addMod(actor.bonuses[SystemUtils.slugify(skillName)]); // active effects
    return cprRoll;
  }
}
