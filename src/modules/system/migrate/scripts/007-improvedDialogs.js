/* global game duplicate */
/* eslint-disable foundry-cpr/logger-after-function-definition */

import CPRMigration from "../cpr-migration.js";
import CPRSystemUtils from "../../../utils/cpr-systemUtils.js";
import LOGGER from "../../../utils/cpr-logger.js";

/**
 *
 */
export default class ImprovedDialogMigration extends CPRMigration {
  constructor() {
    LOGGER.trace("constructor | ImprovedDialog Migration");
    super();
    this.version = 7;
    this.name = "Improved Dialog Migration";
  }

  /**
   * Executed before the migration takes place, see run() in the base migration class.
   */
  async preMigrate() {
    LOGGER.trace(`preMigrate | ${this.version}-${this.name}`);
    CPRSystemUtils.DisplayMessage("notify", CPRSystemUtils.Localize("CPR.migration.effects.beginMigration"));
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
   * Here's the real work.
   *
   * @param {CPRItem} item
   */
  static async migrateItem(item) {
    LOGGER.trace(`migrateItem | ${this.version}-${this.name}`);
    // const updateData = (item.isOwned) ? { _id: item._id } : {};
    const updateData = duplicate(item);
    updateData.effects.forEach(async (e) => {
      e.changes.forEach(async (c, i) => {
        const newFlag = e.flags[game.system.id].changes[i];
        e.flags[`${game.system.id}.changes.cats.${i}`] = newFlag;
        e.flags[`${game.system.id}.changes.situational.${i}.isSituational`] = false;
        e.flags[`${game.system.id}.changes.situational.${i}.onByDefault`] = false;
        e.flags[`${game.system.id}.changes.-=${i}`] = null;
      });
    });
    return (item.isOwned) ? updateData : item.update(updateData);

    /*     if (item.type === "ammo") {
      const updateData = (item.isOwned) ? { _id: item._id } : {};
      if (item.system.type === "rubber") {
        updateData["system.ablationValue"] = 0;
        return (item.isOwned) ? updateData : item.update(updateData);
      }
      if (item.system.type === "armorPiercing") {
        updateData["system.ablationValue"] = 2;
        return (item.isOwned) ? updateData : item.update(updateData);
      }
    } */
    // return null;
  }

  /**
   * Simply make sure owned items are updated too.
   *
   * @param {CPRActor} actor
   */
  async migrateActor(actor) {
    LOGGER.trace(`migrateActor | ${this.version}-${this.name}`);
  /*     const itemUpdates = [];
    for (const item of actor.items) {
      // eslint-disable-next-line no-await-in-loop
      const updateData = await ImprovedDialogMigration.migrateItem(item);
      if (updateData !== null) itemUpdates.push(updateData);
    }
    return actor.updateEmbeddedDocuments("Item", itemUpdates); */
  }
}
