/* globals foundry */

import CPR from "../../../system/config.js";
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
      ammoVariety: new fields.ArrayField(
        new fields.StringField({ choices: CPR.ammoVariety })
      ),
    };
  }
}
