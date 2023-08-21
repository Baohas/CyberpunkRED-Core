/* globals foundry parseUuid */

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
          new fields.DocumentIdField({ required: true }),
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

  static migrateData(source) {
    LOGGER.trace("migrateData");
    if (source.installedItems?.list.length > 0) {
      const installed = source.installedItems.list;
      // eslint-disable-next-line no-param-reassign
      source.installedItems.list = installed.map((i) => {
        if (foundry.data.validators.isValidId(i)) {
          return i;
        }
        const parsedUuid = parseUuid(i);
        const index = parsedUuid.embedded.indexOf("Item") + 1;
        return parsedUuid.documentType === "Item"
          ? parsedUuid.documentId
          : parsedUuid.embedded[index];
      });
    }
    return super.migrateData(source);
  }
}
