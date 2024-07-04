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
    this.errors = 0; // Increment if there were errors as part of this migration.
    this.foundryMajorVersion = parseInt(game.version, 10);
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
   * Execute the migration code. This should not be overidden.
   */
  async run() {
    LOGGER.trace("run | CPRMigration");
    LOGGER.log(`Migrating to data model version ${this.version}`);

    // Migrate settings, if any, first.
    await this.migrateSettings();

    // migrate world items
    await this.migrateItems();

    // migrate world actors
    await this.migrateActors();

    // unlinked actors (tokens) on scenes
    await this.migrateScenes();

    // compendia
    await this.migrateCompendia();

    await this.postMigrate();

    await game.settings.set(game.system.id, "dataModelVersion", this.version);

    return true;
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
   * Generate an error and post a message with useful information for a failed migration.
   *
   * We have the following document types which may fail to migrate:
   *   - World Items
   *   - World Actors
   *     - Items owned by World Actors
   *   - Token Actors
   *     - Items owned by Token Actors
   *   - Pack Items
   *   - Pack Actors
   *     - Items owned by Pack Actors
   *   - Pack Token Actors (from Scene packs)
   *     - Items owned by Pack Token Actors
   *
   * @param {type} document - The document whose migration caused an error.
   * @param {Error} error - The Error object
   * @return {Error} The Error object
   */
  static generateError(document, error) {
    LOGGER.trace("generateError | CPRMigration");
    const docInfo = {
      pack: null,
      scene: null,
      token: null,
      actor: null,
      item: null,
    };

    const { documentName } = document;
    /**
     *
     */
    switch (documentName) {
      case "Actor":
        docInfo.actor = document;
        break;
      case "Item":
        docInfo.item = document;
        if (document.isEmbedded) {
          // If this is true, the actor won't generate its own error message.
          error.fromEmbeddedItem = true;
          docInfo.actor = document.actor;
        }
        break;
      default:
        break;
    }
    const { actor } = docInfo;
    if (actor?.isToken) {
      docInfo.token = actor.token;
      docInfo.scene = actor.token.parent;
    }
    if (document.pack) docInfo.pack = document.compendium.metadata;

    let dataStr = `\nFailed Document: ${document.name}\nUUID: ${document.uuid}`;
    /* eslint-disable no-continue */
    for (const [key, value] of Object.entries(docInfo)) {
      if (!value) continue;
      // Only packs have metadata, and their human-readable string is in the `metadata.label`
      // property rather than the `name` property.
      const label = value.label || value.name;
      dataStr += `\n${key.capitalize()}: ${label} (${value.id})`;
    } /* eslint-enable no-continue */

    const migrationFailString = `Migration Script: '${this.name}' failed.`;

    LOGGER.error(migrationFailString, dataStr, error);
    return error;
  }

  /**
   * Returns the progress bar for a given document.
   *
   * @param {Object} document - The document for which to retrieve the progress bar.
   * @return {Object|null} The progress bar for the document, or null if the document is not provided.
   */
  getProgressBar(document) {
    LOGGER.trace("getProgressBar | CPRMigration");
    if (!document) return null;
    const { collectionName } = document;
    const isEmbeddedItem = collectionName === "items" && document.isEmbedded;
    if (isEmbeddedItem) return null; // We do not track progress for items in actors (they are still migrated, of course).
    const { runner } = CPRMigration;
    if (document.pack) return runner.progress.packDocuments;
    if (document.isToken) return runner.progress.tokens;
    return runner.progress[collectionName];
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
   * Migrate Items
   *
   * @param {Array<CPRItem>|Items} items - array of CPRItems or the Items World Collection itself.
   */
  async migrateItems(items = CPRMigration.runner.documents.worldItems) {
    LOGGER.trace("migrateItems | CPRMigration");
    const MigrationClass = this.constructor;
    const filteredItems = CPRMigration.runner.filterDocuments(items);
    const progress = this.getProgressBar(filteredItems[0]);
    for (const item of filteredItems) {
      try {
        await this.migrateItem(item);
        if (progress) progress.advance();
      } catch (err) {
        throw MigrationClass.generateError(item, err);
      }
    }
  }

  /**
   * Does nothing and is meant to be over-ridden.
   *
   * @param {CPRItem} item
   */
  async migrateItem(item) {
    LOGGER.trace("migrateItem | CPRMigration");
  }

  /**
   * Migrate actors and their owned items.
   *
   * @param {Array<CPRActor>|Actors} actors - filtered array of CPRActors or the Actors World Collection itself.
   */
  async migrateActors(actors = CPRMigration.runner.documents.worldActors) {
    LOGGER.trace("migrateActors | CPRMigration");
    const MigrationClass = this.constructor;
    // Whether to advance the progress bar for World Actors or for Tokens.
    const progress = this.getProgressBar(actors[0]);
    for (const actor of actors) {
      try {
        await this.migrateActor(actor);
        // Migrate actor items.
        const filteredItems = CPRMigration.runner.filterDocuments(actor.items);
        await this.migrateItems(filteredItems);
        if (progress) progress.advance();
      } catch (err) {
        // If this is true, the actor won't generate its own error message also,
        // but just pass along the one generated from the failed item.
        if (err.fromEmbeddedItem) throw err;
        throw MigrationClass.generateError(actor, err);
      }
    }
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
   * Migrate scenes. We specifically focus on unlinked tokens for now.
   */
  async migrateScenes() {
    LOGGER.trace("migrateScenes | CPRMigration");
    const { runner } = CPRMigration;
    runner.progress.scenes.render(); // Initialize 'scenes' progress bar so that it is on top of all 'tokens' progress bars.
    for (const actorList of runner.documents.sceneMap.values()) {
      await this.migrateActors(actorList);
      runner.progress.scenes.advance();
    }
  }

  /**
   * Migrate compendia. This code is not meant to be run on the system-provided compendia
   * that we provide. They are updated and imported on the side. The benefit of that approach
   * to users is decreased migration times. I.e., we already migrated our compendia.
   *
   * We respect whether a compendium is locked. If it is, do not touch it. This does invite problems
   * later on if a user tries to use entries with an outdated data model. However, the discord
   * community for Foundry preferred locked things to be left alone.
   */
  async migrateCompendia() {
    LOGGER.trace("migrateCompendia | CPRMigration");
    const { runner } = CPRMigration;
    runner.progress.packs.render(); // Initialize 'scenes' progress bar so that it is on top of all 'tokens' progress bars.
    for (const [pack, docList] of runner.documents.packMap) {
      // If we are migrating locked packs we need to unlock them before migrating
      const wasLocked = pack.locked;
      await pack.configure({ locked: false });

      // Perform Foundry server-side migration of the pack data model
      await pack.migrate();

      // Iterate over compendium entries - applying fine-tuned migration functions
      switch (pack.metadata.type) {
        case "Scene":
        case "Actor": {
          await this.migrateActors(docList);
          break;
        }
        case "Item": {
          await this.migrateItems(docList);
          break;
        }
        default:
          break;
      }
      runner.progress.packs.advance();

      // Lock packs if they were locked pre-migration
      pack.configure({ locked: wasLocked });
    }
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
