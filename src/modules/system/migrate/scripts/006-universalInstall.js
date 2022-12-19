/* eslint-disable no-await-in-loop */
/* global duplicate mergeObject */

import CPRMigration from "../cpr-migration.js";
import LOGGER from "../../../utils/cpr-logger.js";
import CPRSystemUtils from "../../../utils/cpr-systemUtils.js";

export default class UniversalInstallMigration extends CPRMigration {
  constructor() {
    LOGGER.trace("constructor | 6-universalInstall Migration");
    super();
    this.version = 5;
    this.name = "Universal Install Migration";
  }

  /**
   * Executed before the migration takes place, see run() in the base migration class.
   */
  async preMigrate() {
    LOGGER.trace("preMigrate | 6-universalInstall Migration");
    LOGGER.log(`Starting migration: ${this.name}`);
  }

  /**
   * Takes place after the data migration completes.
   */
  async postMigrate() {
    LOGGER.trace("postMigrate | 6-universalInstall Migration");
    LOGGER.log(`Finishing migration: ${this.name}`);
  }

  /**
   * The actors were updated in 2 ways. No changes to demons, black-ice or containers.
   *    Universal Attack Bonus and Damage --> corresponding AE
   *    Deleted skill and role properties.
   *
   * @async
   * @static
   * @param {CPRActor} actor
   */
  async migrateActor(actor) {
    LOGGER.trace("migrateActor | 6-universalInstall Migration");
    const installedItems = typeof actor.system.installedItems === "object"
      ? duplicate(actor.system.installedItems)
      : {
        allowedTypes: ["cyberware"],
        allowed: true,
        list: [],
      };

    let updatedItemList = [];
    const upgradableTypes = CPRSystemUtils.GetTemplateItemTypes("upgradable");
    const loadableTypes = CPRSystemUtils.GetTemplateItemTypes("loadable");
    const containerTypes = CPRSystemUtils.GetTemplateItemTypes("container");

    for (const item of actor.items) {
      let itemUpdates = {
        _id: item._id,
        system: {},
      };

      if (containerTypes.includes(item.type)) {
        if (typeof item.system.installedItems === "object") {
          itemUpdates.system.installedItems = duplicate(item.system.installedItems);
        } else {
          itemUpdates.system.installedItems = {
            allowedTypes: ["itemUpgrade"],
            allowed: true,
            list: [],
            usedSlots: 0,
            slots: 3,
          };
        }
      }

      if (item.type === "cyberware" && item.system.isFoundational && item.system.isInstalled) {
        installedItems.list.push(item.uuid);

        itemUpdates.system.installedItems.allowedTypes = ["itemUpgrade", "cyberware"];
        itemUpdates.system.installedItems.slots = Math.max(itemUpdates.system.installedItems.slots, parseInt(item.system.optionSlots, 10));

        for (const optionalId of item.system.optionalIds) {
          const optionalItem = actor.getOwnedItem(optionalId);
          if (typeof optionalItem === "object") {
            let optionalItemUpdates = {
              _id: optionalItem._id,
              system: {},
            };
            itemUpdates.system.installedItems.list.push(optionalItem.uuid);
            itemUpdates.system.installedItems.usedSlots += optionalItem.system.size;
            optionalItemUpdates.system.installedIn = item.uuid;
            optionalItemUpdates.system.isInstalled = true;
            const optionalItemAllowsInstall = optionalItem.hasOptionalSlots;
            const optionalItemSlots = optionalItemAllowsInstall ? parseInt(optionalItem.system.optionSlots, 10) : 0;
            optionalItemUpdates.system.installedItems = {
              allowedTypes: ["itemUpgrade"],
              allowed: optionalItemAllowsInstall,
              list: [],
              usedSlots: 0,
              slots: optionalItemSlots,
            };
            optionalItemUpdates = { ...optionalItemUpdates, ...CPRMigration.safeDelete(optionalItem, "hasOptionalSlots") };
            optionalItemUpdates = { ...optionalItemUpdates, ...CPRMigration.safeDelete(optionalItem, "optionSlots") };
            optionalItemUpdates = { ...optionalItemUpdates, ...CPRMigration.safeDelete(optionalItem, "installedOptionSlots") };
            optionalItemUpdates = { ...optionalItemUpdates, ...CPRMigration.safeDelete(optionalItem, "optionalIds") };
            updatedItemList = CPRMigration.addToUpdateList(updatedItemList, optionalItemUpdates);
          }
        }
        itemUpdates.system.installedIn = actor.uuid;
        itemUpdates.system.isInstalled = true;
        itemUpdates = { ...itemUpdates, ...CPRMigration.safeDelete(item, "hasOptionalSlots") };
        itemUpdates = { ...itemUpdates, ...CPRMigration.safeDelete(item, "optionSlots") };
        itemUpdates = { ...itemUpdates, ...CPRMigration.safeDelete(item, "installedOptionSlots") };
        itemUpdates = { ...itemUpdates, ...CPRMigration.safeDelete(item, "optionalIds") };
      }

      if (loadableTypes.includes(item.type) && typeof item.system.magazine.ammoId !== "undefined") {
        const magazineData = item.system.magazine;
        let { ammoId } = magazineData;
        let ammoName = "";
        let ammoUuid = "";
        if ((typeof ammoId === "string" || ammoId instanceof String) && ammoId.length > 0) {
          const ammoItem = actor.getOwnedItem(item.system.magazine.ammoId);
          if (typeof ammoItem === "object") {
            ammoName = ammoItem.name;
            ammoUuid = ammoItem.uuid;
          } else {
            ammoName = `${item.name} Ammo`;
            ammoUuid = `Actor.${actor._id}.Item.${ammoId}`;
          }
        }
        ammoId = { name: ammoName, uuid: ammoUuid };
        magazineData.ammoData = ammoId;
        itemUpdates.system.magazine = magazineData;
        itemUpdates = { ...itemUpdates, ...CPRMigration.safeDelete(item, "magazine.ammoId") };
      }

      if (upgradableTypes.includes(item.type)) {
        itemUpdates.system.installedItems.slots = Math.max(itemUpdates.system.installedItems.slots, parseInt(item.system.slots, 10));
        itemUpdates.system.installedItems.allowed = (item.type === "cyberware" && !item.system.isFoundational) ? false : itemUpdates.system.installedItems.allowed;
        if (item.system.upgrades.length > 0) {
          const newUpgrades = [];
          for (const upgradeData of item.system.upgrades) {
            const upgrade = (typeof upgradeData.uuid === "undefined") ? actor.getOwnedItem(upgradeData._id) : actor.getOwnedItem(upgradeData.uuid);
            if (typeof upgrade === "object") {
              upgradeData.uuid = upgrade.uuid;
              delete upgradeData._id;
              newUpgrades.push(upgradeData);
              itemUpdates.system.installedItems.list.push(upgrade.uuid);
              itemUpdates.system.installedItems.usedSlots += upgrade.system.size;
            }
          }
          itemUpdates.system.upgrades = newUpgrades;
        }
        itemUpdates = { ...itemUpdates, ...CPRMigration.safeDelete(item, "slots") };
      }

      if (item.type === "cyberdeck") {
        itemUpdates.system.installedItems.slots = Math.max(itemUpdates.system.installedItems.slots, parseInt(item.system.slots, 10));
        const oldPrograms = item.system.programs;
        const newPrograms = {
          installed: [],
          rezzed: [],
        };

        for (const programData of oldPrograms.installed) {
          const program = (typeof programData.uuid === "undefined") ? actor.getOwnedItem(programData._id) : actor.getOwnedItem(programData.uuid);
          if (typeof program === "object") {
            programData.uuid = program.uuid;
            delete programData._id;
            newPrograms.installed.push(programData);
            itemUpdates.system.installedItems.list.push(program.uuid);
            itemUpdates.system.installedItems.usedSlots += program.system.size;
          }
        }

        for (const programData of oldPrograms.rezzed) {
          const program = (typeof programData.uuid === "undefined") ? actor.getOwnedItem(programData._id) : actor.getOwnedItem(programData.uuid);
          if (typeof program === "object") {
            programData.uuid = program.uuid;
            delete programData._id;
            newPrograms.rezzed.push(programData);
          }
        }
        itemUpdates.system.programs = newPrograms;
      }
      updatedItemList = CPRMigration.addToUpdateList(updatedItemList, itemUpdates);
    }

    await actor.update({ "system.installedItems": installedItems });

    if (updatedItemList.length > 0) {
      await actor.updateEmbeddedDocuments("Item", updatedItemList);
    }
  }

  /**
   * The Foundry object migration handles most of the changes here.  This is only run against world items.
   * The things that we are doing here:
   *
   * Updating existing objects data model points:
   * - moving slots to the appropriate places
   * - configuring appropriate allowableTypes for container types
   *
   * Cleaning up stale data points which somehow slipped through the cracks during previous migrations.
   *
   * @param {CPRItem} item
   */
  static async migrateItem(item) {
    LOGGER.trace("migrateItem | 6-universalInstall Migration");

    const systemChanges = {};
    const containerTypes = CPRSystemUtils.GetTemplateItemTypes("container");

    if (containerTypes.includes(item.type)) {
      if (typeof item.system.installedItems === "object") {
        systemChanges.installedItems = duplicate(item.system.installedItems);
      } else {
        systemChanges.installedItems = {
          allowedTypes: ["itemUpgrade"],
          allowed: true,
          list: [],
          usedSlots: 0,
          slots: 3,
        };
      }

      if (item.type === "cyberdeck") {
        systemChanges.installedItems.allowedTypes.push("programs");
        systemChanges.installedItems.slots = Math.max(systemChanges.installedItems.slots, parseInt(item.system.slots, 10));
      }

      if (item.type === "cyberware") {
        systemChanges.installedItems.allowedTypes.push("programs");
        systemChanges.installedItems.slots = Math.max(systemChanges.installedItems.slots, parseInt(item.system.optionSlots, 10));
      }
    }

    const updatedSystem = mergeObject(UniversalInstallMigration.scrubItem(item), systemChanges);

    await item.update({ system: updatedSystem }, { CPRmigration: true, mergeDeletes: true });
  }

  /**
   * Clean data points that shouldn't exist on our data model which must have slipped through the cracks
   * in the past migration code.
   *
   * @param {CPRItem} item
   */
  static scrubItem(item) {
    LOGGER.trace("scrubItem | 6-universalInstall Migration");
    let systemChanges = {};

    const removedProperties = ["hasOptionalSlots", "optionSlots", "installedOptionSlots", "optionalIds", "slots"];

    if (typeof item.system.installedItems === "object") {
      systemChanges.installedItems = duplicate(item.system.installedItems);
    } else {
      systemChanges.installedItems = {
        allowedTypes: ["itemUpgrade"],
        allowed: true,
        list: [],
        usedSlots: 0,
        slots: 3,
      };
    }

    for (const prop of removedProperties) {
      if (typeof item.system[prop] !== "undefined") {
        switch (prop) {
          case "optionSlots": {
            systemChanges.installedItems.slots = Math.max(systemChanges.installedItems.slots, parseInt(item.system.optionSlots, 10));
            break;
          }
          case "slots": {
            systemChanges.installedItems.slots = Math.max(systemChanges.installedItems.slots, parseInt(item.system.slots, 10));
            break;
          }
          default:
        }
        systemChanges = { ...systemChanges, ...CPRMigration.safeDelete(item, `system.${prop}`) };
      }
    }
    return systemChanges;
  }
}
