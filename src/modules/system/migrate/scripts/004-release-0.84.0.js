/* eslint-disable foundry-cpr/logger-after-function-definition */
/* eslint-disable no-await-in-loop */

import CPRMigration from "../cpr-migration.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class ReleaseEightyFourDotZero extends CPRMigration {
  constructor() {
    LOGGER.trace("constructor | 4-Release 0.84.0 Migration");
    super();
    this.version = 4;
    this.name = "Release 0.84.0 Migration";
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
   * Update each of the items if needed.
   *
   * @param {CPRActor} actor
   */
  async migrateActor(actor) {
    LOGGER.trace("migrateActor | CPRMigration");
    const itemUpdates = [];
    for (const item of actor.items) {
      if (typeof item.system.price !== "undefined" || typeof item.changes !== "undefined") {
        const updatedItem = ReleaseEightyFourDotZero.migrateItem(item);
        if (Object.keys(updatedItem).length > 1) {
          itemUpdates.push(updatedItem);
        }
      }
    }

    for (const activeEffect of actor.effects) {
      const aeChanges = await ReleaseEightyFourDotZero.updateActiveEffect(activeEffect);
      if (aeChanges) {
        await actor.updateEmbeddedDocuments("ActiveEffect", [{ _id: activeEffect._id, changes: aeChanges }]);
      }
    }

    return (itemUpdates.length > 0) ? actor.updateEmbeddedDocuments("Item", itemUpdates) : Promise.resolve();
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
    for (const activeEffect of item.effects) {
      const aeChanges = await ReleaseEightyFourDotZero.updateActiveEffect(activeEffect);
      if (aeChanges) {
        await item.updateEmbeddedDocuments("ActiveEffect", [{ _id: activeEffect._id, changes: aeChanges }]);
      }
    }

    // Migration code for Issue #554
    updateData = { ...updateData, ...CPRMigration.safeDelete(item, "system.price.category") };

    return (item.isOwned) ? updateData : item.update(updateData);
  }

  static async updateActiveEffect(effect) {
    let needsUpdate = false;
    const newChanges = [];
    if (effect.changes.length > 0) {
      for (const change of effect.changes) {
        switch (change.key) {
          case "bonuses.cyberTech": {
            change.key = "bonuses.cybertech";
            needsUpdate = true;
            break;
          }
          case "bonuses.weaponsTech": {
            change.key = "bonuses.weaponstech";
            needsUpdate = true;
            break;
          }
          default:
        }
        newChanges.push(change);
      }
    }
    return (needsUpdate) ? Promise.resolve(newChanges) : Promise.resolve();
  }
}
