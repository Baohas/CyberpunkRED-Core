/* global Item game */
import * as CPRRolls from "../rolls/cpr-rolls.js";
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

// Item mixins
import Attackable from "./mixins/cpr-attackable.js";
import Effects from "./mixins/cpr-effects.js";
import Equippable from "./mixins/cpr-equippable.js";
import Loadable from "./mixins/cpr-loadable.js";
import Installable from "./mixins/cpr-installable.js";
import Physical from "./mixins/cpr-physical.js";
import Stackable from "./mixins/cpr-stackable.js";
import Upgradable from "./mixins/cpr-upgradable.js";
import Valuable from "./mixins/cpr-valuable.js";

/**
 * We extend the base Item object (document) provided by Foundry. All items in the system derive from it.
 * By itself, it is mostly useless and too generic to be used practically in game.
 *
 * @extends {Item}
 */
export default class CPRItem extends Item {
  /**
   * TODO: figure out what to do with this, hopefully not needed
   * TODO: this should figure out owned vs. not owned items too
   * @override
   * @param {Item} data - details/changes for the Item itself
   * @param {Object} options options (from Foundry) to the Item update process
   */
  update(data, options = {}) {
    LOGGER.trace("update | CPRItem | Called.");
    const cprData = data;
    if (data["data.type"] === "cyberwareInternal" || data["data.type"] === "cyberwareExternal" || data["data.type"] === "fashionware") {
      cprData["data.isFoundational"] = false;
    }
    if (this.data.type === "weapon") {
      cprData["data.dvTable"] = data["data.dvTable"] === null ? "" : data["data.dvTable"];
    }
    return super.update(cprData, options);
  }

  /**
   * TODO: probably not needed after the new code
   * @param {Item} data - the primitive data for the Item being created
   * @param {Object} options - options (from Foundry) to the Item creation process
   * @param {String} userId - user ID that is creating the Item
   */
  _onCreate(data, options, userId) {
    LOGGER.trace("_onCreate | CPRItem | Called.");
    const newData = data;
    // If we are creating an upgradable item from an existing upgradable item
    // which has been upgraded, remove the upgrade from the new weapon as it
    // may reference an itemUpgrade object which doesn't exist in the same
    // location as the upgradable item
    const upgradableItemTypes = SystemUtils.GetTemplateItemTypes("upgradable");
    if (upgradableItemTypes.includes(data.type)) {
      newData.data.isUpgraded = false;
      newData.data.upgrades = [];
    }
    super._onCreate(newData, options, userId);
  }

  /**
   * Load all mixins configured in the Item metadata.
   * TODO: enum this
   *
   * @public
   */
  loadMixins() {
    LOGGER.trace("loadMixins | CPRItem | Called.");
    const mixins = SystemUtils.getDataModelTemplates(this.type);
    const itemData = this.data.data;
    for (let m = 0; m < mixins.length; m += 1) {
      switch (mixins[m]) {
        case "attackable": {
          Attackable.call(CPRItem.prototype);
          break;
        }
        case "effects": {
          Effects.call(CPRItem.prototype);
          itemData.allowedUsage = this.getAllowedUsage();
          // To Do: we could toggle on/off if there's exactly 1 effect enforced...
          break;
        }
        case "equippable": {
          Equippable.call(CPRItem.prototype);
          break;
        }
        case "loadable": {
          Loadable.call(CPRItem.prototype);
          break;
        }
        case "installable": {
          Installable.call(CPRItem.prototype);
          break;
        }
        case "physical": {
          Physical.call(CPRItem.prototype);
          break;
        }
        case "stackable": {
          Stackable.call(CPRItem.prototype);
          break;
        }
        case "upgradable": {
          Upgradable.call(CPRItem.prototype);
          break;
        }
        case "valuable": {
          Valuable.call(CPRItem.prototype);
          break;
        }
        default:
          LOGGER.warn(`Tried to load an unknown mixin, ${mixins[m]}`);
      }
      // LOGGER.debug(`Added mixin ${mixins[m]} to ${this.id}`);
    }
  }

  /**
   * Whenever an item is created or updated this method is called by Foundry. We use it
   * to add in the "mixins" enabled for this item type.
   *
   * This seems excessive (once on item creation seems enough) but this is what DND5E does.
   *
   * @override
   */
  prepareDerivedData() {
    LOGGER.trace("prepareDerivedData | CPRItem | Called.");
    super.prepareDerivedData();
    this.loadMixins();
  }

  /**
   * Generic item.doAction() method so any item can be called to
   * perform an action.  This can be easily extended in the
   * switch statement and adding additional methods for each item.
   * Prepatory work for
   * Click to Consume (Apply mods / effect / state change)
   * Opening Agent Dialog
   * Any calls to functions not related to rolls, triggered from actions.
   *
   * @param {Actor} actor - the actor (parent) associated with the item doing something
   * @param {*} actionAttributes - arbitrary data to control the action
   */
  doAction(actor, actionAttributes) {
    LOGGER.trace("doAction | CPRItem | Called.");
    const itemType = this.data.type;
    switch (itemType) {
      case "cyberware": {
        this._cyberwareAction(actor, actionAttributes);
        break;
      }
      case "itemUpgrade": {
        this._itemUpgradeAction(actor, actionAttributes);
        break;
      }
      case "weapon": {
        this._weaponAction(actor, actionAttributes);
        break;
      }
      case "ammo": {
        this._ammoAction(actionAttributes);
        break;
      }
      default:
    }
  }

  /**
   * Dispatcher for update-specific actions.
   *
   * @param {CPRActor} actor - who is performing the upgrade action?
   * @param {Object} actionAttributes - details from the event data about the action
   * @returns null for invalid actions
   */
  _itemUpgradeAction(actor, actionAttributes) {
    LOGGER.trace("_itemUpgradeAction | CPRItem | Called.");
    switch (this.data.data.type) {
      case "weapon": {
        if (this.data.data.modifiers.secondaryWeapon.configured) {
          return this._weaponAction(actor, actionAttributes);
        }
        break;
      }
      default:
    }
    return null;
  }

  /**
   * Pop up a confirmation dialog box when performing a roll. Depending on the type,
   * the fields may be changed in the form. Properties in the CPRRoll object may
   * be modified by the form answers, and that is what is returned.
   *
   * @param {CPRRoll} cprRoll
   * @returns {CPRRoll}
   */
  confirmRoll(cprRoll) {
    LOGGER.trace("confirmRoll | CPRItem | Called.");
    const itemType = this.data.type;
    const localCprRoll = cprRoll;
    const actorData = this.actor.data;
    const itemEntities = game.system.template.Item;
    if (itemEntities[itemType].templates.includes("loadable")) {
      if (localCprRoll instanceof CPRRolls.CPRAttackRoll) {
        if (this.data.data.isRanged) {
          this.dischargeItem(localCprRoll);
          const ammoType = this._getLoadedAmmoType();
          if (ammoType !== "undefined") {
            localCprRoll.rollCardExtraArgs.ammoType = ammoType;
          }
        }
      }
      if (localCprRoll instanceof CPRRolls.CPRDamageRoll) {
        if (localCprRoll.isAutofire) {
          localCprRoll.setAutofire();
        }
      }
    }
    if (itemType === "role") {
      const subRoleAbility = this.data.data.abilities.find((a) => a.name === localCprRoll.roleName);
      let subRoleSkill;
      let isSubRoleAbility = false;
      let isVarying = false;
      if (typeof subRoleAbility !== "undefined") {
        isSubRoleAbility = true;
        subRoleSkill = subRoleAbility.skill;
      }
      if (!isSubRoleAbility && this.data.data.skill === "varying") {
        isVarying = true;
      } else if (isSubRoleAbility && subRoleSkill === "varying") {
        isVarying = true;
      }
      if (isVarying) {
        const roleSkill = actorData.filteredItems.skill.find((s) => s.data.name === localCprRoll.skillName);
        localCprRoll.skillValue = roleSkill.data.data.level;
        localCprRoll.addMod(actorData.bonuses[SystemUtils.slugify(roleSkill.data.name)]); // add skill bonuses from Active Effects
        if (localCprRoll.statName === "--") {
          localCprRoll.statName = roleSkill.data.data.stat;
          localCprRoll.statValue = this.actor.getStat(localCprRoll.statName);
        }
      }
    }
    return localCprRoll;
  }

  /**
   * Set whether the item is a favorite for the player, highlighting it in the UI/sheet
   */
  toggleFavorite() {
    LOGGER.trace("toggleFavorite | CPRItem | Called.");
    this.update({ "data.favorite": !this.data.data.favorite });
  }

  /**
   * Dispatcher method for creating item-based rolls.
   *
   * @param {String} type - type of roll to be created
   * @param {CPRActor} actor - actor doing the roll
   * @param {Object} extraData - extra data about the roll to consider
   * @returns {CPRRoll} or null for invalid roll types
   */
  createRoll(type, actor, extraData = []) {
    LOGGER.trace("createRoll | CPRItem | Called.");
    switch (type) {
      case CPRRolls.rollTypes.SKILL: {
        return this._createSkillRoll(actor);
      }
      case CPRRolls.rollTypes.INTERFACEABILITY:
        return this._createInterfaceRoll(extraData);
      case CPRRolls.rollTypes.ROLEABILITY: {
        return this._createRoleRoll(type, actor, extraData);
      }
      case CPRRolls.rollTypes.SUPPRESSIVE:
      case CPRRolls.rollTypes.AUTOFIRE:
      case CPRRolls.rollTypes.AIMED:
      case CPRRolls.rollTypes.ATTACK: {
        return this._createAttackRoll(type, actor);
      }
      case CPRRolls.rollTypes.DAMAGE: {
        const damageType = extraData.damageType ? extraData.damageType : type;
        return this._createDamageRoll(damageType);
      }
      case CPRRolls.rollTypes.CYBERDECKPROGRAM: {
        return this._createCyberdeckRoll(type, actor, extraData);
      }
      default:
    }
    return null;
  }
}
