/* global duplicate */
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
  this.uninstallUpgrades = function uninstallUpgrades(upgrades) {
    LOGGER.trace("uninstallUpgrades | Upgradable | Called.");
    let installedUpgrades = this.data.data.upgrades;
    const updateList = [];
    upgrades.forEach((u) => {
      installedUpgrades = installedUpgrades.filter((iUpgrade) => iUpgrade._id !== u.id);
      updateList.push({ _id: u.id, "data.isInstalled": false });
    });
    const upgradeStatus = (installedUpgrades.length > 0);
    // Need to set this so it can be used further in this function.
    this.data.data.upgrades = installedUpgrades;
    updateList.push({ _id: this.id, "data.isUpgraded": upgradeStatus, "data.upgrades": installedUpgrades });

    if (this.type === "weapon" && this.data.data.isRanged) {
      const magazineData = this.data.data.magazine;
      const upgradeValue = this.getAllUpgradesFor("magazine");
      const upgradeType = this.getUpgradeTypeFor("magazine");
      const magazineSize = (upgradeType === "override") ? upgradeValue : magazineData.max + upgradeValue;
      const extraBullets = magazineData.value - magazineSize;
      if (extraBullets > 0) {
        updateList.push({
          _id: this.id,
          "data.isUpgraded": upgradeStatus,
          "data.upgrades": installedUpgrades,
          "data.magazine.value": magazineData.max,
        });
        const ammo = this.actor.items.find((i) => i.data._id === magazineData.ammoId);
        const ammoStack = ammo.data.data.amount + extraBullets;
        updateList.push({ _id: ammo.id, "data.amount": ammoStack });
      }
    } else if (this.type === "armor") {
      const { bodyLocation } = this.data.data;
      const { headLocation } = this.data.data;
      const { shieldHitPoints } = this.data.data;
      bodyLocation.ablation = (bodyLocation.ablation > bodyLocation.sp) ? bodyLocation.sp : bodyLocation.ablation;
      headLocation.ablation = (headLocation.ablation > headLocation.sp) ? headLocation.sp : headLocation.ablation;
      shieldHitPoints.value = (shieldHitPoints.value > shieldHitPoints.max) ? shieldHitPoints.max : shieldHitPoints.value;
      updateList.push({
        _id: this.id,
        "data.isUpgraded": upgradeStatus,
        "data.upgrades": installedUpgrades,
        "data.bodyLocation": bodyLocation,
        "data.headLocation": headLocation,
        "data.shieldHitPoints": shieldHitPoints,
      });
    } else {
      updateList.push({ _id: this.id, "data.isUpgraded": upgradeStatus, "data.upgrades": installedUpgrades });
    }
    return this.actor.updateEmbeddedDocuments("Item", updateList);
  };

  /**
   * Install a list of upgrades to this item.
   *
   * @param {Array} upgrades - the list of upgrades to install
   * @returns the updated item document after the installation
   */
  this.installUpgrades = function installUpgrades(upgrades) {
    LOGGER.trace("installUpgrades | Upgradable | Called.");
    if (typeof this.data.data.isUpgraded === "boolean") {
      const installedUpgrades = this.data.data.upgrades;
      const updateList = [];
      // Loop through the upgrades to install
      upgrades.forEach((u) => {
        // See if the upgrade is already installed, if it is, skip it
        const alreadyInstalled = installedUpgrades.filter((iUpgrade) => iUpgrade._id === u.data._id);
        if (alreadyInstalled.length === 0) {
          // Update the upgrade Item set the isInstalled Boolean and the install setting to this item
          updateList.push({ _id: u.data._id, "data.isInstalled": true, "data.install": this.id });
          const modList = {};
          const upgradeModifiers = u.data.data.modifiers;
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
              modList[index] = modifier;
            }
          });
          const upgradeData = {
            _id: u.data._id,
            name: u.name,
            data: {
              modifiers: modList,
              size: u.data.data.size,
            },
          };
          installedUpgrades.push(upgradeData);
        }
      });
      updateList.push({ _id: this.id, "data.isUpgraded": true, "data.upgrades": installedUpgrades });
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
    if (this.actor && typeof this.data.data.isUpgraded === "boolean" && this.data.data.isUpgraded) {
      const installedUpgrades = this.data.data.upgrades;
      installedUpgrades.forEach((upgrade) => {
        if (typeof upgrade.data.modifiers[dataPoint] !== "undefined") {
          const modType = upgrade.data.modifiers[dataPoint].type;
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
    if (this.actor && typeof this.data.data.isUpgraded === "boolean" && this.data.data.isUpgraded) {
      const installedUpgrades = this.data.data.upgrades;
      installedUpgrades.forEach((upgrade) => {
        if (typeof upgrade.data.modifiers[dataPoint] !== "undefined") {
          const modType = upgrade.data.modifiers[dataPoint].type;
          const modValue = upgrade.data.modifiers[dataPoint].value;
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
   * Dynamically calculates the number of free upgrade slots on the item
   * by starting with the number of slots this item has and substacting
   * the slot size of each of the upgrades.
   *
   * Note that some items override this method: cyberware and cyberdecks.
   *
   * @return {Number}
   */
  this.availableSlots = function availableSlots() {
    LOGGER.trace("availableSlots | Upgradable | Called.");
    const itemData = duplicate(this.data.data);
    let unusedSlots = itemData.slots;
    itemData.upgrades.forEach((mod) => {
      unusedSlots -= mod.data.size;
    });
    return unusedSlots;
  };
};

export default Upgradable;
