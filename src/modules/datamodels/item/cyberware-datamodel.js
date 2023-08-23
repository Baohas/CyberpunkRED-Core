/* globals foundry */

import LOGGER from "../../utils/cpr-logger.js";
import CPR from "../../system/config.js";
import CPRSystemDataModel from "../abstract.js";
import AttackableSchema from "./mixins/attackable-schema.js";
import CommonSchema from "./mixins/common-schema.js";
import ContainerSchema from "../shared/container-schema.js";
import EffectsSchema from "./mixins/effects-schema.js";
import ElectronicSchema from "./mixins/electronic-schema.js";
import InstallableSchema from "./mixins/installable-schema.js";
import LoadableSchema from "./mixins/loadable-schema.js";
import PhysicalSchema from "./mixins/physical-schema.js";
import UpgradableSchema from "./mixins/upgradable-schema.js";
import ValuableSchema from "./mixins/valuable-schema.js";

export default class CyberwareDataModel extends CPRSystemDataModel.mixin(
  AttackableSchema,
  CommonSchema,
  ContainerSchema,
  EffectsSchema,
  ElectronicSchema,
  InstallableSchema,
  LoadableSchema,
  PhysicalSchema,
  UpgradableSchema,
  ValuableSchema
) {
  static defineSchema() {
    LOGGER.trace("defineSchema | CyberwareModel | called.");
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      type: new fields.StringField({
        initial: "cyberArm",
        choices: Object.keys(CPR.cyberwareTypeList),
      }),
      isWeapon: new fields.BooleanField({ initial: false }),
      isFoundational: new fields.BooleanField({ initial: true }),
      core: new fields.BooleanField({ initial: false }),
      humanityLoss: new fields.SchemaField({
        static: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 3,
          min: 0,
        }),
        roll: new fields.StringField({ initial: "1d6" }),
      }),
    });
  }
}
