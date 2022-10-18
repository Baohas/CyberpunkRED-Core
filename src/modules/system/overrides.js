/* global Ruler canvas */
import DvUtils from "../utils/cpr-dvUtils.js";

export default function overrideRulerFunctions() {
  const foundryPrototype = Ruler.prototype._getSegmentLabel;
  Ruler.prototype._getSegmentLabel = function _getSegmentLabel(segment, totalDistance) {
    const { distance } = segment;
    let returnLabel = foundryPrototype.call("_getSegmentLabel", segment, totalDistance);
    if (this.user.isSelf) {
      const token = canvas.tokens.controlled["0"];
      if (token) {
        const DvTable = token.document.flags.cprDvTable;
        if (DvTable) {
          const DV = DvUtils.GetDv(DvTable, distance);
          if (DV !== null) {
            const displayTable = DvTable.replace(/^DV /, "");
            returnLabel = `${returnLabel} (${displayTable} DV: ${DV})`;
          }
        }
      }
    }
    return returnLabel;
  };
}
