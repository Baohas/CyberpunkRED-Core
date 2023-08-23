/* globals foundry game */

import CPR from "../../../system/config.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class InstallableSchema extends foundry.abstract.DataModel {
  static defineSchema() {
    LOGGER.trace("defineSchema | InstallableSchema | called.");
    const { fields } = foundry.data;
    return {
      installLocation: new fields.StringField({
        initial: "mall",
        choices: Object.keys(CPR.cyberwareInstallList),
      }),
      size: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 1,
        min: 0,
      }),
    };
  }

  /**
   * This and `installedIn` are getters so that `containerItem.system.installedItems.list` is
   * always the source of truth for what is installed where.
   *
   * @getter
   * @returns {Boolean} - whether or not this is installed in an actor/item.
   */
  get isInstalled() {
    LOGGER.trace("get isInstalled");
    const { id } = this.parent;
    const actor = this.parent.isOwned ? this.parent.actor : false;
    if (actor) {
      return (
        actor.system.installedItems.list.includes(id) ||
        actor.items.some((i) => i.system?.installedItems?.list?.includes(id))
      );
    }
    return game.items.some((i) => i.system?.installedItems?.list?.includes(id));
  }

  /**
   * @getter
   * @returns {String} - the id of the item that this is installed in.
   */
  get installedIn() {
    LOGGER.trace("get installedIn");
    const { id } = this.parent;
    const actor = this.parent.isOwned ? this.parent.actor : false;
    if (actor) {
      const inActor = actor.system.installedItems.list.includes(id);
      if (inActor) {
        return actor.id;
      }
      const [ownedItem] = actor.items.filter((i) =>
        i.system?.installedItems?.list?.includes(id)
      );
      return ownedItem.id;
    }
    const [worldItem] = game.items.filter((i) =>
      i.system?.installedItems?.list?.includes(id)
    );
    return worldItem.id;
  }
}
