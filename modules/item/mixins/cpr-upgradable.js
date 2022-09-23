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
   * Uninstall a list of upgrades from this Item
   *
   * @param {Array} upgrades - list of upgrade items to uninstall
   * @returns the updated item document after uninstallation
   */
  this.uninstallUpgrades = function uninstallUpgrades(upgrades) {
    LOGGER.trace("uninstallUpgrades | Upgradable | Called.");
    const installedItems = duplicate(this.system.installedItems);
    let installedUpgrades = this.system.upgrades;

    const updateList = [];
    upgrades.forEach((u) => {
      installedUpgrades = installedUpgrades.filter((iUpgrade) => iUpgrade.uuid !== u.uuid);
      installedItems.list = installedItems.list.filter((uuid) => u.uuid !== uuid);
      installedItems.usedSlots -= u.system.size;
      updateList.push({ _id: u.id, "system.isInstalled": false, "system.installedIn": "" });
    });
    const upgradeStatus = (installedUpgrades.length > 0);
    // Need to set this so it can be used further in this function.
    this.system.upgrades = installedUpgrades;
    updateList.push({
      _id: this.id,
      "system.isUpgraded": upgradeStatus,
      "system.upgrades": installedUpgrades,
      "system.installedItems.list": installedItems,
    });

    if (this.type === "weapon" && this.system.isRanged) {
      const magazineData = this.system.magazine;
      const upgradeValue = this.getAllUpgradesFor("magazine");
      const upgradeType = this.getUpgradeTypeFor("magazine");
      const magazineSize = (upgradeType === "override") ? upgradeValue : magazineData.max + upgradeValue;
      const extraBullets = magazineData.value - magazineSize;
      if (extraBullets > 0) {
        updateList.push({
          _id: this.id,
          "system.isUpgraded": upgradeStatus,
          "system.installedItems": installedItems,
          "system.magazine.value": magazineData.max,
        });
        const ammo = this.actor.items.find((i) => i._id === magazineData.ammoId);
        const ammoStack = ammo.system.amount + extraBullets;
        updateList.push({ _id: ammo.id, "system.amount": ammoStack });
      }
    } else if (this.type === "armor") {
      const { bodyLocation } = this.system;
      const { headLocation } = this.system;
      const { shieldHitPoints } = this.system;
      bodyLocation.ablation = (bodyLocation.ablation > bodyLocation.sp) ? bodyLocation.sp : bodyLocation.ablation;
      headLocation.ablation = (headLocation.ablation > headLocation.sp) ? headLocation.sp : headLocation.ablation;
      shieldHitPoints.value = (shieldHitPoints.value > shieldHitPoints.max) ? shieldHitPoints.max : shieldHitPoints.value;
      updateList.push({
        _id: this.id,
        "system.isUpgraded": upgradeStatus,
        "system.installedItems": installedItems,
        "system.bodyLocation": bodyLocation,
        "system.headLocation": headLocation,
        "system.shieldHitPoints": shieldHitPoints,
      });
    } else {
      updateList.push({ _id: this.id, "system.isUpgraded": upgradeStatus, "system.installedItems.list": installedItems });
    }
    return this.actor.updateEmbeddedDocuments("Item", updateList);
  };

  /**
   * Install a list of upgrades to this item.
   *
   * @param {Array} upgrades - the list of upgrades to install
   * @returns the updated item document after the installation
   */
  this.installUpgrades = async function installUpgrades(upgrades) {
    LOGGER.trace("installUpgrades | Upgradable | Called.");
    if (typeof this.system.isUpgraded === "boolean") {
      const installedItems = duplicate(this.system.installedItems);
      const installedUpgrades = duplicate(this.system.upgrades);
      const updateList = [];
      // Loop through the upgrades to install
      const installableUpgrades = [];
      upgrades.forEach((u) => {
        // See if the upgrade is already installed, if it is, skip it
        const alreadyInstalled = installedItems.list.filter((installedUuid) => installedUuid === u.uuid);
        if (alreadyInstalled.length === 0 && this.canInstallItem(u)) {
          installableUpgrades.push(u);
          const upgradeModifiers = u.system.modifiers;
          const modList = {};
          // Loop through the modifiers this upgrade has on it
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
          const upgradeData = {
            _id: u._id,
            uuid: u.uuid,
            name: u.name,
            size: u.system.size,
            system: {
              modifiers: modList,
            },
          };
          installedUpgrades.push(upgradeData);
          // Update the upgrade Item set the isInstalled Boolean and the install setting to this item
          updateList.push({ _id: u._id, "system.isInstalled": true, "system.installedIn": this.uuid });
        }
      });
      updateList.push({ _id: this.id, "system.isUpgraded": true, "system.upgrades": installedUpgrades });
      await this.installItems(installableUpgrades);
      return this.actor.updateEmbeddedDocuments("Item", updateList);
    }
    return null;
  };

  /**
   * Given a data point that this upgrade improves, find out the type of upgrade. In some ways
   * this is a reimplementation of the "mode" for active effects. We could not use AEs here
   * because AE cannot modify other items, only actors. Do not confuse this with the upgradeType
   * property either, which controls what item types this upgrade is applicable for.
   *
   * @param {String} dataPoint - a stat/property/value that this upgrade modifies on the parent item
   * @returns null or the upgrade type for a given data point
   */
  this.getUpgradeTypeFor = function getUpgradeTypeFor(dataPoint) {
    LOGGER.trace("getUpgradeTypeFor | Upgradable | Called.");
    let upgradeType = "modifier";
    if (this.actor && typeof this.system.isUpgraded === "boolean" && this.system.isUpgraded) {
      let installedUpgrades = "LOADING...";
      installedUpgrades = this.system.upgrades;
      installedUpgrades.forEach((upgrade) => {
        if (typeof upgrade.system.modifiers[dataPoint] !== "undefined") {
          const modType = upgrade.system.modifiers[dataPoint].type;
          if (modType !== "modifier") {
            upgradeType = modType;
          }
        }
      });
      return upgradeType;
    }
    return null;
  };

  /**
   * Given a data point, total up all modifications being applied to it, and consider overrides. Again
   * this is like what AEs do, but we cannot use them here.
   *
   * @param {} dataPoint - a stat/property/value that this upgrade modifies on the parent item
   * @returns
   */
  this.getAllUpgradesFor = function getAllUpgradesFor(dataPoint) {
    LOGGER.trace("getAllUpgradesFor | Upgradable | Called.");
    let upgradeNumber = 0;
    let baseOverride = -100000;
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
      upgradeNumber = (baseOverride === 0 || baseOverride === -100000) ? upgradeNumber : baseOverride;
    }
    return upgradeNumber;
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
