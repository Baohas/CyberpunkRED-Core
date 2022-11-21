import * as CPRRolls from "../../rolls/cpr-rolls.js";
import CPRItem from "../cpr-item.js";
import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import CPRMod from "../../rolls/cpr-modifiers.js";

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
        roleValue = Number.parseInt(cprItemData.rank, 10);
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
      roleValue = Number.parseInt(subRoleAbility.rank, 10);
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

    const effects = actor.effects.contents;
    const allMods = CPRMod.getAllModifiers(effects);
    const filteredMods = allMods.filter((m) => !m.isSituational || (m.isSituational && m.onByDefault));

    const skillMods = CPRMod.getRelevantMods(filteredMods, SystemUtils.slugify(skillName), "AeBonus");
    const roleMods = CPRMod.getRelevantMods(filteredMods, SystemUtils.slugify(roleName), "AeBonus");

    const cprRoll = new CPRRolls.CPRRoleRoll(roleName, roleValue, skillName, skillValue, statName, statValue, skillList);
    cprRoll.addMod(skillMods); // add skill bonuses from Active Effects
    cprRoll.addMod(roleMods); // add role bonuses from Active Effects
    cprRoll.addMod([{ value: actor.getWoundStateMods(), source: "Wound State Penalty" }]);
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
    const roleSkillBonusArray = [];
    const roleSkillBonus = this.system.bonuses.find((b) => b.name === skillName);
    if (roleSkillBonus) {
      const value = Math.floor(this.system.rank / this.system.bonusRatio);
      const source = this.system.mainRoleAbility;
      roleSkillBonusArray.push({
        value,
        source,
        key: `bonuses.${SystemUtils.slugify(skillName)}`,
        category: "skill",
      });
    }
    // check whether a sub-ability of a role has the bonuses property. They might affect skills.
    this.system.abilities.forEach((a) => {
      if (a.bonuses?.find((b) => b.name === skillName)) {
        const value = Math.floor(a.rank / a.bonusRatio);
        const source = a.name;
        roleSkillBonusArray.push({
          value,
          source,
          key: `bonuses.${SystemUtils.slugify(skillName)}`,
          category: "skill",
        });
      }
    });
    return roleSkillBonusArray;
  }
}
