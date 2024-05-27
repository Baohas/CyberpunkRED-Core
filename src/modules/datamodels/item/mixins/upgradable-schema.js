import LOGGER from "../../../utils/cpr-logger.js";

export default class UpgradableSchema extends foundry.abstract.DataModel {
  static mixinName = "upgradable";

  static defineSchema() {
    LOGGER.trace("defineSchema | UpgradableSchema | called.");
    return {};
  }

  /**
   * @getter
   * @returns {Boolean} - whether or not the item is upgraded.
   */
  get installedUpgrades() {
    LOGGER.trace("get installedUpgrades | UpgradableSchema | called.");
    return this.parent.getInstalledItems("itemUpgrade");
  }

  /**
   * @getter
   * @returns {Boolean} - whether or not the item is upgraded.
   */
  get isUpgraded() {
    LOGGER.trace("get isUpgraded | UpgradableSchema | called.");
    if (this.parent.getInstalledItems("itemUpgrade").length > 0) {
      return true;
    }
    return false;
  }
}
