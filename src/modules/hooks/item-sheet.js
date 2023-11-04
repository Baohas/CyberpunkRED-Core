/* global Hooks window */
import SheetUtils from "../utils/SheetUtils.js";

/**
 * Hooks have a set of args that are passed to them from Foundry. Even if we do not use them here,
 * we document them all for clarity's sake and to make future development/debugging easier.
 */
const itemSheetHooks = () => {
  Hooks.on("renderItemSheet", (app, html) => {
    window.requestAnimationFrame(() => {
      SheetUtils.setCssClassWidth(html, ".type-tag");
    });
  });
};

export default itemSheetHooks;
