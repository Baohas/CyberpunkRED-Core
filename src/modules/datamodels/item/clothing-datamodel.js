import LOGGER from "../../utils/cpr-logger.js";
import CPR from "../../system/config.js";
import CPRSystemDataModel from "../abstract.js";
import CommonSchema from "./mixins/common-schema.js";
import ContainerSchema from "../shared/container-schema.js";
import EffectsSchema from "./mixins/effects-schema.js";
import ElectronicSchema from "./mixins/electronic-schema.js";
import EquippableSchema from "./mixins/equippable-schema.js";
import PhysicalSchema from "./mixins/physical-schema.js";
import StackableSchema from "./mixins/stackable-schema.js";
import UpgradableSchema from "./mixins/upgradable-schema.js";
import ValuableSchema from "./mixins/valuable-schema.js";

export default class ClothingDataModel extends CPRSystemDataModel.mixin(
  CommonSchema,
  ContainerSchema,
  EffectsSchema,
  ElectronicSchema,
  EquippableSchema,
  PhysicalSchema,
  StackableSchema,
  UpgradableSchema,
  ValuableSchema
) {
  static defineSchema() {
    LOGGER.trace("defineSchema | ClothingDataModel | called.");
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      type: new fields.StringField({
        initial: "jacket",
        choices: Object.keys(CPR.clothingType),
      }),
      style: new fields.StringField({
        initial: "genericChic",
        choices: Object.keys(CPR.clothingStyle),
      }),
    });
  }
}
