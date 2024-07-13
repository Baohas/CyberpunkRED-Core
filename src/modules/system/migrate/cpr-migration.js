/* eslint-disable class-methods-use-this, no-unused-vars */
import LOGGER from "../../utils/cpr-logger.js";
import CPRSystemUtils from "../../utils/cpr-systemUtils.js";

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
    this.allowedDocTypes = this.constructor.getAllowedDocTypes();
    this.flush = false; // migrations will stop after this script, even if more are needed
  }

  // The data model version this migration will take us to. Override this!
  static version = null;

  // Override this!
  static name = "Base Migration Class";

  /**
   * Override this!
   *
   * Filter documents based on the specified types and/or mixins.
   * IMPORTANT: Subclasses should override this!
   *
   * For example, if you were to only migrate "skill" item types, "attackable"
   * item mixins, and "container" actor mixins, it would look like:
   * ```js
   *   static documentFilters = {
   *     Item: { types: ["skill"], mixins: ["attackable"] },
   *     Actor: { types: [], mixins: ["container"] },
   *   };
   * ```
   *
   * To migrate all types/mixins, do not override.
   */
  static documentFilters = {
    Item: { types: [], mixins: [] },
    Actor: { types: [], mixins: [] },
  };

  /**
   * Retrieve the allowed document types based on the specified types and mixins, for this
   * specific migration.
   *
   * @return {Object} Returns an object containing Sets of document types that are allowed.
   */
  static getAllowedDocTypes() {
    LOGGER.trace("getAllowedDocTypes | CPRMigration");
    const docTypes = {};
    /* eslint-disable no-continue */
    for (const [docName, filters] of Object.entries(this.documentFilters)) {
      const { mixins, types } = filters;
      if (!types.length && !mixins.length) {
        docTypes[docName] = new Set();
        continue;
      }
      let docTypeSet = new Set(types);
      for (const mixin of mixins) {
        const mixinTypes = new Set(
          CPRSystemUtils.getDocTypesFromMixin(mixin, docName)
        );
        docTypeSet = docTypeSet.union(mixinTypes);
      }
      docTypes[docName] = docTypeSet;
    } /* eslint-enable no-continue */
    return docTypes;
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
}
