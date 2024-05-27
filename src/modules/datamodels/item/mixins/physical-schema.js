import LOGGER from "../../../utils/cpr-logger.js";

export default class PhysicalSchema extends foundry.abstract.DataModel {
  static mixinName = "physical";

  static defineSchema() {
    LOGGER.trace("defineSchema | PhysicalSchema | called.");
    const { fields } = foundry.data;
    return {
      concealable: new fields.SchemaField({
        concealable: new fields.BooleanField({ initial: false }),
        isConcealed: new fields.BooleanField({ initial: false }),
      }),
      brand: new fields.StringField({ blank: true }),
    };
  }
}
