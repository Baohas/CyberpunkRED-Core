/* globals foundry */

import CPR from "../../system/config.js";
import LOGGER from "../../utils/cpr-logger.js";
import CPRSystemDataModel from "../abstract.js";
import HpSchema from "./components/cpr-hp-schema.js";

export default class BlackIceDataModel extends CPRSystemDataModel.mixin() {
  static defineSchema() {
    LOGGER.trace("defineSchema | BlackIceDataModel | called.");
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      class: new fields.StringField({
        initial: "antipersonnel",
        choices: Object.keys(CPR.blackIceType),
      }),
      stats: new fields.SchemaField({
        per: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 0,
          min: 0,
        }),
        spd: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 0,
          min: 0,
        }),
        atk: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 0,
          min: 0,
        }),
        def: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 0,
          min: 0,
        }),
        rez: new fields.SchemaField(HpSchema.defineSchema()),
      }),
      cost: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 100,
        min: 0,
      }),
      effect: new fields.HTMLField(),
      notes: new fields.HTMLField(),
    });
  }
}
