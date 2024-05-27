import CPR from "../../system/config.js";
import LOGGER from "../../utils/cpr-logger.js";
import CPRSystemDataModel from "../abstract.js";
import CommonSchema from "./mixins/common-schema.js";
import InstallableSchema from "./mixins/installable-schema.js";
import PhysicalSchema from "./mixins/physical-schema.js";
import StackableSchema from "./mixins/stackable-schema.js";
import ValuableSchema from "./mixins/valuable-schema.js";

export default class AmmoDataModel extends CPRSystemDataModel.mixin(
  CommonSchema,
  InstallableSchema,
  PhysicalSchema,
  StackableSchema,
  ValuableSchema
) {
  static defineSchema() {
    LOGGER.trace("defineSchema | AmmoDataModel | called.");
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema({ initialSize: 0 }), {
      ablationValue: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 1,
        min: 0,
      }),
      overrides: new fields.SchemaField({
        autofire: new fields.SchemaField({
          minimum: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 3,
            min: 0,
          }),
          mode: new fields.StringField({
            blank: false,
            initial: "none",
            choices: Object.keys(CPR.ammoAutofireOverrideModes),
          }),
          value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: -1,
          }),
        }),
        damage: new fields.SchemaField({
          minimum: new fields.StringField({
            initial: "1d6",
          }),
          mode: new fields.StringField({
            blank: false,
            initial: "none",
            choices: Object.keys(CPR.ammoDamageOverrideModes),
          }),
          value: new fields.StringField({
            initial: "3d6",
          }),
        }),
      }),
      type: new fields.StringField({
        blank: false,
        initial: "basic",
        choices: Object.keys(CPR.ammoType),
      }),
      variety: new fields.StringField({
        blank: false,
        initial: "heavyPistol",
        choices: Object.keys(CPR.ammoVariety),
      }),
    });
  }
}
