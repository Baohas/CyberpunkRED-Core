/* globals foundry */

import SystemUtils from "../../../utils/cpr-systemUtils.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class ContainerSchema extends foundry.abstract.DataModel {
  static defineSchema() {
    LOGGER.trace("defineSchema | ContainerSchema | called.");
    const { fields } = foundry.data;
    return {
      installedItems: new fields.SchemaField({
        allowed: new fields.BooleanField({ initial: true }),
        allowedTypes: new fields.ArrayField(
          // Can this be blank?
          new fields.StringField({
            required: true,
            blank: true,
            choices: SystemUtils.GetTemplateItemTypes("installable"),
          }),
          { initial: ["itemUpgrade"] }
        ),
        list: new fields.ArrayField(
          new fields.StringField({ required: true, blank: true }),
          { initial: [] }
        ),
        usedSlots: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 0,
          min: 0,
        }),
        slots: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 3,
          min: 0,
        }),
      }),
    };
  }
}
