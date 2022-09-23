/* global ActorSheet, $, setProperty, game, getProperty, mergeObject duplicate, TextEditor */
import ConfirmPrompt from "../../dialog/cpr-confirmation-prompt.js";
import * as CPRRolls from "../../rolls/cpr-rolls.js";
import CPR from "../../system/config.js";
import CPRChat from "../../chat/cpr-chat.js";
import LOGGER from "../../utils/cpr-logger.js";
import RollCriticalInjuryPrompt from "../../dialog/cpr-roll-critical-injury-prompt.js";
import Rules from "../../utils/cpr-rules.js";
import SplitItemPrompt from "../../dialog/cpr-split-item-prompt.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import DvUtils from "../../utils/cpr-dvUtils.js";
import createImageContextMenu from "../../utils/cpr-imageContextMenu.js";
import LedgerEditPrompt from "../../dialog/cpr-ledger-edit-prompt.js";

/**
 * Extend the basic ActorSheet, which comes from Foundry. Not all sheets used in
 * this system module may extend from this. Others also extend ActorSheet. CPRActor
 * is used for common code between Mook sheets and Character sheets.
 * @extends {ActorSheet}
 */
export default class CPRActorSheet extends ActorSheet {
  /**
   * We extend ActorSheet._render to enable automatic window resizing.
   * Only resize the sheet with default size, as render option is called on several differnt update events.
   * Should one still desire resizing the sheet afterwards, please call _automaticResize explicitly.
   *
   * @override
   * @private
   * @param {Boolean} force - for this to be rendered. We don't use this, but the parent class does.
   * @param {Object} options - rendering options that are passed up the chain to the parent
   */
  async _render(force = false, options = {}) {
    LOGGER.trace("_render | CPRActorSheet | Called.");
    await super._render(force, options);
    if (this.position.width === this.options.defaultWidth && this.position.height === this.options.defaultHeight) {
      this._automaticResize();
    }
  }

  /**
   * Set the default width and height so auto-resizing of the window works. Child classes will
   * merge additional default options with this object. The scrollY option identifies elements where the
   * vertical position should be preserved during a re-render.
   *
   * See https://foundryvtt.com/api/Application.html for the complete list of options available.
   *
   * @override
   * @returns - sheet options merged with default options in ActorSheet
   */
  static get defaultOptions() {
    LOGGER.trace("defaultOptions | CPRActorSheet | Called.");
    const defaultWidth = 966;
    const defaultHeight = 590;
    return mergeObject(super.defaultOptions, {
      classes: super.defaultOptions.classes.concat(["sheet", "actor"]),
      defaultWidth,
      defaultHeight,
      width: defaultWidth,
      height: defaultHeight,
      scrollY: [".right-content-section", ".top-pane-gear"],
    });
  }

  /**
   * Get actor data into a more convenient organized structure. This should be called sparingly in code.
   * Only add new data points to getData when you need a complex struct, not when you only need to add
   * new data points to shorten dataPaths. Remember, this data is on the CPRActorSheet object, not the
   * CPRActor object it is tied to. (this.actor)
   *
   * @override
   * @returns {Object} data - a curated structure of actorSheet data
   */
  getData() {
    LOGGER.trace("getData | CPRActorSheet | Called.");
    const foundryData = super.getData();
    const cprActorData = foundryData.actor.system;
    if (this.actor.type === "mook" || this.actor.type === "character") {
      cprActorData.installedCyberware = this._getSortedInstalledCyberware();

      cprActorData.fightOptions = (this.actor.hasItemTypeEquipped("cyberdeck")) ? "both" : "";
      let fightState = this.actor.getFlag("cyberpunk-red-core", "fightState");
      if (!fightState || cprActorData.fightOptions !== "both") {
        fightState = "Meatspace";
      }
      cprActorData.fightState = fightState;
      cprActorData.cyberdeck = "";
      if (fightState === "Netspace") {
        cprActorData.cyberdeck = this.actor.getEquippedCyberdeck();
      }
      cprActorData.filteredEffects = this.prepareActiveEffectCategories();
      foundryData.data.system = cprActorData;
    }
    // This appears to have been removed in V10?
    foundryData.isGM = game.user.isGM;
    return foundryData;
  }

  /**
   * Prepare the data structure for Active Effects which are currently applied to this actor.
   * This came from the DND5E active-effect.js code.
   *
   * @returns {Object}                  Data for rendering
   */
  prepareActiveEffectCategories() {
    LOGGER.trace("prepareActiveEffectCategories | CPRActorSheet | Called.");
    const categories = {
      active: {
        type: "active",
        label: SystemUtils.Localize("CPR.characterSheet.rightPane.effects.active"),
        effects: [],
      },
      inactive: {
        type: "inactive",
        label: SystemUtils.Localize("CPR.characterSheet.rightPane.effects.inactive"),
        effects: [],
      },
    };

    const setting = game.settings.get("cyberpunk-red-core", "displayStatusAsActiveEffects");
    // Iterate over active effects, classifying them into categories
    for (const e of this.actor.effects) {
      e._getSourceName(); // Trigger a lookup for the source name
      if (!(typeof e.flags.core !== "undefined" && typeof e.flags.core.statusId !== "undefined") || setting) {
        if (e.disabled || e.system.isSuppressed) categories.inactive.effects.push(e);
        else categories.active.effects.push(e);
      }
    }

    return categories;
  }

  /**
   * Used in getData to turn installable Cyberware data into an organized structure
   *
   * @private
   * @returns - object data about Cyberware
   */
  _getSortedInstalledCyberware() {
    LOGGER.trace("_getSortedInstalledCyberware | CPRActorSheet | Called.");
    // Get all Installed Cyberware first...
    const installedCyberware = this.actor.getInstalledCyberware();
    const installedFoundationalCyberware = installedCyberware.filter((c) => c.system.isFoundational === true);

    // Now sort allInstalledCybere by type, and only get foundational
    const sortedInstalledCyberware = {};
    for (const [type] of Object.entries(CPR.cyberwareTypeList)) {
      sortedInstalledCyberware[type] = installedFoundationalCyberware.filter(
        (cyberware) => cyberware.system.type === type,
      );
      sortedInstalledCyberware[type] = sortedInstalledCyberware[type].map(
        (cyberware) => ({ foundation: cyberware, optionals: [] }),
      );
      sortedInstalledCyberware[type].forEach((entry) => {
        entry.foundation.system.optionalIds.forEach((id) => entry.optionals.push(this._getOwnedItem(id)));
      });
    }
    return sortedInstalledCyberware;
  }

  /**
   * Activate listeners for the sheet. This should be only common listeners across Mook and Character sheets.
   * This has to call super at the end for Foundry to process events properly and get built-in functionality
   * like dragging items to sheets.
   *
   * @override
   * @param {Object} html - the DOM object
   */
  activateListeners(html) {
    LOGGER.trace("activateListeners | CPRActorSheet | Called.");

    // allow navigation for non owned actors
    this._tabs.forEach((t) => t.bind(html[0]));

    // Make a roll
    html.find(".rollable").click((event) => this._onRoll(event));

    // Ablate Armor
    html.find(".ablate").click((event) => this._ablateArmor(event));

    // Set Armor as Current
    html.find(".armor-current").click((event) => this._makeArmorCurrent(event));

    // Generic item action
    html.find(".item-action").click((event) => this._itemAction(event));

    // bring up read-only versions of the item card (sheet), used with installed cyberware
    html.find(".item-view").click((event) => this._renderReadOnlyItemCard(event));

    // Reset Death Penalty
    html.find(".reset-deathsave-value").click(() => this._resetDeathSave());

    // Increase Death Penalty
    html.find(".increase-deathsave-value").click(() => this._increaseDeathSave());

    // Filter contents of skills or gear
    html.find(".filter-contents").change((event) => this._applyContentFilter(event));

    // Reset content filter
    html.find(".reset-content-filter").click(() => this._clearContentFilter());

    // Show edit and delete buttons
    html.find(".row.item").hover(
      (event) => {
        // show edit and delete buttons
        $(event.currentTarget).contents().contents().addClass("show");
      },
      (event) => {
        // hide edit and delete buttons
        $(event.currentTarget).contents().contents().removeClass("show");
      },
    );

    // Item Dragging
    const handler = (ev) => this._onDragItemStart(ev);
    html.find(".item").each((i, li) => {
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", handler, false);
    });

    // Set up right click context menu when clicking on Actor's image
    this._createActorImageContextMenu(html);

    if (!this.options.editable) return;
    // Listeners for editable fields under here. Fields might not be editable because
    // the user viewing the sheet might not have permission to. They may not be the owner.

    $("input[type=text]").focusin(() => $(this).select());

    // Render Item Card
    html.find(".item-edit").click((event) => this._renderItemCard(event));

    // Roll critical injuries and add to sheet
    html.find(".roll-critical-injury").click(() => this._rollCriticalInjury());

    // set/unset "checkboxes" used with fire modes
    html.find(".fire-checkbox").click((event) => this._fireCheckboxToggle(event));

    // Sheet resizing
    html.find(".tab-label:not(.skills-tab):not(.gear-tab):not(.cyberware-tab)").click(
      () => this._automaticResize(),
    );

    // Reputation related listeners
    html.find(".reputation-edit-button").click(() => this._updateReputation());
    html.find(".reputation-open-ledger").click(() => this.actor.showLedger("reputation"));

    super.activateListeners(html);
  }

  /**
   * Dispatcher that executes a roll based on the "type" passed in the event
   *
   * @private
   * @callback
   * @param {Object} event - object with details of the event
   */
  async _onRoll(event) {
    LOGGER.trace("_onRoll | CPRActorSheet | Called.");
    let rollType = SystemUtils.GetEventDatum(event, "data-roll-type");
    let cprRoll;
    let item = null;
    switch (rollType) {
      case CPRRolls.rollTypes.DEATHSAVE:
      case CPRRolls.rollTypes.FACEDOWN:
      case CPRRolls.rollTypes.STAT: {
        const rollName = SystemUtils.GetEventDatum(event, "data-roll-title");
        cprRoll = this.actor.createRoll(rollType, rollName);
        break;
      }
      case CPRRolls.rollTypes.ROLEABILITY: {
        const itemId = CPRActorSheet._getItemId(event);
        const rollSubType = SystemUtils.GetEventDatum(event, "data-roll-subtype");
        const subRoleName = SystemUtils.GetEventDatum(event, "data-roll-title");
        const rollInfo = {
          rollSubType,
          subRoleName,
        };
        item = this._getOwnedItem(itemId);
        cprRoll = item.createRoll(rollType, this.actor, rollInfo);
        break;
      }
      case CPRRolls.rollTypes.SKILL: {
        const itemId = CPRActorSheet._getItemId(event);
        item = this._getOwnedItem(itemId);
        cprRoll = item.createRoll(rollType, this.actor);
        break;
      }
      case CPRRolls.rollTypes.DAMAGE: {
        const itemId = CPRActorSheet._getItemId(event);
        item = this._getOwnedItem(itemId);
        const damageType = this._getFireCheckbox(event);
        cprRoll = item.createRoll(rollType, this.actor, { damageType });
        if (rollType === CPRRolls.rollTypes.AIMED) {
          cprRoll.location = this.actor.getFlag("cyberpunk-red-core", "aimedLocation") || "body";
        }
        break;
      }
      case CPRRolls.rollTypes.ATTACK: {
        const itemId = CPRActorSheet._getItemId(event);
        item = this._getOwnedItem(itemId);
        rollType = this._getFireCheckbox(event);
        cprRoll = item.createRoll(rollType, this.actor);
        break;
      }
      case CPRRolls.rollTypes.INTERFACEABILITY: {
        const interfaceAbility = SystemUtils.GetEventDatum(event, "data-interface-ability");
        const cyberdeckId = SystemUtils.GetEventDatum(event, "data-cyberdeck-id");
        const cyberdeck = this._getOwnedItem(cyberdeckId);
        const netRoleItem = this.actor.itemTypes.role.find((r) => r.name === this.actor.system.roleInfo.activeNetRole);
        if (!netRoleItem) {
          const error = SystemUtils.Localize("CPR.messages.noNetrunningRoleConfigured");
          SystemUtils.DisplayMessage("error", error);
          return;
        }
        cprRoll = cyberdeck.createRoll(rollType, this.actor, { interfaceAbility, cyberdeck, netRoleItem });
        break;
      }
      case CPRRolls.rollTypes.CYBERDECKPROGRAM: {
        const programId = SystemUtils.GetEventDatum(event, "data-program-id");
        const cyberdeckId = SystemUtils.GetEventDatum(event, "data-cyberdeck-id");
        const executionType = SystemUtils.GetEventDatum(event, "data-execution-type");
        const cyberdeck = this._getOwnedItem(cyberdeckId);
        const netRoleItem = this.actor.itemTypes.role.find((r) => r.name === this.actor.system.roleInfo.activeNetRole);
        if (!netRoleItem) {
          const error = SystemUtils.Localize("CPR.messages.noNetrunningRoleConfigured");
          SystemUtils.DisplayMessage("error", error);
          return;
        }
        const extraData = {
          cyberdeckId,
          programId,
          executionType,
          netRoleItem,
        };
        cprRoll = cyberdeck.createRoll(rollType, this.actor, extraData);
        break;
      }
      default:
    }

    // note: for aimed shots this is where location is set
    const keepRolling = await cprRoll.handleRollDialog(event);
    if (!keepRolling) {
      return;
    }

    if (item !== null) {
      // Do any actions that need to be done as part of a roll, like ammo decrementing
      cprRoll = await item.confirmRoll(cprRoll);
    }

    // Let's roll!
    await cprRoll.roll();

    // Post roll tasks
    if (cprRoll instanceof CPRRolls.CPRDeathSaveRoll) {
      cprRoll.saveResult = this.actor.processDeathSave(cprRoll);
    }

    // "Consume" LUCK if used
    if (Number.isInteger(cprRoll.luck) > 0) {
      const luckStat = this.actor.system.stats.luck.value;
      this.actor.update({
        "system.stats.luck.value": luckStat - ((cprRoll.luck > luckStat) ? luckStat : cprRoll.luck),
      });
    }

    // output to chat
    const token = this.token === null ? null : this.token._id;
    cprRoll.entityData = { actor: this.actor.id, token };
    if (item) {
      cprRoll.entityData.item = item.id;
    }
    CPRChat.RenderRollCard(cprRoll);

    // save the location so subsequent damage rolls hit/show the same place
    if (cprRoll instanceof CPRRolls.CPRAimedAttackRoll) {
      this.actor.setFlag("cyberpunk-red-core", "aimedLocation", cprRoll.location);
    }
  }

  /**
   * Callback for the checkboxes that control weapon fire modes
   *
   * @callback
   * @private
   * @param {Object} event - object with details of the event
   * @returns {CPRRoll}
   */
  _getFireCheckbox(event) {
    LOGGER.trace("_getFireCheckbox | CPRActorSheet | Called.");
    const weaponID = SystemUtils.GetEventDatum(event, "data-item-id");
    const box = this.actor.getFlag("cyberpunk-red-core", `firetype-${weaponID}`);
    if (box) {
      return box;
    }
    return CPRRolls.rollTypes.ATTACK;
  }

  /**
   * Callback for increasing an actor's death save
   *
   * @callback
   * @private
   */
  _increaseDeathSave() {
    LOGGER.trace("_increaseDeathSave | CPRActorSheet | Called.");
    this.actor.increaseDeathPenalty();
  }

  /**
   * Callback for reseting an actor's death save
   *
   * @callback
   * @private
   */
  _resetDeathSave() {
    LOGGER.trace("_resetDeathSave | CPRActorSheet | Called.");
    this.actor.resetDeathPenalty();
  }

  /**
   * Callback for ablating armor
   *
   * @async
   * @private
   * @callback
   * @param {Object} event - object with details of the event
   */
  async _ablateArmor(event) {
    LOGGER.trace("_ablateArmor | CPRActorSheet | Called.");
    const location = SystemUtils.GetEventDatum(event, "data-location");
    this.actor._ablateArmor(location, 1);
  }

  /**
   * As a first step to re-organizing the methods to the appropriate, objects (Actor/Item),
   * we filter calls to manipulate items through here.  Things such as:
   *  Weapon: Load, Unload
   *  Armor: Ablate, Repair
   *
   * @async
   * @private
   * @callback
   * @param {event} event - object capturing event data (what was clicked and where?)
   */
  async _itemAction(event) {
    LOGGER.trace("_itemAction | CPRActorSheet | Called.");
    const item = this._getOwnedItem(CPRActorSheet._getItemId(event));
    const actionType = SystemUtils.GetEventDatum(event, "data-action-type");
    if (item) {
      switch (actionType) {
        case "delete": {
          await this._deleteOwnedItem(item);
          break;
        }
        case "ablate-armor": {
          item.ablateArmor();
          break;
        }
        case "favorite": {
          item.toggleFavorite();
          break;
        }
        case "upgrade": {
          await item.sheet._selectItemUpgrades(event);
          break;
        }
        case "remove-upgrade": {
          await item.sheet._removeItemUpgrade(event);
          break;
        }
        case "split": {
          this._splitItem(item);
          break;
        }
        case "snort": {
          // consume a drug
          item.snort();
          break;
        }
        default: {
          item.doAction(this.actor, event.currentTarget.attributes);
        }
      }
      // Only update if we aren't deleting the item.  Item deletion is handled in this._deleteOwnedItem()
      if (actionType !== "delete") {
        this.actor.updateEmbeddedDocuments("Item", [{ _id: item.id, system: item.system }]);
      }
    }
  }

  /**
   * This is the callback for setting armor as "current", which is the star glyph. Setting this enables
   * the SP of the armor to be tracked as a resource bar on the corresponding token.
   *
   * @callback
   * @private
   * @param {} event - object capturing event data (what was clicked and where?)
   */
  _makeArmorCurrent(event) {
    LOGGER.trace("_makeArmorCurrent | CPRActorSheet | Called.");
    const location = SystemUtils.GetEventDatum(event, "data-location");
    const id = SystemUtils.GetEventDatum(event, "data-item-id");
    this.actor.makeThisArmorCurrent(location, id);
  }

  /**
   * Update a property of an Item that is owned by this actor. There is a round trip to the
   * Foundry server with this call, so do not over use it.
   *
   * @private
   * @param {Item} item - object to be updated
   * @param {String} prop - property to be updated in a dot notation (e.g. "item.name")
   * @param {*} value - value to set the property to
   */
  _updateOwnedItemProp(item, prop, value) {
    LOGGER.trace("_updateOwnedItemProp | CPRActorSheet | Called.");
    setProperty(item, prop, value);
    this._updateOwnedItem(item);
  }

  /**
   * Update an Item owned by this actor. There is a round trip to the Foundry server with this
   * call, so do not over use it in your code.
   *
   * @private
   * @param {Item} item - the updated object to replace in-line
   * @returns - the updated object (document) or array of entities
   */
  _updateOwnedItem(item) {
    LOGGER.trace("_updateOwnedItem | CPRActorSheet | Called.");
    return this.actor.updateEmbeddedDocuments("Item", [{ _id: item.id, system: item.system }]);
  }

  /**
   * Render the item card (chat message) when ctrl-click happens on an item link, or display
   * the item sheet if ctrl was not pressed.
   * To support shift-click in the cpr-mook-sheet, it expects any other event to not be a shift key.
   *
   * @private
   * @callback
   * @param {Object} event - object capturing event data (what was clicked and where?)
   */
  _renderItemCard(event) {
    LOGGER.trace("_renderItemCard | CPRActorSheet | Called.");
    const itemId = CPRActorSheet._getItemId(event);
    const item = this.actor.items.find((i) => i._id === itemId);
    if (event.ctrlKey) {
      CPRChat.RenderItemCard(item);
      return;
    } if (!event.shiftKey) {
      item.sheet.render(true, { editable: true });
    }
  }

  /**
   * Render an item sheet in read-only mode, which is used on installed cyberware. This is to
   * prevent a user from editing data while it is installed, such as the foundation type.
   *
   * @private
   * @callback
   * @param {Object} event - object capturing event data (what was clicked and where?)
   */
  _renderReadOnlyItemCard(event) {
    LOGGER.trace("_renderReadOnlyItemCard | CPRActorSheet | Called.");
    const itemId = CPRActorSheet._getItemId(event);
    const item = this.actor.items.find((i) => i._id === itemId);
    if (event.ctrlKey) {
      CPRChat.RenderItemCard(item);
      return;
    } if (!event.shiftKey) {
      item.sheet.render(true, { editable: false });
    }
  }

  /**
   * Get an itemId if specified as an attribute of a clicked link.
   * TODO: this may belong in a cpr-templateutils.js library
   *
   * @private
   * @static
   * @param {Object} event - the event object to inspect
   * @returns {String} - the string Id of the item
   */
  static _getItemId(event) {
    LOGGER.trace("_getItemId | CPRActorSheet | Called.");
    let id = SystemUtils.GetEventDatum(event, "data-item-id");
    if (typeof id === "undefined") {
      LOGGER.debug("Could not find itemId in parent elements, trying currentTarget");
      id = SystemUtils.GetEventDatum(event, "data-item-id");
    }
    return id;
  }

  /**
   * Return an owned Item object given the desired ID
   *
   * @private
   * @param {String} itemId - the Id of the owned item to retrieve
   * @returns the Item object matching the given Id
   */
  _getOwnedItem(itemId) {
    LOGGER.trace("_getOwnedItem | CPRActorSheet | Called.");
    return this.actor.items.find((i) => i._id === itemId);
  }

  /**
   * Often clickable elements in a sheet reference a complex object on the actor or item.
   * When a property deep in the object needs to be retrieved, a "property-string" is provided
   * for use with the object. This method retrieve that property-string from an attribute in
   * the link. Therefore this method is often pared with _getItemId since it is the first step
   * to getting the object with the property we want.
   *
   * TODO: this may belong in a cpr-templateutils.js library
   *
   * @private
   * @static
   * @param {Object} event - the event object to inspect
   * @returns {String} - the property string
   */
  static _getObjProp(event) {
    LOGGER.trace("_getObjProp | CPRActorSheet | Called.");
    return SystemUtils.GetEventDatum(event, "data-item-prop");
  }

  /**
   * Delete an Item owned by the actor.
   *
   * @private
   * @async
   * @param {Item} item - the item to be deleted
   * @param {Boolean} skipConfirm - bypass rendering the confirmation dialog box
   * @returns {null}
   */
  async _deleteOwnedItem(item, skipConfirm = false) {
    LOGGER.trace("_deleteOwnedItem | CPRActorSheet | Called.");
    // There's a bug here somewhere.  If the prompt is disabled, it doesn't seem
    // to delete, but if the player is prompted, it deletes fine???
    const setting = game.settings.get("cyberpunk-red-core", "deleteItemConfirmation");
    // Only show the delete confirmation if the setting is on, and internally we do not want to skip it.
    if (setting && !skipConfirm) {
      const promptMessage = `${SystemUtils.Localize("CPR.dialog.deleteConfirmation.message")} ${item.name}?`;
      const confirmDelete = await ConfirmPrompt.RenderPrompt(
        SystemUtils.Localize("CPR.dialog.deleteConfirmation.title"),
        promptMessage,
      ).catch((err) => LOGGER.debug(err));
      if (confirmDelete === undefined) {
        return;
      }
      if (!confirmDelete) {
        return;
      }
    }
    if (item.type === "ammo") {
      const weapons = this.actor.itemTypes.weapon;
      let ammoIsLoaded = false;
      weapons.forEach((weapon) => {
        const weaponData = weapon.system;
        if (weaponData.isRanged) {
          if (weaponData.magazine.ammoId === item.id) {
            const warningMessage = `${SystemUtils.Localize("CPR.messages.ammoDeleteWarning")}: ${weapon.name}`;
            SystemUtils.DisplayMessage("warn", warningMessage);
            ammoIsLoaded = true;
          }
        }
      });

      if (ammoIsLoaded) {
        return;
      }
    }
    if (item.type === "cyberdeck") {
      // Set all of the owned programs that were installed on
      // this cyberdeck to uninstalled.
      const programs = item.getInstalledPrograms();
      const updateList = [];
      programs.forEach((p) => {
        updateList.push({ _id: p._id, "system.isInstalled": false });
      });
      await this.actor.updateEmbeddedDocuments("Item", updateList);
    }
    if (item.type === "cyberware") {
      if (item.system.isInstalled) {
        SystemUtils.DisplayMessage("warn", "CPR.messages.cyberwareDeleteWarning");
        return;
      }
    }

    if (game.system.template.Item[item.type].templates.includes("upgradable")) {
      const { upgrades } = item.system;
      const updateList = [];
      upgrades.forEach((u) => {
        updateList.push({ _id: u._id, "system.isInstalled": false });
      });
      await this.actor.updateEmbeddedDocuments("Item", updateList);
    }
    await this.actor.deleteEmbeddedDocuments("Item", [item.id]);
  }

  /**
   * Handle a fire mode checkbox being clicked. This will clear the others and set a Flag on the actor
   * to indicate what was selected when an attack was made. Flags are a Foundry feature on Actors/Items.
   *
   * @private
   * @callback
   * @param {Object} event - object capturing event data (what was clicked and where?)
   */
  async _fireCheckboxToggle(event) {
    LOGGER.trace("_fireCheckboxToggle | CPRActorSheet | Called.");
    const weaponID = SystemUtils.GetEventDatum(event, "data-item-id");
    const firemode = SystemUtils.GetEventDatum(event, "data-fire-mode");
    const flag = getProperty(this.actor, `flags.cyberpunk-red-core.firetype-${weaponID}`);
    LOGGER.debug(`firemode is ${firemode}`);
    LOGGER.debug(`weaponID is ${weaponID}`);
    LOGGER.debug(`flag is ${flag}`);
    if (this.token !== null && firemode === "autofire") {
      const weaponDvTable = (this._getOwnedItem(weaponID)).system.dvTable;
      const currentDvTable = (weaponDvTable === "") ? getProperty(this.token, "flags.cprDvTable") : weaponDvTable;
      if (typeof currentDvTable !== "undefined") {
        const dvTable = currentDvTable.replace(" (Autofire)", "");
        const afTable = (DvUtils.GetDvTables()).filter((name) => name.includes(dvTable) && name.includes("Autofire"));
        let newDvTable = currentDvTable;
        if (afTable.length > 0) {
          newDvTable = (flag === firemode) ? dvTable : afTable[0];
        }
        await this.token.update({ "flags.cprDvTable": newDvTable });
      }
    }
    if (flag === firemode) {
      // if the flag was already set to firemode, that means we unchecked a box
      await this.actor.unsetFlag("cyberpunk-red-core", `firetype-${weaponID}`);
    } else {
      await this.actor.setFlag("cyberpunk-red-core", `firetype-${weaponID}`, firemode);
    }
  }

  /**
   * Look up the critical injury rollable tables based on name.
   *
   * @private
   * @returns {Array} - a sorted list of rollable table names that match expectations
   */
  static _getCriticalInjuryTables() {
    LOGGER.trace("_getCriticalInjuryTables | CPRActorSheet | Called.");
    const pattern = "^Critical Injury|^CriticalInjury|^CritInjury|^Crit Injury|^Critical Injuries|^CriticalInjuries";
    const tableNames = [];
    const tableList = SystemUtils.GetRollTables(pattern, true);
    tableList.forEach((table) => tableNames.push(table.name));
    return tableNames.sort();
  }

  /**
   * Pop up a dialog box asking which critical injury table to use and return the user's answer.
   *
   * @private
   * @returns {String} - chosen name of the rollable table to be used for critical injuries
   */
  static async _setCriticalInjuryTable() {
    LOGGER.trace("_setCriticalInjuryTable | CPRActorSheet | Called.");
    const critInjuryTables = CPRActorSheet._getCriticalInjuryTables();
    const formData = await RollCriticalInjuryPrompt.RenderPrompt(critInjuryTables).catch((err) => LOGGER.debug(err));
    if (formData === undefined) {
      return undefined;
    }
    return formData.criticalInjuryTable;
  }

  /**
   * Roll a critical injury. This is the top-level event handler for the sheet.
   *
   * @async
   * @callback
   * @private
   */
  async _rollCriticalInjury() {
    LOGGER.trace("_rollCriticalInjury | CPRActorSheet | Called.");
    const tableName = await CPRActorSheet._setCriticalInjuryTable();
    if (tableName === undefined) {
      return;
    }
    const table = (SystemUtils.GetRollTables(tableName, false))[0];
    this._drawCriticalInjuryTable(tableName, table, 0);
    this._automaticResize();
  }

  /**
   * Roll on the given critical injury table. Some heuristics are going on to handle user settings where
   * they do not want duplicate results on a character. When that happens, reroll by recursively calling
   * this method. There is cap to prevent recursing too much or if there are unreachable entries on the
   * table.
   *
   * @param {String} tableName - the name of the table to roll on
   * @param {RollTable} table - the rollable table to draw from (roll on)
   * @param {Number} iteration - iteration #, used to track how many times we have rolled to bail if too many
   * @returns {null}
   */
  async _drawCriticalInjuryTable(tableName, table, iteration) {
    LOGGER.trace("_drawCriticalInjuryTable | CPRActorSheet | Called.");
    if (iteration > 100) {
      // 6% chance to reach here in case of only one rare critical injury remaining (2 or 12 on 2d6)
      const crit = game.items.find((item) => (
        (item.type === "criticalInjury") && (item.name === table._source[0].text)
      ));
      if (!crit) {
        SystemUtils.DisplayMessage("warn", (SystemUtils.Localize("CPR.dialog.rollCriticalInjury.criticalInjuryNoneWarning")));
        return;
      }
      const critType = crit.system.location;
      LOGGER.debug(`critType is ${critType}`);
      let numberCritInjurySameType = 0;
      this.actor.itemTypes.criticalInjury.forEach((injury) => {
        if (injury.system.location === critType) { numberCritInjurySameType += 1; }
      });
      if (table.results.contents.length <= numberCritInjurySameType) {
        SystemUtils.DisplayMessage("warn", (SystemUtils.Localize("CPR.messages.criticalInjuryDuplicateAllWarning")));
        return;
      }
      // Techincally possible to reach even if a critical injury is still missing (chance: 6*10e-11 %), though unlikely.
      if (iteration > 1000) {
        SystemUtils.DisplayMessage("error", (SystemUtils.Localize("CPR.messages.criticalInjuryDuplicateLoopWarning")));
        // Prevent endless loop in case of mixed (head and body) Critical Injury tables
        // or unreachable elements in the rolltable.
        return;
      }
    }
    table.draw({ displayChat: false })
      .then(async (res) => {
        if (res.results.length > 0) {
          // Check if the critical Injury already exists on the character
          let injuryAlreadyExists = false;
          this.actor.itemTypes.criticalInjury.forEach((injury) => {
            if (injury.name === res.results[0].text) { injuryAlreadyExists = true; }
          });
          if (injuryAlreadyExists) {
            const setting = game.settings.get("cyberpunk-red-core", "preventDuplicateCriticalInjuries");
            if (setting === "reroll") {
              this._drawCriticalInjuryTable(tableName, table, iteration + 1);
              return;
            }
            if (setting === "warn") {
              SystemUtils.DisplayMessage("warn", (SystemUtils.Localize("CPR.messages.criticalInjuryDuplicateWarning")));
            }
          }
          const crit = game.items.find((item) => (
            (item.type === "criticalInjury") && (item.name === res.results[0].text)
          ));
          if (!crit) {
            SystemUtils.DisplayMessage("warn", (SystemUtils.Localize("CPR.dialog.rollCriticalInjury.criticalInjuryNoneWarning")));
            return;
          }
          const cprItemData = {
            name: crit.name,
            type: crit.type,
            img: crit.img,
            system: duplicate(crit.system),
          };
          const result = await this.actor.createEmbeddedDocuments("Item", [cprItemData]);
          const cprRoll = new CPRRolls.CPRTableRoll(
            crit.name,
            res.roll,
            "systems/cyberpunk-red-core/templates/chat/cpr-critical-injury-rollcard.hbs",
          );
          cprRoll.rollCardExtraArgs.tableName = tableName;
          cprRoll.rollCardExtraArgs.itemName = result[0].name;
          cprRoll.rollCardExtraArgs.itemImg = result[0].img;
          if (this.token) {
            cprRoll.entityData = { actor: this.actor.id, token: this.token.id, item: result[0].id };
          } else {
            cprRoll.entityData = { actor: this.actor.id, item: result[0].id };
          }
          CPRChat.RenderRollCard(cprRoll);
        }
      });
  }

  /**
   * Automatically resize the actor sheet to dimensions that will fit all revealed elements, assuming the
   * user has this set to happen in their settings.
   *
   * @private
   */
  _automaticResize() {
    LOGGER.trace("_automaticResize | CPRActorSheet | Called.");
    const setting = game.settings.get("cyberpunk-red-core", "automaticallyResizeSheets");
    if (setting && this.rendered && !this._minimized) {
      // It seems that the size of the content does not change immediately upon updating the content
      setTimeout(() => {
        // Make sheet small, so this.form.offsetHeight does not include whitespace
        this.setPosition({ width: this.position.width, height: 35 });
        // 30px for the header and 8px top margin 8px bottom margin
        this.setPosition({ width: this.position.width, height: this.form.offsetHeight + 46 });
      }, 10);
    }
  }

  /**
   * Ledger methods
   * For the most part ledgers are character-specific - they provide records of change to EB, IP and Reputation.
   * Mooks use this for Reputation too, and that's the only reason these remain here.
   */

  /**
   * Provide an Array of values and reasons the EB has changed. Together this is the "ledger", a
   * collection of records for EB changes.
   *
   * @private
   * @returns {Array} - the records
   */
  _listEbRecords() {
    LOGGER.trace("_listEbRecords | CPRActorSheet | called.");
    return this.actor.listRecords("wealth");
  }

  /**
   * Clear all EB records, effectively setting it back to 0.
   *
   * @private
   * @returns - any empty Array, or null if unsuccessful
   */
  _clearEbRecords() {
    LOGGER.trace("_clearEbRecords | CPRActorSheet | called.");
    return this.actor.clearLedger("wealth");
  }

  /**
   * Set the value in a ledger on the actor to a specific value, with a reason.
   *
   * @private
   * @param {String} ledgerName - The name of the ledger
   * @param {Number} value - the value to set IP to
   * @param {String} reason - a freeform comment of why the IP is changing to the given value
   * @returns - the modified property or null if it was unsuccessful
   */
  _setLedger(ledgerName, value, reason) {
    LOGGER.trace("_setLedger | CPRActorSheet | called.");
    LOGGER.debug(`setting ${ledgerName} to ${value}`);
    return this.actor.setLedgerProperty(ledgerName, value, reason);
  }

  /**
   * Increase ledger value by an amount, with a reason
   *
   * @private
   * @param {String} ledgerName - The name of the ledger
   * @param {Number} value - the value to increase IP by
   * @param {String} reason - a freeform comment of why the IP is changing to the given value
   * @returns - the modified property or null if it was unsuccessful
   */
  _gainLedger(ledgerName, value, reason) {
    LOGGER.trace("_gainLedger | CPRActorSheet | called.");
    return this.actor.deltaLedgerProperty(ledgerName, value, reason);
  }

  /**
   * Reduce ledger value by an amount, with a reason
   *
   * @private
   * @param {String} ledgerName - The name of the ledger
   * @param {Number} value - the value to reduce IP to
   * @param {String} reason - a freeform comment of why the IP is changing to the given value
   * @returns - the modified property or null if it was unsuccessful
   */
  _loseLedger(ledgerName, value, reason) {
    LOGGER.trace("_loseLedger | CPRActorSheet | called.");
    const resultantValue = this.actor.system[ledgerName].value - value;
    let rulesWarning = "";
    switch (ledgerName) {
      case "improvementPoints": {
        rulesWarning = "CPR.messages.warningNotEnoughIp";
        break;
      }
      case "wealth": {
        rulesWarning = "CPR.messages.warningNotEnoughEb";
        break;
      }
      case "reputation": {
        rulesWarning = "CPR.messages.warningNotEnoughReputation";
        break;
      }
      default: {
        break;
      }
    }
    Rules.lawyer(resultantValue > 0, rulesWarning);
    let tempVal = value;
    if (tempVal > 0) {
      tempVal = -tempVal;
    }

    const ledgerProp = this.actor.deltaLedgerProperty(ledgerName, tempVal, reason);
    return ledgerProp;
  }

  /**
   * Provide an Array of values and reasons IP has changed. Together this is the "ledger", a
   * collection of records for IP changes.
   *
   * @private
   * @returns {Array} - the records
   */
  _listIpRecords() {
    LOGGER.trace("_listIpRecords | CPRActorSheet | called.");
    return this.actor.listRecords("improvementPoints");
  }

  /**
   * Clear all IP records, effectively setting it back to 0.
   *
   * @private
   * @returns - any empty Array, or null if unsuccessful
   */
  _clearIpRecords() {
    LOGGER.trace("_clearIpRecords | CPRActorSheet | called.");
    return this.actor.clearLedger("improvementPoints");
  }

  /**
   * Called when an Item is dragged on the ActorSheet. This "stringifies" the Item into attributes
   * that can be inspected later. Doing so allows the system to make changes to the item before/after it
   * is added to the Actor's inventory.
   *
   * @private
   * @param {Object} event - an object capturing event details
   */
  _onDragItemStart(event) {
    LOGGER.trace("_onDragItemStart | CPRActorSheet | called.");
    const itemId = SystemUtils.GetEventDatum(event, "data-item-id");
    const item = this.actor.getEmbeddedDocument("Item", itemId);
    const tokenId = (this.token === null) ? null : this.token.id;
    event.dataTransfer.setData("text/plain", JSON.stringify({
      type: "Item",
      uuid: item.uuid,
      system: {
        actorId: this.actor._id,
        tokenId,
        data: item,
        root: SystemUtils.GetEventDatum(event, "root"),
      },
    }));
  }

  /**
   * _onDrop is provided by Foundry and extended here. When an Item is dragged to an ActorSheet a new copy is created.
   * This extension ensure that the copy is owned by the right actor afterward. In the case that an item is dragged from
   * one Actor sheet to another, the item on the source sheet is deleted, simulating an actor giving an item to another
   * actor.
   *
   * @private
   * @override
   * @param {Object} event - an object capturing event details
   * @returns {null}
   */
  async _onDrop(event) {
    LOGGER.trace("_onDrop | CPRActorSheet | called.");
    const dragData = TextEditor.getDragEventData(event);
    if (dragData.system && dragData.system.actorId !== undefined) {
      // Transfer ownership from one player to another
      const actor = (Object.keys(game.actors.tokens).includes(dragData.system.tokenId))
        ? game.actors.tokens[dragData.system.tokenId]
        : game.actors.find((a) => a.id === dragData.system.actorId);
      if (actor.type === "container" && !game.user.isGM) {
        SystemUtils.DisplayMessage("warn", SystemUtils.Localize("CPR.messages.tradeDragOutWarn"));
        return;
      }
      if (actor) {
        // Do not move if the data is moved to itself
        if (actor._id === this.actor._id) {
          return;
        }
        const item = dragData.system.data;
        const cprData = item.system;
        // If the cyberware is marked as core, or is installed, throw an error message.
        if (cprData.core === true || (cprData.type === "cyberware" && cprData.isInstalled)) {
          SystemUtils.DisplayMessage("error", SystemUtils.Localize("CPR.messages.cannotDropInstalledCyberware"));
          return;
        }
        if (cprData.isUpgraded) {
          SystemUtils.DisplayMessage("warn", SystemUtils.Localize("CPR.messages.tradedragupgradewarn"));
          return;
        }
        if (await super._onDrop(event)) {
          await actor.deleteEmbeddedDocuments("Item", [item._id]);
        }
      }
    } else {
      await super._onDrop(event);
    }
  }

  /**
   * _splitItem splits an item into multiple items if possible.
   * It also adjusts the price accordingly.
   *
   * @param {Object} item - an object containing the new item
   * @returns {null}
   */
  async _splitItem(item) {
    LOGGER.trace("_splitItem | CPRActorSheet | called.");
    if (item.system.upgrades && item.system.upgrades.length !== 0) {
      SystemUtils.DisplayMessage("warn", SystemUtils.Format("CPR.dialog.splitItem.warningUpgrade"));
    }
    const itemText = SystemUtils.Format(
      "CPR.dialog.splitItem.text",
      { amount: item.system.amount, itemName: item.name },
    );
    const formData = await SplitItemPrompt.RenderPrompt(itemText).catch((err) => LOGGER.debug(err));
    if (formData === undefined) {
      return;
    }
    const oldAmount = parseInt(item.system.amount, 10);
    if (formData.splitAmount <= 0 || formData.splitAmount >= oldAmount) {
      const warningMessage = SystemUtils.Format(
        "CPR.dialog.splitItem.warningAmount",
        { amountSplit: formData.splitAmount, amountOld: oldAmount, itemName: item.name },
      );
      SystemUtils.DisplayMessage("warn", warningMessage);
      return;
    }
    const newAmount = oldAmount - formData.splitAmount;
    const cprNewItemData = duplicate(item.system);
    cprNewItemData.amount = formData.splitAmount;
    delete cprNewItemData._id;
    await this.actor.updateEmbeddedDocuments("Item", [{ _id: item.id, "system.amount": newAmount }]);
    await this.actor.createEmbeddedDocuments("Item", [cprNewItemData], { CPRsplitStack: true });
  }

  /**
   * Sets up a ContextMenu that appears when the Actor's image is right clicked.
   * Enables the user to share the image with other players.
   *
   * @param {Object} html - The DOM object
   * @returns {ContextMenu} The created ContextMenu
   */
  _createActorImageContextMenu(html) {
    LOGGER.trace("_createActorImageContextMenu | CPRActorSheet | called.");
    return createImageContextMenu(html, ".image-block", this.actor);
  }

  /**
   * _applyContentFilter is used to filter data content on the actor sheet
   * to make locating things, such as skills or gear easier
   *
   * @private
   * @param {Object} event - an object capturing event details
   */
  async _applyContentFilter(event) {
    LOGGER.trace("_applyContentFilter | CPRActorSheet | called.");
    const filterValue = event.currentTarget.value;
    this.options.cprContentFilter = filterValue;
    this._render();
  }

  /**
   * _clearContentFilter is used to clear the filter used on the sheet
   * This is called when the tabs change if a filter is set.
   *
   * @private
   * @param {Object} event - an object capturing event details
   */
  async _clearContentFilter() {
    LOGGER.trace("_clearContentFilter | CPRActorSheet | called.");
    if (typeof this.options.cprContentFilter !== "undefined" && this.options.cprContentFilter !== "") {
      this.options.cprContentFilter = "";
      this._render();
    }
  }

  /**
   * Called when the Reputation editing glyph is clicked. Pops up a dialog to get details about the change
   * and a reason, and then saves those similar to IP.
   *
   * @callback
   * @private
   * @returns {null}
   */
  async _updateReputation() {
    LOGGER.trace("_updateReputation | CPRCharacterActorSheet | Called.");
    const formData = await LedgerEditPrompt.RenderPrompt("CPR.characterSheet.bottomPane.reputationEdit").catch((err) => LOGGER.debug(err));
    if (formData === undefined) {
      // Prompt was closed
      return;
    }
    if (formData.changeValue !== null && formData.changeValue !== "") {
      switch (formData.action) {
        case "add": {
          this._gainLedger("reputation", parseInt(formData.changeValue, 10), `${formData.changeReason} - ${game.user.name}`);
          break;
        }
        case "subtract": {
          this._loseLedger("reputation", parseInt(formData.changeValue, 10), `${formData.changeReason} - ${game.user.name}`);
          break;
        }
        case "set": {
          this._setLedger("reputation", parseInt(formData.changeValue, 10), `${formData.changeReason} - ${game.user.name}`);
          break;
        }
        default: {
          SystemUtils.DisplayMessage("error", SystemUtils.Localize("CPR.messages.reputationEditInvalidAction"));
          break;
        }
      }
    } else {
      SystemUtils.DisplayMessage("warn", SystemUtils.Localize("CPR.messages.reputationEditWarn"));
    }
  }
}
