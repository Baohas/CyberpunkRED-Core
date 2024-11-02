/* eslint-disable no-param-reassign */

import BaseMigrationScript from "../base-migration-script.js";
import LOGGER from "../../../utils/cpr-logger.js";

/**
 * Turn Item UUIDs into IDs for Container Items
 */
export default class InstallListUUIDsToIDs extends BaseMigrationScript {
  static version = 33;

  static name = "Install List - UUIDs to IDs";

  static documentFilters = {
    Item: { types: [], mixins: ["container"] },
    Actor: { types: [], mixins: ["container"] },
  };

  async updateItem(doc) {
    LOGGER.trace("updateItem | UUIDs to IDs");
    this.constructor.migrateUuids(doc);
  }

  async updateActor(doc) {
    LOGGER.trace("updateActor | UUIDs to IDs");
    this.constructor.migrateUuids(doc);
  }

  /**
   * Turn Item UUIDs into IDs
   *
   * @param {object} doc - the uuid of an item
   * @returns {void} - just mutates the document
   */
  static migrateUuids(doc) {
    LOGGER.trace("migrateUuids | UUIDs to IDs");
    const { installedItems } = doc.system;
    if (installedItems.list.length > 0) {
      const installed = installedItems.list;
      installedItems.list = installed.map((uuid) => {
        // Early return uuid is already an ID.
        if (foundry.data.validators.isValidId(uuid)) {
          return uuid;
        }

        // Parse UUID and find the index of the id which represents the Item.
        const parsedUuid = foundry.utils.parseUuid(uuid);
        const index = parsedUuid.embedded.indexOf("Item") + 1;

        // If the parsed uuid document type is not Item, return the embedded id at above index.
        return parsedUuid.documentType === "Item"
          ? parsedUuid.documentId
          : parsedUuid.embedded[index];
      });
    }
  }
}
