/* eslint-disable max-classes-per-file */
/* global game */

import LOGGER from "../utils/cpr-logger.js";

export default class CPRMod {
  constructor(effect, change, index) {
    LOGGER.trace("constructor | CPRMod | Called.");
    this.change = change;
    this.isSituational = effect.flags[`${game.system.id}`].changes.situational[index].isSituational;
    this.onByDefault = effect.flags[`${game.system.id}`].changes.situational[index].onByDefault;
    this.id = `${change.key}-${effect.id}`;
    this.source = effect.label;
    this.value = change.value;
    this.key = change.key;
  }

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

  static getRelevantMods(modifiers, key, bonusType) {
    LOGGER.trace("getRelevantMods | CPRMod | Called.");
    let relevantMods;
    switch (bonusType) {
      case "AeBonus": {
        relevantMods = modifiers.filter((m) => m.key === `bonuses.${key}`);
        break;
      }
      case "statBonus": {
        relevantMods = modifiers.filter((m) => m.key === `system.stats.${key}.value`);
        break;
      }
      default:
        break;
    }
    return relevantMods.length > 0 ? relevantMods : false;
  }
}
