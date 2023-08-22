/* globals foundry parseUuid */

import SystemUtils from "../../utils/cpr-systemUtils.js";
import LOGGER from "../../utils/cpr-logger.js";

export default class InstalledItemsSchema extends foundry.abstract.DataModel {
  /**
   *
   * @param {Array<String>} initialAllowedTypes - initial array for allowed types, different for Actors and Items.
   * @param {Boolean} includeSlots - Items include slot data and actors dont.
   * @returns {SchemaField}
   */
  static defineSchema(initialAllowedTypes, includeSlots) {
    LOGGER.trace("defineSchema | InstalledItemsSchema | called.");
    const { fields } = foundry.data;

    const baseSchema = {
      allowed: new fields.BooleanField({ initial: true }),
      allowedTypes: new fields.ArrayField(
        // Can this be blank?
        new fields.StringField({
          required: true,
          blank: true,
          choices: SystemUtils.GetTemplateItemTypes("installable"),
        }),
        { initial: initialAllowedTypes }
      ),
      list: new fields.ArrayField(
        new fields.DocumentIdField({ required: true }),
        { initial: [] }
      ),
    };
    if (includeSlots) {
      return {
        installedItems: new fields.SchemaField({
          ...baseSchema,
          ...this.slotsSchema,
        }),
      };
    }
    return { installedItems: new fields.SchemaField({ ...baseSchema }) };
  }

  static get slotsSchema() {
    LOGGER.trace("slotsSchema");
    const { fields } = foundry.data;
    return {
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
    };
  }

  static migrateData(source) {
    LOGGER.trace("migrateData");
    if (source.installedItems?.list.length > 0) {
      const installed = source.installedItems.list;
      // eslint-disable-next-line no-param-reassign
      source.installedItems.list = installed.map((i) =>
        this.migrateItemUuid(i)
      );
    }
    return super.migrateData(source);
  }

  /**
   *
   * @param {String} uuid - the uuid of an item
   * @returns {String} - the id of that item
   */
  static migrateItemUuid(uuid) {
    LOGGER.trace("migrateItemUuid");
    if (foundry.data.validators.isValidId(uuid)) {
      return uuid;
    }
    const parsedUuid = parseUuid(uuid);
    const index = parsedUuid.embedded.indexOf("Item") + 1;
    return parsedUuid.documentType === "Item"
      ? parsedUuid.documentId
      : parsedUuid.embedded[index];
  }
}
