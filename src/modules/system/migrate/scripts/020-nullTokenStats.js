/* eslint-disable foundry-cpr/logger-after-function-definition */
/* global duplicate */

import CPRMigration from "../cpr-migration.js";
import CPRSystemUtils from "../../../utils/cpr-systemUtils.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class NullStatsMigration extends CPRMigration {
  constructor() {
    LOGGER.trace("constructor | Null Stats - Migration");
    super();
    this.version = 20;
    this.name = "Null Stats - Migration";
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
   * Black Ice have two note sections that could easily be combined into one.
   * This will combine the two note sections.
   *
   * @param {CPRActor} actor
   */
  async migrateActor(actor) {
    LOGGER.trace(`migrateActor | ${this.version}-${this.name}`);
    // Return if not Black Ice.
    if (actor.token && !actor.token.actorLink) {
      const nullStatItems = actor.items.filter((i) => {
        return Object.values(i._stats).some((stat) => !stat);
      });
      const nullStatUpdates = [];
      nullStatItems.forEach((i) => {
        nullStatUpdates.push({
          _id: i.id,
          _stats: {
            coreVersion: "10.303",
            createdTime: 1692463494866,
            lastModifiedBy: "Tk20S39ggUnMuKpt",
            modifiedTime: 1692463494866,
            systemId: "cyberpunk-red-core",
            systemVersion: "v0.87.6",
          },
        });
      });
      return actor.updateEmbeddedDocuments("Item", nullStatUpdates);
    }
    return Promise.resolve();
  }
}
