import * as CPRRolls from "../../rolls/cpr-rolls.js";
import CPR from "../../system/config.js";
import CPRItem from "../cpr-item.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import CPRMod from "../../rolls/cpr-modifiers.js";

/**
 * Resolve the `{ statValue, skillLevel }` base for a skill roll. Sourced from the actor's
 * `system.skills` getter (the single canonical place the base is computed, and the seam a future
 * Combat-Number capability would override), falling back to the raw STAT/level for any actor whose
 * data model doesn't expose the getter.
 *
 * @param {CPRActor} actor - the actor making the roll
 * @param {string} statName - the skill's linked stat
 * @param {string} skillName - the skill's name
 * @param {object} skillData - the skill item's `system`
 * @returns {{statValue:number, skillLevel:number}}
 */
function resolveSkillBase(actor, statName, skillName, skillData) {
  const base = actor.system.skills?.[SystemUtils.slugify(skillName)] ?? {};
  return {
    statValue: base.stat ?? actor.getStat(statName),
    skillLevel: resolveSkillLevel(base, skillData),
  };
}

/**
 * The skill level from the resolved base, falling back to the parsed skill-item level.
 *
 * @param {object} base - the resolved skill base (may be empty)
 * @param {object} skillData - the skill item's `system`
 * @returns {number}
 */
function resolveSkillLevel(base, skillData) {
  return base.level ?? Number.parseInt(skillData.level, 10);
}

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
  async setSkillLevel(value) {
    await this.update({ "system.level": Math.clamp(-99, value, 99) });
  }

  /**
   * Create a CPRRoll object with the right type and mods for this skill.
   *
   * @param {CPRActor} actor - the actor this skill is associated with
   * @returns {CPRRoll}
   */
  _createSkillRoll(actor) {
    const cprItemData = this.system;
    const statName = cprItemData.stat;
    const niceStatName = SystemUtils.Localize(CPR.statList[statName]);
    const skillName = this.name;
    const { statValue, skillLevel } = resolveSkillBase(
      actor,
      statName,
      skillName,
      cprItemData,
    );

    const filteredMods = CPRMod.getActiveMods(actor);

    const skillMods = CPRMod.getRelevantMods(filteredMods, [
      SystemUtils.slugify(skillName),
      `${SystemUtils.slugify(skillName)}Hearing`,
      `${SystemUtils.slugify(skillName)}Sight`,
    ]);

    const allActionsMods = CPRMod.getRelevantMods(filteredMods, [
      "allActions",
      "allActionsSpeech",
      "allActionsHands",
    ]);

    // Get all mods for skills from role abilities and subRole abilities.
    let roleSkillMods = [];
    actor.itemTypes.role.forEach((r) => {
      roleSkillMods = roleSkillMods.concat(r.getRoleMods(skillName));
    });
    roleSkillMods = roleSkillMods.filter(
      (m) => !m.isSituational || (m.isSituational && m.onByDefault),
    );

    const cprRoll = CPRRolls.CPRSkillRoll.create(
      niceStatName,
      statValue,
      skillName,
      skillLevel,
    );
    cprRoll.addMod([
      {
        value: actor.getArmorPenaltyMods(statName),
        source: SystemUtils.Format("CPR.rolls.modifiers.sources.armorPenalty", {
          stat: niceStatName,
        }),
      },
    ]);
    cprRoll.addMod([
      {
        value: actor.getWoundStateMods(),
        source: SystemUtils.Localize(
          "CPR.rolls.modifiers.sources.woundStatePenalty",
        ),
      },
    ]);
    cprRoll.addMod(roleSkillMods);
    cprRoll.addMod(skillMods); // active effects
    cprRoll.addMod(allActionsMods); // Mods that affect all actions.
    return cprRoll;
  }
}
