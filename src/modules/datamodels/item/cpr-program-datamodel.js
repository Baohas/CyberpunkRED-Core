/* globals foundry */

import LOGGER from "../../utils/cpr-logger.js";
import CPR from "../../system/config.js";
import CPRSystemDataModel from "../abstract.js";
import CommonSchema from "./mixins/common-schema.js";
import EffectsSchema from "./mixins/effects-schema.js";
import InstallableSchema from "./mixins/installable-schema.js";
import ValuableSchema from "./mixins/valuable-schema.js";

export default class ProgramModel extends CPRSystemDataModel.mixin(
  CommonSchema,
  EffectsSchema,
  InstallableSchema,
  ValuableSchema
) {
  static defineSchema() {
    LOGGER.trace("defineSchema | ProgramModel | called.");
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      class: new fields.StringField({
        initial: "defender",
        choices: CPR.programClassList,
      }),
      blackIceType: new fields.StringField({
        initial: "antipersonnel",
        choices: CPR.blackIceType,
      }),
      prototypeActor: new fields.StringField({}),
      interface: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 0,
        min: 0,
      }),
      isRezzed: new fields.BooleanField({ initial: false }),
      damage: new fields.SchemaField({
        standard: new fields.StringField({ initial: "1d6" }),
        blackIce: new fields.StringField({ initial: "" }),
      }),
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
      rez: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 0,
        min: 0,
      }),
    });
  }
}
