/* eslint-disable no-param-reassign */

import BaseMigrationScript from "../base-migration-script.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class ElectronicMigration extends BaseMigrationScript {
  static version = 30;

  static name = "Item: isElectronic";

  static documentFilters = {
    Item: { types: ["cyberdeck", "gear"], mixins: [] },
    Actor: { types: [], mixins: [] },
  };

  async updateItem(doc) {
    LOGGER.trace("updateItem | Test Migration");
    // Set Cyberdecks to be electronic
    if (doc.type === "cyberdeck") {
      doc.system.isElectronic = true;
    }

    // Fix Computers not being Electronic
    const translatedNames = [
      "Computer",
      "Компьютер",
      "Ordinateur",
      "Computador",
      "コンピュータ",
      "Komputer",
      "Computadora",
    ];

    if (translatedNames.includes(doc.name)) {
      doc.system.isElectronic = true;
    }
  }
}
