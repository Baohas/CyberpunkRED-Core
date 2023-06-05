/* global ActiveEffect game */
import CPRActor from "./actor/cpr-actor.js";
import LOGGER from "./utils/cpr-logger.js";

/**
 * Extend the base ActiveEffect class to implement system-specific logic.
 * @extends {ActiveEffect}
 */
export default class CPRActiveEffect extends ActiveEffect {
  /**
   * We extend the constructor to initialize CPR data structures used for tracking the CPRActiveEffect
   * With V10, Foundry moved all system data points into {obj}.system, so we will follow suit with
   * active effects
   *
   * @constructor
   * @param {*} object - the Foundry object data for an Active Effect
   * @param {*} options - The Foundry options for an Active Effect
   */
  constructor(object = {}, options = {}) {
    LOGGER.trace("constructor | CPRActiveEffect | Called.");
    super(object, options);
  }

  /**
   * Get the item/actor that provides this active effect. You might think this is simply
   * this.parent, but that can vary depending on if it is on an actor itself, or
   * an unlinked token. Instead we use the origin property and act from that.
   *
   * There are cases where null is returned, which is when the parent cannot be determined.
   *
   * Example origins (in same order as conditionals below):
   *    Status effects (like an sleep icon on a token) are AEs, and the origin is "undefined"
   *    On a world actor itself: "Actor.voAMugZgXyH2OG9l"
   *    On an actor itself that is stored in a compendium: "Compendium.world.test.8XnYcfQCvbqjTi06"
   *    On an unlinked token actor itself: "Scene.rG5JN8h8v5hFMmCC.Token.IbKRfHzNJyk1isk0"
   *    AE on a world (unowned) item (in or out of a compendium): "Item.ioY6vLPzo2ZuhXuS"
   *    AE from an item owned by a world actor (in or out of a compendium): "Actor.voAMugZgXyH2OG9l.Item.ioY6vLPzo2ZuhXuS"
   *    On an unlinked token actor with an owned item: "Scene.rG5JN8h8v5hFMmCC.Token.IbKRfHzNJyk1isk0.Item.9c66oxg9rk13o"
   */
  getEffectParent() {
    LOGGER.trace("getEffectParent | CPRActiveEffect | Called.");
    if (!this.origin) return null;
    // eslint-disable-next-line no-unused-vars
    const [parentType, parentId, documentType, documentId, childType, childId] =
      this.origin?.split(".") ?? [];
    if (parentType === "Actor" && !documentType) return this.parent;
    if (parentType === "Compendium") return null;
    if (parentType === "Scene" && documentType === "Token" && !childType)
      return this.parent;
    if (parentType === "Item") return this.parent;
    if (parentType === "Actor" && documentType === "Item") {
      const item = this.parent.items.get(documentId);
      if (!item) return null;
      return item;
    }
    if (
      parentType === "Scene" &&
      documentType === "Token" &&
      childType === "Item"
    ) {
      const item = this.parent.items.get(childId);
      if (!item) return null;
      return item;
    }
    LOGGER.error(`This AE has a crazy origin: ${this.origin}`);
    return null;
  }

  /**
   * Convenience getter for retrieving how an effect is "used", this is actually stored
   * on the item providing the effect.
   *
   * XXX: LOGGER calls do not work in this getter. I don't know why; use console.
   */
  get usage() {
    LOGGER.trace("get usage | CPRActiveEffect | Called.");
    const item = this.getEffectParent();
    if (!item) return null;
    return item.system.usage;
  }

  /**
   * set the key category for a mod
   *
   * @param {Number} num - the index of the mod in the changes array
   * @param {String} category - the key category value to set
   */
  async setModKeyCategory(num, category) {
    LOGGER.trace("setModKeyCategory | CPRActiveEffect | Called.");
    await this.setFlag(game.system.id, `changes.cats.${num}`, category);
  }

  /**
   * Determine if this effect is suppressed because of some game mechanic, like the item is not equipped.
   * This was mostly copied from the dnd5e module in active-effect.js.
   *
   * Warning: If errors are thrown in this method, they'll show up early on loading Foundry,
   * and break basic functionality, for example, in actor.getData.
   *
   * @returns nothing, it only sets the isSuppressed property (it's a mutator)
   */
  async updateSuppression() {
    LOGGER.trace("determineSuppression | CPRActiveEffect | Called.");
    const isSuppressed = this.calculateSuppression();
    if (this.isSuppressed !== isSuppressed) {
      await this.setFlag(game.system.id, "isSuppressed", isSuppressed);
    }
  }

  /**
   * Actual suppression calculation logic.
   */
  calculateSuppression() {
    if (this.parent.documentName !== "Actor") return false;
    const doc = this.getEffectParent();
    if (!doc) return false; // happens on item delete
    if (doc instanceof CPRActor) return false; // we never suppress actor effects
    return doc.areEffectsSuppressed();
  }

  /**
   * Overriding default getter to return actual value instead of false if one is set.
   */
  get isSuppressed() {
    return this.getFlag(game.system.id, "isSuppressed") ?? false;
  }
}
