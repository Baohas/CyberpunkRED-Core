/* eslint-disable no-param-reassign */

import BaseMigrationScript from "../base-migration-script.js";
import LOGGER from "../../../utils/cpr-logger.js";

/**
 * Armour penalties used to be stored as negative integers (eg: -4)
 * this was changed during the DataModel work to use positive integers.
 */
export default class ArmorPenaltyMigration extends BaseMigrationScript {
  static version = 29;

  static name = "Item: Armor Penalty Migration";

  static documentFilters = {
    Item: { types: ["armor"], mixins: [] },
    Actor: { types: [], mixins: [] },
  };

  async updateItem(doc) {
    LOGGER.trace("updateItem | Attackable Ignore Armor");
    if (doc.system.penalty < 0) {
      doc.system.penalty = Math.abs(doc.system.penalty);
    }
  }
}
