/* eslint-disable no-await-in-loop */
import CPRCharacterActorSheet from "./sheet/cpr-character-sheet.js";
import CPRMookActorSheet from "./sheet/cpr-mook-sheet.js";
import LOGGER from "../utils/cpr-logger.js";
import Rules from "../utils/cpr-rules.js";
import SystemUtils from "../utils/cpr-systemUtils.js";
import { cprConfirm } from "../dialog/cpr-dialog.js";
import Container, { ContainerUtils } from "../item/mixins/cpr-container.js";

/**
 * CPRActor contains common code between mooks and characters (NPCs and players).
 * It extends Actor which comes from Foundry.
 *
 * @extends {Actor}
 */
export default class CPRActor extends Actor {
  /**
   * Restrict the "Create Actor" dialog to the creatable actor types. `blackIce` and `demon` are being
   * deprecated (their NET entities move to Program items in the Netrunning work): existing ones keep
   * loading, opening, and rolling, but no new ones can be made from the sidebar. Foundry builds the
   * dialog's type list from `Actor.TYPES` honoring a `types` restriction, so default `types` to the
   * creatable subset unless a caller supplies its own.
   *
   * @async
   * @override
   * @param {object} data - default data for the new actor
   * @param {object} createOptions - document creation options
   * @param {object} [dialogOptions] - dialog options; `types` restricts the offered types
   * @returns {Promise<Actor|null>}
   */
  static async createDialog(data = {}, createOptions = {}, dialogOptions = {}) {
    const types =
      dialogOptions.types ??
      Actor.TYPES.filter(
        (type) => !["base", "blackIce", "demon"].includes(type),
      );
    return super.createDialog(data, createOptions, { ...dialogOptions, types });
  }

  /**
   * Load the behavioural mixins declared by this actor's data model. The mixin list is derived from the
   * composed data-model schema (`SystemUtils.getMixins`), so a type opts into a behaviour by mixing its
   * schema rather than by a hardcoded list here. Schema-only mixins with no behavioural counterpart
   * (e.g. `wealth`) are skipped.
   *
   * @public
   */
  loadMixins() {
    const mixins = SystemUtils.getMixins(this.type, "Actor");
    mixins.forEach((mixin) => {
      switch (mixin) {
        case "container":
          Container.call(this);
          break;
        default:
          break;
      }
    });
  }

  /**
   * Called when an actor is passed to the client, we override this to calculate
   * derived stats and massage some of the data for convenience later.
   *
   * @override
   */
  prepareData() {
    super.prepareData();
    this.loadMixins();
  }

  /**
   * The Active Effects do not have access to their parent at preparation time so we wait until
   * this stage to determine whether they are suppressed or not. Taken from dnd5e character code.
   *
   * @override
   * @returns nothing, just applies effects to the actor
   */
  applyActiveEffects() {
    for (const e of this.allApplicableEffects()) {
      e.determineSuppression();
    }
    return super.applyActiveEffects();
  }

  /**
   * The three reasons we extend this code are:
   *  - handle an edge case for migrations.
   *  - prevent addition of core items
   *  - handle item stacking
   *  - Handle containers with installed items
   *
   * @override
   * @param {String} embeddedName - document name, usually a category like Item
   * @param {Array<CPRItem>} items - Array of items to create
   * @param {Object} context - an object tracking the context in which the method is being called
   * @returns {null}
   */
  async createEmbeddedDocuments(
    embeddedName,
    items,
    context = { createInstalled: true },
  ) {
    // If migration is calling this, we definitely want to
    // create the Embedded Documents.
    const isMigration = !!(
      typeof context !== "undefined" && context.cprIsMigrating
    );
    if (isMigration || !embeddedName === "Item")
      return super.createEmbeddedDocuments(embeddedName, items, context);

    // Don't add core items.
    const coreItemIds = items.filter((i) => i.system?.core).map((i) => i._id);
    if (coreItemIds.length > 0) {
      Rules.lawyer(false, "CPR.messages.dontAddCoreItems");
      items = items.filter((i) => !coreItemIds.includes(i._id));
    }

    // Stack items.
    const canStack = Object.values(this.apps).some(
      (app) =>
        app instanceof CPRCharacterActorSheet ||
        app instanceof CPRMookActorSheet,
    );
    const stackedItemReferences = [];
    if (canStack && !context.CPRsplitStack) {
      LOGGER.debug("Attempting to stack items on an actor sheet");
      const dontCreate = [];
      for (const doc of items) {
        // eslint-disable-next-line no-continue
        if (!doc.system) continue;
        const [returnValue] = await this.automaticallyStackItems(doc);
        if (returnValue) {
          dontCreate.push(doc._id);
          // Keep track of the item that we stacked upon, so we can update the parent's
          // references later, if the item that was stacked is meant to be installed.
          stackedItemReferences.push({ id: returnValue._id, system: {} });
        }
      }
      // Don't create items that we should stack.
      items = items.filter((i) => !dontCreate.includes(i._id));
    }

    // Create the items
    const createdItems = await super.createEmbeddedDocuments(
      embeddedName,
      items,
      context,
    );

    if (context.createInstalled) {
      // Handle creating and installing any items into the parent item.
      for (const item of createdItems) {
        // eslint-disable-next-line no-continue
        if (!item.system.hasInstalled) continue;
        // The item will only have this flag if it is imported/coming from another actor.
        const imported = !!ContainerUtils.getInstallTreeFlag(item);
        // The following function recusrively creates and installs all items in the install tree.
        await item.createInstalledItemsOnActor(imported);
      }
    }

    const isMookSheet = Object.values(this.apps).some(
      (app) => app instanceof CPRMookActorSheet,
    );

    for (const item of createdItems) {
      if (isMookSheet) await this.handleMookDraggedItem(item);
    }

    // Here, we return the created item array, but concatenated with references to any stacked items
    // This way, when dragging/dropping installed items from sheet to sheet, the calling function can still
    // update the parent with the correct references (see `createInstalledItemsOnActor()` in the mixin cpr-container.js)
    return createdItems.concat(stackedItemReferences);
  }

  /**
   * This is extended to handle :
   * - items installed in other items
   * - container items with other items installed in them.
   *
   * When we delete an owned item, we should first check if it has items installed into it,
   * or if it's installed into something else (or both). That way we can make sure they get
   * uninstalled properly and their references are scrubbed.
   *
   * @override
   * @param {String} embeddedName - document name, usually a category like Item
   * @param {Object} ids - Array of ids to consider
   * @param {Object} [options] - an object tracking the context in which the method is being called
   * @param {Boolean} [options.cprIsMigrating = false] - Whether or not this is being called during migration.
   * @param {Boolean} [options.unloadAmmo = true]      - If ammo should be unloaded as a part of this delete action.
   * @param {Boolean} [options.deleteInstalled = false]   - Uninstall or delete installed items?.
   * @returns {null}
   */
  async deleteEmbeddedDocuments(
    embeddedName,
    ids,
    options = {
      cprIsMigrating: false,
      unloadAmmo: true,
      deleteInstalled: false,
    },
  ) {
    // If migration is calling this, we assume migration is
    // handling all references to containers and installable
    // items, so we just delete the item.
    const isMigration = !!options?.cprIsMigrating;
    if (isMigration)
      return super.deleteEmbeddedDocuments(embeddedName, ids, options);

    // For every item that we are deleting...
    const uninstallPromises = [];
    for (const itemId of ids) {
      // Get the item.
      const item = this.getOwnedItem(itemId);
      // Check if item is installed somewhere. Uninstall it first.
      if (item?.system.isInstalled) {
        uninstallPromises.push(item.uninstall({ skipDialog: true }));
      }

      // Check if it has installed items. Uninstall them before deleting.
      if (item?.system.hasInstalled) {
        const installedItemIDs = item.system.installedItems.list;
        const installedItemsList = installedItemIDs.map((id) =>
          this.getOwnedItem(id),
        );
        if (!options.deleteInstalled) {
          // Uninstall all items before deletion of parent.
          uninstallPromises.push(
            item.uninstallItems(installedItemsList, {
              unloadAmmo: options.unloadAmmo,
            }),
          );
        }
      }
    }
    // Resolve all promises.
    await Promise.all(uninstallPromises);

    // Continue on with deleting the documents (call the Foundry function).
    return super.deleteEmbeddedDocuments(embeddedName, ids, options);
  }

  /**
   * Return the Item object given an Id
   *
   * @public
   * @param {String} itemId - Id or UUID of the item to get
   * @returns {CPRItem}
   */
  getOwnedItem(itemId) {
    const item = this.items.find((i) => i._id === itemId || i.uuid === itemId);
    return item;
  }

  /**
   * Return an array of Item objects given an array of Ids
   *
   * @public
   * @param {Array} itemIds - Array of Ids or UUIDs of the item(s) to get.
   * @returns {Array<CPRItem>}
   */
  getMultipleOwnedItems(itemIds) {
    const items = [];
    for (const id of itemIds) {
      const ownedItem = this.items.find((i) => i._id === id || i.uuid === id);
      items.push(ownedItem);
    }
    return items;
  }

  /**
   * Given a property name on the actor model, wipe out all records in the corresponding ledger
   * for it. Effectively this sets it back to [].
   *
   * @param {String} prop - name of the property that has a ledger
   * @returns {Array} - empty or null if the property was not found
   */
  clearLedger(prop) {
    if (this.isLedgerProperty(prop)) {
      const valProp = `system.${prop}.value`;
      const ledgerProp = `system.${prop}.transactions`;
      this.update({
        [valProp]: 0,
        [ledgerProp]: [],
      });
      return foundry.utils.getProperty(this.system, prop);
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
    if (this.isLedgerProperty(prop)) {
      // update "value"; it may be negative
      const valProp = `system.${prop}.value`;
      let newValue = foundry.utils.getProperty(this, valProp);
      newValue += value;
      // update the ledger with the change
      const ledgerProp = `system.${prop}.transactions`;
      const ledger = foundry.utils.getProperty(this, ledgerProp);
      if (value > 0) {
        ledger.push([
          SystemUtils.Format("CPR.ledger.increaseSentence", {
            property: prop,
            amount: value,
            total: newValue,
          }),
          reason,
        ]);
      } else {
        ledger.push([
          SystemUtils.Format("CPR.ledger.decreaseSentence", {
            property: prop,
            amount: -1 * value,
            total: newValue,
          }),
          reason,
        ]);
      }
      // update the actor and return the modified property
      this.update({
        [valProp]: newValue,
        [ledgerProp]: ledger,
      });
      return foundry.utils.getProperty(this.system, prop);
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
    if (this.isLedgerProperty(prop)) {
      const valProp = `system.${prop}.value`;
      const ledgerProp = `system.${prop}.transactions`;
      const ledger = foundry.utils.getProperty(this, ledgerProp);
      ledger.push([
        SystemUtils.Format("CPR.ledger.setSentence", {
          property: prop,
          total: value,
        }),
        reason,
      ]);
      this.update({
        [valProp]: value,
        [ledgerProp]: ledger,
      });
      return foundry.utils.getProperty(this.system, prop);
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
    if (this.isLedgerProperty(prop)) {
      return foundry.utils.getProperty(this.system, `${prop}.transactions`);
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
    const ledgerData = foundry.utils.getProperty(this.system, prop);
    if (!foundry.utils.hasProperty(ledgerData, "value")) {
      SystemUtils.DisplayMessage(
        "error",
        SystemUtils.Format("CPR.ledger.errorMessage.missingValue", { prop }),
      );
      return false;
    }
    if (!foundry.utils.hasProperty(ledgerData, "transactions")) {
      SystemUtils.DisplayMessage(
        "error",
        SystemUtils.Format("CPR.ledger.errorMessage.missingTransactions", {
          prop,
        }),
      );
      return false;
    }
    return true;
  }

  /**
   * Return whether the actor has a specific Item Type equipped.
   *
   * @public
   * @param {string} itemType - type of item we are looking for
   * @returns {Boolean}
   */
  hasItemTypeEquipped(itemType) {
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
   * automaticallyStackItems searches for an identical item on the actor
   * and if found increments the amount and price for the item on the actor
   * instead of adding it as a new item.
   *
   * @param {Object} newItem - an object containing the new item
   * @returns {boolean} - true if thee item should be added normally
   *                    - false if it has been stacked on an existing item
   */
  automaticallyStackItems(newItem) {
    const itemTemplates = SystemUtils.getMixins(newItem.type);
    if (!itemTemplates.includes("stackable")) return [];
    const itemMatch = this.items.find(
      (i) => i.type === newItem.type && i.name === newItem.name,
    );
    if (
      !itemMatch ||
      !CPRActor._canStackOnto(itemTemplates, itemMatch, newItem)
    )
      return [];
    const toInt = (value) => {
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? 1 : parsed;
    };
    const newAmount =
      toInt(itemMatch.system.amount) + toInt(newItem.system.amount);
    return this.updateEmbeddedDocuments(
      "Item",
      [{ _id: itemMatch.id, "system.amount": newAmount }],
      { diff: false },
    );
  }

  /**
   * Whether an incoming item may stack onto an existing match. Upgradable items
   * become unique once either side carries installed upgrades, so they never
   * merge; everything else stacks.
   *
   * @param {string[]} itemTemplates - the mixin templates for the item type
   * @param {Item} itemMatch - the existing item to stack onto
   * @param {Object} newItem - the incoming item data
   * @returns {boolean} true if the items may be merged into one stack
   */
  static _canStackOnto(itemTemplates, itemMatch, newItem) {
    if (!itemTemplates.includes("upgradable")) return true;
    return (
      !itemMatch.system.installedUpgrades.length &&
      !newItem.system.installedUpgrades?.length
    );
  }

  /**
   * Create an active effect on this actor. This method belongs here so migration scripts can
   * dynamically generate effects based on custom mods already on the actor from earlier versions.
   *
   * @param {Boolean} render - Render the effect's sheet or not. Default true.
   * @returns {CPRActiveEffect} the new document
   */
  async createEffect(render = true) {
    const effectDoc = await this.createEmbeddedDocuments("ActiveEffect", [
      {
        name: SystemUtils.Localize("CPR.itemSheet.effects.newEffect"),
        icon: "icons/svg/aura.svg",
        origin: this.uuid, // Do we still want this here?
        disabled: false,
      },
    ]);

    return effectDoc[0].sheet.render(render);
  }

  copyEffect(effect) {
    const newEffect = foundry.utils.duplicate(effect);
    return this.createEmbeddedDocuments("ActiveEffect", [newEffect]);
  }

  /**
   * Delete the desired effect from this actor. Pops up a confirmation box if permitted.
   *
   * @param {CPRActiveEffect} effect - the effect to delete
   * @returns null
   */
  static async deleteEffect(effect) {
    const setting = game.settings.get(game.system.id, "deleteItemConfirmation");
    if (setting) {
      const dialogMessage = `${SystemUtils.Localize(
        "CPR.dialog.deleteConfirmation.message",
      )} ${effect.name}?`;

      // Show confirmation dialog.
      const confirmDelete = await cprConfirm(dialogMessage, {
        title: SystemUtils.Localize("CPR.dialog.deleteConfirmation.title"),
      });
      if (!confirmDelete) return;
    }
    effect.delete();
  }
}
