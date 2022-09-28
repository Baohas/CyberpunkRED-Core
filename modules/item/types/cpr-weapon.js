/* globals duplicate */
import CPRItem from "../cpr-item.js";
import LOGGER from "../../utils/cpr-logger.js";
import CPR from "../../system/config.js";

/**
 * Extend the base CPRItem object with things specific to weapons.
 * @extends {CPRItem}
 */
export default class CPRWeaponItem extends CPRItem {
  postUninstall(installedUpgrades) {
    LOGGER.trace("postUninstall | CPRWeapon | Called.");
    const updateList = [];
    if (this.system.isRanged) {
      const magazineData = this.system.magazine;
      if (magazineData.value > magazineData.max) {
        const modifierData = {
          type: "modifier",
          value: 0,
        };
        for (const upgrade of installedUpgrades) {
          const modifiers = Object.keys(upgrade.system.modifiers);
          if (modifiers.includes("magazine")) {
            const modType = upgrade.system.modifiers.magazine.type;
            const modValue = upgrade.system.modifiers.magazine.value;
            if (modType === "override") {
              modifierData.value = modType === modifierData.type
                && modValue > modifierData.value
                ? modValue : modifierData.value;
            } else {
              modifierData.value += modValue;
            }
          }
        }
        const magazineSize = (modifierData.type === "override") ? modifierData.value : magazineData.max + modifierData.value;
        if (magazineData.value > magazineSize) {
          updateList.push({ _id: this._id, "system.magazine.value": magazineSize });
          const extraBullets = magazineData.value - magazineSize;
          const ammo = this.actor.items.find((i) => i._id === magazineData.ammoId);
          const ammoStack = ammo.system.amount + extraBullets;
          updateList.push({ _id: ammo.id, "system.amount": ammoStack });
        }
      }
    }
    return updateList;
  }
}
