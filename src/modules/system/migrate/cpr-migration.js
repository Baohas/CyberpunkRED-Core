/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-vars */
/* eslint-disable no-await-in-loop */
import LOGGER from "../../utils/cpr-logger.js";

/**
 * This is the base class for migration scripts. All migrations should extend this class and
 * implement the methods needed, which depends on what changed in the data model (actors, items, etc).
 * Put your migration in the scripts directory and add it to index.js so it is included.
 *
 * @abstract
 */
export default class CPRMigration {
  /**
   * Basic constructor to establish the version and other options.
   */
  constructor() {
    LOGGER.trace("constructor | CPRMigration");
    this.version = this.constructor.version; // Derived from the static property below.
    this.name = this.constructor.name; // Derived from the static property below.
    this.flush = false; // migrations will stop after this script, even if more are needed
  }

  // The data model version this migration will take us to. Override this!
  static version = null;

  // Override this!
  static name = "Base Migration Class";

  /**
   * Filter documents based on the specified types and/or mixins.
   * IMPORTANT: Subclasses should override this
   *
   * For example, if you were to only migrate "skill" item types, "attackable"
   * item mixins, and "container" actor mixins, it would look like:
   * ```js
   *   static documentTypeFilters = {
   *     Item: { types: ["skill"], mixins: ["attackable"] },
   *     Actor: { types: [], mixins: ["container"] },
   *   };
   * ```
   *
   * To migrate all types/mixins, do not override.
   */
  static documentTypeFilters = {
    Item: { types: [], mixins: [] },
    Actor: { types: [], mixins: [] },
  };

  static get runner() {
    LOGGER.trace("get runner | CPRMigration");
    return game.cpr.MigrationRunner || null;
  }

  /**
   * Return a data object that can be merged to delete a document property. This method
   * safely checks if the property exists before passing back the Foundry-specific directive to
   * delete a property. Attempting to delete keys in normal JS ways produces errors when calling
   * Doc.update().
   *
   * Example deletion key that will delete "data.whatever.property":
   *    { "data.whatever.-=property": null }
   *
   * @param {Document} doc - document (item or actor) that we intend to delete properties on
   * @param {String} prop - dot-notation of the property, "data.roleInfo.role" for example
   * @returns {Object}
   */
  static safeDelete(doc, prop) {
    LOGGER.trace("safeDelete | CPRMigration");
    let key = prop;

    if (foundry.utils.hasProperty(doc, key)) {
      key = prop.match(/.\../)
        ? prop.replace(/.([^.]*)$/, ".-=$1")
        : `-=${prop}`;
      return { [key]: null };
    }
    return {};
  }

  /**
   * Takes in an array of object changes (updateList) and a requested object change (itemUpdateData)
   * and if the object is in the array, it will merge the changes to that object in the array, otherwise
   * it appends to the array.
   * Returns an updated array.
   * @param {Array} updateList - Array of objects to be passed to actor.*EmbeddedDocuments()
   * @param {Object} itemUpdateData  - Object with at least _id: set and changes for the object
   * @returns {Array} - Updated updateList including itemUpdateData
   */
  static addToUpdateList(updateList, itemUpdateData) {
    LOGGER.trace("addToUpdateList | CPRMigration");
    let newList = foundry.utils.duplicate(updateList);
    const inList = updateList.filter((i) => i._id === itemUpdateData._id);
    if (inList.length > 0) {
      const updatedData = foundry.utils.mergeObject(itemUpdateData, inList[0]);
      newList = newList.filter((i) => i._id !== itemUpdateData._id);
      newList.push(updatedData);
    } else {
      newList.push(itemUpdateData);
    }
    return newList;
  }

  /**
   * Actions to be performed before data is migrated.
   * Meant to be over-ridden (and the super called), but not required.
   */
  async preMigrate() {
    LOGGER.trace("preMigrate | CPRMigration");
    LOGGER.log("Migrations starting");
  }

  /**
   * Actions to be performed after data is migrated.
   * Meant to be over-ridden (and the super called), but not required.
   */
  async postMigrate() {
    LOGGER.trace("postMigrate | CPRMigration");
    LOGGER.log("Migrations finished.");
  }

  /**
   * Does nothing and is meant to be over-ridden.
   *
   */
  async migrateSettings() {
    LOGGER.trace("migrateSettings | CPRMigration");
    // Return true so that if a migration script doesn't override this function, nothing fails.
    return true;
  }

  /**
   * Does nothing and is meant to be over-ridden.
   *
   * @param {Object} itemData - Source data for the item. From item.toObject().
   * @param {Object} actorData - Source data for the item's parent actor, if any. From actor.toObject().
   */
  async migrateItem(itemData, actorData) {
    LOGGER.trace("migrateItem | CPRMigration");
  }

  /**
   * Does nothing and is meant to be over-ridden.
   *
   * @param {CPRActor} actor
   */
  async migrateActor(actor) {
    LOGGER.trace("migrateActor | CPRMigration");
  }

  /**
   * Utility function which simulates a long process by delaying the resolution of a Promise.
   * Used for testing, so probably should not have any commits which call this.
   *
   * @param {number} [time=10] - The time in milliseconds to delay the resolution.
   * @return {Promise} A Promise that resolves after the specified time.
   */
  static simulateLongProcess(time = 10) {
    LOGGER.trace("simulateLongProcess | CPRMigration");
    return new Promise((resolve) => {
      setTimeout(resolve, time);
    });
  }

  /**
   * This block of abstract methods breaks down how each document type is migrated. If there
   * are any steps that need to be taken before migrating, put them in preMigrate. Likewise
   * any clean up or changes after go in postMigrate. Note that uncommenting these will cause
   * the linter to traceback for some ridiculous reason.
   *
   * They all assume data model changes are sent to the server (they're mutators).
   *
   * async preMigrate() {}
   * async migrateActor(actor) {}
   * static async migrateItem(item) {}
   * static async migrateMacro(macro) {}
   * static async migrateToken(token) {}
   * static async migrateTable(table) {}
   * async postMigrate() {}
   */
}
