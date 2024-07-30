/* eslint-disable no-param-reassign */

import BaseMigrationScript from "../base-migration-script.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class AttackableIgnoreArmorMigration extends BaseMigrationScript {
  static version = 28;

  static name = "Item: Attackable Ignore Armor";

  static documentFilters = {
    Item: {
      none: false,
      types: [],
      mixins: ["attackable"],
    },
    Actor: { none: false, types: [], mixins: [] },
  };

  async updateItem(doc) {
    LOGGER.trace("updateItem | Attackable Ignore Armor");
    if (!doc.system.isRanged) {
      doc.system.canIgnoreArmor = true;
      doc.system.ignoreArmorPercent = 50;
      doc.system.ignoreBelowSP = 0;
    }
  }
}
