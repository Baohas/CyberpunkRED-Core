/* globals foundry parseUuid */

import SystemUtils from "../../utils/cpr-systemUtils.js";
import LOGGER from "../../utils/cpr-logger.js";

/**
 * Container Schema are shared between
 */
export default class ContainerSchema extends foundry.abstract.DataModel {
  /**
   * NOTE: This schema mixin refers to `document.system.installedItems`. It has nothing to do with the
   * Container Actor type. In fact, Container Actors do not mix in this schema into their data model at all, because
   * Container actors never actually have items installed in them directly.
   *
   * This ContainerSchema mixin is shared by both items and actors, but there are slight differences for each.
   * First, actors do not have the `installedItems.slots` or `installedItems.usedSlots` property.
   * Second, the default for actor `installedItems.allowedTypes` is `["cyberware"]` and for items its `["itemUpgrade"]`.
   *
   * `ContainerSchema.defineSchema()` defaults as though an item is calling it / mixing it in, since that is more common in the code.
   * If an actor needs to mix it in, one must pass an options object: `{initialAllowedTypes: ["cyberware"], includeSlots: false}`.
   * See `mook-datamodel.js` or `character-datamodel.js` to see how this is done.
   *
   * @param {Object} - options for configuring the schema. Can be overridden in the class that calls this as a mixin.
   *   @prop {Array<String>} options.initialAllowedTypes - initial array for allowed types, different for Actors and Items.
   *   @prop {Boolean} options.includeSlots - Items include slot data and actors dont. Set true by default since there are more
   *   @prop {Boolean} options.initialSlots - How many slots this item should start with.
   *      items than actors that mixin the Container Schema.
   * @returns {SchemaField}
   */
  static defineSchema(
    options = {
      initialAllowedTypes: ["itemUpgrade"],
      includeSlots: true,
      initialSlots: 3,
    }
  ) {
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
        { initial: options.initialAllowedTypes }
      ),
      list: new fields.ArrayField(
        new fields.DocumentIdField({ required: true }),
        { initial: [] }
      ),
    };
    const slotsSchema = {
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
        initial: options.initialSlots,
        min: 0,
      }),
    };

    if (options.includeSlots) {
      return {
        installedItems: new fields.SchemaField({
          ...baseSchema,
          ...slotsSchema,
        }),
      };
    }
    return { installedItems: new fields.SchemaField({ ...baseSchema }) };
  }

  /**
   * Migrates data on the fly. From Foundry
   *
   * @override
   * @param {CPRSystemDataModel} source - source actor or item `document.system`
   * @returns
   */
  static migrateData(source) {
    LOGGER.trace("migrateData");
    // Turn this list of UUIDs into a list of IDs.
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
   * Turn Item UUIDs into IDs
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
