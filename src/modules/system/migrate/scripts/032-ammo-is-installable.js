/* eslint-disable no-param-reassign */

import BaseMigrationScript from "../base-migration-script.js";
import LOGGER from "../../../utils/cpr-logger.js";

/**
 * Make "ammo" an installable type for every loadable (weapon) item.
 *
 * Add ammo uuid to the list of installed items (will get converted to regular id
 * in next script).
 */
export default class AmmoIsInstallable extends BaseMigrationScript {
  static version = 32;

  static name = "Loadables: Ammo Is Installable";

  static documentFilters = {
    Item: { types: [], mixins: ["loadable"] },
    Actor: { types: [], mixins: [] },
  };

  async updateItem(doc) {
    LOGGER.trace("updateItem | AmmoIsInstallable");
    const { addAmmoAsInstallable, addInstalledAmmo } = this.constructor;
    addAmmoAsInstallable(doc);
    addInstalledAmmo(doc);
  }

  static addAmmoAsInstallable(loadable) {
    LOGGER.trace("addAmmoAsInstallable | AmmoIsInstallable");
    const { installedItems, isRanged } = loadable.system;
    if (!isRanged) return;
    installedItems.allowed = true;
    if (installedItems.allowedTypes.includes("ammo")) return;
    installedItems.allowedTypes.push("ammo");
  }

  static addInstalledAmmo(loadable) {
    LOGGER.trace("addInstalledAmmo | AmmoIsInstallable");
    const { magazine, installedItems } = loadable.system;
    if (magazine.ammoData?.uuid) {
      installedItems.list.push(magazine.ammoData.uuid);
    }
  }
}
