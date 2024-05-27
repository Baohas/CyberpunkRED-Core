import LOGGER from "../../../utils/cpr-logger.js";
import CPR from "../../../system/config.js";

export default class ActorWeaponsSchema extends foundry.abstract.DataModel {
  static defineSchema() {
    LOGGER.log("defineSchema | WeaponsSchema | Called.");
    return {};
  }

  /**
   * Returns a list of weapons based on the options passed.
   *
   * What are considered weapons:
   *   * item.type === weapon
   *   * item.type === cyberware.isWeapon
   *   * item.type === itemUpgrade.modifiers.secondaryWeapon.configuired
   *
   * Options:
   *
   * `all`: Everything considered a weapon above
   *
   * `available`:      weapon: owned/carried/equipped
   *              cyberWeapon: isWeapon && isInstalledInActor
   *              itemUpgrade: secondaryWeapon.configuired &&
   *                           installedIn weapon that is owned/carried/equipped
   *
   * `owned`:          weapon: owned
   *              itemUpgrade: secondaryWeapon.configuired &&
   *                           installedIn weapon that is owned
   *
   * `carried`:        weapon: carried
   *              itemUpgrade: secondaryWeapon.configuired &&
   *                           installedIn weapon that is carried
   *
   * `equipped`:       weapon: equipped
   *              cyberWeapon: isWeapon && isInstalledInActor
   *              itemUpgrade: secondaryWeapon.configuired &&
   *                           installedIn weapon that is equipped
   *
   * @param {string} option - filter weapons by one of the above options
   *
   * @return {Array} of CPRItems that match the filter option.
   */
  getWeapons(option) {
    LOGGER.trace("_getWeapons | ActorWeaponSchema | Called.");
    // Retrieve all possible equipped states an item can be in
    const equippedStates = Object.keys(CPR.equipped);

    // Helper function to check if an item is a weapon or cyberWeapon
    const isWeapon = (item) =>
      item.type === "weapon" ||
      (item.type === "cyberware" && item.system.isWeapon);

    // Helper function to check if an item is a itemUpgrade secondary weapon
    const isWeaponUpgrade = (item) =>
      item.type === "itemUpgrade" &&
      item.system.modifiers.secondaryWeapon.configured;

    // Create an array of all weapon items
    const allWeapons = this.parent.parent.items.filter(isWeapon);

    // Create an array of all itemUpgrades that are configuired as weapons
    const allUpgrades = this.parent.parent.items.filter(isWeaponUpgrade);

    const allInstalledCyberWeapons = allWeapons.filter(
      (item) => item.system.isInstalledInActor
    );

    // Helper function to determine if an item is available based on its
    // equipped status
    const isAvailable = (item) =>
      equippedStates.includes(item.system.equipped) ||
      (item.type === "cyberware" && item.system.isInstalledInActor) ||
      (item.type === "itemUpgrade" && isWeaponUpgrade(item));

    // Helper function to filter items based on a provided condition
    const filterItems = (condition) => allWeapons.filter(condition);

    // Helper function to filter upgrades based on the equipped state
    // of the weapon it is installed into
    const filterUpgrades = (upgrades, condition) =>
      upgrades.filter((upgrade) => {
        const parent = this.parent.parent.items.get(
          upgrade.system.installedIn[0]
        );
        return parent && condition(parent);
      });

    switch (option) {
      // Return all weapons and itemUpgrade weapons
      case "all": {
        return [...allWeapons, ...allUpgrades];
      }
      // Filter weapons and upgrades that are available
      case "available": {
        const availableWeapons = filterItems(isAvailable);
        const availableUpgrades = filterUpgrades(allUpgrades, isAvailable);
        return [...availableWeapons, ...availableUpgrades];
      }
      // Filter weapons and upgrades based on a their equipped status
      case "owned":
      case "carried":
      case "equipped": {
        const condition = (item) => item.system.equipped === option;
        const specificEquippedWeapons = filterItems(condition);
        const specificUpgrades = filterUpgrades(allUpgrades, condition);
        if (option === "equipped") {
          return [
            ...specificEquippedWeapons,
            ...specificUpgrades,
            ...allInstalledCyberWeapons,
          ];
        }
        return [...specificEquippedWeapons, ...specificUpgrades];
      }
      default: {
        return [];
      }
    }
  }

  // Getters to return one of the above options from `getWeapons`
  // Accessed via `actor.system.weapons.all` etc.
  get all() {
    LOGGER.trace("get all | ActorWeaponsSchema | Called.");
    return this.getWeapons("all");
  }

  get available() {
    LOGGER.trace("get available | ActorWeaponsSchema | Called.");
    return this.getWeapons("available");
  }

  get owned() {
    LOGGER.trace("get owned | ActorWeaponsSchema | Called.");
    return this.getWeapons("owned");
  }

  get carried() {
    LOGGER.trace("get carried | ActorWeaponsSchema | Called.");
    return this.getWeapons("carried");
  }

  get equipped() {
    LOGGER.trace("get equipped | ActorWeaponsSchema | Called.");
    return this.getWeapons("equipped");
  }
}
