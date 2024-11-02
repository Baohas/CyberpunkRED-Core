/* eslint-disable no-param-reassign */

import BaseMigrationScript from "../base-migration-script.js";
import LOGGER from "../../../utils/cpr-logger.js";

/**
 * Convert `system.rez` from a Number to an Object.
 */
export default class ProgramRez extends BaseMigrationScript {
  static version = 34;

  static name = "Program Rez";

  static documentFilters = {
    Item: { types: ["program"], mixins: [] },
    Actor: { types: [], mixins: [] },
  };

  async updateItem(doc) {
    LOGGER.trace("updateItem | Program Rez");
    const { rez } = doc.system;
    if (!(rez instanceof Object)) {
      const newRez = {
        value: rez,
        max: rez,
        transactions: [],
      };
      doc.system.rez = newRez;
    }
  }
}
