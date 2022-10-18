/* global canvas */
import HudPrompt from "../dialog/cpr-hud-prompt.js";
import DvUtils from "../utils/cpr-dvUtils.js";
import LOGGER from "../utils/cpr-logger.js";

/**
 * We implemented a tool in the hud interface to measure ranged attack DVs. To figure out the right
 * DVs to present in the UI (based on weapon type), we use this class to look up tables and save them
 * to the token data.
 */
export default class HudInterface {
  /**
   * SetDvTable looks up the right DV table to use (implemented as a rollable table) and sets it
   * in the tokenData for use later.
   *
   * @param {TokenDocument} tokenData - the tokenData to update
   * @returns {null}
   */
  static async SetDvTable(tokenData) {
    LOGGER.trace("SetDvTable | HudInterface | Called.");
    const dvTables = DvUtils.GetDvTables();
    const formData = await HudPrompt.RenderPrompt("dv", dvTables).catch((err) => LOGGER.debug(err));
    if (formData === undefined) {
      return;
    }
    if (formData.dvTable === null) {
      formData.dvTable = "";
    }
    const { controlled } = canvas.tokens;
    const index = controlled.findIndex((x) => x.id === tokenData._id);
    const token = controlled[index];
    token.document.update({ "flags.cprDvTable": formData.dvTable });
  }
}
