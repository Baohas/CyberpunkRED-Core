import CPRActor from "./cpr-actor.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

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
    this._applyCreationSource(data, {
      prototypeToken: { disposition: 0 },
      ownership: { default: 3 },
      flags: {
        [game.system.id]: { "container-type": "shop", "players-sell": true },
      },
    });
    return allowed;
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
    // Determine the transaction direction, then delegate to the inherited `ledgerable` API
    // (set/deltaLedgerProperty on the container's `wealth` ledger). A seller matching this container
    // means money flows in (add); a different seller means money flows out (subtract); otherwise the
    // direction is read from the reason string (its third word).
    let transactionType;
    if (seller) {
      transactionType = seller._id === this._id ? "add" : "subtract";
    } else {
      // eslint-disable-next-line prefer-destructuring
      transactionType = reason.split(" ")[2];
    }

    switch (transactionType) {
      case "add":
        return this.deltaLedgerProperty("wealth", value, reason);
      case "subtract":
        return this.deltaLedgerProperty("wealth", -value, reason);
      case "set":
      default:
        return this.setLedgerProperty("wealth", value, reason);
    }
  }
}
