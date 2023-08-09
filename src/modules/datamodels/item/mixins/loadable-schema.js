/* globals foundry */

import LOGGER from "../../../utils/cpr-logger.js";

export default class LoadableSchema extends foundry.abstract.DataModel {
  static defineSchema() {
    LOGGER.trace("defineSchema | LoadableSchema | called.");
    const { fields } = foundry.data;
    return {
      // Is this used anywhere?
      usesType: new fields.StringField({ initial: "magazine" }),
      magazine: new fields.SchemaField({
        value: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 0,
          min: 0,
        }),
        max: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 0,
          min: 0,
        }),
        ammoData: new fields.SchemaField({
          name: new fields.StringField({ blank: true }),
          uuid: new fields.StringField({ blank: true }),
        }),
      }),
      brand: new fields.StringField({ blank: true }),
    };
  }
}
