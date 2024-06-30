/* eslint-disable no-await-in-loop */

import * as Migrations from "./scripts/index.js";
import LOGGER from "../../utils/cpr-logger.js";
import CPRSystemUtils from "../../utils/cpr-systemUtils.js";
import MigrationApp from "./migration-app.js";
import Progress from "../../utils/Progress.js";

/**
 * This class provides a method to find and execute all migrations that are needed
 * to get the data to the latest data model.
 */
export default class MigrationRunner {
  /**
   * Set up some basic data on the migration runner.
   *
   * @param {Number} currDataModelVersion - the current data model version
   * @param {Number} newDataModelVersion - the data model version we want to get to, may be multiple versions ahead
   */
  constructor(currDataModelVersion, newDataModelVersion) {
    LOGGER.trace("constructor | MigrationRunner");
    this.currentDataModelVersion = currDataModelVersion;
    this.newDataModelVersion = newDataModelVersion;

    this.#migrationClasses = this.filterMigrationClasses();
    this.totalMigrations = this.migrationClasses.length;

    // The following properties are set in `migrateWorld()`or `runMigrations()`.
    // They are not necessary to compute unless migrations are needed.
    this.migrationInstances = null;
    this.documentFilters = null;
    this.documents = null;
    this.progress = null;

    // This is also set in `migrateWorld()`, if migrations completed successfully.
    this.migrationSuccessful = null;
  }

  /** @type {Array<typeof CPRMigration>} */
  #migrationClasses;

  get migrationClasses() {
    LOGGER.trace("get migrationClasses | MigrationRunner");
    return this.#migrationClasses;
  }

  /**
   * Get the migration app, if it exists.
   * @returns {MigrationApp|null}
   */
  static get app() {
    LOGGER.trace("get app | MigrationRunner");
    const app = foundry.applications.instances.get("cpr-migration");
    return app || null;
  }

  /**
   * Check if there are any migrations that need to be run.
   *
   * @return {boolean}
   */
  get needsMigration() {
    LOGGER.trace("get needsMigration | MigrationRunner");
    return this.totalMigrations > 0;
  }

  /**
   * Retrieves/organizes the total number of various documents to migrate.
   *
   * @return {Object} An object containing the count of items, actors, scenes, tokens, packs, and pack documents.
   */
  get totalDocs() {
    LOGGER.trace("get totalDocs | MigrationRunner");
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
   * Knowing the data model versions, figure out which migration scripts (as objects) to run.
   *
   * @return {Array<typeof CPRMigration>} - an ordered list of CPRMigration subclasses.
   */
  filterMigrationClasses() {
    LOGGER.trace("filterMigrationClasses | MigrationRunner");
    const { currentDataModelVersion, newDataModelVersion } = this;
    const migrationClasses = Object.values(Migrations)
      .filter((Migration) => {
        const { version } = Migration;
        return (
          version > currentDataModelVersion && version <= newDataModelVersion
        );
      })
      .sort((a, b) => (a.version > b.version ? 1 : -1));
    return migrationClasses;
  }

  /**
   * Retrieves the document filters for a given document name.
   *
   * @param {string} docName - The name of the document, either "Item" or "Actor".
   * @return {Set} The set of document filters.
   */
  getDocumentTypes(docName) {
    LOGGER.trace("getDocumentTypes | MigrationRunner");
    let filters = new Set();
    for (const Migration of this.migrationClasses) {
      const { mixins, types } = Migration.documentTypeFilters[docName];
      if (!types.length && !mixins.length) return filters;

      let docTypeSet = new Set(types);
      for (const mixin of mixins) {
        const mixinTypes = new Set(
          CPRSystemUtils.getDocTypesFromMixin(mixin, docName)
        );
        docTypeSet = docTypeSet.union(mixinTypes);
      }
      filters = filters.union(docTypeSet);
    }
    return filters;
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
  async prepareDocumentsForMigration() {
    LOGGER.trace("prepareDocumentsForMigration | MigrationRunner");
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
    for (const pack of MigrationRunner.filterCompendia(game.packs)) {
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
   * Filters a list of documents of a given class based on the specified doc types and/or mixins.
   *
   * @param {Array<Document>|WorldCollection} docList - The list of documents or World Collection to filter
   * @return {Array<CPRActor|CPRItem>} An array of filtered Actors or Items (but not both).
   */
  filterDocuments(docList) {
    LOGGER.trace("filterDocuments | MigrationRunner");
    if (!Array.isArray(docList)) docList = Array.from(docList);
    if (!docList.length) return docList;

    const docName = docList[0].documentName;
    // Filter tokens, convert them to actors, and then run this function again,
    // which will skip this block, because now an Array of Actors is being passed.
    if (docName === "Token") {
      const filteredTokens = MigrationRunner.filterTokens(docList);
      const tokenActors = filteredTokens.map((token) => token.actor);
      return this.filterDocuments(tokenActors);
    }

    const documentTypes = this.documentFilters[docName];
    if (!documentTypes.size) return docList;

    const filteredDocs = docList.filter((doc) => {
      return documentTypes.has(doc.type); // Filter for doc type.
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
    LOGGER.trace("filterTokens | MigrationRunner");
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
    LOGGER.trace("filterCompendia | MigrationRunner");
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
   * Prepares progress bars for each document type based on the total number of documents.
   *
   * @return {Object} - An object containing progress bars for each document type.
   *                  - The keys are document types and values are Progress objects.
   */
  prepareProgressBars() {
    LOGGER.trace("prepareProgressBars | MigrationRunner");
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
   * This is the top level entry point for executing migrations. This code assumes the user is a GM. It will
   * figure out what migrations to run, and dispatch them for execution.
   *
   * @param {Number} currentDataModelVersion - the current data model version
   * @param {Number} newDataModelVersion - the data model version we want to get to, may be multiple versions ahead
   * @returns {Boolean} - True if all migrations completed successfully or no migrations are needed
   */
  async migrateWorld() {
    LOGGER.trace("migrateWorld | MigrationRunner");

    const { currentDataModelVersion, newDataModelVersion } = this;

    // Open migration application before anything else.
    const migrationApp = new MigrationApp({ migrationRunner: this });
    await migrationApp.render({ force: true });

    this.documentFilters = {
      Item: this.getDocumentTypes("Item"),
      Actor: this.getDocumentTypes("Actor"),
    };
    this.documents = await this.prepareDocumentsForMigration();
    this.progress = this.prepareProgressBars();

    CPRSystemUtils.DisplayMessage(
      "notify",
      `Beginning Migrations of Cyberpunk Red Core from Data Model ${currentDataModelVersion} to ${newDataModelVersion}.`
    );
    CPRSystemUtils.DisplayMessage(
      "warn",
      CPRSystemUtils.Localize("CPR.migration.status.waitForEnd")
    );
    this.migrationSuccessful = await this.runMigrations();

    if (this.migrationSuccessful) {
      CPRSystemUtils.DisplayMessage(
        "notify",
        CPRSystemUtils.Localize("CPR.migration.status.migrationsComplete")
      );
      // This makes it so the app no longer acts as a modal,
      // and users can interact with the rest of Foundry again.
      migrationApp.element.close();
      migrationApp.element.show();
    }

    return this.migrationSuccessful;
  }

  /**
   * Run all of the migrations in the right order, waiting for them to complete before proceeding to the next.
   * There's a lot of async/await wrangling going on here; still an amateur on JS asynchronicity.
   *
   * @returns {Promise<Boolean>} - True if all migrations completed successfully
   */
  async runMigrations() {
    LOGGER.trace("runMigrations | MigrationRunner");

    this.migrationInstances = this.migrationClasses.map(
      (Migration) => new Migration()
    );

    for (const migration of this.migrationInstances) {
      try {
        const result = await migration.run();
        if (!result) return false;
      } catch (err) {
        LOGGER.error(err);
        CPRSystemUtils.DisplayMessage(
          "error",
          `Fatal error while migrating to ${migration.version}: ${err.message}`
        );
        return false;
      }
      if (migration.flush) {
        CPRSystemUtils.DisplayMessage(
          "notify",
          `Migration to data model ${migration.version} complete, please refresh your browser tab to continue.`
        );
        return false;
      }
    }
    return true;
  }

  /**
   * Closes all progress bars associated with each migration instance.
   *
   * @return {void}
   */
  closeProgressBars() {
    LOGGER.trace("closeProgressBars | MigrationRunner");
    // close all progress bars.
    if (!this.migrationInstances)
      throw new Error("MigrationRunner#migrationInstances has not been set.");
    for (const migration of this.migrationInstances) {
      Object.values(migration.progress).forEach((bar) => bar.close());
    }
  }
}
