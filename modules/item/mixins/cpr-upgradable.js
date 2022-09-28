/* global duplicate mergeObject */
import CPR from "../../system/config.js";
import LOGGER from "../../utils/cpr-logger.js";

/**
 * If an item can ACCEPT upgrades (i.e. it has slots), then it should include this
 * mixin. This does not accommodate items that are upgrades.
 */
const Upgradable = function Upgradable() {
  /**
   * Uninstall a list of upgrades from this Item
   *
   * @param {Array} upgrades - list of upgrade items to uninstall
   * @returns the updated item document after uninstallation
   */
  this.uninstallUpgrades = async function uninstallUpgrades(upgradeList) {
    LOGGER.trace("uninstallUpgrades | Upgradable | Called.");

    const actor = (this.isOwned) ? this.actor : false;

    if (!actor) {
      return Promise.reject(new Error("Can not install upgrades in unowned objects."));
    }

    let installedUpgrades = JSON.parse(JSON.stringify(this.system.upgrades));
    const updateList = [];

    for (const upgrade of upgradeList) {
      installedUpgrades = installedUpgrades.filter((installed) => installed.uuid !== upgrade.uuid);
    }
    const upgradeStatus = (installedUpgrades.length > 0);

    const uninstallResult = await this.uninstallItems(upgradeList);
    if (uninstallResult.length !== (upgradeList.length + 1)) {
      return Promise.reject(new Error(`Un-installation of upgrades failed. upgrades: ${upgradeList}, installResult: ${uninstallResult}`));
    }

    let thisChange = {
      _id: this.id,
      "system.isUpgraded": upgradeStatus,
      "system.upgrades": installedUpgrades,
    };
    if (typeof this.postUpgradeUninstall === "function") {
      const adjustmentChanges = this.postUpgradeUninstall(installedUpgrades.filter((u) => u.type === this.type));
      for (const change of adjustmentChanges) {
        if (change._id === this._id) {
          // eslint-disable-next-line no-await-in-loop
          thisChange = await mergeObject(thisChange, change);
        } else {
          updateList.push(change);
        }
      }
    }
    updateList.push(thisChange);

    return actor.updateEmbeddedDocuments("Item", updateList);
  };

  /**
   * Install a list of upgrades to this item.
   *
   * @param {Array} upgrades - the list of upgrades to install
   * @returns the updated item document after the installation
   */
  this.installUpgrades = async function installUpgrades(upgradeList) {
    LOGGER.trace("installUpgrades | Upgradable | Called.");

    const actor = (this.isOwned) ? this.actor : false;

    if (!actor) {
      return Promise.reject(new Error("Can not install upgrades in unowned objects."));
    }

    const installedItems = duplicate(this.system.installedItems);
    let installedUpgrades = duplicate(this.system.upgrades);
    const updateList = [];

    const installableUpgrades = [];
    for (const upgrade of upgradeList) {
      const alreadyInstalled = installedItems.list.includes(upgrade.uuid);
      if (!alreadyInstalled) {
        installableUpgrades.push(upgrade);
        installedUpgrades = installedUpgrades.filter((u) => u.uuid !== upgrade.uuid);
      }
    }

    if (installableUpgrades.length > 0) {
      if (this.canInstallItems(installableUpgrades)) {
        for (const upgrade of installableUpgrades) {
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
        const installResult = await this.installItems(installableUpgrades);
        if (installResult.length !== (installableUpgrades.length + 1)) {
          return Promise.reject(new Error(`Installation of upgrades failed. installableUpgrades: ${installableUpgrades}, installResult: ${installResult}`));
        }
        updateList.push({ _id: this._id, "system.isUpgraded": true, "system.upgrades": installedUpgrades });
      }
    }
    return actor.updateEmbeddedDocuments("Item", updateList);
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
