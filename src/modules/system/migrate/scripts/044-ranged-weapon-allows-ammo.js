import BaseMigrationScript from "../base-migration-script.js";

/**
 * Ranged items (weapons and other attackable containers) must allow `ammo` as
 * an installable type so ammo can be loaded. Backfill existing ranged items
 * whose `installedItems.allowedTypes` predates this behaviour. See #1253.
 */
export default class RangedWeaponAllowsAmmo extends BaseMigrationScript {
  static version = 44;

  static name = "Ranged weapons allow ammo installs";

  static documentFilters = {
    Item: { types: [], mixins: ["container"] },
    Actor: { types: [], mixins: ["container"] },
  };

  /** @inheritdoc */
  async updateItem(doc) {
    this.constructor.allowAmmoOnRanged(doc);
  }

  /**
   * Add `ammo` to a ranged item's allowed install types if it is missing.
   *
   * @param {Object} doc - the item data to migrate; mutated in place.
   * @returns {void}
   */
  static allowAmmoOnRanged(doc) {
    const allowedTypes = doc.system?.installedItems?.allowedTypes;
    if (
      doc.system?.isRanged === true &&
      Array.isArray(allowedTypes) &&
      !allowedTypes.includes("ammo")
    ) {
      allowedTypes.push("ammo");
    }
  }
}
