/* eslint-disable foundry-cpr/logger-after-function-definition */
/* global game */

import CPRMigration from "../cpr-migration.js";
import CPRSystemUtils from "../../../utils/cpr-systemUtils.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class PackIconMigration extends CPRMigration {
  constructor() {
    LOGGER.trace("constructor | PackIcon Migration");
    super();
    this.version = 9;
    this.name = "PackIcon Migration";
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
   * Here's the real work.
   *
   * @param {CPRItem} item
   */
  static async migrateItem(item) {
    LOGGER.trace(`migrateItem | ${this.version}-${this.name}`);
    const updateData = item.isOwned ? { _id: item._id } : {};
    const basePath = `systems/${game.system.id}/icons/compendium`;
    const itemImage = item.img;

    // Update drug images
    const drugIcons = [
      `${basePath}/gear/antibiotics.svg`,
      `${basePath}/gear/black_lace.svg`,
      `${basePath}/gear/blue_glass.svg`,
      `${basePath}/gear/boost.svg`,
      `${basePath}/gear/rapidetox.svg`,
      `${basePath}/gear/smash.svg`,
      `${basePath}/gear/speedheal.svg`,
      `${basePath}/gear/stim.svg`,
      `${basePath}/gear/surge.svg`,
      `${basePath}/gear/synthcoke.svg`,
    ];
    if (drugIcons.includes(itemImage)) {
      const newPath = itemImage.replace("gear", "drugs");
      updateData.img = newPath;
      return item.isOwned ? updateData : item.update(updateData);
    }

    // Update Upgrade images
    if (itemImage.includes(`${basePath}/item_upgrades`)) {
      const newPath = itemImage.replace("item_upgrades", "upgrades");
      updateData.img = newPath;
      return item.isOwned ? updateData : item.update(updateData);
    }

    // Update vehicle images
    if (itemImage.includes(`${basePath}/vehicle`)) {
      const newPath = itemImage.replace("vehicle", "vehicles");
      updateData.img = newPath;
      return item.isOwned ? updateData : item.update(updateData);
    }

    // Update net-rolltable images
    const itemNames = [
      "All Other Floors (Advanced)",
      "All Other Floors (Basic)",
      "All Other Floors (Standard)",
      "All Other Floors (Uncommon)",
      "First Two Floors (The Lobby)",
    ];
    if (item.name in itemNames) {
      const newPath = `${basePath}/default/Default_Dice.svg`;
      updateData.img = newPath;
      return item.isOwned ? updateData : item.update(updateData);
    }

    // Update flamethrower images
    if (itemImage.includes(`${basePath}/weapons/Flamethrower.svg`)) {
      const newPath = itemImage.replace("Flamethrower", "flamethrower");
      updateData.img = newPath;
      return item.isOwned ? updateData : item.update(updateData);
    }

    // Update throen weapon images
    if (itemImage.includes("icons/compendium/weapons/Thrown_Weapon.svg")) {
      const newPath = itemImage.replace("Thrown_Weapon", "thrown_weapon");
      updateData.img = newPath;
      return item.isOwned ? updateData : item.update(updateData);
    }

    // Update cyberdeck icon path
    if (itemImage.includes("icons/compendium/gear/cyberdeck.svg")) {
      const newPath = itemImage.replace("gear", "default");
      updateData.img = newPath;
      return item.isOwned ? updateData : item.update(updateData);
    }

    return null;
  }

  /**
   * Simply make sure owned items are updated too.
   *
   * @param {CPRActor} actor
   */
  async migrateActor(actor) {
    LOGGER.trace(`migrateActor | ${this.version}-${this.name}`);
    const itemUpdates = [];
    for (const item of actor.items) {
      // eslint-disable-next-line no-await-in-loop
      const updateData = await PackIconMigration.migrateItem(item);
      if (updateData !== null) itemUpdates.push(updateData);
    }
    return actor.updateEmbeddedDocuments("Item", itemUpdates);
  }
}
