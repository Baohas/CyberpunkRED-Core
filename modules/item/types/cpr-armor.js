/* globals duplicate */
import CPRItem from "../cpr-item.js";
import LOGGER from "../../utils/cpr-logger.js";
import CPR from "../../system/config.js";

/**
 * Extend the base CPRItem object with things specific to armor.
 * @extends {CPRItem}
 */
export default class CPRArmorItem extends CPRItem {
  postUpgradeUninstall(installedUpgrades) {
    LOGGER.trace("postUpgradeUninstall | CPRArmor | Called.");

    const upgradeMap = duplicate(CPR.upgradableDataPoints.armor);

    upgradeMap.bodySp.system = "bodyLocation";
    upgradeMap.headSp.system = "headLocation";
    upgradeMap.shieldHp.system = "shieldHitPoints";

    for (const upgrade of installedUpgrades) {
      for (const modifier of Object.keys(upgrade.system.modifiers)) {
        const modType = upgrade.system.modifiers[modifier].type;
        const modValue = upgrade.system.modifiers[modifier].value;
        if (upgradeMap[modifier]) {
          if (modType === "override") {
            upgradeMap[modifier].value = modType === upgradeMap[modifier].type
              && modValue > upgradeMap[modifier].value
              ? modValue : upgradeMap[modifier].value;
          } else {
            upgradeMap[modifier].value += modValue;
          }
        } else {
          upgradeMap[modifier] = { type: modType, value: modValue };
        }
      }
    }

    const updateObject = {};
    for (const mod of Object.keys(upgradeMap)) {
      const itemDataPoint = (typeof upgradeMap[mod].system !== "undefined") ? upgradeMap[mod].system : false;
      if (itemDataPoint && this.system[itemDataPoint].ablation > 0) {
        updateObject._id = this._id;
        updateObject[`system.${itemDataPoint}.ablation`] = this.system[itemDataPoint].ablation > this.system[itemDataPoint].sp
          ? this.system[itemDataPoint].sp : this.system[itemDataPoint].ablation;
      }
    }
    return [updateObject];
  }
}
