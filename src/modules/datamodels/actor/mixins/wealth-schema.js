import LedgerSchema from "../components/ledger-schema.js";

export default class WealthSchema extends foundry.abstract.DataModel {
  static mixinName = "wealth";

  static defineSchema() {
    const { fields } = foundry.data;
    return {
      wealth: new fields.SchemaField(LedgerSchema.defineSchema()),
    };
  }
}
