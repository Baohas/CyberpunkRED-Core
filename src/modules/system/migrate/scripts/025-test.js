/* eslint-disable no-param-reassign */
/* eslint-disable no-await-in-loop */

import BaseMigrationScript from "../base-migration-script.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class TestMigration extends BaseMigrationScript {
  static version = 25;

  static name = "Test Migration";

  static documentFilters = {
    Item: { none: false, types: [], mixins: [] },
    Actor: { none: false, types: [], mixins: [] },
  };

  async migrateMisc() {
    LOGGER.trace("migrateMisc | Test Migration");
  }

  async updateActor(doc) {
    LOGGER.trace("updateActor | Test Migration");
  }

  async updateItem(doc) {
    LOGGER.trace("updateItem | Test Migration");
  }
}
