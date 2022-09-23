import * as CPRRolls from "../../rolls/cpr-rolls.js";
import CPRItem from "../cpr-item.js";
import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";

/**
 * Extend the CPRSkillItem object with things specific to character roles.
 *
 * @extends {CPRSkillItem}
 */
export default class CPRRoleItem extends CPRItem {
  /**
   * Create a CPRRole object appropriate for rolling an ability associated with this role
   *
   * @param {String} rollType - an identifier for the type of role roll being performed
   * @param {CPRCharacterActor} actor - the actor associated with this role item
   * @param {Object} rollInfo - magic object with more role configuration data
   * @returns {CPRRoll}
   */
  _createRoleRoll(rollType, actor, rollInfo) {
    LOGGER.trace("_createRoleRoll | CPRRoleItem | Called.");
    const cprItemData = this.system;
    let roleName = cprItemData.mainRoleAbility;
    let statName = "--";
    let skillName = "--";
    let skillList;
    let roleValue = 0;
    let statValue = 0;
    let skillValue = 0;
    if (rollInfo.rollSubType === "mainRoleAbility") {
      if (cprItemData.addRoleAbilityRank) {
        roleValue = cprItemData.rank;
      }
      if (cprItemData.stat !== "--") {
        statName = cprItemData.stat;
        statValue = actor.getStat(statName);
      }
      if (cprItemData.skill !== "--" && cprItemData.skill !== "varying") {
        skillName = cprItemData.skill;
        const skillObject = actor.itemTypes.skill.find((i) => skillName === i.name);
        if (skillObject !== undefined) {
          skillValue = skillObject.system.level;
        } else {
          SystemUtils.DisplayMessage("error", SystemUtils.Localize("CPR.noskillbythatname"));
        }
      } else if (cprItemData.skill === "varying") {
        skillName = "varying";
        if (cprItemData.stat !== "--") {
          skillList = actor.itemTypes.skill.filter((s) => s.system.stat === cprItemData.stat);
        } else {
          skillList = actor.itemTypes.skill;
        }
      }
    }

    if (rollInfo.rollSubType === "subRoleAbility") {
      const subRoleAbility = cprItemData.abilities.find((a) => a.name === rollInfo.subRoleName);
      roleName = subRoleAbility.name;
      roleValue = subRoleAbility.rank;
      if (subRoleAbility.stat !== "--") {
        statName = subRoleAbility.stat;
        statValue = actor.getStat(statName);
      }
      if (subRoleAbility.skill !== "--" && subRoleAbility.skill !== "varying") {
        skillName = subRoleAbility.skill.name;
        const skillObject = actor.itemTypes.skill.find((i) => skillName === i.name);
        if (skillObject !== undefined) {
          skillValue = skillObject.system.level;
        } else {
          SystemUtils.DisplayMessage("error", SystemUtils.Localize("CPR.noskillbythatname"));
        }
      } else if (subRoleAbility.skill === "varying") {
        skillName = "varying";
        if (subRoleAbility.stat !== "--") {
          skillList = actor.itemTypes.skill.filter((s) => s.system.stat === subRoleAbility.stat);
        } else {
          skillList = actor.itemTypes.skill;
        }
      }
    }

    const cprRoll = new CPRRolls.CPRRoleRoll(roleName, roleValue, skillName, skillValue, statName, statValue, skillList);
    cprRoll.addMod(actor.bonuses[SystemUtils.slugify(skillName)]); // add skill bonuses from Active Effects
    cprRoll.addMod(actor.bonuses[SystemUtils.slugify(roleName)]); // add role bonuses from Active Effects
    cprRoll.addMod(actor.getWoundStateMods());
    return cprRoll;
  }

  /**
   * Given the name of a skill, look up the role and subRole bonuses and see if any should
   * be applied to the skill. If they do, sum them up and return the bonus.
   *
   * @param {String} skillName - name of the skill to look for
   * @return {Array} - a tuple, the first is a list of related role abilities, the second being total bonuses
   */
  getSkillBonuses(skillName) {
    LOGGER.trace("getSkillBonuses | CPRRoleItem | Called.");
    // some role abilities modify skills too, so we account for that here
    let roleName;
    let roleValue = 0;
    const roleSkillBonuses = this.system.bonuses.filter((b) => b.name === skillName);
    if (roleSkillBonuses.length > 0) {
      roleValue += Math.floor(this.system.rank / this.system.bonusRatio);
      roleName = this.system.mainRoleAbility;
    }
    // check whether a sub-ability of a role has the bonuses property. They might affect skills.
    const subroleSkillBonuses = [];
    this.system.abilities.forEach((a) => {
      if ("bonuses" in a) {
        a.bonuses.forEach((b) => {
          if (b.name === skillName) subroleSkillBonuses.push(a);
        });
      }
    });
    if (subroleSkillBonuses.length > 0) {
      subroleSkillBonuses.forEach((b, index) => {
        if (roleName) {
          roleName += `, ${b.name}`;
        } else if (index === 0) {
          roleName = b.name;
        }
        roleValue += Math.floor(b.rank / b.bonusRatio);
      });
    }
    return [roleName, roleValue];
  }
}
