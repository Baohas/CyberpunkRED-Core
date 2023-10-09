/* globals foundry */

import CPR from "../../../system/config.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class InstallableSchema extends foundry.abstract.DataModel {
  static defineSchema() {
    LOGGER.trace("defineSchema | InstallableSchema | called.");
    const { fields } = foundry.data;
    return {
      installLocation: new fields.StringField({
        initial: "mall",
        choices: Object.keys(CPR.cyberwareInstallList),
      }),
      installedIn: new fields.StringField({
        blank: true,
      }),
      isInstalled: new fields.BooleanField({ initial: false }),
      size: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 1,
        min: 0,
      }),
    };
  }
}
