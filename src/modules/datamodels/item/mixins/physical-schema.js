/* globals foundry */

import LOGGER from "../../../utils/cpr-logger.js";

export default class PhysicalSchema extends foundry.abstract.DataModel {
  static defineSchema() {
    LOGGER.trace("defineSchema | PhysicalSchema | called.");
    const { fields } = foundry.data;
    return {
      concealable: new fields.SchemaField({
        concealable: new fields.BooleanField({ inital: false }),
        isConcealed: new fields.BooleanField({ inital: false }),
      }),
      brand: new fields.StringField({ blank: true }),
    };
  }
}
