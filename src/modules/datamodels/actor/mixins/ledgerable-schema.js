import CPRSystemDataModel from "../../system-data-model.js";

/**
 * Marker schema mixin that opts an actor type into the `ledgerable` behavioural mixin
 * (`src/modules/actor/mixins/cpr-ledgerable.js`), which supplies the ledger read/write API.
 *
 * It declares no fields of its own — the ledger data already lives on the composing types
 * (`wealth` via WealthSchema, `reputation` via CommonSchema, `improvementPoints` on the character
 * model). Its sole job is to make `SystemUtils.getMixins` surface the name `"ledgerable"` so
 * `CPRActor.loadMixins` attaches the behaviour.
 */
export default class LedgerableSchema extends CPRSystemDataModel {
  static mixinName = "ledgerable";

  static defineSchema() {
    return {};
  }
}
