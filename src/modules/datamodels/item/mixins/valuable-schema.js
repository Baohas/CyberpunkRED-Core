import LOGGER from "../../../utils/cpr-logger.js";

export default class ValuableSchema extends foundry.abstract.DataModel {
  static mixinName = "valuable";

  static defineSchema() {
    LOGGER.trace("defineSchema | ValuableSchema | called.");
    const { fields } = foundry.data;
    return {
      price: new fields.SchemaField({
        market: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 100,
          min: 0,
        }),
      }),
    };
  }
}
