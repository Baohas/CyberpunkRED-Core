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
   * Basic constructor to establish the version and other options.
   * NOTE: This class should be instantiated via the static `initialize()`
   *       method, rather than invoking the constructor directly.
   */
  constructor() {
    LOGGER.trace("constructor | CPRMigration");
    this.version = this.constructor.version; // Derived from the static property below.
    this.name = this.constructor.name; // Derived from the static property below.
    this.flush = false; // migrations will stop after this script, even if more are needed
    this.errors = 0; // Increment if there were errors as part of this migration.
    this.foundryMajorVersion = parseInt(game.version, 10);

    // The next two properties are set in static `initialize()`.
    this.documents = null;
    this.progress = null;
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

  /**
   * Initialize the CPRMigration instance. We use this function instead
   * of invoking the constructor (`new CPRMigration()`), because we need
   * to attach some additional properties that rely on an async operation
   * (which, we cannot use in the constructor).
   *
   * @return {CPRMigration} The initialized CPRMigration object.
   */
  static async initialize() {
    LOGGER.trace("initialize | CPRMigration");
    const Migration = new this();
    Migration.documents = await this.prepareDocumentsForMigration();
    Migration.progress = Migration.prepareProgressBars();

    return Migration;
  }

  /**
   * Filters and organizes the various documents for migration:
   *   - World Items
   *   - World Actors
   *   - Scenes
   *     - Token Actors
   *   - Packs
   *     - Pack Documents (Items, Actors, and Token Actors in Scenes)
   *
   * @return {Promise<Object>} An object containing the world items, world actors, scene Map, and pack Map.
   */
  static async prepareDocumentsForMigration() {
    LOGGER.trace("prepareDocumentsForMigration | CPRMigration");
    // Prepare world items and actors.
    const worldItems = this.filterDocuments(game.items);
    const worldActors = this.filterDocuments(game.actors);

    /**
     * Build a Map of scenes to their Token Actors.
     * @type {Map<Scene, CPRActor[]>}
     */
    const sceneMap = new Map();
    for (const scene of game.scenes) {
      /* eslint-disable no-continue */
      const filteredTokens = this.filterDocuments(scene.tokens);
      if (filteredTokens.length === 0) continue;
      sceneMap.set(scene, filteredTokens);
    }

    /**
     * Build a Map of CompendiumCollections to their Pack Documents (Items or Token Actors).
     * @type {Map<CompendiumCollection, CPRItem|CPRActor[]>}
     */
    const packMap = new Map();
    for (const pack of this.filterCompendia(game.packs)) {
      const { metadata } = pack;
      let filteredDocuments;
      // If the pack is of type "Scene", filter the tokens in the scene.
      if (metadata.type === "Scene") {
        const sceneDocs = await pack.getDocuments();
        let tokenList = [];
        sceneDocs.forEach((scene) => {
          tokenList = [...tokenList, ...scene.tokens];
        });
        filteredDocuments = this.filterDocuments(tokenList);
      } else {
        // Else, filter the Actor/Item documents in the pack.
        const index = Array.from(pack.index);
        // `filterDocuments()` looks at the first entry in the array for the property: `documentName`.
        // Typically it's passed an array/map of Documents, in which each entry has this prop by default.
        // However, in this case, we are passing it an index (array) of limited document data, in which
        // no entries have that property, so we assign it manually to the first entry in the array.
        index[0].documentName = metadata.type;
        const filteredIds = this.filterDocuments(index).map(
          (docData) => docData._id
        );
        filteredDocuments = await pack.getDocuments({ _id__in: filteredIds });
      }
      if (filteredDocuments.length === 0) continue;
      packMap.set(pack, filteredDocuments);
    } /* eslint-enable no-continue */
    return { worldItems, worldActors, sceneMap, packMap };
  }

  /**
   * Retrieves/organizes the total number of various documents to migrate.
   *
   * @return {Object} An object containing the count of items, actors, scenes, tokens, packs, and pack documents.
   */
  get totalDocs() {
    LOGGER.trace("get totalDocs | CPRMigration");
    if (!this.documents) return null;
    const { documents } = this;
    const totals = {
      items: documents.worldItems.length,
      actors: documents.worldActors.length,
      scenes: documents.sceneMap.size,
      tokens: null,
      packs: documents.packMap.size,
      packDocuments: null,
    };

    let tokens = 0;
    for (const actorList of documents.sceneMap.values()) {
      tokens += actorList.length;
    }

    let packDocuments = 0;
    for (const docList of documents.packMap.values()) {
      packDocuments += docList.length;
    }

    totals.tokens = tokens;
    totals.packDocuments = packDocuments;

    return totals;
  }

  /**
   * Prepares progress bars for each document type based on the total number of documents.
   *
   * @return {Object} - An object containing progress bars for each document type.
   *                  - The keys are document types and values are Progress objects.
   */
  prepareProgressBars() {
    LOGGER.trace("prepareProgressBars | CPRMigration");
    const { totalDocs } = this;

    const progressBars = {};
    for (const [docType, max] of Object.entries(totalDocs)) {
      const label = `${CPRSystemUtils.Format(
        "CPR.migration.status.migratingDocs",
        {
          docType: CPRSystemUtils.Localize(`CPR.migration.docType.${docType}`),
        }
      )}`;
      progressBars[docType] = new Progress({ label, max });
    }
    return progressBars;
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
          `WARNING: Token "${token.name}" (${token.actorId}) on Scene "${token.parent.name}" (${token.parent.id})` +
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
   * Filters the compendia based on the pack types, source types, and locked status.
   *
   * @param {Array<CompendiumCollection>|CompendiumPacks} compendia - The array/map of compendia to filter.
   * @return {Array} The filtered array of compendia.
   */
  static filterCompendia(compendia) {
    LOGGER.trace("filterCompendia | CPRMigration");
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
    const packsToMigrate = compendia.filter(
      (p) =>
        packTypes.includes(p.metadata.type) &&
        sourceTypes.includes(p.metadata.packageType) &&
        (migrateLockedPacks || !p.locked)
    );

    return packsToMigrate;
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
    if (document.pack) return this.progress.packDocuments;
    if (document.isToken) return this.progress.tokens;
    return this.progress[collectionName];
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
  async migrateItems(items = this.documents.worldItems) {
    LOGGER.trace("migrateItems | CPRMigration");
    const MigrationClass = this.constructor;
    const filteredItems = MigrationClass.filterDocuments(items);
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
  async migrateActors(actors = this.documents.worldActors) {
    LOGGER.trace("migrateActors | CPRMigration");
    const MigrationClass = this.constructor;
    // Whether to advance the progress bar for World Actors or for Tokens.
    const progress = this.getProgressBar(actors[0]);
    for (const actor of actors) {
      try {
        await this.migrateActor(actor);
        // Migrate actor items.
        const filteredItems = MigrationClass.filterDocuments(actor.items);
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
    this.progress.scenes.render(); // Initialize 'scenes' progress bar so that it is on top of all 'tokens' progress bars.
    for (const actorList of this.documents.sceneMap.values()) {
      await this.migrateActors(actorList);
      this.progress.scenes.advance();
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

    this.progress.packs.render(); // Initialize 'scenes' progress bar so that it is on top of all 'tokens' progress bars.
    for (const [pack, docList] of this.documents.packMap) {
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
      this.progress.packs.advance();

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
