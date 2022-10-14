/* eslint-disable no-await-in-loop */
/* global game */

import CPRMigration from "../cpr-migration.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class UniversalInstallMigration extends CPRMigration {
  constructor() {
    LOGGER.trace("constructor | 3-universalInstall Migration");
    super();
    this.version = 2;
    this.name = "Universal Install Migration";
  }

  /**
   * Executed before the migration takes place, see run() in the base migration class.
   */
  async preMigrate() {
    LOGGER.trace("preMigrate | 3-universalInstall Migration");
    LOGGER.log(`Starting migration: ${this.name}`);
  }

  /**
   * Takes place after the data migration completes.
   */
  async postMigrate() {
    LOGGER.trace("postMigrate | 3-universalInstall Migration");
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
    LOGGER.trace("migrateActor | 3-universalInstall Migration");
    const { installedItems } = actor.system;
    const updatedItemList = [];
    const cyberware = actor.items.filter((i) => i.type === "cyberware");
    const installedFoundationalCyberware = cyberware.filter((i) => i.system.isFoundational && i.system.isInstalled);

    for (const cw of installedFoundationalCyberware) {
      installedItems.list.push(cw.uuid);
      const cwInstalledItems = cw.system.installedItems;
      cwInstalledItems.allowedTypes = ["itemUpgrade", "cyberware"];
      cwInstalledItems.slots = parseInt(cw.system.optionSlots, 10);
      for (const ocwId of cw.optionalIds) {
        const ocw = actor.getOwnedItem(ocwId);
        cwInstalledItems.list.push(ocw.uuid);
        cwInstalledItems.usedSlots += ocw.system.size;
      }
      updatedItemList.push({
        _id: cw._id,
        "system.installedIn": actor.uuid,
        "system.isInstalled": true,
        "system.installedItems": cwInstalledItems,
      });
    }

    const cyberdecks = actor.items.filter((i) => i.type === "cyberdeck");
    cyberdecks.forEach((item) => {
      const oldPrograms = item.system.programs;
      const newPrograms = {
        installed: [],
        rezzed: [],
      };

      for (const programData of oldPrograms.installed) {
        const program = actor.getOwnedItem(programData._id);
        programData.uuid = program.uuid;
        newPrograms.installed.push(programData);
      }

      for (const programData of oldPrograms.rezzed) {
        const program = actor.getOwnedItem(programData._id);
        programData.uuid = program.uuid;
        newPrograms.rezzed.push(programData);
      }
      updatedItemList.push({ _id: item._id, "system.programs": newPrograms });
    });

    if (updatedItemList.length > 0) {
      await actor.updateEmbeddedDocuments("Item", updatedItemList);
    }
  }

  /**
   * The Foundry object migration handles most of the changes here.  The things that we are doing here
   * is cleaning up stale data points which somehow slipped through the cracks during previous migrations.
   *
   * @param {CPRItem} item
   */
  static async migrateItem(item) {
    LOGGER.trace("migrateItem |3-universalInstall Migration");

    const systemChanges = UniversalInstallMigration.scrubItem(item);

    await item.update({ system: systemChanges }, { CPRmigration: true, mergeDeletes: true });
  }

  /**
   * Clean data points that shouldn't exist on our data model which must have slipped through the cracks
   * in the past migration code.
   *
   * @param {CPRItem} item
   */
  static scrubItem(item) {
    LOGGER.trace("scrubItem | 2-foundryV10 Migration");
    let systemChanges = {};
    if (typeof item.system.attachmentSlots !== "undefined") {
      systemChanges = { ...systemChanges, ...CPRMigration.safeDelete(item, "attachmentSlots") };
    }

    if (game.system.template.Item[item.type].templates.includes("physical") && typeof item.system.concealable !== "object") {
      systemChanges.concealable = {
        concealable: item.system.concealable,
        isConcealed: item.system.isConcealed,
      };
      systemChanges = { ...systemChanges, ...CPRMigration.safeDelete(item, "isConcealed") };
    }

    if (!game.system.template.Item[item.type].templates.includes("stackable") && (typeof item.system.amount !== "undefined")) {
      systemChanges = { ...systemChanges, ...CPRMigration.safeDelete(item, "amount") };
    }

    if (typeof item.system.upgrade !== "undefined") {
      systemChanges = { ...systemChanges, ...CPRMigration.safeDelete(item, "upgrade") };
    }
    return systemChanges;
  }
}
