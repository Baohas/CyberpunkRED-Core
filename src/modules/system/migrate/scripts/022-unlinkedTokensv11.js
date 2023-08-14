/* eslint-disable foundry-cpr/logger-after-function-definition */
/* global duplicate */

import CPRMigration from "../cpr-migration.js";
import CPRSystemUtils from "../../../utils/cpr-systemUtils.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class v11TokenMigration extends CPRMigration {
  constructor() {
    LOGGER.trace("constructor | Unlinked Tokens (v11) Migration");
    super();
    this.version = 22;
    this.name = "Unlinked Tokens (v11) Migration";
  }

  /**
   * Executed before the migration takes place, see run() in the base migration class.
   */
  async preMigrate() {
    LOGGER.trace(`preMigrate | ${this.version}-${this.name}`);
    CPRSystemUtils.DisplayMessage(
      "notify",
      CPRSystemUtils.Localize("CPR.migration.effects.beginMigration")
    );
    LOGGER.log(`Starting migration: ${this.name}`);
  }

  /**
   * Takes place after the data migration completes.
   */
  async postMigrate() {
    LOGGER.trace(`postMigrate | ${this.version}-${this.name}`);
    LOGGER.log(`Finishing migration: ${this.name}`);
  }

  /**
   * In `actor.getData()` we were erroneously adding datapoints that are not in our datamodel.
   * This removes them.
   *
   * Additionally, in Foundry v11, items with AEs no longer duplicate them to the actor.
   * Thus, without migration there would be duplicate effects showing up, one from the actor,
   * and one from the item. This removes the duplicate effects from the actor.
   *
   * @param {CPRActor} actor
   */
  async migrateActor(actor) {
    LOGGER.trace(`migrateActor | ${this.version}-${this.name}`);
    if (!actor.token || actor.token.actorLink) {
      return Promise.resolve();
    }
    const updateData = duplicate(actor.system);

    function mutateUuid(actr, uuid) {
      const splitUuids = uuid.split(".");
      if (splitUuids.includes("Token")) {
        const i = splitUuids.indexOf("Item");
        splitUuids.splice(i, 0, "Actor", actor.id);
      }
      return splitUuids.join(".");
    }

    const newInstalledUuids = [];
    for (const UUID of updateData.installedItems.list) {
      newInstalledUuids.push(mutateUuid(actor, UUID));
    }

    return actor.update({ "system.installedItems.list": newInstalledUuids });
  }
}
