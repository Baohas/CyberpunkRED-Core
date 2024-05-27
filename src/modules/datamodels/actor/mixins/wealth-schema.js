import LOGGER from "../../../utils/cpr-logger.js";
import LedgerSchema from "../components/ledger-schema.js";

export default class WealthSchema extends foundry.abstract.DataModel {
  static defineSchema() {
    LOGGER.trace("defineSchema | WealthSchema | called.");
    const { fields } = foundry.data;
    return {
      wealth: new fields.SchemaField(LedgerSchema.defineSchema()),
    };
  }
}
