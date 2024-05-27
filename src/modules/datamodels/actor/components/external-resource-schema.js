import LOGGER from "../../../utils/cpr-logger.js";

export default class ExternalResourceSchema extends foundry.abstract.DataModel {
  static defineSchema() {
    LOGGER.trace("defineSchema | ExternalResourceSchema | called.");
    const { fields } = foundry.data;
    return {
      id: new fields.DocumentIdField({ initial: "", blank: true }),
      value: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        positive: false,
        initial: 0,
        min: 0,
      }),
      max: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        positive: false,
        initial: 0,
        min: 0,
      }),
    };
  }
}
