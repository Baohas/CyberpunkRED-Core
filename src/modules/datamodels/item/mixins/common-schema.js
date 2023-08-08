/* globals foundry */

import LOGGER from "../../../utils/cpr-logger.js";

export default class CommonSchema extends foundry.abstract.DataModel {
  static defineSchema() {
    LOGGER.trace("defineSchema | CommonSchema | called.");
    const { fields } = foundry.data;
    return {
      description: new fields.SchemaField({
        chat: new fields.StringField({ blank: true }),
        value: new fields.HTMLField({ blank: true }),
      }),
    };
  }
}
