/* globals Actor, game, getProperty, setProperty, hasProperty, duplicate */
import ConfirmPrompt from "../dialog/cpr-confirmation-prompt.js";
import CPR from "../system/config.js";
import CPRChat from "../chat/cpr-chat.js";
import CPRCharacterActorSheet from "./sheet/cpr-character-sheet.js";
import * as CPRRolls from "../rolls/cpr-rolls.js";
import InstallCyberwarePrompt from "../dialog/cpr-install-cyberware-prompt.js";
import LOGGER from "../utils/cpr-logger.js";
import Rules from "../utils/cpr-rules.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

/**
 * CPRActor contains common code between mooks and characters (NPCs and players).
 * It extends Actor which comes from Foundry.
 *
 * @extends {Actor}
 */
export default class CPRActor extends Actor {
  /**
   * create() is called when creating the actor, but it's not the same as a constructor. In the
   * code here, we pre-populate characters with skills, core cyberware, and other baked-in items.
   *
   * @async
   * @override
   * @static
   * @param {Object} data - a complex structure with details and data to stuff into the actor object
   * @param {Object} options - not used here, but required by the parent class
   */
  static async create(data, options) {
    LOGGER.trace("create | CPRCharacterActor | called.");
    const createData = data;
    if (typeof data.system === "undefined") {
      LOGGER.trace("create | New Actor | CPRCharacterActor | called.");
      createData.items = [];
      const tmpItems = data.items.concat(await SystemUtils.GetCoreSkills(), await SystemUtils.GetCoreCyberware());
      tmpItems.forEach((item) => {
        const cprItem = {
          name: item.name,
          img: item.img,
          type: item.type,
          system: item.system,
        };
        createData.items.push(cprItem);
      });
    }
    super.create(createData, options);
  }

  /**
   * Called when an actor is passed to the client, we override this to calculate
   * derived stats and massage some of the data for convenience later.
   *
   * @override
   */
  prepareData() {
    LOGGER.trace("prepareData | CPRActor | Called.");
    super.prepareData();
    if (this.compendium === null || this.compendium === undefined) {
      // It looks like prepareData() is called for any actors/npc's that exist in
      // the game and the clients can't update them.  Everyone should only calculate
      // their own derived stats, or the GM should be able to calculate the derived
      // stat
      if (this.isOwner || game.user.isGM) {
        this._calculateDerivedStats();
      }
    }
  }

  /**
   * Also called when an actor is passed to the client. Notably this is called BEFORE active
   * effects are applied to the actor, so we can prepare temporary variables for them to modify.
   * We get the list of skills for the actor, including custom, and creates a "bonus" object
   * in the actor data that active effects will later modify. When a skill roll is made, it will
   * use the bonus object to consider skill mods from active effects on the actor.
   *
   * @override
   */
  prepareBaseData() {
    LOGGER.trace("prepareBaseData | CPRActor | Called.");
    super.prepareBaseData();
    this.bonuses = {};
    const skills = this.items.filter((i) => i.type === "skill");
    skills.forEach((skill) => {
      this.bonuses[SystemUtils.slugify(skill.name)] = 0;
    });
    const roles = this.items.filter((i) => i.type === "role");
    roles.forEach((role) => {
      this.bonuses[SystemUtils.slugify(role.system.mainRoleAbility)] = 0;
      if (role.system.abilities.length > 0) {
        for (const ability of role.system.abilities) {
          this.bonuses[SystemUtils.slugify(ability.name)] = 0;
        }
      }
    });
    this.bonuses.run = 0;
    this.bonuses.walk = 0;
    this.bonuses.deathSavePenalty = 0;
    this.bonuses.hands = 0;
    this.bonuses.initiative = 0;
    this.bonuses.maxHp = 0;
    this.bonuses.maxHumanity = 0;
    this.bonuses.universalAttack = 0;
    this.bonuses.universalDamage = 0;
    // netrunning things
    this.bonuses.speed = 0;
    this.bonuses.perception_net = 0; // beware of hacks because "perception" is also a skill
    this.bonuses.attack = 0;
    this.bonuses.defense = 0;
    this.bonuses.rez = 0;
    // combat-related rolls
    this.bonuses.aimedShot = 0;
    this.bonuses.melee = 0;
    this.bonuses.ranged = 0;
    this.bonuses.autofire = 0;
    this.bonuses.suppressive = 0;
    this.bonuses.singleShot = 0;
  }

  /**
   * The Active Effects do not have access to their parent at preparation time so we wait until
   * this stage to determine whether they are suppressed or not. Taken from dnd5e character code.
   *
   * @override
   * @returns nothing, just applies effects to the actor
   */
  applyActiveEffects() {
    LOGGER.trace("applyActiveEffects | CPRActor | Called.");
    this.effects.forEach((e) => e.determineSuppression());
    return super.applyActiveEffects();
  }

  /**
   * The only reason we extend this code right now is to handle an edge case for migrations.
   *
   * @override
   * @param {String} embeddedName - document name, usually a category like Item
   * @param {Object} data - Array of documents to consider
   * @param {Object} context - an object tracking the context in which the method is being called
   * @returns {null}
   */
  async createEmbeddedDocuments(embeddedName, data, context) {
    LOGGER.trace("createEmbeddedDocuments | CPRActor | called.");
    // If migration is calling this, we definitely want to
    // create the Embedded Documents.
    const isMigration = !!(((typeof context) !== "undefined" && context.CPRmigration));
    if (!isMigration) {
      if (embeddedName === "Item") {
        let containsCoreItem = false;
        data.forEach((document) => {
          if (document.system && document.system.core) {
            containsCoreItem = true;
          }
        });
        if (containsCoreItem) {
          Rules.lawyer(false, "CPR.messages.dontAddCoreItems");
          return null;
        }
      }
    }
    // Standard embedded entity creation
    return super.createEmbeddedDocuments(embeddedName, data, context);
  }

  /**
   * This is where derived stats are calculated, and the behavior is driven by which sheet
   * (aka "app") is associated with the actor. This includes max HP, Humanity, Empathy, and
   * Death Saves. For mooks we skip humanity and hp calculations.
   *
   * To Do: this is called 3 times when creating an actor... why?
   *
   * @private
   */
  _calculateDerivedStats() {
    LOGGER.trace("_calculateDerivedStats | CPRActor | Called.");
    const cprData = this.system;
    const { derivedStats } = cprData;

    // Walk & Run, from the Move/Run Action (pg 127)
    derivedStats.walk.value = cprData.stats.move.value * 2;
    derivedStats.run.value = cprData.stats.move.value * 4;

    // seriously wounded
    derivedStats.seriouslyWounded = Math.ceil(derivedStats.hp.max / 2);

    // We need to always call this because if the actor was wounded and now is not, their
    // value would be equal to max, however their current wound state was never updated.
    this._setWoundState();
    // Updated derivedStats variable with currentWoundState
    derivedStats.currentWoundState = this.system.derivedStats.currentWoundState;

    // Death save
    let basePenalty = this.bonuses.deathSavePenalty; // 0 + active effects
    const critInjury = this.itemTypes.criticalInjury;
    critInjury.forEach((criticalInjury) => {
      const { deathSaveIncrease } = criticalInjury.system;
      if (deathSaveIncrease) {
        basePenalty += 1;
      }
    });
    derivedStats.deathSave.basePenalty = basePenalty;
    derivedStats.deathSave.value = derivedStats.deathSave.penalty + derivedStats.deathSave.basePenalty;
    this.system.derivedStats = derivedStats;

    if (typeof this.apps === "undefined") {
      // this happens when the actor is being created, we hardcode defaults here based on 6s in all stats
      derivedStats.hp.value = 40;
      derivedStats.hp.max = 40;
      derivedStats.humanity.value = 60;
      derivedStats.humanity.max = 60;
    } else if (Object.values(this.apps).some((app) => app instanceof CPRCharacterActorSheet)) {
      // The rest is character-specific. We only calculate hp and humanity for characters because some mooks
      // break the rules/standards.
      derivedStats.hp.value = Math.min(
        derivedStats.hp.value,
        derivedStats.hp.max,
      );
      if (derivedStats.humanity.value > derivedStats.humanity.max) {
        derivedStats.humanity.value = derivedStats.humanity.max;
      }
    }
  }

  /**
   * Returns the current wound state of the actor
   *
   * @returns {String}
   */
  getWoundState() {
    LOGGER.trace("getWoundState | CPRActor | Obtaining Wound State.");
    return this.system.derivedStats.currentWoundState;
  }

  /**
   * Sets the wound state of the actor based on the current hit point value
   *
   * @private
   */
  _setWoundState() {
    LOGGER.trace("_setWoundState | CPRActor | Setting Wound State.");
    const { derivedStats } = this.system;
    let newState = "invalidState";
    if (derivedStats.hp.value < 1) {
      newState = "mortallyWounded";
    } else if (derivedStats.hp.value < derivedStats.seriouslyWounded) {
      newState = "seriouslyWounded";
    } else if (derivedStats.hp.value < derivedStats.hp.max) {
      newState = "lightlyWounded";
    } else if (derivedStats.hp.value === derivedStats.hp.max) {
      newState = "notWounded";
    }
    this.system.derivedStats.currentWoundState = newState;
  }

  /**
   * Looks up the wound state and returns the penalties (-2, -4) that should be applied to rolls
   *
   * @returns {Number}
   */
  getWoundStateMods() {
    LOGGER.trace("getWoundStateMods | CPRActor | Obtaining Wound State Mods.");
    let woundStateMod = 0;
    if (this.getWoundState() === "seriouslyWounded") {
      woundStateMod = -2;
    }
    if (this.getWoundState() === "mortallyWounded") {
      woundStateMod = -4;
    }
    return woundStateMod;
  }

  /**
   * Returns an array of installed cyberware items
   *
   * @returns {Array} - installed Cyberware Items
   */
  getInstalledCyberware() {
    LOGGER.trace("getInstalledCyberware | CPRActor | Called.");
    return this.itemTypes.cyberware.filter((item) => item.system.isInstalled);
  }

  /**
   * Return an Array of cyberware matching the provided type and is installed.
   *
   * @param {string} type uses the type of a cyberware item to return a list of
   *                      compatiable foundational cyberware installed.
   * @return {Array} - Foundational Cyberware matching the type and is installed
   */
  getInstalledFoundationalCyberware(type) {
    LOGGER.trace("getInstalledFoundationalCyberware | CPRActor | Called.");
    if (type) {
      if (type in CPR.cyberwareTypeList) {
        return this.itemTypes.cyberware.filter(
          (item) => item.system.isInstalled
            && item.system.isFoundational
            && item.system.type === type,
        );
      }
      SystemUtils.DisplayMessage("error", "Invalid cyberware type!");
    }
    return this.itemTypes.cyberware.filter(
      (item) => item.system.isInstalled && item.system.isFoundational,
    );
  }

  /**
   * Top-level method to add (install) cyberware owned by an actor.
   * This will handle making sure it is going into the right foundational cyberware, if applicable.
   *
   * @async
   * @param {String} itemId - the ItemId of the cyberware to be added
   * @returns {null}
   */
  async addCyberware(itemId) {
    LOGGER.trace("addCyberware | CPRActor | Called.");
    const item = this._getOwnedItem(itemId);
    const compatibleFoundationalCyberware = this.getInstalledFoundationalCyberware(item.system.type);

    if (compatibleFoundationalCyberware.length < 1 && !item.system.isFoundational) {
      Rules.lawyer(false, "CPR.messages.warnNoFoundationalCyberwareOfCorrectType");
      return;
    }
    let formData;
    if (item.system.isFoundational) {
      formData = await InstallCyberwarePrompt.RenderPrompt({ item }).catch((err) => LOGGER.debug(err));
      if (formData === undefined) {
        return;
      }
      await this._addFoundationalCyberware(item, formData);
    } else {
      formData = await InstallCyberwarePrompt.RenderPrompt({
        item,
        foundationalCyberware: compatibleFoundationalCyberware,
      }).catch((err) => LOGGER.debug(err));
      if (formData === undefined) {
        return;
      }
      await this._addOptionalCyberware(item, formData);
    }
    await this.loseHumanityValue(item, formData);
  }

  /**
   * Add (install) foundational cyberware, which includes losing Humanity.
   *
   * @private
   * @param {CPRItem} item - the Cyberware item to install
   * @returns {Object}
   */
  _addFoundationalCyberware(item) {
    LOGGER.debug("_addFoundationalCyberware | CPRActor | Applying foundational cyberware.");
    return this.updateEmbeddedDocuments("Item", [{ _id: item.id, "system.isInstalled": true }]);
  }

  /**
   * Add (install) optional cyberware, including the loss of Humanity
   *
   * @private
   * @param {CPRItem} item - the Cyberware item to install
   * @param {Object} formData - an object representing answers from the installation dialog box
   * @returns {Object}
   */
  async _addOptionalCyberware(item, formData) {
    LOGGER.trace("_addOptionalCyberware | CPRActor | Called.");
    const tmpItem = item;
    LOGGER.trace(`_addOptionalCyberware | CPRActor | applying optional cyberware to item ${formData.foundationalId}.`);
    const foundationalCyberware = this._getOwnedItem(formData.foundationalId);
    const newOptionalIds = foundationalCyberware.system.optionalIds.concat(item._id);
    const newInstalledOptionSlots = foundationalCyberware.system.installedOptionSlots + item.system.size;
    tmpItem.system.isInstalled = true;
    const allowedSlots = Number(foundationalCyberware.availableSlots());
    Rules.lawyer((item.system.size <= allowedSlots), "CPR.messages.tooManyOptionalCyberwareInstalled");
    return this.updateEmbeddedDocuments("Item", [
      { _id: item.id, "system.isInstalled": true }, {
        _id: foundationalCyberware.id,
        "system.optionalIds": newOptionalIds,
        "system.installedOptionSlots": newInstalledOptionSlots,
      },
    ]);
  }

  /**
   * Remove (uninstall) Cyberware from an actor. Like addCyberware, this is the top-level entry method.
   *
   * @async
   * @param {String} itemId - the Cyberware item ID to uninstall
   * @param {String} foundationalId - the foundational Cyberware Id to uninstall from
   * @param {Boolean} skipConfirm - a boolean to indicate whether the confirmation dialog should be displayed
   * @returns {Object}
   */
  async removeCyberware(itemId, foundationalId, skipConfirm = false) {
    LOGGER.trace("removeCyberware | CPRActor | Called.");
    const item = this._getOwnedItem(itemId);
    let confirmRemove;
    if (!skipConfirm) {
      const dialogTitle = SystemUtils.Localize("CPR.dialog.removeCyberware.title");
      const dialogMessage = `${SystemUtils.Localize("CPR.dialog.removeCyberware.text")} ${item.name}?`;
      confirmRemove = await ConfirmPrompt.RenderPrompt(dialogTitle, dialogMessage);
    } else {
      confirmRemove = true;
    }
    if (confirmRemove) {
      if (item.system.isFoundational) {
        await this._removeFoundationalCyberware(item);
      } else {
        await this._removeOptionalCyberware(item, foundationalId);
      }
      await this.updateEmbeddedDocuments("Item", [{ _id: item.id, "system.isInstalled": false }]);
      return this.setMaxHumanity();
    }
    return this.updateEmbeddedDocuments("Item", []);
  }

  /**
   * Remove (uninstall) optional cyberware
   *
   * @private
   * @param {CPRItem} item - optional cyberware item to uninstall
   * @param {String} foundationalId - The foundational cybeware Id to uninstall the cybeware from
   * @returns {Object}
   */
  _removeOptionalCyberware(item, foundationalId) {
    LOGGER.trace("_removeOptionalCyberware | CPRActor | Called.");
    // If the cyberware item was not installed, don't process the removal from a non-existent foundational slot.
    if (item.system.isInstalled) {
      const foundationalCyberware = this._getOwnedItem(foundationalId);
      const newInstalledOptionSlots = foundationalCyberware.system.installedOptionSlots - item.system.size;
      const newOptionalIds = foundationalCyberware.system.optionalIds.filter(
        (optionId) => optionId !== item._id,
      );
      return this.updateEmbeddedDocuments("Item", [{
        _id: foundationalCyberware.id,
        "system.optionalIds": newOptionalIds,
        "system.installedOptionSlots": newInstalledOptionSlots,
      }]);
    }
    return null;
  }

  /**
   * Remove (uninstall) foundational cyberware
   *
   * @private
   * @param {CPRItem} item - foundational cyberware item to uninstall
   * @returns {Object}
   */
  _removeFoundationalCyberware(item) {
    LOGGER.trace("_removeFoundationalCyberware | CPRActor | Called.");
    const updateList = [];
    if (item.system.optionalIds) {
      item.system.optionalIds.forEach(async (optionalId) => {
        const optional = this._getOwnedItem(optionalId);
        updateList.push({ _id: optional.id, "system.isInstalled": false });
      });
      updateList.push({ _id: item.id, "system.optionalIds": [], "system.installedOptionSlots": 0 });
      return this.updateEmbeddedDocuments("Item", updateList);
    }
    return PromiseRejectionEvent();
  }

  /**
   * Return the Item object given an Id
   *
   * @private
   * @param {String} itemId - Id of the item to get
   * @returns {CPRItem}
   */
  _getOwnedItem(itemId) {
    LOGGER.trace("_getOwnedItem | CPRActor | Called.");
    return this.items.find((i) => i._id === itemId);
  }

  /**
   * Return the skill level (number) for a given skill on the actor.
   *
   * @param {String} skillName - the skill name (e.g. from CPR.skillList) to look up
   * @returns {Number} - skill level or 0 if not found
   */
  getSkillLevel(skillName) {
    LOGGER.trace("getSkillLevel | CPRActor | Called.");
    const skillList = (this.itemTypes.skill).filter((s) => s.name === skillName);
    if (skillList.length > 0) {
      const relevantSkill = skillList[0];
      return parseInt(relevantSkill.system.level, 10);
    }
    return 0;
  }

  /**
   * Return the skill mod (number) for a given skill on the actor.
   *
   * @param {String} skillName - the skill name (e.g. from CPR.skillList) to look up
   * @returns {Number} - skill mod or 0 if not found
   */
  getSkillMod(skillName) {
    LOGGER.trace("getSkillMod | CPRActor | Called.");
    const skillSlug = SystemUtils.slugify(skillName);
    return this.bonuses[skillSlug];
  }

  /**
   * After a death save is rolled, process the results: assess pass/fail, and persist data to the actor
   * model. Remember when a save is passed, the next one gets harder.
   *
   * @param {CPRRoll} cprRoll - the rolled death save object
   * @returns {String}
   */
  processDeathSave(cprRoll) {
    LOGGER.trace("processDeathSave | CPRActor | Called.");
    const success = SystemUtils.Localize("CPR.rolls.success");
    const failed = SystemUtils.Localize("CPR.rolls.failed");
    let saveResult = cprRoll.resultTotal < this.system.stats.body.value ? success : failed;
    if (cprRoll.initialRoll === 10) {
      saveResult = failed;
    }
    if (saveResult === success) {
      const deathPenalty = this.system.derivedStats.deathSave.penalty + 1;
      this.update({ "system.derivedStats.deathSave.penalty": deathPenalty });
    }
    return saveResult;
  }

  /**
   * Method to manually increase the death save penalty by 1.
   * Can be used in case a character gets hit by an attack while mortally wounded.
   */
  increaseDeathPenalty() {
    LOGGER.trace("increaseDeathPenalty | CPRActor | Called.");
    const deathPenalty = this.system.derivedStats.deathSave.penalty + 1;
    this.update({ "system.derivedStats.deathSave.penalty": deathPenalty });
  }

  /**
   * Whenever a death save passes, the penalty increases by 1. Once a character is stable,
   * the penalty should be reset to 0, which is what this method does.
   */
  resetDeathPenalty() {
    LOGGER.trace("resetDeathPenalty | CPRActor | Called.");
    this.update({ "system.derivedStats.deathSave.penalty": 0 });
  }

  /**
   * Given a stat name, return the value of it off the actor
   *
   * @param {String} statName - name (from CPR.statList) of the stat to retrieve
   * @returns {Number}
   */
  getStat(statName) {
    LOGGER.trace("getStat | CPRActor | Called.");
    return parseInt(this.system.stats[statName].value, 10);
  }

  /**
   * Get all mods provided by equippable and upgradeable items for a specific thing
   *
   * @param {String} baseName - name of the thing (e.g. stat) getting mods
   * @returns {Number}
   */
  getUpgradeMods(baseName) {
    LOGGER.trace("getUpgradeMods | CPRActor | Called.");
    let modValue = 0;
    // See if we have any items which upgrade our stat, and if so, upgrade the stat base
    const equippableItemTypes = SystemUtils.GetTemplateItemTypes("equippable");
    const upgradableItemTypes = SystemUtils.GetTemplateItemTypes("upgradable");
    const itemTypes = equippableItemTypes.filter((value) => upgradableItemTypes.includes(value));
    let modType = "modifier";

    itemTypes.forEach((itemType) => {
      const itemList = this.itemTypes[itemType].filter((i) => i.system.equipped === "equipped" && i.system.isUpgraded);
      itemList.forEach((i) => {
        const upgradeValue = i.getAllUpgradesFor(baseName);
        const upgradeType = i.getUpgradeTypeFor(baseName);
        if (modType === "override") {
          if (upgradeType === "override" && upgradeValue > modValue) {
            modValue = upgradeValue;
          }
        } else {
          modValue = (upgradeType === "override") ? upgradeValue : modValue + upgradeValue;
          modType = upgradeType;
        }
      });
    });

    return modValue;
  }

  /**
   * Given a property name on the actor model, wipe out all records in the corresponding ledger
   * for it. Effectively this sets it back to [].
   *
   * @param {String} prop - name of the property that has a ledger
   * @returns {Array} - empty or null if the property was not found
   */
  clearLedger(prop) {
    LOGGER.trace("clearLedger | CPRActor | Called.");
    if (this.isLedgerProperty(prop)) {
      const valProp = `system.${prop}.value`;
      const ledgerProp = `system.${prop}.transactions`;
      const cprData = duplicate(this.system);
      setProperty(cprData, valProp, 0);
      setProperty(cprData, ledgerProp, []);
      this.update(cprData);
      return getProperty(this.system, prop);
    }
    return null;
  }

  /**
   * Change the value of a property and store a record of the change in the corresponding
   * ledger.
   *
   * @param {String} prop - name of the property that has a ledger
   * @param {Number} value - how much to increase or decrease the value by
   * @param {String} reason - a user-provided reason for the change
   * @returns {Number} (or null if not found)
   */
  deltaLedgerProperty(prop, value, reason) {
    LOGGER.trace("deltaLedgerProperty | CPRActor | Called.");
    if (this.isLedgerProperty(prop)) {
      // update "value"; it may be negative
      const valProp = `${prop}.value`;
      const cprData = duplicate(this.system);
      let newValue = getProperty(cprData, valProp);
      newValue += value;
      setProperty(cprData, valProp, newValue);
      // update the ledger with the change
      const ledgerProp = `${prop}.transactions`;
      const ledger = getProperty(cprData, ledgerProp);
      if (value > 0) {
        ledger.push([
          SystemUtils.Format("CPR.ledger.increaseSentence", { property: prop, amount: value, total: newValue }),
          reason]);
      } else {
        ledger.push([
          SystemUtils.Format("CPR.ledger.decreaseSentence", { property: prop, amount: (-1 * value), total: newValue }),
          reason]);
      }
      setProperty(cprData, ledgerProp, ledger);
      // update the actor and return the modified property
      this.update({ system: cprData });
      return getProperty(this.system, prop);
    }
    return null;
  }

  /**
   * Set the value of a property and store a record of the change in the corresponding
   * ledger. This is different from applying a delta, here we just set the value.
   *
   * @param {String} prop - name of the property that has a ledger
   * @param {Number} value - what to set the value to
   * @param {String} reason - a user-provided reason for the change
   * @returns {Number} (or null if not found)
   */
  setLedgerProperty(prop, value, reason) {
    LOGGER.trace("setLedgerProperty | CPRActor | Called.");
    if (this.isLedgerProperty(prop)) {
      const valProp = `${prop}.value`;
      const ledgerProp = `${prop}.transactions`;
      const cprData = duplicate(this.system);
      setProperty(cprData, valProp, value);
      const ledger = getProperty(cprData, ledgerProp);
      ledger.push([SystemUtils.Format("CPR.ledger.setSentence", { property: prop, total: value }), reason]);
      setProperty(cprData, ledgerProp, ledger);
      this.update({ system: cprData });
      return getProperty(this.system, prop);
    }
    return null;
  }

  /**
   * Get all records from the associated ledger of a property.
   *
   * @param {String} prop - name of the property that has a ledger
   * @returns {Array} - Each element is a tuple: [value, reason], or null if not found
   */
  listRecords(prop) {
    LOGGER.trace("listRecords | CPRActor | Called.");
    if (this.isLedgerProperty(prop)) {
      return getProperty(this.system, `${prop}.transactions`);
    }
    return null;
  }

  /**
   * Return whether a property in actor data is a ledgerProperty. This means it has
   * two (sub-)properties, "value", and "transactions".
   *
   * XXX: This method is copied to cpr-container.js because CPRContainerActor does not inherit
   *      from this class. We could fix that, but then all other code in that file would be added
   *      here, which is already long. If you make changes here, be sure to consider them there too.
   *
   * @param {String} prop - name of the property that has a ledger
   * @returns {Boolean}
   */
  isLedgerProperty(prop) {
    LOGGER.trace("isLedgerProperty | CPRActor | Called.");
    const ledgerData = getProperty(this.system, prop);
    if (!hasProperty(ledgerData, "value")) {
      SystemUtils.DisplayMessage("error", SystemUtils.Format("CPR.ledger.errorMessage.missingValue", { prop }));
      return false;
    }
    if (!hasProperty(ledgerData, "transactions")) {
      SystemUtils.DisplayMessage("error", SystemUtils.Format("CPR.ledger.errorMessage.missingTransactions", { prop }));
      return false;
    }
    return true;
  }

  /**
   * Given a stat, look up any armor penalties applied to it and return that number.
   *
   * @param {String} stat - name of a stat we are interested in seeing the mods on
   * @returns {Number}
   */
  getArmorPenaltyMods(stat) {
    LOGGER.trace("getArmorPenaltyMods | CPRActor | Called.");
    const penaltyStats = ["ref", "dex", "move"];
    const penaltyMods = [0];
    if (penaltyStats.includes(stat)) {
      const coverage = ["head", "body"];
      coverage.forEach((location) => {
        const penaltyValue = Number(this._getArmorValue("penalty", location));
        if (penaltyValue > 0) {
          penaltyMods.push(0 - penaltyValue);
        }
      });
    }
    return Math.min(...penaltyMods);
  }

  /**
   * Get the actors current armor value (or stat penalty) given a location.
   *
   * @private
   * @param {String} valueType - indicate whether to get the SP or stat penalty instead
   * @param {string} location - armor location to consider (head or body)
   * @returns {Number}
   */
  _getArmorValue(valueType, location) {
    LOGGER.trace("_getArmorValue | CPRActor | Called.");

    const armors = this.getEquippedArmors(location);
    let sps;
    let penalties;

    if (location === "body") {
      sps = armors.map((a) => a.system.bodyLocation.sp);
    } else if (location === "head") {
      sps = armors.map((a) => a.system.headLocation.sp);
    } // we assume getEquippedArmors will throw an error with a bad loc
    penalties = armors.map((a) => a.system.penalty);
    penalties = penalties.map(Math.abs);

    penalties.push(0);
    sps.push(0); // force a 0 if nothing is equipped

    if (valueType === "sp") {
      return Math.max(...sps); // Math.max treats null values in array as 0
    }
    if (valueType === "penalty") {
      return Math.max(...penalties); // Math.max treats null values in array as 0
    }
    return 0;
  }

  /**
   * Return an array of all equipped armors given a location. Yes, it is possible and within the rules
   * to wear multiple armors, even thought it might not be a good idea.
   *
   * @param {String} location - head, body, or shield
   * @returns {Array}
   */
  getEquippedArmors(location) {
    LOGGER.trace("getEquippedArmors | CPRActor | Called.");
    const armors = this.itemTypes.armor;
    const equipped = armors.filter((item) => item.system.equipped === "equipped");

    if (location === "body") {
      return equipped.filter((item) => item.system.isBodyLocation);
    }
    if (location === "head") {
      return equipped.filter((item) => item.system.isHeadLocation);
    }
    if (location === "shield") {
      return equipped.filter((item) => item.system.isShield);
    }
    throw new Error(`Bad location given: ${location}`);
  }

  /**
   * Update actor data with data from the given armor so that it can be dislpayed in a resource bar.
   *
   * @param {String} location - head, body, or shield
   * @param {String} id - Id of armor item we want to make "current" and available as a resource bar
   */
  makeThisArmorCurrent(location, id) {
    LOGGER.trace("makeThisArmorCurrent | CPRActor | Called.");
    const currentArmor = this._getOwnedItem(id);
    if (location === "body") {
      const currentArmorValue = currentArmor.system.bodyLocation.sp - currentArmor.system.bodyLocation.ablation;
      const currentArmorMax = currentArmor.system.bodyLocation.sp;
      return this.update({
        "system.externalData.currentArmorBody.value": currentArmorValue,
        "system.externalData.currentArmorBody.max": currentArmorMax,
        "system.externalData.currentArmorBody.id": id,
      });
    }
    if (location === "head") {
      const currentArmorValue = currentArmor.system.headLocation.sp - currentArmor.system.headLocation.ablation;
      const currentArmorMax = currentArmor.system.headLocation.sp;
      return this.update({
        "system.externalData.currentArmorHead.value": currentArmorValue,
        "system.externalData.currentArmorHead.max": currentArmorMax,
        "system.externalData.currentArmorHead.id": id,
      });
    }
    if (location === "shield") {
      const currentArmorValue = currentArmor.system.shieldHitPoints.value;
      const currentArmorMax = currentArmor.system.shieldHitPoints.max;
      return this.update({
        "system.externalData.currentArmorShield.value": currentArmorValue,
        "system.externalData.currentArmorShield.max": currentArmorMax,
        "system.externalData.currentArmorShield.id": id,
      });
    }
    return null;
  }

  /**
   * Create the appropriate roll object given a type. The type comes from link attributes in handlebars templates.
   *
   * @param {String} type - the type of roll to create
   * @param {String} name - a name for the roll, which is displayed in the roll card
   * @returns {CPRRoll}
   */
  createRoll(type, name) {
    LOGGER.trace("createRoll | CPRActor | Called.");
    switch (type) {
      case CPRRolls.rollTypes.STAT: {
        return this._createStatRoll(name);
      }
      case CPRRolls.rollTypes.DEATHSAVE: {
        return this._createDeathSaveRoll();
      }
      case CPRRolls.rollTypes.FACEDOWN: {
        return this._createFacedownRoll();
      }
      default:
    }
    return undefined;
  }

  /**
   * Create a stat roll and return the object representing it
   *
   * @private
   * @param {string} statName - name of the stat to generate a roll for
   * @returns {CPRStatRoll}
   */
  _createStatRoll(statName) {
    LOGGER.trace("_createStatRoll | CPRActor | Called.");
    const niceStatName = SystemUtils.Localize(CPR.statList[statName]);
    const statValue = this.getStat(statName);
    const cprRoll = new CPRRolls.CPRStatRoll(niceStatName, statValue);
    cprRoll.addMod(this.getArmorPenaltyMods(statName));
    cprRoll.addMod(this.getWoundStateMods());
    cprRoll.addMod(this.getUpgradeMods(statName));
    return cprRoll;
  }

  /**
   * Create a stat roll and return the object representing it
   *
   * @private
   * @returns {CPRFacedownRoll}
   */
  _createFacedownRoll() {
    LOGGER.trace("_createFacedownRoll | CPRActor | Called.");
    const statName = "cool";
    const niceStatName = SystemUtils.Localize(CPR.statList[statName]);
    const statValue = this.getStat(statName);
    const cprRoll = new CPRRolls.CPRFacedownRoll(niceStatName, statValue);
    cprRoll.addMod(this.system.reputation.value);
    return cprRoll;
  }

  /**
   * Create a death save roll and return the object representing it
   *
   * @private
   * @returns {CPRDeathSaveRoll}
   */
  _createDeathSaveRoll() {
    LOGGER.trace("_createDeathSaveRoll | CPRActor | Called.");
    const deathSavePenalty = this.system.derivedStats.deathSave.penalty;
    const deathSaveBasePenalty = this.system.derivedStats.deathSave.basePenalty;
    const bodyStat = this.system.stats.body.value;
    return new CPRRolls.CPRDeathSaveRoll(deathSavePenalty, deathSaveBasePenalty, bodyStat);
  }

  // We need a way to unload a specific ammo from all of the weapons
  // in case the ammo item is deleted or given to someone else.
  unloadAmmoFromAllOwnedWeapons(ammoId) {
    LOGGER.trace("unloadAmmoFromAllOwnedWeapons | CPRActor | Called.");
    const weapons = this.itemTypes.weapon;
    weapons.forEach((weapon) => {
      const cprWeaponData = weapon.system;
      if (cprWeaponData.isRanged) {
        if (cprWeaponData.magazine.ammoId === ammoId) {
          weapon._unloadItem();
        }
      }
    });
  }

  /**
   * Return whether the actor has a specific Item Type equipped.
   *
   * @public
   * @param {string} itemType - type of item we are looking for
   * @returns {Boolean}
   */
  hasItemTypeEquipped(itemType) {
    LOGGER.trace("hasItemTypeEquipped | CPRActor | Called.");
    let equipped = false;
    if (this.itemTypes[itemType]) {
      this.itemTypes[itemType].forEach((i) => {
        if (i.system.equipped) {
          if (i.system.equipped === "equipped") {
            equipped = true;
          }
        }
      });
    }
    return equipped;
  }

  /**
   * Return the all of the roles this actor currently has
   *
   * @public
   * @returns {Object} - array of roles
   */
  getRoles() {
    LOGGER.trace("getRoles | CPRActor | Called.");
    return this.itemTypes.role;
  }

  /**
   * Return the number of hands the actor has. For now this assumes 2 and considers any
   * active effects that may add more. Characters cannot start with less than 2 hands.
   *
   * @private
   * @returns {Number}
   */
  _getHands() {
    LOGGER.trace("_getHands | CPRActor | Called.");
    return 2 + this.bonuses.hands;
  }

  /**
   * Return the number of free hands an actor has, based on what is currently equipped (wielded)
   *
   * @private
   * @returns {Number}
   */
  _getFreeHands() {
    LOGGER.trace("_getFreeHands | CPRActor | Called.");
    const weapons = this._getEquippedWeapons();
    const needed = weapons.map((w) => w.system.handsReq);
    const freeHands = this._getHands() - needed.reduce((a, b) => a + b, 0);
    return freeHands;
  }

  /**
   * Return an array of weapons that are currently equipped
   *
   * @private
   * @returns {Array} of CPRItems
   */
  _getEquippedWeapons() {
    LOGGER.trace("_getEquippedWeapons | CPRActor | Called.");
    const weapons = this.itemTypes.weapon;
    return weapons.filter((a) => a.system.equipped === "equipped");
  }

  /**
   * Helper method to assess whether the actor can hold another weapon. Used to assess whether
   * an item can be equipped.
   *
   * @param {Item} weapon - item proposed to be held
   * @returns {Boolean}
   */
  canHoldWeapon(weapon) {
    LOGGER.trace("canHoldWeapon | CPRActor | Called.");
    const needed = weapon.system.handsReq;
    if (needed > this._getFreeHands()) {
      return false;
    }
    return true;
  }

  /**
   * Return the first equipped cyberdeck found.
   *
   * @returns {CPRItem} or null if none are found/equipped
   */
  getEquippedCyberdeck() {
    LOGGER.trace("getEquippedCyberdeck | CPRActor | Called.");
    const cyberdecks = this.itemTypes.cyberdeck;
    const equipped = cyberdecks.filter((item) => item.system.equipped === "equipped");
    if (equipped) {
      return equipped[0];
    }
    return null;
  }

  /**
   * TODO: Delete this method after the March 2022 release.
   * This method was created to facilitate homebrew critical injuries with a macro.
   * It is not used anywhere else, and likely belongs in its own file to be exposed in
   * a sanctioned API. (_rollCriticalInjury() largely replaces this functionality.)
   *
   * @returns {Object}
   */
  addCriticalInjury(location, name, effect, quickFixType, quickFixDV, treatmentType, treatmentDV, deathSaveIncrease = false) {
    LOGGER.trace("addCriticalInjury | CPRActor | Called.");
    SystemUtils.Format("CPR.system.message.toBeDeprecated", { functionName: "actor.addCriticalInjury" });
    const itemData = {
      type: "criticalInjury",
      name,
      data: {
        location,
        description: {
          value: effect,
          chat: "",
          unidentified: "",
        },
        quickFix: {
          type: quickFixType,
          dv: quickFixDV,
        },
        treatment: {
          type: treatmentType,
          dv: treatmentDV,
        },
        deathSaveIncrease,
      },
    };
    return this.createEmbeddedEntity("Item", itemData, { force: true });
  }

  /**
   * automaticallyStackItems searches for an identical item on the actor
   * and if found increments the amount and price for the item on the actor
   * instead of adding it as a new item.
   *
   * @param {Object} newItem - an object containing the new item
   * @returns {boolean} - true if thee item should be added normally
   *                    - false if it has been stacked on an existing item
   */
  automaticallyStackItems(newItem) {
    LOGGER.trace("automaticallyStackItems | CPRActor | Called.");
    const itemTemplates = SystemUtils.getDataModelTemplates(newItem.type);
    if (itemTemplates.includes("stackable")) {
      const itemMatch = this.items.find((i) => i.type === newItem.type && i.name === newItem.name);
      if (itemMatch) {
        const canStack = !(itemTemplates.includes("upgradable") && itemMatch.system.upgrades.length === 0);
        if (canStack) {
          let oldAmount = parseInt(itemMatch.system.amount, 10);
          let addedAmount = parseInt(newItem.system.amount, 10);
          if (Number.isNaN(oldAmount)) { oldAmount = 1; }
          if (Number.isNaN(addedAmount)) { addedAmount = 1; }
          const newAmount = oldAmount + addedAmount;
          this.updateEmbeddedDocuments("Item", [{ _id: itemMatch.id, "system.amount": newAmount }]);
          return false;
        }
      }
    }
    // If not stackable, then return true to continue adding the item.
    return true;
  }

  /**
   * Apply damage to the actor, respecting any equipped armor and damage modifiers
   * due to the location. In addition ablate the armor in the correct location.
   *
   * @param {int} damage - value of the damage taken
   * @param {int} bonusDamage - value of the bonus damage
   * @param {string} location - location of the damage
   * @param {int} ablation - value of the ablation
   * @param {boolean} ignoreHalfArmor - if half of the armor should be ignored
   * @param {boolean} damageLethal - if this damage can cause HP <= 0
   */
  async _applyDamage(damage, bonusDamage, location, ablation, ignoreHalfArmor, damageLethal) {
    LOGGER.trace("_applyDamage | CPRActor | Called.");
    let totalDamageDealt = 0;
    if (location === "brain") {
      // This is damage done in a netrun, which completely ignores armor
      const currentHp = this.system.derivedStats.hp.value;
      await this.update({ "system.derivedStats.hp.value": currentHp - damage - bonusDamage });
      CPRChat.RenderDamageApplicationCard({ name: this.name, hpReduction: damage + bonusDamage, brainDamage: true });
      return;
    }
    const armors = this.getEquippedArmors(location);
    // Determine the highest value of all the equipped armors in the specific location
    let armorValue = 0;
    armors.forEach((a) => {
      let newValue;
      if (location === "head") {
        newValue = a.system.headLocation.sp - a.system.headLocation.ablation;
      } else {
        newValue = a.system.bodyLocation.sp - a.system.bodyLocation.ablation;
      }
      if (newValue > armorValue) {
        armorValue = newValue;
      }
    });
    if (ignoreHalfArmor) {
      armorValue = Math.ceil(armorValue / 2);
    }
    // Apply the bonusDamage, which penetrates the armor
    if (bonusDamage !== 0) {
      const currentHp = this.system.derivedStats.hp.value;
      await this.update({ "system.derivedStats.hp.value": currentHp - bonusDamage });
      totalDamageDealt += bonusDamage;
    }
    if (damage <= armorValue) {
      // Damage did not penetrate armor, thus only the bonus damage is applied.
      CPRChat.RenderDamageApplicationCard({ name: this.name, hpReduction: totalDamageDealt, ablation: 0 });
      return;
    }
    // Take the regular damage.
    let takenDamage = damage - armorValue;
    if (location === "head") {
      // Damage taken against the head is doubled.
      takenDamage *= 2;
    }
    const currentHp = this.system.derivedStats.hp.value;
    if (takenDamage >= currentHp && !damageLethal) {
      takenDamage = currentHp - 1;
    }
    await this.update({ "system.derivedStats.hp.value": currentHp - takenDamage });
    totalDamageDealt += takenDamage;

    // Ablate the armor correctly if there's armor equipped
    if (armors.length > 0) {
      await this._ablateArmor(location, ablation);
    }

    const cardDisplayAblation = (armors.length > 0) ? ablation : 0;
    CPRChat.RenderDamageApplicationCard({ name: this.name, hpReduction: totalDamageDealt, ablation: cardDisplayAblation });
  }

  /**
   * Ablate the equipped armor at the specified location by the given value.
   *
   * @param {string} location - locaiton of the ablation
   * @param {int} ablation - value of the ablation
   */
  async _ablateArmor(location, ablation) {
    LOGGER.trace("_ablateArmor | CPRActor | Called.");
    const armorList = this.getEquippedArmors(location);
    const updateList = [];
    let currentArmorValue;
    switch (location) {
      case "head": {
        armorList.forEach((a) => {
          const cprArmorData = a.system;
          const upgradeValue = a.getAllUpgradesFor("headSp");
          const upgradeType = a.getUpgradeTypeFor("headSp");
          cprArmorData.headLocation.sp = Number(cprArmorData.headLocation.sp);
          cprArmorData.headLocation.ablation = Number(cprArmorData.headLocation.ablation);
          const armorSp = (upgradeType === "override") ? upgradeValue : cprArmorData.headLocation.sp + upgradeValue;
          cprArmorData.headLocation.ablation = Math.min((cprArmorData.headLocation.ablation + ablation), armorSp);
          updateList.push({ _id: a.id, system: cprArmorData });
        });
        await this.updateEmbeddedDocuments("Item", updateList);
        // Update actor external data as head armor is ablated:
        currentArmorValue = Math.max((this.system.externalData.currentArmorHead.value - ablation), 0);
        await this.update({ "system.externalData.currentArmorHead.value": currentArmorValue });
        break;
      }
      case "body": {
        armorList.forEach((a) => {
          const cprArmorData = a.system;
          cprArmorData.bodyLocation.sp = Number(cprArmorData.bodyLocation.sp);
          cprArmorData.bodyLocation.ablation = Number(cprArmorData.bodyLocation.ablation);
          const upgradeValue = a.getAllUpgradesFor("bodySp");
          const upgradeType = a.getUpgradeTypeFor("bodySp");
          const armorSp = (upgradeType === "override") ? upgradeValue : cprArmorData.bodyLocation.sp + upgradeValue;
          cprArmorData.bodyLocation.ablation = Math.min((cprArmorData.bodyLocation.ablation + ablation), armorSp);
          updateList.push({ _id: a.id, system: cprArmorData });
        });
        await this.updateEmbeddedDocuments("Item", updateList);
        // Update actor external data as body armor is ablated:
        currentArmorValue = Math.max((this.system.externalData.currentArmorBody.value - ablation), 0);
        await this.update({ "system.externalData.currentArmorBody.value": currentArmorValue });
        break;
      }
      case "shield": {
        armorList.forEach((a) => {
          const cprArmorData = a.system;
          cprArmorData.shieldHitPoints.value = Number(cprArmorData.shieldHitPoints.value);
          cprArmorData.shieldHitPoints.max = Number(cprArmorData.shieldHitPoints.max);
          cprArmorData.shieldHitPoints.value = Math.max((a.system.shieldHitPoints.value - ablation), 0);
          updateList.push({ _id: a.id, system: cprArmorData });
        });
        await this.updateEmbeddedDocuments("Item", updateList);
        // Update actor external data as shield is damaged:
        currentArmorValue = Math.max((this.system.externalData.currentArmorShield.value - ablation), 0);
        await this.update({ "system.externalData.currentArmorShield.value": currentArmorValue });
        break;
      }
      default:
    }
  }

  /**
   * Create an active effect on this actor. This method belongs here so migration scripts can
   * dynamically generate effects based on custom mods already on the actor from earlier versions.
   *
   * @returns {CPRActiveEffect} the new document
   */
  createEffect() {
    LOGGER.trace("createEffect | CPRCharacterActor | Called.");
    return this.createEmbeddedDocuments("ActiveEffect", [{
      label: SystemUtils.Localize("CPR.itemSheet.effects.newEffect"),
      icon: "icons/svg/aura.svg",
      origin: this.uuid,
      disabled: false,
    }]);
  }

  /**
   * Delete the desired effect from this actor. Pops up a confirmation box if permitted.
   *
   * @param {CPRActiveEffect} effect - the effect to delete
   * @returns null
   */
  static async deleteEffect(effect) {
    LOGGER.trace("deleteEffect | CPRCharacterActor | Called.");
    const setting = game.settings.get("cyberpunk-red-core", "deleteItemConfirmation");
    if (setting) {
      const promptMessage = `${SystemUtils.Localize("CPR.dialog.deleteConfirmation.message")} ${effect.system.label}?`;
      const confirmDelete = await ConfirmPrompt.RenderPrompt(
        SystemUtils.Localize("CPR.dialog.deleteConfirmation.title"),
        promptMessage,
      ).catch((err) => LOGGER.debug(err));
      if (!confirmDelete) return;
    }
    effect.delete();
  }

  /**
   * Warning!
   *
   * When a user changes sheets (character/mook), the type for the actor itself does not change.
   * This forces us to put actor code in the same place, and have the sheets encode specific behaviors,
   * not the actors. Below you're going to see methods that look like they belong in cpr-mook.js
   * or cpr-character.js, but doing so will result in broken functionality if a user swaps sheets.
   */

  /** CHARACTER SPECIFIC CODE */

  /**
   * Calculate the character's max HP based on stats and effects.
   *
   * @return {Number}
   */
  calcMaxHp() {
    LOGGER.trace("_calcMaxHp | CPRActor | Called.");
    const { stats } = this.system;
    let maxHp = 10 + 5 * Math.ceil((stats.will.value + stats.body.value) / 2);
    maxHp += this.bonuses.maxHp; // from any active effects
    return maxHp;
  }

  /**
   * Calculate the character's Humanity based on stats and effects.
   *
   * @return {Number}
   * @private
   */
  _calcMaxHumanity() {
    LOGGER.trace("_calcMaxHumanity | CPRActor | Called.");
    const cprData = this.system;
    const { stats } = cprData;
    let cyberwarePenalty = 0;
    this.getInstalledCyberware().forEach((cyberware) => {
      if (cyberware.system.type === "borgware") {
        cyberwarePenalty += 4;
      } else if (parseInt(cyberware.system.humanityLoss.static, 10) > 0) {
        cyberwarePenalty += 2;
      }
    });
    let maxHumanity = 10 * stats.emp.max - cyberwarePenalty; // minus sum of installed cyberware
    maxHumanity += this.bonuses.maxHumanity; // from any active effects
    return maxHumanity;
  }

  /**
   * Calculate the max humanity on this actor.
   * If current humanity is full and the max changes, we should update the current and EMP to match only
   * if the new max is less than the old max.
   * We assume that to be preferred behavior more often than not, especially during character creation.
   *
   * @callback
   */
  async setMaxHumanity() {
    LOGGER.trace("setMaxHumanity | CPRActor | Called.");
    const maxHumanity = this._calcMaxHumanity();
    const { humanity } = this.system.derivedStats;
    if (humanity.max === humanity.value && maxHumanity < humanity.max) {
      await this.update({
        "system.derivedStats.humanity.max": maxHumanity,
        "system.derivedStats.humanity.value": maxHumanity,
        "system.stats.emp.value": Math.floor(humanity.value / 10),
      });
    } else {
      await this.update({
        "system.derivedStats.humanity.max": maxHumanity,
        "system.stats.emp.value": Math.floor(humanity.value / 10),
      });
    }
  }

  /**
   * Called when cyberware is installed, this method decreases Humanity on an actor, rolling
   * for the value if need be.
   *
   * You may think this should be in cpr-character only since Humanity is overlooked for NPCs, however
   * because users can switch between mook and character sheets independent of actor type, we
   * have to keep this here. (i.e. they can create a mook but switch to the character sheet)
   *
   * @param {CPRItem} item - the Cyberware item being installed (provided just to name the roll)
   * @param {Object} amount - contains a humanityLoss attribute we use to reduce humanity.
   *                          Will roll dice if it is a formula.
   * @returns {@Promise}
   */
  async loseHumanityValue(item, amount) {
    LOGGER.trace("loseHumanityValue | CPRActor | Called.");
    if (amount.humanityLoss === "None") {
      LOGGER.trace("CPR Actor loseHumanityValue | Called. | humanityLoss was None.");
      await this.setMaxHumanity();
      return;
    }
    const { humanity } = this.system.derivedStats;
    let value = Number.isInteger(humanity.value) ? humanity.value : humanity.max;
    if (amount.humanityLoss.match(/[0-9]+d[0-9]+/)) {
      const humRoll = new CPRRolls.CPRHumanityLossRoll(item.name, amount.humanityLoss);
      await humRoll.roll();
      value -= humRoll.resultTotal;
      humRoll.entityData = { actor: this.id };
      CPRChat.RenderRollCard(humRoll);
      LOGGER.trace("CPR Actor loseHumanityValue | Called. | humanityLoss was rolled.");
    } else {
      value -= parseInt(amount.humanityLoss, 10);
      LOGGER.trace("CPR Actor loseHumanityValue | Called. | humanityLoss was static.");
    }

    if (value <= 0) {
      Rules.lawyer(false, "CPR.messages.youCyberpsycho");
    }

    await this.update({ "system.derivedStats.humanity.value": value });
    await this.setMaxHumanity();
  }

  /**
   * Persist life path information to the actor model
   *
   * Again, this should be in cpr-character only since Humanity is overlooked for NPCs, but
   * users can switch between sheet types.
   *
   * @param {Object} formData  - an object of answers provided by the user in a form
   * @returns {Object}
   */
  setLifepath(formData) {
    LOGGER.trace("setLifepath | CPRActor | Called.");
    return this.update(formData);
  }

  /** MOOK SPECIFIC CODE */

  /**
   * Called by the createOwnedItem listener (hook) when a user drags an item on a mook sheet
   * It handles the automatic equipping of gear and installation of cyberware.
   *
   * @param {CPRItem} item - the item document that was dragged
   */
  handleMookDraggedItem(item) {
    LOGGER.trace("handleMookDraggedItem | CPRActor | Called.");
    // auto-install this cyberware
    if (item.type === "cyberware") {
      this.addCyberware(item._id);
    }
    // auto-equip this item
    if (SystemUtils.hasDataModelTemplate(item.type, "equippable")) {
      this.updateEmbeddedDocuments("Item", [{ _id: item._id, "system.equipped": "equipped" }]);
    }
  }
}
