/* eslint-disable foundry-cpr/logger-after-function-definition */
/* global duplicate */

import CPRMigration from "../cpr-migration.js";
import CPRSystemUtils from "../../../utils/cpr-systemUtils.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class JunkDataMigration extends CPRMigration {
  constructor() {
    LOGGER.trace("constructor | JunkData Migration");
    super();
    this.version = 19;
    this.name = "JunkData Migration";
  }

  /**
   * Executed before the migration takes place, see run() in the base migration class.
   */
  async preMigrate() {
    LOGGER.trace(`preMigrate | ${this.version}-${this.name}`);
    CPRSystemUtils.DisplayMessage(
      "notify",
      CPRSystemUtils.Localize("CPR.migration.effects.beginMigration")
    );
    LOGGER.log(`Starting migration: ${this.name}`);
  }

  /**
   * Takes place after the data migration completes.
   */
  async postMigrate() {
    LOGGER.trace(`postMigrate | ${this.version}-${this.name}`);
    LOGGER.log(`Finishing migration: ${this.name}`);
  }

  /**
   * Remove junk fields from actors.
   *
   * @param {CPRActor} actor
   */
  async migrateActor(actor) {
    LOGGER.trace(`migrateActor | ${this.version}-${this.name}`);
    const updateData = duplicate(actor.system);
    updateData["-=fightOptions"] = null;
    updateData["-=fightState"] = null;
    updateData["-=cyberdeck"] = null;
    updateData["-=filteredEffects"] = null;
    return actor.update({ system: updateData });
  }
}
