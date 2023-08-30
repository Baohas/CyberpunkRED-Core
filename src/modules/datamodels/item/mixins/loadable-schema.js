/* globals foundry */

import CPR from "../../../system/config.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class LoadableSchema extends foundry.abstract.DataModel {
  static defineSchema() {
    LOGGER.trace("defineSchema | LoadableSchema | called.");
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
        new fields.StringField({ choices: Object.keys(CPR.ammoVariety) })
      ),
    };
  }

  get loadedAmmo() {
    LOGGER.trace("loadedAmmo | LoadableSchema | called.");
    return this.parent.getInstalledItems("ammo")[0];
  }

  get hasAmmoLoaded() {
    LOGGER.trace("hasAmmoLoaded | LoadableSchema | called.");
    return this.parent.getInstalledItems("ammo").length > 0;
  }
}
