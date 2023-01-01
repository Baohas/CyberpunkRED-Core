/* eslint-disable no-await-in-loop */
/* global game duplicate fromUuidSync */
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
      actor.effects.contents.forEach((e) => {
        const effectData = duplicate(e);
        e.changes.forEach((c, i) => {
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
    const containerItems = [];
    const installedItems = [];
    const upgradedItems = [];

    for (const ownedItem of ownedItems) {
      // We cannot add AEs to owned items, that's a Foundry limitation. If an owned item might get an AE
      // as a result of this migration, we must make an unowned copy first, and then copy that back to
      // the actor. Not all item types require this, and skills/core cyberware are filtered out earlier.
      let newWorldItem = ownedItem;
      if (ownedItem.effects.size > 0) {
        newWorldItem = await CPRMigration.backupOwnedItem(ownedItem);
      }
      try {
        await ImprovedDialogMigration.migrateItem(newWorldItem);
      } catch (err) {
        throw new Error(`${ownedItem.name} (${ownedItem._id}) had a migration error: ${err.message}`);
      }
      let newOwnedItem = newWorldItem;
      if (ownedItem.effects.size > 0) {
        const newData = duplicate(newWorldItem);
        [newOwnedItem] = await actor.createEmbeddedDocuments("Item", [newData], { isMigrating: true });
        remappedItems[ownedItem._id] = newOwnedItem._id;
        remappedItems[ownedItem.uuid] = newOwnedItem.uuid;

        // Remap actor's installed item list.
        const newList = actor.system.installedItems.list.map((entry) => remappedItems[entry] || entry);
        // await actor.update({ "system.installedItems.list": newList });

        // It may seem silly to update right before we delete, but we do the following to avoid some messiness.
        // Because we override preDelete in cpr-item.js, and our override queries system.isInstalled,
        // we set system.isInstalled to false because we do not want it to pass into the if statement on line 160 of cpr-item.js.
        // That block is only relevant to owned items, and causes errors if it is performed on non-owned items.
        // TODO: This may be a bit of a workaround and so i will talk with Darin about proper fixes (he wrote the relevant functions).
        await newWorldItem.update({ "system.isInstalled": false });
        await newWorldItem.delete();
        deleteItems.push(ownedItem._id);
      }

      // Get all container items, regardless of whether or not they have effects.
      if (ownedItem.system.installedItems?.list.length > 0) {
        containerItems.push(newOwnedItem);
      }

      // Get all upgraded items, regardless of whether or not they have effects.
      if (ownedItem.system.upgrades?.length > 0) {
        upgradedItems.push(newOwnedItem);
      }

      // Get all items installed in other items, regardless of whether or not they have effects.
      if (ownedItem.system.isInstalled) {
        installedItems.push(newOwnedItem);
      }
    }

    for (const container of containerItems) {
      // Map the UUIDs in the old container item's list to the UUIDs of the new items it should contain.
      // If the entry doesn't exist in remappedItems, the item this UUID refers to was not duplicated, and thus should map to itself.
      const newList = container.system.installedItems.list.map((entry) => remappedItems[entry] || entry);
      const updateData = container.system;
      updateData.installedItems.list = newList;

      if (container.type === "cyberdeck") {
        const oldPrograms = container.system.programs;
        const newPrograms = {
          installed: [],
          rezzed: [],
        };

        for (const oldProgramData of oldPrograms.installed) {
          const program = actor.getOwnedItem(remappedItems[oldProgramData.uuid]);
          if (typeof program === "object") {
            const newProgramData = duplicate(oldProgramData);
            newProgramData.uuid = remappedItems[oldProgramData.uuid] || oldProgramData.uuid;
            if (oldProgramData.isRezzed) {
              newPrograms.rezzed.push(newProgramData);
            }
            newPrograms.installed.push(newProgramData);
          }
        }
        updateData.programs = newPrograms;
      }
      await container.update({ system: updateData });
    }

    for (const upgradedItem of upgradedItems) {
      const oldUpgrades = upgradedItem.system.upgrades;
      const newUpgrades = [];
      for (const oldUpgradeData of oldUpgrades) {
        const newUpgradeData = duplicate(oldUpgradeData);
        newUpgradeData.uuid = remappedItems[oldUpgradeData.uuid] || oldUpgradeData.uuid;
        newUpgrades.push(newUpgradeData);
      }
      await upgradedItem.update({ "system.upgrades": newUpgrades });
    }

    for (const installedItem of installedItems) {
      // Map the UUID in the old installed item's `installedIn` field to the UUID of the new item it should install into.
      // If the UUID doesn't exist in remappedItems, the item this UUID refers to was not duplicated, and thus should be set back to itself.
      const newUuid = remappedItems[installedItem.system.installedIn] || installedItem.system.installedIn;
      await installedItem.update({ "system.installedIn": newUuid });
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
  }
}
