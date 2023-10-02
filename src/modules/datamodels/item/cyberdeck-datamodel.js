/* globals foundry */

import LOGGER from "../../utils/cpr-logger.js";
import CPRSystemDataModel from "../abstract.js";
import CommonSchema from "./mixins/common-schema.js";
import ContainerSchema from "./mixins/container-schema.js";
import ElectronicSchema from "./mixins/electronic-schema.js";
import EquippableSchema from "./mixins/equippable-schema.js";
import InstallableSchema from "./mixins/installable-schema.js";
import PhysicalSchema from "./mixins/physical-schema.js";
import QualitySchema from "./mixins/quality-schema.js";
import UpgradableSchema from "./mixins/upgradable-schema.js";
import ValuableSchema from "./mixins/valuable-schema.js";

export default class CyberdeckDataModel extends CPRSystemDataModel.mixin(
  CommonSchema,
  ContainerSchema,
  ElectronicSchema,
  EquippableSchema,
  InstallableSchema,
  PhysicalSchema,
  QualitySchema,
  UpgradableSchema,
  ValuableSchema
) {
  static defineSchema() {
    LOGGER.trace("defineSchema | CyberdeckDataModel | called.");
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      programs: new fields.SchemaField({
        // These two need fleshing out.
        installed: new fields.ArrayField(new fields.ObjectField()),
        rezzed: new fields.ArrayField(new fields.ObjectField()),
      }),
    });
  }
}
