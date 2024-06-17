/* eslint-disable no-param-reassign */
/* eslint-disable no-await-in-loop */

import CPRMigration from "../cpr-migration.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class BaseMigration extends CPRMigration {
  constructor() {
    LOGGER.trace("constructor | Base Migration");
    super();
    this.version = 26;
    this.name = "Base Migration";
  }
}
