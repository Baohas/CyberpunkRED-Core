/* global Ruler canvas */
import DvUtils from "../utils/cpr-dvUtils.js";
import LOGGER from "../utils/cpr-logger.js";

/**
 * Override some Foundry Ruler functionality. This is how we have the DV included in the
 * text that displays with the ruler tool. We only do this if we own the selected token
 * and a valid DV shows up from the compendium of roll tables.
 *
 * Foundry calls _getSegmentLabel as a synchronous function, therefore we must resolve
 * all promises returned by async functions on the way to getting the DV.
 */
export default function overrideRulerFunctions() {
  const foundryPrototype = Ruler.prototype._getSegmentLabel;
  Ruler.prototype._getSegmentLabel = function _getSegmentLabel(segment, totalDistance) {
    const { distance } = segment;
    let returnLabel = null;
    if (this.user.isSelf) {
      const token = canvas.tokens.controlled["0"];
      if (token) {
        const DvTable = token.document.flags.cprDvTable;
        if (DvTable) {
          returnLabel = DvUtils.GetDv(DvTable, distance).then((DV) => {
            LOGGER.debugObject(DV);
            if (DV !== null) {
              const displayTable = DvTable.replace(/^DV /, "");
              return `${returnLabel} (${displayTable} DV: ${DV})`;
            }
            return null;
          });
        }
      }
    }
    if (returnLabel === null) returnLabel = foundryPrototype.call("_getSegmentLabel", segment, totalDistance);
    LOGGER.debugObject(returnLabel);
    return returnLabel;
  };
}
