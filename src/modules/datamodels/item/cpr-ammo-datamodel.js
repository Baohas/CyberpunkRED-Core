/* globals foundry */

import LOGGER from "../../utils/cpr-logger.js";
import CPRSystemDataModel from "../abstract.js";
import CommonSchema from "./mixins/common-schema.js";

export default class AmmoDataModel extends CPRSystemDataModel.mixin(
  CommonSchema
) {
  static defineSchema() {
    LOGGER.trace("defineSchema | AmmoDataModel | called.");
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      ablationValue: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 1,
        min: 0,
      }),
      amount: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 1,
        min: 0,
      }),
    });
  }
}
