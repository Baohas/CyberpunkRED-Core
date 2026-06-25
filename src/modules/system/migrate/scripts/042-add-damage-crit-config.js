/* eslint-disable no-param-reassign */

import BaseMigrationScript from "../base-migration-script.js";

/**
 * Backfill the configurable damage-critical fields introduced alongside the `dmg` die modifier:
 *   - attackable items (weapons) gain `system.damageCrit` { threshold, count, bonus }
 *   - ammo gains `system.overrides.crit` { mode, threshold, count, bonus }
 *
 * Existing items get RAW defaults — 2+ dice showing the die's max face → +5 damage — matching the
 * datamodel initials, so behaviour is unchanged; this just persists the fields to stored data.
 */
export default class AddDamageCritConfig extends BaseMigrationScript {
  static version = 42;

  static name = "Item: Add configurable damage-critical fields";

  static documentFilters = {
    Item: { types: ["ammo"], mixins: ["attackable"] },
    Actor: { types: [], mixins: [] },
  };

  /** @inheritdoc */
  // eslint-disable-next-line class-methods-use-this
  async updateItem(itemData) {
    if (itemData.type === "ammo") {
      if (!foundry.utils.hasProperty(itemData, "system.overrides.crit")) {
        foundry.utils.setProperty(itemData, "system.overrides.crit", {
          override: false,
          threshold: 0,
          count: 2,
          bonus: 5,
        });
      }
      return;
    }
    if (!foundry.utils.hasProperty(itemData, "system.damageCrit")) {
      foundry.utils.setProperty(itemData, "system.damageCrit", {
        threshold: 0,
        count: 2,
        bonus: 5,
      });
    }
  }
}
