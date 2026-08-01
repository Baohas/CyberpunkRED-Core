/* eslint-disable no-await-in-loop */
import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import Rules from "../../utils/cpr-rules.js";
import { ContainerUtils } from "../../item/mixins/cpr-container.js";

/**
 * Whether an incoming item may stack onto an existing match. Upgradable items become unique once
 * either side carries installed upgrades, so they never merge; everything else stacks.
 *
 * @param {string[]} itemTemplates - the mixin templates for the item type
 * @param {Item} itemMatch - the existing item to stack onto
 * @param {Object} newItem - the incoming item data
 * @returns {boolean} true if the items may be merged into one stack
 */
function canStackOnto(itemTemplates, itemMatch, newItem) {
  if (!itemTemplates.includes("upgradable")) return true;
  return (
    !itemMatch.system.installedUpgrades.length &&
    !newItem.system.installedUpgrades?.length
  );
}

/**
 * The combined `amount` after stacking `newItem` onto `itemMatch`, treating non-numeric amounts as 1.
 *
 * @param {Item} itemMatch - the existing item being stacked onto
 * @param {Object} newItem - the incoming item data
 * @returns {number} the summed amount
 */
function stackedAmount(itemMatch, newItem) {
  const toInt = (value) => {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? 1 : parsed;
  };
  return toInt(itemMatch.system.amount) + toInt(newItem.system.amount);
}

/**
 * Behavioural mixin adding item embedding/stacking and install-tree handling to an actor. Attached
 * at prepare time via `ItemHolder.call(this)` from `CPRActor.loadMixins` for actor types that
 * compose `ItemHolderSchema` (character, mook, container).
 *
 * `createEmbeddedDocuments`/`deleteEmbeddedDocuments` override Foundry lifecycle methods. Because a
 * mixin instance method cannot use `super`, they call the Foundry base explicitly via
 * `Actor.prototype.<method>.call(this, ...)` — stable across `loadMixins` re-running each
 * `prepareData` (it never references the re-attached `this.<method>`). Per-type variation is supplied
 * by two hooks, defaulted here and overridden on a subclass prototype (e.g. `CPRHuman`):
 *   - `_shouldStackOnCreate(context)` — whether to attempt stacking (default: always).
 *   - `_postCreateEmbeddedItems(createdItems)` — post-creation step (default: none).
 */
const ItemHolder = function ItemHolder() {
  // Default hooks. A subclass that defines these on its prototype (CPRHuman) keeps its own; a type
  // without an override (container) gets the defaults.
  if (typeof this._shouldStackOnCreate !== "function")
    this._shouldStackOnCreate = () => true;
  if (typeof this._postCreateEmbeddedItems !== "function")
    this._postCreateEmbeddedItems = () => {};

  /**
   * Extended to block core items, stack identical items, and recursively install installed items.
   *
   * @param {String} embeddedName - document name, usually a category like Item
   * @param {Array<CPRItem>} items - Array of items to create
   * @param {Object} context - an object tracking the context in which the method is being called
   * @returns {Promise<Array>} the created items, concatenated with any stacked-item references
   */
  this.createEmbeddedDocuments = async function createEmbeddedDocuments(
    embeddedName,
    items,
    context = { createInstalled: true },
  ) {
    // Migration and non-Item creation skip the item-holder handling.
    const isMigration = !!(context && context.cprIsMigrating);
    if (isMigration || embeddedName !== "Item")
      return Actor.prototype.createEmbeddedDocuments.call(
        this,
        embeddedName,
        items,
        context,
      );

    const { toCreate, stackedItemReferences } =
      await this._prepareItemsForCreate(items, context);
    const createdItems = await Actor.prototype.createEmbeddedDocuments.call(
      this,
      embeddedName,
      toCreate,
      context,
    );
    await this._afterCreateEmbeddedItems(createdItems, context);

    // Return created items plus references to any stacked items, so callers dragging/dropping
    // installed items sheet-to-sheet can still update the parent with the correct references.
    return createdItems.concat(stackedItemReferences);
  };

  /**
   * Drop core items, then (when stacking is enabled) fold identical items onto existing stacks.
   *
   * @param {Array<CPRItem>} items - the items about to be created
   * @param {Object} context - the createEmbeddedDocuments context
   * @returns {Promise<{toCreate: Array, stackedItemReferences: Array}>}
   */
  this._prepareItemsForCreate = async function _prepareItemsForCreate(
    items,
    context,
  ) {
    const blocked = this._blockCoreItems(items);
    if (context.CPRsplitStack || !this._shouldStackOnCreate(context))
      return { toCreate: blocked, stackedItemReferences: [] };
    return this._stackItemsOnCreate(blocked);
  };

  /**
   * Drop any "core" items (auto-added skills/cyberware) from a to-create list and warn the user.
   *
   * @param {Array<CPRItem>} items - the items about to be created
   * @returns {Array<CPRItem>} the items minus any core items
   */
  this._blockCoreItems = function _blockCoreItems(items) {
    const coreItemIds = items.filter((i) => i.system?.core).map((i) => i._id);
    if (coreItemIds.length === 0) return items;
    Rules.lawyer(false, "CPR.messages.dontAddCoreItems");
    return items.filter((i) => !coreItemIds.includes(i._id));
  };

  /**
   * Attempt to stack each item onto an existing identical item before creation.
   *
   * @param {Array<CPRItem>} items - the items about to be created
   * @returns {Promise<{toCreate: Array, stackedItemReferences: Array}>} the items still to create and
   *   references to items that were stacked instead
   */
  this._stackItemsOnCreate = async function _stackItemsOnCreate(items) {
    LOGGER.debug("Attempting to stack items on an actor sheet");
    const dontCreate = [];
    const stackedItemReferences = [];
    for (const doc of items) {
      // eslint-disable-next-line no-continue
      if (!doc.system) continue;
      const [returnValue] = await this.automaticallyStackItems(doc);
      if (returnValue) {
        dontCreate.push(doc._id);
        stackedItemReferences.push({ id: returnValue._id, system: {} });
      }
    }
    return {
      toCreate: items.filter((i) => !dontCreate.includes(i._id)),
      stackedItemReferences,
    };
  };

  /**
   * Post-creation step: recursively install any installed items, then run the subclass hook.
   *
   * @param {Array<CPRItem>} createdItems - the items just created on this actor
   * @param {Object} context - the createEmbeddedDocuments context
   * @returns {Promise<void>}
   */
  this._afterCreateEmbeddedItems = async function _afterCreateEmbeddedItems(
    createdItems,
    context,
  ) {
    if (context.createInstalled) await this._installCreatedItems(createdItems);
    await this._postCreateEmbeddedItems(createdItems);
  };

  /**
   * Recursively create and install any installed items carried by freshly-created items.
   *
   * @param {Array<CPRItem>} createdItems - the items just created on this actor
   * @returns {Promise<void>}
   */
  this._installCreatedItems = async function _installCreatedItems(
    createdItems,
  ) {
    for (const item of createdItems) {
      // eslint-disable-next-line no-continue
      if (!item.system.hasInstalled) continue;
      // The item only has this flag if it is imported/coming from another actor.
      const imported = !!ContainerUtils.getInstallTreeFlag(item);
      await item.createInstalledItemsOnActor(imported);
    }
  };

  /**
   * Extended to uninstall installed items / scrub references before deleting an owned item.
   *
   * @param {String} embeddedName - document name, usually a category like Item
   * @param {Array} ids - Array of ids to delete
   * @param {Object} [options] - context for the delete
   * @param {Boolean} [options.cprIsMigrating=false] - whether this is a migration delete
   * @param {Boolean} [options.unloadAmmo=true] - whether to unload ammo as part of the delete
   * @param {Boolean} [options.deleteInstalled=false] - uninstall or delete installed items
   * @returns {Promise<Array>}
   */
  this.deleteEmbeddedDocuments = async function deleteEmbeddedDocuments(
    embeddedName,
    ids,
    options = {
      cprIsMigrating: false,
      unloadAmmo: true,
      deleteInstalled: false,
    },
  ) {
    // Migration handles references itself, so just delete.
    if (options?.cprIsMigrating)
      return Actor.prototype.deleteEmbeddedDocuments.call(
        this,
        embeddedName,
        ids,
        options,
      );

    await Promise.all(this._collectUninstallPromises(ids, options));
    return Actor.prototype.deleteEmbeddedDocuments.call(
      this,
      embeddedName,
      ids,
      options,
    );
  };

  /**
   * Build the uninstall promises for every id about to be deleted.
   *
   * @param {Array} ids - the item ids about to be deleted
   * @param {Object} options - the delete options (`unloadAmmo`, `deleteInstalled`)
   * @returns {Array<Promise>} the uninstall promises to await
   */
  this._collectUninstallPromises = function _collectUninstallPromises(
    ids,
    options,
  ) {
    return ids.flatMap((itemId) =>
      this._uninstallPromisesForItem(itemId, options),
    );
  };

  /**
   * The uninstall promises for a single item: uninstall it if it is installed elsewhere, and
   * uninstall any items installed into it (unless they are being deleted with it).
   *
   * @param {String} itemId - the id of the item about to be deleted
   * @param {Object} options - the delete options (`unloadAmmo`, `deleteInstalled`)
   * @returns {Array<Promise>} zero to two uninstall promises
   */
  this._uninstallPromisesForItem = function _uninstallPromisesForItem(
    itemId,
    options,
  ) {
    const item = this.getOwnedItem(itemId);
    if (!item) return [];
    const promises = [];
    if (item.system.isInstalled)
      promises.push(item.uninstall({ skipDialog: true }));
    return promises.concat(this._childUninstallPromises(item, options));
  };

  /**
   * The uninstall promise(s) for the items installed into `item`, unless they are being deleted with
   * it.
   *
   * @param {CPRItem} item - the item about to be deleted
   * @param {Object} options - the delete options (`unloadAmmo`, `deleteInstalled`)
   * @returns {Array<Promise>} zero or one uninstall promise
   */
  this._childUninstallPromises = function _childUninstallPromises(
    item,
    options,
  ) {
    if (!item.system.hasInstalled || options.deleteInstalled) return [];
    const installedItemsList = item.system.installedItems.list.map((id) =>
      this.getOwnedItem(id),
    );
    return [
      item.uninstallItems(installedItemsList, {
        unloadAmmo: options.unloadAmmo,
      }),
    ];
  };

  /**
   * Search for an identical item on the actor and, if found, increment its amount instead of adding
   * a new item.
   *
   * @param {Object} newItem - the incoming item
   * @returns {Array|Promise<Array>} the update result, or [] if the item should be created normally
   */
  this.automaticallyStackItems = function automaticallyStackItems(newItem) {
    const itemTemplates = SystemUtils.getMixins(newItem.type);
    if (!itemTemplates.includes("stackable")) return [];
    const itemMatch = this.items.find(
      (i) => i.type === newItem.type && i.name === newItem.name,
    );
    if (!itemMatch || !canStackOnto(itemTemplates, itemMatch, newItem))
      return [];
    return this.updateEmbeddedDocuments(
      "Item",
      [
        {
          _id: itemMatch.id,
          "system.amount": stackedAmount(itemMatch, newItem),
        },
      ],
      { diff: false },
    );
  };
};

export default ItemHolder;
