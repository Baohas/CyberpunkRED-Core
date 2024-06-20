/* eslint-disable no-debugger */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-vars */
/* eslint-disable no-await-in-loop */
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
    this.version = null; // the data model version this migration will take us to
    this.flush = false; // migrations will stop after this script, even if more are needed
    this.errors = 0; // Increment if there were errors as part of this migration.
    this.statusPercent = 0;
    this.statusMessage = "";
    this.name = "Base CPRMigration Class";
    this.foundryMajorVersion = parseInt(game.version, 10);
    this.debugMigration = {
      enabled: false,
      actor: { name: "", id: "", uuid: "" },
      scene: { name: "", id: "", uuid: "" },
      compendia: { name: "", id: "", uuid: "" },
    };
  }

  /**
   * Execute the migration code. This should not be overidden.
   */
  async run() {
    LOGGER.trace("run | CPRMigration");
    LOGGER.log(`Migrating to data model version ${this.version}`);

    // migrate unowned items
    this.statusPercent = 1;
    this.statusMessage =
      `${CPRSystemUtils.Localize("CPR.migration.status.start")} ` +
      `${CPRSystemUtils.Localize("CPR.migration.status.items")}, ` +
      `${CPRSystemUtils.Localize("CPR.migration.status.actors")}, ` +
      `${CPRSystemUtils.Localize("CPR.migration.status.scenes")}, ` +
      `${CPRSystemUtils.Localize("CPR.migration.status.compendia")}...`;
    // CPRSystemUtils.updateMigrationBar(this.statusPercent, this.statusMessage);

    // Migrate settings, if any, first.
    if (!(await this.migrateSettings())) {
      CPRSystemUtils.DisplayMessage(
        "error",
        CPRSystemUtils.Localize("CPR.migration.status.settingsErrors")
      );
      return false;
    }

    if (!(await this.migrateItems())) {
      CPRSystemUtils.DisplayMessage(
        "error",
        CPRSystemUtils.Localize("CPR.migration.status.itemErrors")
      );
      return false;
    }

    this.statusPercent += 24;
    this.statusMessage =
      `${CPRSystemUtils.Localize("CPR.migration.status.start")} ` +
      `${CPRSystemUtils.Localize("CPR.migration.status.actors")}, ` +
      `${CPRSystemUtils.Localize("CPR.migration.status.scenes")}, ` +
      `${CPRSystemUtils.Localize("CPR.migration.status.compendia")}...`;
    // CPRSystemUtils.updateMigrationBar(this.statusPercent, this.statusMessage);

    // migrate actors
    if (!(await this.migrateActors())) {
      CPRSystemUtils.DisplayMessage(
        "error",
        CPRSystemUtils.Localize("CPR.migration.status.actorErrors")
      );
      return false;
    }

    this.statusPercent += 25;
    this.statusMessage =
      `${CPRSystemUtils.Localize("CPR.migration.status.start")} ` +
      `${CPRSystemUtils.Localize("CPR.migration.status.scenes")}, ` +
      `${CPRSystemUtils.Localize("CPR.migration.status.compendia")}...`;
    // CPRSystemUtils.updateMigrationBar(this.statusPercent, this.statusMessage);

    // unlinked actors (tokens)
    if (!(await this.migrateScenes())) {
      CPRSystemUtils.DisplayMessage(
        "error",
        CPRSystemUtils.Localize("CPR.migration.status.tokenErrors")
      );
      return false;
    }

    this.statusPercent += 25;
    this.statusMessage =
      `${CPRSystemUtils.Localize("CPR.migration.status.start")} ` +
      `${CPRSystemUtils.Localize("CPR.migration.status.compendia")}...`;
    // CPRSystemUtils.updateMigrationBar(this.statusPercent, this.statusMessage);

    // compendia
    if (!(await this.migrateCompendia())) {
      CPRSystemUtils.DisplayMessage(
        "error",
        CPRSystemUtils.Localize("CPR.migration.status.compendiaErrors")
      );
      return false;
    }

    this.statusPercent = 100;
    this.statusMessage = `${CPRSystemUtils.Localize(
      "CPR.migration.status.migrationsComplete"
    )}`;
    // CPRSystemUtils.updateMigrationBar(this.statusPercent, this.statusMessage);

    // In the future, put top-level migrations for tokens, scenes, and other things here

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
   */
  async migrateItems() {
    LOGGER.trace("migrateItems | CPRMigration");
    let good = true;

    let itemsMigrated = 0;
    const itemMigrations = [];
    for (const item of game.items.contents) {
      try {
        const migrateItem = await this.migrateItem(item);
        itemsMigrated += 1;
        const { totalDocuments } = game.cpr.MigrationRunner;
        const percent = Math.floor(
          (itemsMigrated / totalDocuments.items) * 100
        );
        CPRSystemUtils.updateMigrationBar(percent, this.statusMessage);
        itemMigrations.push(migrateItem);
      } catch (err) {
        LOGGER.error(err);
        throw new Error(
          `${this.name}: ${item.name} had a migration error: ${err.message}`
        );
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
   * Migrate actors
   */
  async migrateActors() {
    LOGGER.trace("migrateActors | CPRMigration");
    // actors in the "directory"
    let good = true;
    const actorMigrations = game.actors.contents.map(async (actor) => {
      try {
        if (
          this.debugMigration.enabled &&
          (actor.name === this.debugMigration.actor.name ||
            actor.id === this.debugMigration.actor.id ||
            actor.uuid === this.debugMigration.actor.uuid)
        ) {
          debugger;
        }
        return await this.migrateActor(actor);
      } catch (err) {
        LOGGER.error(err);
        throw new Error(
          `${this.name}: ${actor.name} had a migration error: ${err.message}`
        );
      }
    });
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
    const sceneMigrations = game.scenes.contents.map(async (scene) => {
      try {
        if (
          this.debugMigration.enabled &&
          (scene.name === this.debugMigration.scene.name ||
            scene.id === this.debugMigration.scene.id ||
            scene.uuid === this.debugMigration.scene.uuid)
        ) {
          debugger;
        }
        return await this.migrateScene(scene);
      } catch (err) {
        LOGGER.error(err);
        throw new Error(
          `${this.name}: ${scene.name} had a migration error: ${err.message}`
        );
      }
    });
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
    const tokens = scene.tokens.contents.filter((token) => {
      const tokenData = this.foundryMajorVersion < 10 ? token.data : token;
      if (!game.actors.has(tokenData.actorId)) {
        // Degenerate case where the actor that the token is derived from was since
        // deleted. This makes token.actor null so we don't have a full view of all of the actor data.
        // This is technically a broken token and even Foundry throws errors when you do certain things
        // with this token. We skip it.
        LOGGER.warn(
          `WARNING: Token "${tokenData.name}" (${tokenData.actorId}) on Scene "${scene.name}" (${scene.id})` +
            ` is missing the source Actor, so we will skip migrating it. Consider replacing or deleting it.`
        );
        return false;
      }
      if (!tokenData.actorLink) return true; // unlinked tokens, this is what we're after
      // anything else is a linked token, we assume they're already migrated
      return false;
    });
    const tokenMigrations = tokens.map(async (token) => {
      try {
        return this.migrateActor(token.actor);
      } catch (err) {
        LOGGER.error(err);
        throw new Error(
          `${this.name}: ${token.name} token had a migration error: ${err.message}`
        );
      }
    });
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

      if (
        this.debugMigration.enabled &&
        (pack.name === this.debugMigration.compendia.name ||
          pack.id === this.debugMigration.compendia.id ||
          pack.uuid === this.debugMigration.compendia.uuid)
      ) {
        debugger;
      }

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
