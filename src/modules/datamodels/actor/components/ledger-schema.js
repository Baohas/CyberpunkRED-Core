import LOGGER from "../../../utils/cpr-logger.js";

export default class LedgerSchema extends foundry.abstract.DataModel {
  static defineSchema() {
    LOGGER.trace("defineSchema | LedgerSchema | called.");
    const { fields } = foundry.data;
    return {
      transactions: new fields.ArrayField(
        new fields.ArrayField(
          new fields.StringField({ required: true, blank: true })
        )
      ),
      value: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        positive: false,
        initial: 0,
      }),
    };
  }
}
