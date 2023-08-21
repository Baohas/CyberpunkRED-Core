/* eslint-disable foundry-cpr/logger-after-function-definition */
/* global game */

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
   * We have faced a very strange issue where some items have null `item._stats`
   * fields on unlinked tokens. This was not an issue in v10 but it seems that
   * v11 doesn't like it. After migration to v11 and then a refresh of the page,
   * these items disappear. Luckily, we can manually update the _stats field
   * and that is what this function does.
   *
   * @param {CPRItem} item
   */
  static async migrateItem(item) {
    LOGGER.trace(`migrateItem | ${this.version}-${this.name}`);
    if (item._stats && Object.values(item._stats).some((stat) => !stat)) {
      return item.update({
        _stats: {
          coreVersion: "10.303", // Doesn't matter
          createdTime: 1692463494866, // This is just a unix timestamp
          lastModifiedBy: "CPRCMigration088", // This can be anything [A-Za-z0-9]{16}
          modifiedTime: 1692463494866, // This is just a unix timestamp
          systemId: game.system.id, // This needs to be this obviously
          systemVersion: "v0.87.6", // Doesn't matter
        },
      });
    }
    return Promise.resolve();
  }

  /**
   * Migrate each owned item.
   *
   * @param {CPRActor} actor
   */
  async migrateActor(actor) {
    LOGGER.trace(`migrateActor | ${this.version}-${this.name}`);
    for (const item of actor.items) {
      // eslint-disable-next-line no-await-in-loop
      await NullStatsMigration.migrateItem(item);
    }
  }
}
