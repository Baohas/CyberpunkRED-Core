/* global game duplicate */
/* eslint-disable foundry-cpr/logger-after-function-definition */

import CPRMigration from "../cpr-migration.js";
import CPRSystemUtils from "../../../utils/cpr-systemUtils.js";
import LOGGER from "../../../utils/cpr-logger.js";
import actorSheetHooks from "../../../hooks/actor-sheet.js";

/**
 * This migration will rearrange and introduce new flags on effects that exist on items/actors.
 * It will also give a couple new data points to roles and their subabilities.
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
    const updateData = duplicate(item);
    if (updateData.effects.length > 0) {
      updateData.effects.forEach(async (e) => {
        e.changes.forEach(async (c, i) => {
          const newFlag = e.flags[game.system.id].changes[i];
          e.flags[`${game.system.id}.changes.cats.${i}`] = newFlag;
          e.flags[`${game.system.id}.changes.situational.${i}.isSituational`] = false;
          e.flags[`${game.system.id}.changes.situational.${i}.onByDefault`] = false;
          e.flags[`${game.system.id}.changes.-=${i}`] = null;
        });
      });
    }
    if (item.type === "role") {
      updateData.system.isSituational = false;
      updateData.system.onByDefault = false;
      updateData.system.abilities.forEach((a) => {
        a.isSituational = false;
        a.onByDefault = false;
      });
    }

    return (item.isOwned) ? updateData : item.update(updateData);
  }

  /**
   * Update effects created directly on the actor.
   *
   * @param {CPRActor} actor
   */
  async migrateActor(actor) {
    LOGGER.trace(`migrateActor | ${this.version}-${this.name}`);
    const updateList = [];
    if (actor.effects.contents.length > 0) {
      actor.effects.contents.forEach(async (e) => {
        const effectData = duplicate(e);
        e.changes.forEach(async (c, i) => {
          const newFlag = e.flags[game.system.id].changes[i];
          effectData.flags[`${game.system.id}.changes.cats.${i}`] = newFlag;
          effectData.flags[`${game.system.id}.changes.situational.${i}.isSituational`] = false;
          effectData.flags[`${game.system.id}.changes.situational.${i}.onByDefault`] = false;
          effectData.flags[`${game.system.id}.changes.-=${i}`] = null;
        });
        updateList.push(effectData);
      });
    }

    await actor.updateEmbeddedDocuments("ActiveEffect", updateList);
  /*     const itemUpdates = [];
    for (const item of actor.items) {
      // eslint-disable-next-line no-await-in-loop
      const updateData = await ImprovedDialogMigration.migrateItem(item);
      if (updateData !== null) itemUpdates.push(updateData);
    }
    return actor.updateEmbeddedDocuments("Item", itemUpdates); */
  }
}
