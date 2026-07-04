import CPRSystemDataModel from "../../system-data-model.js";

/**
 * Marker schema mixin that opts an actor type into the `itemHolder` behavioural mixin
 * (`src/modules/actor/mixins/cpr-item-holder.js`), which supplies the item embedding/stacking and
 * install-tree `createEmbeddedDocuments`/`deleteEmbeddedDocuments` overrides.
 *
 * It declares no fields of its own — it exists only so `SystemUtils.getMixins` surfaces the name
 * `"itemHolder"` and `CPRActor.loadMixins` attaches the behaviour to the item-holding actor types.
 */
export default class ItemHolderSchema extends CPRSystemDataModel {
  static mixinName = "itemHolder";

  static defineSchema() {
    return {};
  }
}
