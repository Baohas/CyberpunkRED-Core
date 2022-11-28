/* eslint-disable max-classes-per-file */
/* global game */

import LOGGER from "../utils/cpr-logger.js";
import CPR from "../system/config.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

export default class CPRMod {
  constructor(effect, change, index) {
    LOGGER.trace("constructor | CPRMod | Called.");
    this.change = change;
    this.category = effect.flags[game.system.id].changes.cats[index];
    // We do optional chaining on the next two because some items may not have flags.cyberpunk-red-core.situational defined.
    this.isSituational = effect.flags[game.system.id].changes.situational?.[index].isSituational;
    this.onByDefault = effect.flags[game.system.id].changes.situational?.[index].onByDefault;
    this.id = `${change.key}-${effect.id}`;
    this.source = effect.label;
    this.value = Number.parseInt(change.value, 10);
    this.key = change.key;
    this.changeMode = change.mode;
  }

  /**
   * Convert each Change on each (non-disabled) Effect into a CPRMod and then return a list of those CPRMod objects.
   *
   * @param {Array<ActiveEffect>} effects - An array of ActiveEffects
   * @return {Array<CPRMod>}
   */
  static getAllModifiers(effects) {
    LOGGER.trace("getAllModifiers | CPRMod | Called.");
    const allModifiers = [];
    effects.forEach((effect) => {
      if (!effect.disabled) {
        effect.changes.forEach((change, index) => {
          const mod = new CPRMod(effect, change, index);
          allModifiers.push(mod);
        });
      }
    });
    return allModifiers;
  }

  /**
   * Get a list of relevant mods to a specific roll, based on a bonus's key.
   *
   * @param {Array<CPRMod>} modifiers - An array of CPRMods.
   * @param {String} key - String with an effect key to filter the array.
   * @return {Array<CPRMod>} - Array of mods filtered for a specific key.
   */
  static getRelevantMods(modifiers, key) {
    LOGGER.trace("getRelevantMods | CPRMod | Called.");
    const relevantMods = modifiers.filter((m) => m.key === `bonuses.${key}`);
    return relevantMods;
  }

  /**
   * Get all mods that are situational for the roll dialog.
   *
   * @param {CPRRoll} rollData - CPRRoll object
   * @param {Array<ActiveEffect>} effects - An array of ActiveEffects on the actor that triggered the roll.
   * @param {CPRItem} item - CPRItem that the roll came from.
   * @return {Array<CPRMod>} - Array of mods filtered to be applicable for a specific type of roll.
   */
  static getSituationalRollMods(rollData, effects, item) {
    LOGGER.trace("getSituationalRollMods | CPRMod | Called.");
    const prototypeChain = SystemUtils.getPrototypeChain(rollData);

    // Get effects relevant to the roll.
    const allSituationalMods = CPRMod.getAllModifiers(effects).filter((m) => m.isSituational);
    let filteredMods = [];

    // Stat mods. (This should either not be included or refactored, since the bonus is already applied via the native active effects.)
    if ((prototypeChain.includes("CPRStatRoll") || prototypeChain.includes("CPRRoleRoll")) && !prototypeChain.includes("CPRInterfaceRoll")) {
      const statMods = allSituationalMods.filter((m) => m.key === `system.stats.${rollData.statName.toLowerCase()}.value`);
      filteredMods = filteredMods.concat(statMods);
    }

    // Skill mods.
    if ((prototypeChain.includes("CPRSkillRoll") || prototypeChain.includes("CPRRoleRoll")) && !prototypeChain.includes("CPRInterfaceRoll")) {
      const skillMods = allSituationalMods.filter((m) => m.key === `bonuses.${SystemUtils.slugify(rollData.skillName)}`);
      filteredMods = filteredMods.concat(skillMods);
    }

    // Initiative Mods.
    if (prototypeChain.includes("CPRInitiative")) {
      const initiativeMods = allSituationalMods.filter((m) => m.key === `bonuses.initiative`);
      filteredMods = filteredMods.concat(initiativeMods);
    }

    // Attack mods.
    if (prototypeChain.includes("CPRAttackRoll")) {
      const attackRollBonusKeys = ["bonuses.universalAttack"];

      if (item.system.isRanged) {
        attackRollBonusKeys.push("bonuses.ranged");
      } else {
        attackRollBonusKeys.push("bonuses.melee");
      }

      if (prototypeChain[0] === "CPRAttackRoll") {
        attackRollBonusKeys.push("bonuses.singleShot");
      } else if (prototypeChain.includes("CPRAimedAttackRoll")) {
        attackRollBonusKeys.push("bonuses.singleShot");
        attackRollBonusKeys.push("bonuses.aimedShot");
      } else if (prototypeChain.includes("CPRAutofireRoll")) {
        attackRollBonusKeys.push("bonuses.autofire");
      } else if (prototypeChain.includes("CPRSuppressiveFireRoll")) {
        attackRollBonusKeys.push("bonuses.suppressive");
      }
      const attackMods = allSituationalMods.filter((m) => attackRollBonusKeys.includes(m.key));

      // Attack mods from upgrades.
      const upgradeMods = item.getAllUpgradeMods("attackmod").filter((m) => m.isSituational);
      filteredMods = filteredMods.concat(attackMods).concat(upgradeMods);
    }

    // Damage Mods.
    if (prototypeChain.includes("CPRDamageRoll")) {
      const damageMods = allSituationalMods.filter((m) => m.key === `bonuses.universalDamage`);
      // Damage mods from upgrades.
      const upgradeMods = item.getAllUpgradeMods("damage").filter((m) => m.isSituational);
      filteredMods = filteredMods.concat(damageMods).concat(upgradeMods);
    }

    // Role Mods.
    if (prototypeChain.includes("CPRRoleRoll")) {
      const roleMods = allSituationalMods.filter((m) => m.key === `bonuses.${SystemUtils.slugify(rollData.roleName)}`);
      filteredMods = filteredMods.concat(roleMods);
    }

    // Netrunner Mods.
    if (prototypeChain.includes("CPRInterfaceRoll")) {
      let netrunnerMods = allSituationalMods.filter((m) => m.key === `bonuses.${rollData.ability}`);

      // Zap is an attack, so we need to add relevant attack bonuses to it.
      if (rollData.ability === "zap") {
        netrunnerMods = netrunnerMods.concat(allSituationalMods.filter((m) => m.key === "bonuses.attack" || m.key === "bonuses.universalAttack"));
      }

      // Bonus to all attacks, meat or net.
      if (rollData.ability === "attack") {
        netrunnerMods = netrunnerMods.concat(allSituationalMods.filter((m) => m.key === "bonuses.universalAttack"));
      }

      filteredMods = filteredMods.concat(netrunnerMods);
    }

    // Death Save Mods.
    if (prototypeChain.includes("CPRDeathSaveRoll")) {
      const deathSavePenaltyMods = allSituationalMods.filter((m) => m.key === "bonuses.deathSavePenalty");
      filteredMods = filteredMods.concat(deathSavePenaltyMods);
    }

    return filteredMods;
  }

  /**
   * Get default situational mods which appear in the core rule book on page 130.
   *
   * @return {Array<CPRMod-like-objects>} - Array of mods from config.js.
   */
  static getDefaultSituationalMods() {
    LOGGER.trace("getDefaultSituationalMods | CPRMod | Called.");
    return Object.values(CPR.defaultSituationalMods);
  }
}
