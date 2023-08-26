/* eslint-disable no-await-in-loop */
/* global duplicate Item game Folder */
import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";

/**
 * If an item can ACCEPT upgrades (i.e. it has slots), then it should include this
 * mixin. This does not accommodate items that are upgrades.
 */
const Container = function Container() {
  /**
   * Return the number of available slots, taking into
   * considerations any upgrades which may change the number
   * of slots.
   *
   * NOTE: Only call this function when `this` is CPRItem,
   * as CPRActors don't have slots.
   *
   * @returns Integer - Total number of available slots
   */
  this.availableInstallSlots = function availableInstallSlots() {
    LOGGER.trace("availableInstallSlots | Container | Called.");
    const itemTemplates = SystemUtils.GetTemplateItemTypes("upgradable");
    let totalSlots = this.system.installedItems.slots;
    if (itemTemplates.includes(this.type)) {
      const upgradeData = this.getTotalUpgradeValues("slots");
      totalSlots =
        upgradeData.type === "override"
          ? upgradeData.value
          : totalSlots + upgradeData.value;
    }
    return parseInt(totalSlots - this.system.installedItems.usedSlots, 10);
  };

  /**
   * Get an array of the objects installed in this Item. An optional
   * string parameter may be passed to filter the return list by a
   * specific Item type.
   *
   * @param {String} type - Optionally return a list of a specific item type
   * @returns {Array} - Array of objects that are installed
   */
  this.getInstalledItems = function getInstalledItems(type = false) {
    LOGGER.trace("getInstalledItems | Container | Called.");
    const actor = this.isOwned ? this.actor : false;

    const installedItems = [];

    this.system.installedItems.list.forEach((id) => {
      const item = actor ? actor.getOwnedItem(id) : game.items.get(id);
      if (!type || item?.type === type) {
        installedItems.push(item);
      }
    });
    return installedItems;
  };

  /**
   * Get an array of items that can be installed in this item,
   * whether they are installed or not.
   *
   * @param {String} type - Optionally return a list of a specific item type
   * @returns {Array} - Array of objects that are installed
   */
  this.getInstallableItems = function getInstallableItems(type = false) {
    LOGGER.trace("getInstalableItems | Container | Called.");
    const actor = this.isOwned ? this.actor : false;
    // If a type is provided as an argument, then that is the only allowed type.
    // Otherwise, go with the configured values.
    const allowedTypes = type
      ? [type]
      : this.system.installedItems.allowedTypes;

    // If there is an actor, get owned items. Else, get world items.
    let installableItems = [];
    if (actor) {
      installableItems = actor.items.filter((i) =>
        allowedTypes.includes(i.type)
      );
    } else {
      installableItems = game.items.filter((i) =>
        allowedTypes.includes(i.type)
      );
    }

    // Filter out item upgrades that don't fit this item type.
    installableItems = installableItems.filter((i) => {
      if (i.type === "itemUpgrade" && this.type !== i.system.type) {
        return false;
      }
      return true;
    });

    return installableItems;
  };

  /**
   * Get an array of the objects installed in this Item.
   *
   * @returns {Array} - Array of objects that are installed
   */
  this.recursiveGetAllInstalledItems =
    function recursiveGetAllInstalledItems() {
      LOGGER.trace("recursiveGetAllInstalledItems | Container | Called.");

      const installedItems = [];
      const containerTypes = SystemUtils.GetTemplateItemTypes("container");

      const actor = this.isEmbedded ? this.actor : false;
      if (this.system.installedItems.list.length > 0) {
        let idList = this.system.installedItems.list;
        while (idList.length > 0) {
          for (const id of idList) {
            const item = actor ? actor.getOwnedItem(id) : game.items.get(id);
            if (item !== null) {
              if (containerTypes.includes(item.type)) {
                idList = idList.concat(item.system.installedItems.list);
              }
              installedItems.push(item);
            }
            idList = idList.filter((itemId) => itemId !== id);
          }
        }
      }
      return installedItems;
    };

  /**
   * Determine if a set of objects can be installed into this Item. Checks for
   * the following criteria:
   *  - Items are allowed to be installed
   *  - Item in itemLists are all in the allowedTypes of this item
   *  - Cumulative size of items in itemList is less than or equal to available slots
   *
   * @param {Array} itemList - Array of objects to wanting to be installed
   * @returns {Boolean} - Whether this item can install all objects passed to it
   */
  this.canInstallItems = function canInstallItems(itemList) {
    LOGGER.trace("canInstallItems | Container | Called.");
    if (!Array.isArray(itemList)) {
      LOGGER.debug(
        `CPRActor.canInstallItems argument is not an array: ${itemList}`
      );
      return false;
    }

    // Check that the document allows anything to be installed.
    let result = this.system.installedItems.allowed;

    let totalInstallationSize = 0;
    itemList.forEach((item) => {
      if (
        // Check that the item's *type* can be installed.
        this.system.installedItems.allowedTypes.includes(item.type) &&
        // Check that the item being installed is actually 'installable'.
        SystemUtils.getDataModelTemplates(item.type).includes("installable")
      ) {
        // For actors, which don't have slots, this will result in `0 + undefined = NaN` and will otherwise be unused
        totalInstallationSize += item.system.size;
      } else {
        SystemUtils.DisplayMessage(
          "error",
          SystemUtils.Format("CPR.messages.installInvalidType", {
            target: this.name,
            item: item.name,
          })
        );
        result = false;
      }
    });

    if (this.documentName === "Item") {
      const availableSlots = this.availableInstallSlots();
      if (totalInstallationSize > availableSlots) {
        SystemUtils.DisplayMessage(
          "error",
          SystemUtils.Format("CPR.messages.installInsufficientSlots", {
            item: this.name,
          })
        );
        result = false;
      }
    }

    return result;
  };

  /**
   * This will install items into this item.
   * @param {Array} itemList - Array of Item Objects to be installed
   * @returns {Promise<Boolean>} - Promise containing a boolean; whether or not changes were made to the caling document.
   */
  this.installItems = async function installItems(itemList) {
    LOGGER.trace("_installItems | Container | Called.");
    // Make sure this function is passed an array.
    if (!Array.isArray(itemList)) {
      Promise.reject(
        new Error(`CPRItem.installItems argument is not an array: ${itemList}`)
      );
      return false;
    }

    const updateList = [];
    // Make sure we can actually install the items in this list.
    if (!this.canInstallItems(itemList)) {
      return false;
    }

    const actor = this.isOwned ? this.actor : false;

    const installedItems = duplicate(this.system.installedItems);
    const equippableTypes = SystemUtils.GetTemplateItemTypes("equippable");

    itemList.forEach((item) => {
      // No need to install it, it it's already installed.
      if (!installedItems.list.includes(item.id)) {
        // Add installed item to the target's list.
        installedItems.list.push(item.id);
        // Update target's used slots.
        installedItems.usedSlots += item.system.size;
        // Update the installed item itself.
        const itemData = {
          _id: item.id,
        };
        // Set equipped status of the newly installed item.
        if (equippableTypes.includes(item.type)) {
          itemData["system.equipped"] = equippableTypes.includes(this.type)
            ? this.system.equipped
            : "equipped";
        }
        // Push the installed item data
        updateList.push(itemData);
      }
    });
    // Push the data for the target item to the update list.
    updateList.push({ _id: this.id, "system.installedItems": installedItems });

    if (actor) {
      // `document.updateEmbeddedDocuments` returns an empty list if no changes were made.
      return actor
        .updateEmbeddedDocuments("Item", updateList)
        .then((list) => list.length > 0);
    }

    // `document.update` returns undefined if no changes were made. Double exclamation point
    // to make this a boolean.
    return !!(await this.update({ "system.installedItems": installedItems }));
  };

  /**
   * This will uninstall all items in itemList from this item.  By default, any installed items
   * which also have installed items will NOT have those items removed from it.  Example:
   * Uninstalling a Cyberdeck from a Bodyweight Suit will NOT also uninstall any programs/upgrades
   * from the Cyberdeck.
   *
   * An exception here is the uninstallation of Cyberware.  Cyberware is always removed recursively
   * so if you uninstall a CyberArm which has a Cyberdeck in it, all programs and upgrades from the
   * Cyberdeck are also uninstalled.
   *
   * TODO: Determine if we should stop recursiveness on an item type change.  IE, if this
   *       is a cyberware item, only remove all embedded cyberware items and if something else
   *       is installed, like a cyberdeck, don't uninstall whatever it has installed.
   * @param {Array} itemList - Array of objects to uninstall
   * @param {Boolean} recursive  - Boolean stating if the uninstallation should be recursive
   *                               in that each item uninstalled should also have it's own
   *                               installed items removed.  This is needed for Cyberware uninstallations.
   * @returns {Promise} - Promise containing an updated list of objects from updateEmbeddedDocuments()
   */
  this.uninstallItems = async function uninstallItems(
    uninstallList,
    recursive = false
  ) {
    LOGGER.trace("uninstallItems | Container | Called.");
    if (!Array.isArray(uninstallList)) {
      return Promise.reject(
        new Error(
          `Container.uninstallItems argument is not an array: ${uninstallList}`
        )
      );
    }
    const containerTypes = SystemUtils.GetTemplateItemTypes("container");
    const actor = this.isOwned ? this.actor : false;
    // Duplicate the currenlty installed items.
    const installedIds = duplicate(this.system.installedItems.list);

    for (const item of uninstallList) {
      // Get index of uninstalled item.
      const index = installedIds.indexOf(item.id);
      // Remove that entry.
      installedIds.splice(index, 1);

      // Handle recursion - Uninstall items installed in items from `uninstallList`.
      if (recursive && containerTypes.includes(item.type)) {
        const recursiveUninstalled = item.getInstalledItems();
        if (recursiveUninstalled.length > 0) {
          await item.uninstallItems(recursiveUninstalled, true);
        }
      }
    }

    // Programs require some special actions like setting isRezzed to false,
    // and deleting any Black Ice tokens from the canvas, if applicable.
    // Those are handled in `cyberdeck.uninstallPrograms()`.
    const uninstalledPrograms = uninstallList.filter(
      (i) => i.type === "program"
    );
    if (uninstalledPrograms.length > 0 && this.type === "cyberdeck") {
      await this.uninstallPrograms(uninstalledPrograms);
    }

    // Update used slots with the newly installed system.
    let usedSlots = 0;
    if (this.documentName === "Item") {
      installedIds.forEach((i) => {
        const item = actor ? actor.getOwnedItem(i) : game.items.get(i);
        usedSlots += item.system.size;
      });
    }

    // Update the item with the new list and used slots.
    return this.update({
      "system.installedItems.list": installedIds,
      "system.installedItems.usedSlots": usedSlots,
    });
  };

  /**
   * This function is called from the createItem hook and it will create any items that are
   * installed in this container object at the location of this container object. In other words:
   *
   * If this object is created on an actor, the installed items are created on the same actor
   * If this object is created in the world, the installed items are created as world items
   *
   * World items that are created, are created in in a folder defined by the localized variable:
   *
   *  "CPR.settings.installedItemsFolder".
   *
   * @returns {Promise} - Promise of updated document
   */
  this.createInstalledItems = async function createInstalledItems() {
    LOGGER.trace("createInstalledItems | Container | Called.");
    const actor = this.isOwned ? this.actor : false;

    const equipTypes = SystemUtils.GetTemplateItemTypes("equippable");
    const upgradableTypes = SystemUtils.GetTemplateItemTypes("upgradable");
    const creationList = [];
    for (const installedId of this.system.installedItems.list) {
      const installedItem = actor
        ? actor.getOwnedItem(installedId)
        : game.items.get(installedId);
      creationList.push(installedItem.toObject());
    }

    const newInstalledList = [];

    if (creationList.length > 0) {
      const containerTypes = SystemUtils.GetTemplateItemTypes("container");
      let createdItems = [];
      if (actor) {
        createdItems = await actor.createEmbeddedDocuments(
          "Item",
          creationList
        );
      } else {
        const folderName = SystemUtils.Localize(
          "CPR.settings.installedItemsFolder"
        );
        const folderList = game.folders.filter(
          (folder) => folder.name === folderName && folder.type === "Item"
        );
        const workingFolder =
          folderList.length === 1
            ? folderList[0]
            : await Folder.create({ name: folderName, type: "Item" });
        for (const item of creationList) {
          item.folder = workingFolder;
          item.system.isInstalled = true;
          item.system.installedIn = this.id;
          const newItem = await Item.create(item);
          createdItems.push(newItem);
        }
      }
      for (const item of createdItems) {
        newInstalledList.push(item.id);
      }
    }

    return !actor
      ? this.update({ "system.installedItems.list": newInstalledList })
      : actor.updateEmbeddedDocuments("Item", [
          { _id: this._id, "system.installedItems.list": newInstalledList },
        ]);
  };
};

export default Container;
