/* global duplicate */
import CPR from "../../system/config.js";
import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";

/**
 * If an item can ACCEPT upgrades (i.e. it has slots), then it should include this
 * mixin. This does not accommodate items that are upgrades.
 */
const Upgradable = function Upgradable() {
  /**
   * Sync the upgrade list with the installed Items list. When
   * this function is called, the expectation is that the
   * installedItems properly accurately reflects what is installed
   * which may or may not be an upgrade.
   *
   * @param {Array} upgrades - the list of upgrades to install
   * @returns the updated item document after the installation
   */
  this.syncUpgrades = async function syncUpgrades(upgradeList) {
    LOGGER.trace("syncUpgrades | Upgradable | Called.");

    const actor = (this.isOwned) ? this.actor : false;

    if (!actor) {
      SystemUtils.DisplayMessage("warn", SystemUtils.Localize("CPR.messages.ownedItemOnlyError"));
      return Promise.reject(new Error("Can not install upgrades in unowned objects."));
    }

    const installedItems = duplicate(this.system.installedItems);
    let installedUpgrades = duplicate(this.system.upgrades);

    // First, remove any upgrades that were uninstalled
    for (const upgrade of this.system.upgrades) {
      if (!installedItems.list.includes(upgrade.uuid)) {
        installedUpgrades = installedUpgrades.filter((u) => u.uuid !== upgrade.uuid);
      }
    }

    // Next identify any upgrades that are installed but not recorded
    // as an upgraded data point
    const newUpgrades = [];
    installedItems.list.forEach((uuid) => {
      const installedItem = actor.getOwnedItem(uuid);
      if (installedItem.type === "itemUpgrade" && installedUpgrades.filter((upgrade) => upgrade.uuid === uuid).length === 0) {
        newUpgrades.push(installedItem);
      }
    });

    for (const upgrade of newUpgrades) {
      const upgradeModifiers = upgrade.system.modifiers;
      const modList = {};
      Object.keys(upgradeModifiers).forEach((index) => {
        const modifier = upgradeModifiers[index];
        /*
              Before we add this modifier to the list of upgrades for this item, we need to do several checks:
              1. Ensure the modifier is defined as the key could have been added but the value never set
              2. Ensure the modifier is valid for this item type. As this information is stored in an
                object, it's possible keys may exist that are not valid if one changes the itemUpgrade type.
              3. The next couple checks ensure we are only adding actual modifications, null, 0 or empty strings don't modify
                anything, so we ignore those.
            */
        if (typeof modifier !== "undefined" && typeof CPR.upgradableDataPoints[this.type][index] !== "undefined"
              && modifier !== 0 && modifier !== null && modifier !== "") {
          if (typeof modifier.value === "undefined" || modifier.value !== null) {
            modList[index] = modifier;
          }
        }
      });
      if (Object.keys(modList).length > 0) {
        const upgradeData = {
          _id: upgrade._id,
          uuid: upgrade.uuid,
          name: upgrade.name,
          type: upgrade.system.type,
          size: upgrade.system.size,
          system: {
            modifiers: modList,
          },
        };
        installedUpgrades.push(upgradeData);
      }
    }
    const upgradeStatus = (installedUpgrades.length > 0);
    let upgradeData = [{
      _id: this._id,
      "system.isUpgraded": upgradeStatus,
      "system.upgrades": installedUpgrades,
    }];
    this.system.isUpgraded = upgradeStatus;
    this.system.upgrades = installedUpgrades;

    if (this.type === "weapon" && this.system.isRanged && this.system.magazine.ammoId !== "") {
      const additionalUpdates = await this.syncMagazine();
      if (additionalUpdates.length > 0) {
        upgradeData = upgradeData.concat(additionalUpdates);
      }
    }
    return actor.updateEmbeddedDocuments("Item", upgradeData);
  };

  /**
   * Given a data point that this upgrade improves, find out the type of upgrade and total up all
   * of the modifications being applied to it, and consider overrides. In some ways
   * this is a reimplementation of what Active Effects provides, returnign the "mode" and value.
   * We could not use AEs here because AE cannot modify other items, only actors. Do not confuse
   * this with the upgradeType property either, which controls what item types this upgrade is applicable for.
   *
   * @param {String} dataPoint - a stat/property/value that this upgrade modifies on the parent item
   * @returns {Object} upgradeData - an object with a key for "type" and "value" of the upgrade
   *
   */
  this.getAllUpgradesFor = function getAllUpgradesFor(dataPoint) {
    LOGGER.trace("getAllUpgradesFor | Upgradable | Called.");
    let upgradeNumber = 0;
    let baseOverride = -100000;
    const upgradeData = {
      type: "modifier",
      value: 0,
    };
    if (this.actor && typeof this.system.isUpgraded === "boolean" && this.system.isUpgraded) {
      const installedUpgrades = this.system.upgrades;
      installedUpgrades.forEach((upgrade) => {
        if (typeof upgrade.system.modifiers[dataPoint] !== "undefined") {
          const modType = upgrade.system.modifiers[dataPoint].type;
          const modValue = upgrade.system.modifiers[dataPoint].value;
          if (typeof modValue === "number" && modValue !== 0) {
            if (modType === "override") {
              baseOverride = (modValue > baseOverride) ? modValue : baseOverride;
            } else {
              upgradeNumber += modValue;
            }
          }
        }
      });
      if (baseOverride === 0 || baseOverride === -100000) {
        upgradeData.type = "modifier";
        upgradeData.value = upgradeNumber;
      } else {
        upgradeData.type = "override";
        upgradeData.value = baseOverride;
      }
    }
    return upgradeData;
  };

  /**
   * Whenever a new upgradeable item is created, we automatically clear the upgrades associated with it.
   * Otherwise, a copied Item will contain references to upgrades used in the original item.
   *
   * @param {Object} data - the data the item is being created from
   */
  this.clearUpgrades = function clearUpgrades(data) {
    LOGGER.trace("clearUpgrades | Upgradable | Called.");
    const newData = data;
    newData.system.isUpgraded = false;
    newData.system.upgrades = [];
    return newData;
  };
};

export default Upgradable;
