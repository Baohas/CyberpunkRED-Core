export default class UpgradableSchema extends foundry.abstract.DataModel {
  static mixinName = "upgradable";

  static defineSchema() {
    return {};
  }

  /**
   * @getter
   * @returns {Boolean} - whether or not the item is upgraded.
   */
  get installedUpgrades() {
    return this.parent.getInstalledItems("itemUpgrade");
  }

  /**
   * @getter
   * @returns {Boolean} - whether or not the item is upgraded.
   */
  get isUpgraded() {
    if (this.parent.getInstalledItems("itemUpgrade").length > 0) {
      return true;
    }
    return false;
  }
}
