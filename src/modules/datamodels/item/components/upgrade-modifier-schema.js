import LOGGER from "../../../utils/cpr-logger.js";

export default class UpgradeModifierSchema extends foundry.abstract.DataModel {
  static defineSchema() {
    LOGGER.trace("defineSchema | UpgradeModifierSchema | called.");
    const { fields } = foundry.data;
    return {
      type: new fields.StringField({
        choices: ["modifier", "override"],
      }),
      value: new fields.NumberField({
        required: true,
        nullable: true,
        integer: true,
      }),
      isSituational: new fields.BooleanField({ required: false }),
      onByDefault: new fields.BooleanField({ required: false }),
    };
  }
}
