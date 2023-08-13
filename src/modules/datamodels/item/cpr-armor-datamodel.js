/* globals foundry */

import LOGGER from "../../utils/cpr-logger.js";
import CPRSystemDataModel from "../abstract.js";
import CommonSchema from "./mixins/common-schema.js";
import ContainerSchema from "./mixins/container-schema.js";
import EffectsSchema from "./mixins/effects-schema.js";
import ElectronicSchema from "./mixins/electronic-schema.js";
import EquippableSchema from "./mixins/equippable-schema.js";
import PhysicalSchema from "./mixins/physical-schema.js";
import UpgradableSchema from "./mixins/upgradable-schema.js";
import ValuableSchema from "./mixins/valuable-schema.js";

export default class ArmorDataModel extends CPRSystemDataModel.mixin(
  CommonSchema,
  EffectsSchema,
  ElectronicSchema,
  EquippableSchema,
  PhysicalSchema,
  UpgradableSchema,
  ValuableSchema,
  ContainerSchema
) {
  static defineSchema() {
    LOGGER.trace("defineSchema | ArmorModel | called.");
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      isBodyLocation: new fields.BooleanField({ initial: true }),
      isHeadLocation: new fields.BooleanField({ initial: false }),
      isShield: new fields.BooleanField({ initial: false }),
      bodyLocation: new fields.SchemaField({
        sp: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 7,
          min: 0,
        }),
        ablation: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 0,
          min: 0,
        }),
      }),
      headLocation: new fields.SchemaField({
        sp: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 7,
          min: 0,
        }),
        ablation: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 0,
          min: 0,
        }),
      }),
      shieldHitPoints: new fields.SchemaField({
        value: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 10,
          min: 0,
        }),
        max: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 10,
          min: 0,
        }),
      }),
      penalty: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 0,
        min: 0,
      }),
    });
  }
}
