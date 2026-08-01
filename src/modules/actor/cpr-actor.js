import SystemUtils from "../utils/cpr-systemUtils.js";
import Container from "../item/mixins/cpr-container.js";
import ItemHolder from "./mixins/cpr-item-holder.js";
import Ledgerable from "./mixins/cpr-ledgerable.js";

/**
 * CPRActor is the generic base shared by every CPR actor type. It holds only behaviour common to
 * *all* actors: the create-dialog type restriction, behavioural-mixin dispatch, active-effect
 * suppression, and owned-item lookup. Type- or capability-specific behaviour lives on subclasses
 * (`CPRHuman`) or in capability mixins (`itemHolder`, `ledgerable`, `container`).
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
        case "itemHolder":
          ItemHolder.call(this);
          break;
        case "ledgerable":
          Ledgerable.call(this);
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
   * Apply creation-source defaults (token, ownership, flags, …) to a genuinely-new actor. A
   * duplicate or import brings its own `items`, so it is left untouched. Called from each subclass's
   * `_preCreate` with its type-specific source.
   *
   * @param {object} data - the creation data
   * @param {object} source - the source update to apply when the actor is new
   */
  _applyCreationSource(data, source) {
    if (!data.items?.length) this.updateSource(source);
  }
}
