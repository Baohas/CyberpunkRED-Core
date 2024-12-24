import CPR from "../../../system/config.js";

export default class EquippableSchema extends foundry.abstract.DataModel {
  static mixinName = "equippable";

  static defineSchema() {
    const { fields } = foundry.data;
    return {
      equipped: new fields.StringField({
        initial: "owned",
        choices: Object.keys(CPR.equipped),
      }),
    };
  }
}
