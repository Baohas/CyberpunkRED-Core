/* globals fromUuidSync */
import CPRMigration from "../cpr-migration.js";
import CPRSystemUtils from "../../../utils/cpr-systemUtils.js";
import LOGGER from "../../../utils/cpr-logger.js";
import CPR from "../../config.js";

export default class InstalledItemMigrationFix extends CPRMigration {
  constructor() {
    LOGGER.trace("constructor | InstalledItemMigrationFix Migration");
    super();
    this.version = 12;
    this.name = "Migration Fix for Installed Items";
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
   * Simply make sure owned items are updated too.
   *
   * @param {CPRActor} actor
   */
  async migrateActor(actor) {
    LOGGER.trace(`migrateActor | ${this.version}-${this.name}`);
    const containerTypes = CPRSystemUtils.GetTemplateItemTypes("container");
    const upgradableTypes = CPRSystemUtils.GetTemplateItemTypes("upgradable");
    const ownedItemUpdates = [];
    const upgradeItems = [];
    for (const item of actor.items) {
      if (
        containerTypes.includes(item.type) &&
        item.system.installedItems.list.length > 0
      ) {
        const installedItemsList = [];
        const itemUpdates = {
          _id: item.id,
        };
        let installedSize = 0;
        for (const installedItemUUID of item.system.installedItems.list) {
          const installedItem = fromUuidSync(installedItemUUID);
          if (installedItem !== null) {
            installedSize += installedItem.system.size;
            if (!installedItem.system.isInstalled) {
              const systemUpdate = installedItem.system;
              systemUpdate.isInstalled = true;
              systemUpdate.installedIn = item.uuid;
              const updatedItem = {
                _id: installedItem.id,
                system: systemUpdate,
              };
              ownedItemUpdates.push(updatedItem);
              installedItemsList.push(installedItem.uuid);
            }
            if (
              upgradableTypes.includes(item.type) &&
              installedItem.type === "itemUpgrade"
            ) {
              const upgradeModifiers = installedItem.system.modifiers;
              const modList = {};
              Object.keys(upgradeModifiers).forEach((index) => {
                const modifier = upgradeModifiers[index];
                if (
                  typeof modifier !== "undefined" &&
                  typeof CPR.upgradableDataPoints[this.type][index] !==
                    "undefined" &&
                  modifier !== 0 &&
                  modifier !== null &&
                  modifier !== ""
                ) {
                  if (
                    typeof modifier.value === "undefined" ||
                    modifier.value !== null
                  ) {
                    modList[index] = modifier;
                  }
                }
              });
              const upgradeData = {
                _id: installedItem._id,
                uuid: installedItem.uuid,
                name: installedItem.name,
                type: installedItem.system.type,
                size: installedItem.system.size,
                system: {
                  modifiers: modList,
                },
              };
              upgradeItems.push(upgradeData);
            }
          }
        }
        if (
          item.system.installedItems.list.length !== installedItemsList.length
        ) {
          itemUpdates["system.installedItems.list"] = installedItemsList;
          itemUpdates["system.installedItems.usedSlots"] = installedSize;
        }
        if (upgradeItems.length > 0) {
          itemUpdates["system.upgrades"] = upgradeItems;
        }
        if (Object.keys(itemUpdates).length > 1) {
          ownedItemUpdates.push(itemUpdates);
        }
      }
    }
    return actor.updateEmbeddedDocuments("Item", ownedItemUpdates);
  }
}
