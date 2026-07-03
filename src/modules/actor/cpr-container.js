/* eslint-disable no-await-in-loop */
import CPRActor from "./cpr-actor.js";
import SystemUtils from "../utils/cpr-systemUtils.js";
import LOGGER from "../utils/cpr-logger.js";
import Rules from "../utils/cpr-rules.js";
import { ContainerUtils } from "../item/mixins/cpr-container.js";

/**
 * Container actors function like loot boxes, player or party stashes, stores, and vending machines.
 * They extend the generic CPRActor base for the shared item/ledger/embedded-document behaviour and add
 * their own container-specific shop/loot/stash handling.
 *
 * @extends {CPRActor}
 */
export default class CPRContainerActor extends CPRActor {
  /**
   * Set up a newly-created container in the creation source: neutral-disposition token, owner-default
   * ownership so players can interact, and the default "shop" container type (its flags — the other
   * container types' unset flags are already absent on a fresh actor). Applied only to a genuinely-new
   * actor (a duplicate/import keeps its own token, ownership, and container type).
   *
   * @async
   * @override
   * @param {object} data - the creation data
   * @param {object} options - creation options
   * @param {User} user - the user requesting the creation
   * @returns {Promise<boolean|void>} false aborts creation
   */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    if (!data.items?.length) {
      this.updateSource({
        prototypeToken: { disposition: 0 },
        ownership: { default: 3 },
        flags: {
          [game.system.id]: { "container-type": "shop", "players-sell": true },
        },
      });
    }
    return allowed;
  }

  /**
   * Containers override the base `createEmbeddedDocuments` because their stacking behaviour differs:
   * items always stack on a container (there is no character/mook-sheet gate, and no mook-dragged-item
   * handling). We still block core items and recursively install container/installed items.
   *
   * @override
   * @param {String} embeddedName - document name, usually a category like Item
   * @param {Array<CPRItem>} items - Array of documents to create
   * @param {Object} context - an object tracking the context in which the method is being called
   * @returns {null}
   */
  async createEmbeddedDocuments(
    embeddedName,
    items,
    context = { createInstalled: true },
  ) {
    if (!embeddedName === "Item")
      return super.createEmbeddedDocuments(embeddedName, items, context);

    // Don't add core items.
    const coreItemIds = items.filter((i) => i.system?.core).map((i) => i._id);
    if (coreItemIds.length > 0) {
      Rules.lawyer(false, "CPR.messages.dontAddCoreItems");
      items = items.filter((i) => !coreItemIds.includes(i._id));
    }

    // Attempt to stack item before creating it
    const stackedItemReferences = [];
    if (!context.CPRsplitStack) {
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

    // Here, we return the created item array, but concatenated with references to any stacked items
    // This way, when dragging/dropping installed items from sheet to sheet, the calling function can still
    // update the parent with the correct references (see `createInstalledItemsOnActor()` in the mixin cpr-container.js)
    return createdItems.concat(stackedItemReferences);
  }

  /**
   * This is a helper function for when syncing installed items fails irrecoverably.
   * It forcibly uninstalls all items from all other items so that the character sheet
   * can reset from a neutral state. This function should reveal items that are "invisible" on actors
   * due to IDs not matching up. Unfortunately, it means that users will have to manually
   * reinstall all their items, but at least other stats on those items aren't lost.
   * Ideally, this is also seldomly used.
   *
   * Note: Much of this code is duplicated from CPRContainer (Mixin). It should stay until
   * we harmonize CPRActor and CPRContainerActor.
   *
   * @async
   */
  async resetInstalled() {
    const containerTypes = SystemUtils.getDocTypesFromMixin("container");
    const installableTypes = SystemUtils.getDocTypesFromMixin("installable");
    const relevantItems = this.items.filter(
      (i) =>
        containerTypes.includes(i.type) || installableTypes.includes(i.type),
    );
    const updateList = [];
    for (const item of relevantItems) {
      const updateData = {
        _id: item.id,
      };

      if (item.system.installedItems?.list) {
        updateData["system.installedItems.list"] = [];
      }

      if (item.system.installedItems?.slots) {
        updateData["system.installedItems.usedSlots"] = 0;
      }

      if (item.type === "program") {
        updateData["system.isRezzed"] = false;
      }

      updateList.push(updateData);
    }

    await this.updateEmbeddedDocuments("Item", updateList);
  }

  /**
   * This is the callback for setting the container type.
   *
   * @callback
   * @public
   * @param {} event - object capturing event data (what was clicked and where?)
   */
  async setContainerType(containerType) {
    await this.setFlag(game.system.id, "container-type", containerType);
    switch (containerType) {
      case "shop": {
        await this.unsetFlag(game.system.id, "items-free");
        await this.unsetFlag(game.system.id, "players-create");
        await this.unsetFlag(game.system.id, "players-delete");
        await this.unsetFlag(game.system.id, "players-modify");
        await this.setFlag(game.system.id, "players-sell", true);
        await this.unsetFlag(game.system.id, "players-move");
        break;
      }
      case "loot": {
        await this.unsetFlag(game.system.id, "infinite-stock");
        await this.setFlag(game.system.id, "items-free", true);
        await this.unsetFlag(game.system.id, "players-create");
        await this.unsetFlag(game.system.id, "players-delete");
        await this.unsetFlag(game.system.id, "players-modify");
        await this.unsetFlag(game.system.id, "players-sell");
        await this.unsetFlag(game.system.id, "players-move");
        break;
      }
      case "stash": {
        await this.unsetFlag(game.system.id, "infinite-stock");
        await this.unsetFlag(game.system.id, "players-sell");
        await this.setFlag(game.system.id, "items-free", true);
        await this.setFlag(game.system.id, "players-create", true);
        await this.setFlag(game.system.id, "players-delete", true);
        await this.setFlag(game.system.id, "players-modify", true);
        await this.setFlag(game.system.id, "players-move", true);
        break;
      }
      case "custom": {
        break;
      }
      default: {
        break;
      }
    }
  }

  /**
   * A utility method that toggles a flag back and forth. If defined, it is
   * set to true, but when it should be "false" we just remove it.
   *
   * @param {*} flagName - a name for the flag to set/unset
   * @returns {Document} representing the flag
   */
  async toggleFlag(flagName) {
    const flag = this.getFlag(game.system.id, flagName);
    if (flag === undefined || flag === false) {
      return this.setFlag(game.system.id, flagName, true);
    }
    return this.unsetFlag(game.system.id, flagName);
  }

  /**
   * Change the value of a property and store a record of the change in the corresponding
   * ledger.
   *
   * @param {Number} value - how much to increase or decrease the value by
   * @param {String} reason - a user-provided reason for the change
   * @returns {Number} (or null if not found)
   */
  recordTransaction(value, reason, seller = null) {
    // update "value"; it may be negative
    // If Containers ever get Active Effects, this code will be a problem. See Issue #583.
    const cprData = foundry.utils.duplicate(this.system);
    let newValue = foundry.utils.getProperty(cprData, "wealth.value") || 0;
    let transactionSentence;
    let transactionType = "set";

    if (seller) {
      if (seller._id === this._id) {
        transactionType = "add";
      } else {
        transactionType = "subtract";
      }
    } else {
      // eslint-disable-next-line prefer-destructuring
      transactionType = reason.split(" ")[2];
    }

    switch (transactionType) {
      case "set": {
        newValue = value;
        transactionSentence = "CPR.ledger.setSentence";
        break;
      }
      case "add": {
        newValue += value;
        transactionSentence = "CPR.ledger.increaseSentence";
        break;
      }
      case "subtract": {
        newValue -= value;
        transactionSentence = "CPR.ledger.decreaseSentence";
        break;
      }
      default:
    }

    foundry.utils.setProperty(cprData, "wealth.value", newValue);
    // update the ledger with the change
    const ledger = foundry.utils.getProperty(cprData, "wealth.transactions");
    ledger.push([
      SystemUtils.Format(transactionSentence, {
        property: "wealth",
        amount: value,
        total: newValue,
      }),
      reason,
    ]);
    foundry.utils.setProperty(cprData, "wealth.transactions", ledger);
    // update the actor and return the modified property
    this.update({ system: cprData });
    return foundry.utils.getProperty(this.system, "wealth");
  }
}
