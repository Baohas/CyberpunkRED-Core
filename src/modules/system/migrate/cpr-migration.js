/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-vars */
/* eslint-disable no-await-in-loop */
import Progress from "../../utils/Progress.js";
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
   * Basic constructor to establish the version and other options
   */
  constructor() {
    LOGGER.trace("constructor | CPRMigration");
    this.version = this.constructor.version; // the data model version this migration will take us to
    this.name = this.constructor.name;
    this.flush = false; // migrations will stop after this script, even if more are needed
    this.errors = 0; // Increment if there were errors as part of this migration.
    this.foundryMajorVersion = parseInt(game.version, 10);

    // Create progress bars for each type of document.
    const { totalDocuments } = this.constructor;
    const progress = {};
    for (const [docType, max] of Object.entries(totalDocuments)) {
      const label = `${CPRSystemUtils.Format(
        "CPR.migration.status.migratingDocs",
        {
          docType: CPRSystemUtils.Localize(`CPR.migration.status.${docType}`),
        }
      )}`;
      progress[docType] = new Progress({ label, max });
    }
    this.progress = progress;
  }

  // Override this!
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

  /**
   * Retrieves the total number of various documents to migrate.
   *
   * @return {Object} An object containing the count of items, actors, scenes, tokens, and pack documents.
   */
  static get totalDocuments() {
    LOGGER.trace("get totalDocuments | MigrationRunner");
    return {
      items: this.filterDocuments(game.items).length, // World Items
      actors: this.filterDocuments(game.actors).length, // World Actors
      scenes: game.scenes.size,
      tokens: game.scenes.contents.reduce((sum, scene) => {
        const tokenActors = this.filterDocuments(scene.tokens);
        return sum + tokenActors.length;
      }, 0),
      packs: game.packs.filter((pack) => pack.metadata.packageType === "world")
        .length,
    };
  }

  /**
   * Execute the migration code. This should not be overidden.
   */
  async run() {
    LOGGER.trace("run | CPRMigration");
    LOGGER.log(`Migrating to data model version ${this.version}`);

    // Migrate settings, if any, first.
    if (!(await this.migrateSettings())) {
      CPRSystemUtils.DisplayMessage(
        "error",
        CPRSystemUtils.Localize("CPR.migration.status.settingsErrors")
      );
      return false;
    }

    // migrate unowned items
    if (!(await this.migrateItems())) {
      CPRSystemUtils.DisplayMessage(
        "error",
        CPRSystemUtils.Localize("CPR.migration.status.itemErrors")
      );
      return false;
    }

    // migrate actors
    if (!(await this.migrateActors())) {
      CPRSystemUtils.DisplayMessage(
        "error",
        CPRSystemUtils.Localize("CPR.migration.status.actorErrors")
      );
      return false;
    }

    // unlinked actors (tokens)
    if (!(await this.migrateScenes())) {
      CPRSystemUtils.DisplayMessage(
        "error",
        CPRSystemUtils.Localize("CPR.migration.status.tokenErrors")
      );
      return false;
    }

    // compendia
    if (!(await this.migrateCompendia())) {
      CPRSystemUtils.DisplayMessage(
        "error",
        CPRSystemUtils.Localize("CPR.migration.status.compendiaErrors")
      );
      return false;
    }

    await this.postMigrate();

    if (this.errors !== 0) {
      throw Error("Migration errors encountered");
    }
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
   * Filters a list ofdocuments of a given class based on the specified doc types and/or mixins.
   *
   * @param {Array<Document>|WorldCollection} docList - The list of documents or World Collection to filter
   * @return {Array<CPRActor|CPRItem>} An array of filtered Actors or Items (but not both).
   */
  static filterDocuments(docList) {
    LOGGER.trace("filterDocuments | CPRMigration");
    if (!Array.isArray(docList)) docList = Array.from(docList);
    if (!docList.length) return docList;

    const docName = docList[0].documentName;
    // Filter tokens, convert them to actors, and then run this function again,
    // which will skip this block, because now an Array of Actors is being passed.
    if (docName === "Token") {
      const filteredTokens = CPRMigration.filterTokens(docList);
      const tokenActors = filteredTokens.map((token) => token.actor);
      return this.filterDocuments(tokenActors);
    }

    const { mixins, types } = this.documentTypeFilters[docName];
    if (!mixins.length && !types.length) return docList;

    const filteredDocs = docList.filter((doc) => {
      let docTypeList = [...types];
      for (const mixin of mixins) {
        docTypeList = [
          ...docTypeList,
          ...CPRSystemUtils.getDocTypesFromMixin(mixin, docName),
        ];
      }
      const docTypeSet = new Set(docTypeList); // Use Set to remove duplicates
      return docTypeSet.has(doc.type); // Filter for doc type.
    });
    return filteredDocs;
  }

  /**
   * Filters an array of tokens based on certain conditions:
   *  - The actor that the token is derived from exists.
   *  - The token is not linked.
   *
   * @param {Array<Token>} tokens - The array of tokens to filter.
   * @return {Array<Token>} An array of filtered tokens.
   */
  static filterTokens(tokens) {
    LOGGER.trace("filterTokens | CPRMigration");
    const filteredTokens = tokens.filter((token) => {
      if (!game.actors.has(token.actorId)) {
        // Degenerate case where the actor that the token is derived from was since
        // deleted. This makes token.actor null so we don't have a full view of all of the actor data.
        // This is technically a broken token and even Foundry throws errors when you do certain things
        // with this token. We skip it.
        LOGGER.warn(
          `WARNING: Token "${token.name}" (${token.actorId}) on Scene "${token.scene.name}" (${token.scene.id})` +
            ` is missing the source Actor, so we will skip migrating it. Consider replacing or deleting it.`
        );
        return false;
      }
      if (!token.actorLink) return true; // unlinked tokens, this is what we're after
      // anything else is a linked token, we assume they're already migrated
      return false;
    });
    return filteredTokens;
  }

  /**
   * Generate an error and post a message with useful information for a failed migration.
   *
   * @param {type} document - The document whose migration caused an error.
   * @param {Error} error - The Error object
   * @return {Error} The Error object
   */
  static generateError(document, error) {
    LOGGER.trace("generateError | CPRMigration");
    const docInfo = { scene: null, actor: null, item: null, token: null };

    const { documentName } = document;
    /**
     *  We have the following document types which may fail to migrate:
     *   - World Items
     *   - World Actors
     *   - Items owned by World Actors
     *   - Token Actors
     *   - Items owned by Token Actors
     */
    switch (documentName) {
      case "Actor":
        docInfo.actor = document;
        break;
      case "Item":
        docInfo.item = document;
        if (document.isEmbedded) {
          docInfo.actor = document.actor;
        }
        break;
      default:
        break;
    }
    if (docInfo.actor?.isToken) {
      docInfo.token = document.token;
      docInfo.scene = document.token.parent;
    }

    let dataStr = `\nFailed Document: ${document.name}\nUUID: ${document.uuid}`;
    /* eslint-disable no-continue */
    for (const [key, value] of Object.entries(docInfo)) {
      if (!value) continue;
      dataStr += `\n${key.capitalize()}: ${value.name} (${value.id})`;
    } /* eslint-enable no-continue */

    const migrationFailString = `Migration Script: '${this.name}' failed.`;

    LOGGER.error(migrationFailString, dataStr, error);
    return error;
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
   * Migrate unowned Items
   *
   * @param {Array<CPRItem>|Items} items - array of CPRItems or the Items World Collection itself.
   */
  async migrateItems(items = game.items) {
    LOGGER.trace("migrateItems | CPRMigration");
    let good = true;

    const MigrationClass = this.constructor;
    const filteredItems = MigrationClass.filterDocuments(items);
    const itemMigrations = [];
    for (const item of filteredItems) {
      try {
        const migrateItem = await this.migrateItem(item);
        this.progress.items.advance();
        itemMigrations.push(migrateItem);
      } catch (err) {
        throw MigrationClass.generateError(item, err);
      }
    }

    const values = await Promise.allSettled(itemMigrations);
    for (const value of values.filter((v) => v.status !== "fulfilled")) {
      LOGGER.error(`Migration (${this.name}) error: ${value.reason.message}`);
      LOGGER.error(value.reason.stack);
      good = false;
    }
    return good;
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
   * @param {Array<CPRActor>|Actors} actors - array of CPRActors or the Actors World Collection itself.
   */
  async migrateActors(actors = game.actors) {
    LOGGER.trace("migrateActors | CPRMigration");
    // actors in the "directory"
    let good = true;

    const MigrationClass = this.constructor;
    const filteredActors = MigrationClass.filterDocuments(actors);
    const actorMigrations = [];
    // Whether to advance the progress bar for World Actors or for Tokens.
    const progress = filteredActors[0]?.isToken
      ? this.progress.tokens
      : this.progress.actors;
    for (const actor of filteredActors) {
      try {
        const migrateActor = await this.migrateActor(actor);
        // Migrate actor items.
        const filteredItems = MigrationClass.filterDocuments(actor.items);
        await this.migrateItems(filteredItems);
        progress.advance();
        actorMigrations.push(migrateActor);
      } catch (err) {
        throw MigrationClass.generateError(actor, err);
      }
    }
    const values = await Promise.allSettled(actorMigrations);
    for (const value of values.filter((v) => v.status !== "fulfilled")) {
      LOGGER.error(`Migration (${this.name}) error: ${value.reason.message}`);
      LOGGER.error(value.reason.stack);
      good = false;
    }
    return good;
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
    let good = true;
    const sceneMigrations = [];
    this.progress.scenes.render(); // Initialize 'scenes' progress bar so that it is on top of all 'tokens' progress bars.
    for (const scene of game.scenes.contents) {
      const migrateScene = await this.migrateScene(scene);
      this.progress.scenes.advance();
      sceneMigrations.push(migrateScene);
    }
    const values = await Promise.allSettled(sceneMigrations);
    for (const value of values.filter((v) => v.status !== "fulfilled")) {
      LOGGER.error(`Migration (${this.name}) error: ${value.reason.message}`);
      LOGGER.error(value.reason.stack);
      good = false;
    }
    return good;
  }

  /**
   * Migrate scene
   */
  async migrateScene(scene) {
    LOGGER.trace("migrateScene | CPRMigration");
    const MigrationClass = this.constructor;
    const tokenActors = MigrationClass.filterDocuments(scene.tokens);
    const tokenMigrations = [];
    await this.migrateActors(tokenActors);
    const values = await Promise.allSettled(tokenMigrations);
    for (const value of values.filter((v) => v.status !== "fulfilled")) {
      LOGGER.error(`Migration (${this.name}) error: ${value.reason.message}`);
      LOGGER.error(value.reason.stack);
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
    let good = true;

    // Pack types we provide migrations for
    const packTypes = ["Actor", "Item", "Scene"];

    // Read setting to check which pack.sourceTypes we are migrating
    const sourceTypes = ["world"];

    // If we are migrating module compendia add it to the sourceTypes array
    if (game.settings.get(game.system.id, "migrateModuleCompendia")) {
      sourceTypes.push("module");
    }

    // During dev you might want to run migrations on our own packs rather than
    // migrate by hand, if so uncomment this and set migration of locked packs
    // to true in the game settings and run your migrations.
    // sourceTypes.push("system");

    // Check if we are migrating locked packs
    const migrateLockedPacks = game.settings.get(
      game.system.id,
      "migrateLockedCompendia"
    );

    // Get a list of packs to migrate based on the settings above
    const packsToMigrate = game.packs.filter(
      (p) =>
        packTypes.includes(p.metadata.type) &&
        sourceTypes.includes(p.metadata.packageType) &&
        (migrateLockedPacks || !p.locked)
    );

    LOGGER.debug(
      `CPRC Migration | Migrating packs: ${packsToMigrate
        .map((p) => p.metadata.id)
        .join(", ")}`
    );

    for (const pack of packsToMigrate) {
      // If we are migrating locked packs we need to unlock them before migrating
      const wasLocked = pack.locked;
      await pack.configure({ locked: false });

      // Perform Foundry server-side migration of the pack data model
      await pack.migrate();

      // Iterate over compendium entries - applying fine-tuned migration functions
      const docs = await pack.getDocuments();
      const packMigrations = docs.map(async (doc) => {
        switch (pack.metadata.type) {
          case "Actor": {
            await this.migrateActor(doc);
            break;
          }
          case "Item": {
            await this.migrateItem(doc);
            break;
          }
          case "Scene": {
            await this.migrateScene(doc);
            break;
          }
          default:
            CPRSystemUtils.DisplayMessage(
              "error",
              `Unexpected doc type in compendia: ${doc}`
            );
        }
      });

      const values = await Promise.allSettled(packMigrations);
      for (const value of values.filter((v) => v.status !== "fulfilled")) {
        LOGGER.error(`Migration (${this.name}) error: ${value.reason.message}`);
        LOGGER.error(value.reason.stack);
        good = false;
      }
      // Lock packs if they were locked pre-migration
      await pack.configure({ locked: wasLocked });
    }
    return good;
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
