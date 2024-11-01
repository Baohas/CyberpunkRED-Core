import CPR from "../../../system/config.js";
import CPRSystemDataModel from "../../system-data-model.js";

export default class LoadableSchema extends CPRSystemDataModel {
  static mixinName = "loadable";

  static defineSchema() {
    const { fields } = foundry.data;
    return {
      // Is this used anywhere?
      usesType: new fields.StringField({ initial: "magazine" }),
      magazine: new fields.SchemaField({
        value: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 0,
          min: 0,
        }),
        max: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 0,
          min: 0,
        }),
      }),
      ammoVariety: new fields.ArrayField(
        new fields.StringField({ choices: Object.keys(CPR.ammoVarieties) })
      ),
    };
  }

  get loadedAmmo() {
    return this.parent.getInstalledItems("ammo")[0];
  }

  get hasAmmoLoaded() {
    return this.parent.getInstalledItems("ammo").length > 0;
  }
}
