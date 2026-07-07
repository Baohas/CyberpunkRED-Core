/**
 * Common utils for Actors
 */
export default class CPRActorUtils {
  /**
   * Gets the SP value for a given armor and location with ablation (optional), including any upgrades
   *
   * @param {Actor} armor - The armor actor to check
   * @param {string} location - The location to check
   * @param {boolean} withAblation - Whether to include ablation in the calculation
   * @returns {Promise<number>} The total SP value for the specified armor and location
   */
  static async calculateArmorSP(armor, location, withAblation = false) {
    if (!armor) return 0;

    const cprArmorData = armor.system;
    const upgradeData = armor.getTotalUpgradeValues(`${location}Sp`);

    const currentSP = Number(cprArmorData[`${location}Location`].sp);
    const currentAblation = Number(
      cprArmorData[`${location}Location`].ablation,
    );

    const currentSpWithUpgrades =
      upgradeData.type === "override"
        ? upgradeData.value
        : currentSP + upgradeData.value;

    const armorSPWithAblation =
      currentAblation < 0
        ? Math.min(
            currentSpWithUpgrades - currentAblation,
            currentSpWithUpgrades,
          )
        : Math.max(currentSpWithUpgrades - currentAblation, 0);

    return withAblation ? armorSPWithAblation : currentSpWithUpgrades;
  }
}
