/* global Hooks window */
import LOGGER from "../utils/cpr-logger.js";
import SheetUtils from "../utils/SheetUtils.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

/**
 * Hooks have a set of args that are passed to them from Foundry. Even if we do not use them here,
 * we document them all for clarity's sake and to make future development/debugging easier.
 */
const actorSheetHooks = () => {
  /**
   * Persist collapsed sections of a character when it is closed. That way they
   * are not lost when it is re-opened.
   *
   * @public
   * @memberof hookEvents
   * @param {CPRActorSheet} actorSheet - application object (the sheet)
   * @param {Object} (unused) - HTML DOM object
   */
  Hooks.on("closeActorSheet", (actorSheet) => {
    LOGGER.trace("closeActorSheet | actorSheetHooks | Called.");
    SystemUtils.SetUserSetting(
      "sheetConfig",
      "sheetCollapsedSections",
      actorSheet.options.collapsedSections,
      actorSheet.id
    );
    // eslint-disable-next-line no-param-reassign
    actorSheet.options.setConfig = true;
  });

  /**
   * Set width of '.type-tag' elements on the actor sheet
   *
   * @param {Object} app - not used but needed
   * @param {Object} html - The jQuery HTML context for the ActorSheet's DOM.
   */
  Hooks.on("renderActorSheet", (app, html) => {
    window.requestAnimationFrame(() => {
      SheetUtils.setCssClassWidth(html, ".type-tag");
    });
  });
};

export default actorSheetHooks;
