/* eslint-disable no-param-reassign */
/* eslint-disable no-await-in-loop */

import CPRMigration from "../cpr-migration.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class TestMigration extends CPRMigration {
  static version = 25;

  static name = "Test Migration";

  static documentTypeFilters = {
    Item: { types: [], mixins: [] },
    Actor: { types: [], mixins: [] },
  };

  async migrateActor(actor) {
    LOGGER.trace("migrateActor | Test Migration");
    return CPRMigration.simulateLongProcess(1);
  }

  async migrateItem(item) {
    LOGGER.trace("migrateItem | Test Migration");
    return CPRMigration.simulateLongProcess(1);
  }
}
