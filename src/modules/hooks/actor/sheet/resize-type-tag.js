/* global Hooks window */
import SheetUtils from "../../../utils/SheetUtils.js";

const ResizeTypeTag = () => {
  /**
   * Adjusts the width of elements with the '.type-tag' class dynamically.
   *
   * @public
   * @memberof hookEvents
   * @param {CPRActorSheet} app - application object (unused)
   * @param {Object} html - HTML DOM object
   */
  // Run on Actor Sheets
  Hooks.on("renderActorSheet", (_, html) => {
    window.requestAnimationFrame(() => {
      SheetUtils.setCssClassWidth(html, ".type-tag");
    });
  });
};

export default ResizeTypeTag;
