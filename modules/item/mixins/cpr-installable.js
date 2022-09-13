import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";

const Installable = function Installable() {
  /**
   * installs this into target.
   *
   * @async
   * @param {Object} target - the item to install into
   * @returns - the updated item document
   */
  this.installInto = async function installInto(target) {
    LOGGER.trace("installInto | Installable | Called.");
    if (!target) {
      return false;
    }

    if (!await target.canInstallItem(this)) {
      return false;
    }

    await target.installItem(this);
    return this.update({ "system.isInstalled": true });
  };

  /**
   * uninstalls this from target.
   *
   * @async
   * @param {Object} target - the item to uninstall into
   * @returns - the updated item document
   */
  this.uninstallFrom = async function uninstallFrom(target) {
    LOGGER.trace("uninstallFrom | Installable | Called.");
    if (!target) {
      return false;
    }
    await target.uninstallItem(this);
    return this.update({ "system.isInstalled": false });
  };
};

export default Installable;
