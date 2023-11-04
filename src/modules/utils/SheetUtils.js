/* global document window */
/* eslint-env jquery */

import LOGGER from "./cpr-logger.js";

/**
 * CPR-C utilities that are used in sheets
 */
export default class CPRSheetUtils {
  /**
   * Dynamically adjusts the width of all elements with the specified class
   * within the provided HTML context. It ensures that all elements have a
   * consistent width equal to the width of the widest element. The width is
   * calculated by cloning the elements, appending them to the body invisibly,
   * measuring their width, and then applying this maximum width to all
   * elements in rem units.
   *
   * @param {Object} html - The jQuery HTML context in which to find and adjust
   *                        '.type-tag' elements.
   * @param {String} cssClass - The CSS class to target
   */
  static setCssClassWidth(html, cssClass) {
    LOGGER.trace("setCssClassWidth | CPRSheetUtils | Called.");
    const typeTags = html.find(cssClass);

    // As some elements might be hidden on other tabs or under expandos we need
    // to clone them and append them to the body to measure their width.
    const clonedElements = typeTags
      .clone()
      .css({
        position: "absolute",
        visibility: "hidden",
        display: "block",
      })
      .appendTo("body");

    // Measure the widths of these cloned elements with a named function
    const maxWidth = Math.max(
      ...clonedElements
        .map(function measureWidth() {
          return $(this).width();
        })
        .get()
    );

    // Remove the cloned elements from the body after measurement
    clonedElements.remove();

    // Convert the maxWidth from px to rem
    if (maxWidth > 0) {
      const rootFontSize = parseFloat(
        window.getComputedStyle(document.documentElement).fontSize
      );
      const maxWidthInRem = maxWidth / rootFontSize;

      // Apply the maximum width in rem to all specified elements
      typeTags.css("width", `${maxWidthInRem}rem`);
    }
  }
}
