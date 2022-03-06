/* global ActiveEffect */
import LOGGER from "./utils/cpr-logger.js";

/**
 * Extend the base ActiveEffect class to implement system-specific logic.
 * @extends {ActiveEffect}
 */
export default class CPRActiveEffect extends ActiveEffect {
  /**
   * Get the item that provides this active effect. You might think this is simply
   * this.parent, but that can vary depending on if it is on an actor itself, or
   * an unlinked token. Instead we use the origin property and act from that.
   *
   * Example origins (in same order as conditionals below):
   *    Status effects (like an sleep icon on a token) are AEs, and the origin is "undefined"
   *    On a world actor itself: "Actor.voAMugZgXyH2OG9l"
   *    On an unlinked token actor itself: "Scene.rG5JN8h8v5hFMmCC.Token.IbKRfHzNJyk1isk0"
   *    AE on an unowned item: "Item.ioY6vLPzo2ZuhXuS"
   *    AE from an item owned by a world actor: "Actor.voAMugZgXyH2OG9l.Item.ioY6vLPzo2ZuhXuS"
   *    On an unlinked token actor with an owned item: "Scene.rG5JN8h8v5hFMmCC.Token.IbKRfHzNJyk1isk0.Item.9c66oxg9rk13o"
   */
  getSourceItem() {
    LOGGER.trace("getSourceItem | CPRActiveEffect | Called.");
    if (!this.data.origin) return null;
    // eslint-disable-next-line no-unused-vars
    const [parentType, parentId, documentType, documentId, childType, childId] = this.data.origin?.split(".") ?? [];
    if (parentType === "Actor" && !documentType) return null;
    if (parentType === "Scene" && documentType === "Token" && !childType) return null;
    if (parentType === "Item") return this.parent;
    if (parentType === "Actor" && documentType === "Item") {
      const item = this.parent.items.get(documentId);
      if (!item) return null;
      return item;
    }
    if (parentType === "Scene" && documentType === "Token" && childType === "Item") {
      const item = this.parent.items.get(childId);
      if (!item) return null;
      return item;
    }
    LOGGER.error(`This AE has a crazy origin: ${this.data.origin}`);
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
    const item = this.getSourceItem();
    if (!item) return null;
    return item.data.data.usage;
  }

  /**
   * set the key category for a mod
   *
   * @param {Number} num - the index of the mod in the changes array
   * @param {String} category - the key category value to set
   */
  async setModKeyCategory(num, category) {
    LOGGER.trace("setModKeyCategory | CPRActiveEffect | Called.");
    this.setFlag("cyberpunk-red-core", `changes.${num}`, category);
  }

  /**
   * Check if this effect is suppressed before applying it. Taken from the 5E code in
   * active-effect.js.
   *
   * @override
   * @param {CPRActor} actor - who's getting the active effect?
   * @param {Object} change - the change to apply from an effect
   * @returns null if this is suppressed, apply() otherwise
   */
  apply(actor, change) {
    LOGGER.trace("apply | CPRActiveEffect | Called.");
    if (this.data.isSuppressed) return null;
    return super.apply(actor, change);
  }

  /**
   * Determine if this effect is suppressed because of some game mechanic, like the item is not equipped.
   * This was mostly copied from the dnd5e module in active-effect.js.
   *
   * @returns nothing, it only sets the isSuppressed property (it's a mutator)
   */
  determineSuppression() {
    LOGGER.trace("determineSuppression | CPRActiveEffect | Called.");
    this.data.isSuppressed = false;
    if (this.data.disabled || (this.parent.documentName !== "Actor")) return;
    const item = this.getSourceItem();
    if (!item) return; // happens on item delete
    this.data.isSuppressed = item.areEffectsSuppressed();
  }
}
