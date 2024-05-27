import LOGGER from "../../../utils/cpr-logger.js";

export default class CommonSchema extends foundry.abstract.DataModel {
  static mixinName = "common";

  static defineSchema() {
    LOGGER.trace("defineSchema | CommonSchema | called.");
    const { fields } = foundry.data;
    return {
      description: new fields.SchemaField({
        value: new fields.HTMLField({ blank: true }),
      }),
      favorite: new fields.BooleanField({ initial: false }),
      source: new fields.SchemaField({
        book: new fields.StringField({ blank: true }),
        page: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 0,
          min: 0,
        }),
      }),
    };
  }
}
