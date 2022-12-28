/* eslint-disable no-await-in-loop */
/* global game duplicate */
/* eslint-disable foundry-cpr/logger-after-function-definition */

import CPRMigration from "../cpr-migration.js";
import CPRSystemUtils from "../../../utils/cpr-systemUtils.js";
import LOGGER from "../../../utils/cpr-logger.js";

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
    this.migrationFolder = await CPRSystemUtils.GetFolder("Item", "Improved-Dialog-Migration Workspace");
    LOGGER.log(`Starting migration: ${this.name}`);
  }

  /**
   * Takes place after the data migration completes.
   */
  async postMigrate() {
    LOGGER.trace(`postMigrate | ${this.version}-${this.name}`);
    if (this.migrationFolder.contents.length === 0) {
      LOGGER.debug("would delete migration folder");
      this.migrationFolder.delete();
    }
    LOGGER.log(`Finishing migration: ${this.name}`);
  }

  /**
   * Here's the real work.
   *
   * @param {CPRItem} item
   * @override
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
   * @override
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

    const ownedItems = actor.items.filter((i) => {
      if (i.type === "skill") return false;
      if (i.type === "cyberware" && i.system.core) return false;
      return true;
    });

    const deleteItems = [];
    const remappedItems = {};

    for (const ownedItem of ownedItems) {
      // We cannot add AEs to owned items, that's a Foundry limitation. If an owned item might get an AE
      // as a result of this migration, we must make an unowned copy first, and then copy that back to
      // the actor. Not all item types require this, and skills/core cyberware are filtered out earlier.
      let newItem = ownedItem;
      if (ownedItem.effects.size > 0) {
        newItem = await CPRMigration.backupOwnedItem(ownedItem);
      }
      try {
        await ImprovedDialogMigration.migrateItem(newItem);
      } catch (err) {
        throw new Error(`${ownedItem.name} (${ownedItem._id}) had a migration error: ${err.message}`);
      }
      if (ownedItem.effects.size > 0) {
        const newData = duplicate(newItem.data);
        const createdItem = await actor.createEmbeddedDocuments("Item", [newData], { isMigrating: true });
        remappedItems[ownedItem._id] = createdItem[0]._id;
        // It may seem silly to update right before we delete, but we do the following to avoid some messiness.
        // Because we override preDelete in cpr-item.js, and our override queries system.isInstalled,
        // we set system.isInstalled to false because we do not want it to pass into the if statement on line 160 of cpr-item.js.
        // That block is only relevant to owned items, and causes errors if it is performed on non-owned items.
        // TODO: This may be a bit of a workaround and so i will talk with Darin about proper fixes (he wrote the relevant functions).
        await newItem.update({ "system.isInstalled": false });
        await newItem.delete();
        deleteItems.push(ownedItem._id);
      }
    }

    // delete all of the owned items we have replaced with items that have AEs
    const deleteList = [];
    for (const delItem of deleteItems) {
      if (actor.items.filter((i) => i._id === delItem).length > 0) {
        deleteList.push(delItem);
      }
    }

    if (deleteList.length > 0) {
      await actor.deleteEmbeddedDocuments("Item", deleteList);
    }

  /*     const itemUpdates = [];
    for (const item of actor.items) {
      // eslint-disable-next-line no-await-in-loop
      const updateData = await ImprovedDialogMigration.migrateItem(item);
      if (updateData !== null) itemUpdates.push(updateData);
    }
    return actor.updateEmbeddedDocuments("Item", itemUpdates); */
  }
}
