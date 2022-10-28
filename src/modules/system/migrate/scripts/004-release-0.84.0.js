/* eslint-disable foundry-cpr/logger-after-function-definition */
/* eslint-disable no-await-in-loop */

import CPRMigration from "../cpr-migration.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class ReleaseEightyFourDotZero extends CPRMigration {
  constructor() {
    LOGGER.trace("constructor | 3-Release 0.84.0 Migration");
    super();
    this.version = 4;
    this.name = "Hotfix 0.84.0 Migration";
  }

  /**
   * Executed before the migration takes place, see run() in the base migration class.
   */
  async preMigrate() {
    LOGGER.trace(`preMigrate | ${this.version}-${this.name}`);
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
   * The Foundry object migration handles most of the changes here.  The things that we are doing here
   * is cleaning up stale data points which somehow slipped through the cracks during previous migrations.
   *
   * @param {CPRItem} item
   */
  static async migrateItem(item) {
    LOGGER.trace(`migrateItem | ${this.version}-${this.name}`);
    let updateData = (item.isOwned) ? { _id: item._id } : {};
    // Migration code for Issue #546
    if (typeof item.changes !== "undefined") {
      const newChanges = [];
      for (const change of item.changes) {
        if (change.key === "bonuses.cyberTech") {
          change.key = "bonuses.cybertech";
        }
        if (change.key === "bonuses.weaponsTech") {
          change.key = "bonuses.weaponstech";
        }
        newChanges.push(change);
      }
      updateData["system.changes"] = newChanges;
    }

    // Migration code for Issue #554
    updateData = { ...updateData, ...CPRMigration.safeDelete(item, "system.price.category") };

    return (item.isOwned) ? item.actor.updateEmbeddedDocuments("Item", updateData) : item.update(updateData);
  }
}
