/* globals Actor, getProperty, hasProperty, setProperty, duplicate */
import SystemUtils from "../utils/cpr-systemUtils.js";
import LOGGER from "../utils/cpr-logger.js";

/**
 * Container actors function like loot boxes, player or party stashes, stores, and
 * vending machines. Note this does not extend CPRActor.
 *
 * @extends {Actor}
 */
export default class CPRContainerActor extends Actor {
  /**
   * create() is called when creating the actor, but it's not the same as a constructor. In the
   * code here, we pre-configure a few token options to reduce repetitive clicking.
   */
  static async create(data, options) {
    LOGGER.trace("create | CPRContainerActor | called.");
    const createData = data;
    if (typeof data.system === "undefined") {
      LOGGER.trace("create | New Actor | CPRContainerActor | called.");
      createData.token = {
        disposition: 0,
      };
    }
    super.create(createData, options);
  }

  /**
   * prepareData is called before the actor is vendored to clients, so we can filter
   * or streamline the data for convenience.
   */
  prepareData() {
    LOGGER.trace("prepareData | CPRContainerActor | Called.");
    super.prepareData();
    if (this.compendium === null || this.compendium === undefined) {
      const cprData = this.system;
    }
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
      const itemMatch = this.items.find((i) => i.type === newItem.type && i.name === newItem.name && i.system.upgrades.length === 0);
      if (itemMatch) {
        const canStack = !(itemTemplates.includes("upgradable") && itemMatch.system.upgrades.length === 0);
        if (canStack) {
          let oldAmount = parseInt(itemMatch.system.amount, 10);
          let addedAmount = parseInt(newItem.system.amount, 10);
          if (Number.isNaN(oldAmount)) { oldAmount = 1; }
          if (Number.isNaN(addedAmount)) { addedAmount = 1; }
          const newAmount = oldAmount + addedAmount;
          this.updateEmbeddedDocuments("Item", [{ _id: itemMatch._id, "system.amount": newAmount }]);
          return false;
        }
      }
    }
    // If not stackable, then return true to continue adding the item.
    return true;
  }

  /**
   * This is the callback for setting the container type.
   *
   * @callback
   * @public
   * @param {} event - object capturing event data (what was clicked and where?)
   */
  async setContainerType(containerType) {
    LOGGER.trace("setContainerType | CPRContainerActor | Called.");
    await this.setFlag("cyberpunk-red-core", "container-type", containerType);
    switch (containerType) {
      case "shop": {
        await this.unsetFlag("cyberpunk-red-core", "items-free");
        await this.unsetFlag("cyberpunk-red-core", "players-create");
        await this.unsetFlag("cyberpunk-red-core", "players-delete");
        await this.unsetFlag("cyberpunk-red-core", "players-modify");
        await this.setFlag("cyberpunk-red-core", "players-sell", true);
        await this.unsetFlag("cyberpunk-red-core", "players-move");
        break;
      }
      case "loot": {
        await this.unsetFlag("cyberpunk-red-core", "infinite-stock");
        await this.setFlag("cyberpunk-red-core", "items-free", true);
        await this.unsetFlag("cyberpunk-red-core", "players-create");
        await this.unsetFlag("cyberpunk-red-core", "players-delete");
        await this.unsetFlag("cyberpunk-red-core", "players-modify");
        await this.unsetFlag("cyberpunk-red-core", "players-sell");
        await this.unsetFlag("cyberpunk-red-core", "players-move");
        break;
      }
      case "stash": {
        await this.unsetFlag("cyberpunk-red-core", "infinite-stock");
        await this.unsetFlag("cyberpunk-red-core", "players-sell");
        await this.setFlag("cyberpunk-red-core", "items-free", true);
        await this.setFlag("cyberpunk-red-core", "players-create", true);
        await this.setFlag("cyberpunk-red-core", "players-delete", true);
        await this.setFlag("cyberpunk-red-core", "players-modify", true);
        await this.setFlag("cyberpunk-red-core", "players-move", true);
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
    LOGGER.trace("toggleFlag | CPRContainerActor | Called.");
    const flag = this.getFlag("cyberpunk-red-core", flagName);
    if (flag === undefined || flag === false) {
      return this.setFlag("cyberpunk-red-core", flagName, true);
    }
    return this.unsetFlag("cyberpunk-red-core", flagName);
  }

  /**
   * Get all records from the associated ledger of a property. Currently the only
   * ledger that the container actor supports is the wealth ledger, however the
   * actor data model does have hit points listed as a ledger so we will
   * leave this as is.
   *
   * @param {String} prop - name of the property that has a ledger
   * @returns {Array} - Each element is a tuple: [value, reason], or null if not found
   */
  listRecords(prop) {
    LOGGER.trace("listRecords | CPRContainerActor | Called.");
    if (prop === "wealth") {
      return getProperty(this.system, `${prop}.transactions`);
    }
    return null;
  }

  /**
   * Return whether a property in actor data is a ledgerProperty. This means it has
   * two (sub-)properties, "value", and "transactions".
   *
   * XXX: This method is copied from cpr-actor.js because CPRContainerActor does not inherit
   *      from that class. We could fix that, but then all other code in this file would be added
   *      to an already long file. If you make changes here, be sure to consider them there too.
   *
   * @param {String} prop - name of the property that has a ledger
   * @returns {Boolean}
   */
  isLedgerProperty(prop) {
    LOGGER.trace("isLedgerProperty | CPRContainerActor | Called.");
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
   * Change the value of a property and store a record of the change in the corresponding
   * ledger.
   *
   * @param {Number} value - how much to increase or decrease the value by
   * @param {String} reason - a user-provided reason for the change
   * @returns {Number} (or null if not found)
   */
  recordTransaction(value, reason, seller = null) {
    LOGGER.trace("recordTransaction | CPRContainerActor | Called.");
    // update "value"; it may be negative
    const cprData = duplicate(this.system);
    let newValue = getProperty(cprData, "wealth.value") || 0;
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

    setProperty(cprData, "wealth.value", newValue);
    // update the ledger with the change
    const ledger = getProperty(cprData, "wealth.transactions");
    ledger.push([
      SystemUtils.Format(transactionSentence, { property: "wealth", amount: value, total: newValue }),
      reason]);
    setProperty(cprData, "wealth.transactions", ledger);
    // update the actor and return the modified property
    this.update({ system: cprData });
    return getProperty(this.system, "wealth");
  }
}
