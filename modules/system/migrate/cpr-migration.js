/* global game */
import * as Migrations from "./scripts/index.js";
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
   * Basic constructor to establish the version and other options
   */
  constructor() {
    LOGGER.trace("constructor | CPRMigration");
    this.version = null; // the data model version this migration will take us to
    this.flush = false; // migrations will stop after this script, even if more are needed
  }

  /**
   * Execute the migration code. This should not be overidden with the exception of the legacy
   * migration scripts. (000-base.js)
   * ToDo: should toObject() be called on each thing being migrated?
   */
  async run() {
    LOGGER.trace("run | CPRMigration");
    LOGGER.log(`Migrating to data model version ${this.version}`);
    const classRef = Migrations[this.constructor.name];
    await classRef.preMigrate();
    for (const item of game.items.contents) await classRef.updateItem(item);
    for (const actor of game.actors.contents) await classRef.updateActor(actor);
    await classRef.postMigrate();
    game.settings.set("cyberpunk-red-core", "dataModelVersion", this.version);
  }

  /**
   * This block of abstract methods breaks down how each document type is migrated. If there
   * are any steps that need to be taken before migrating, put them in preMigrate. Likewise
   * any clean up or changes after go in postMigrate.
   *
   * These all assume data model changes are sent to the server (they're mutators).
   */
  static async preMigrate() {};
  static async updateActor(actor) {};
  static async updateItem(item) {};
  static async updateMacro(macro) {};
  static async updateToken(token) {};
  static async updateTable(table) {};
  static async updateCompendium(comp) {};
  static async postMigrate() {};
}
