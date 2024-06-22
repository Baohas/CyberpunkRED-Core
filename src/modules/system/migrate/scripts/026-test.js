/* eslint-disable no-param-reassign */
/* eslint-disable no-await-in-loop */

import CPRMigration from "../cpr-migration.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class TestMigration extends CPRMigration {
  constructor() {
    LOGGER.trace("constructor | Test Migration");
    super();
    this.version = TestMigration.version;
    this.name = "Test Migration";
  }

  static version = 26;
}
