/* global duplicate */

import CPRItem from "../cpr-item.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import LOGGER from "../../utils/cpr-logger.js";

/**
 * Extend the base CPRItem object with things specific to cyberware.
 * @extends {CPRItem}
 */
export default class CPRCyberwareItem extends CPRItem {
  /**
   * Dynamically calculates the number of free slots on the cyberware
   * by starting with the number of slots this cyberware has and substacting
   * the slot size of each of the installed options.
   *
   * @override
   * @public
   */
  availableSlots() {
    LOGGER.trace("availableSlots | CPRCyberwareItem | Called.");
    const cprItemData = duplicate(this.system);
    let unusedSlots = cprItemData.optionSlots - cprItemData.installedOptionSlots;
    cprItemData.upgrades.forEach((mod) => {
      unusedSlots -= mod.system.size;
    });
    return unusedSlots;
  }

  async canInstallItem(item) {
    LOGGER.trace("canInstallItem | CPRCyberwareItem | Called.");

    const unsettledPromises = this.system.installedItems.map(async (uuid) => {
      try {
        return await SystemUtils.GetItemByUUID(uuid);
      } catch {
        throw new Error(`Unable to obtain list of installed items`);
      }
    });
    const allPromises = await Promise.allSettled(unsettledPromises);
    let usedSlots = item.system.size;
    for (const promise of allPromises.filter((p) => p.status === "fulfilled")) {
      const installedItem = promise.value;
      usedSlots += installedItem.system.size ? installedItem.system.size : 0;
    }

    if (usedSlots > this.system.slots) {
      SystemUtils.DisplayMessage("error", "CPR.messages.tooManyOptionalCyberwareInstalled");
      return false;
    }
    return true;
  }

  /**
   * Perform a cyberware-specific action. Most of these map to attackable (mixin) calls
   * for cyberware that is an embedded weapon. This assumes the Item is also attackable.
   *
   * @param {CPRActor} actor - who is doing the action?
   * @param {*} actionAttributes - data from the event indicating the type of action
   * @returns null for invalid actions
   */
  _cyberwareAction(actor, actionAttributes) {
    LOGGER.trace("_cyberwareAction | CPRItem | Called.");
    const actionData = actionAttributes["data-action"].nodeValue;
    switch (actionData) {
      case "select-ammo":
      case "unload":
      case "load":
      case "reload-ammo":
      case "measure-dv": {
        return this._weaponAction(actor, actionAttributes);
      }
      default:
    }
    return null;
  }
}
