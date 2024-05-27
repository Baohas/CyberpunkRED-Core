import CPR from "../../../system/config.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class LoadableSchema extends foundry.abstract.DataModel {
  static mixinName = "loadable";

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

  /**
   * Migrates data on the fly. From Foundry.
   *
   * Give every weapon item "ammo" as an installable type.
   *
   * @override
   * @param {CPRSystemDataModel} source - source actor or item `document.system`
   * @returns {CPRSystemDataModel} - migrated data
   */
  static migrateData(source) {
    LOGGER.trace("migrateData | LoadableSchema | called.");
    if (!source.installedItems.allowedTypes.includes("ammo")) {
      source.installedItems.allowedTypes.push("ammo");
    }
    return super.migrateData(source);
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
