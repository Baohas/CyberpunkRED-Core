/* global canvas game */
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
    const dvTables = await DvUtils.GetDvTables();
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
    const [selectedTable] = dvTables.filter((table) => table.name === formData.dvTable);
    const dvSetting = selectedTable ? { name: selectedTable.name, table: {} } : null;
    if (selectedTable) {
      for (const result of selectedTable.results) {
        // Rolltable entry of type is a Text entry
        if (result.type === 0) {
          const { range } = result;
          const key = `${range[0]}_${range[1]}`;
          const dv = result.text;
          dvSetting.table[key.toString()] = dv;
        }
      }
    }
    // Unsure why but if we do not unset the flag before setting
    // it, the setting of the flag becomes the merge of the before
    // and after settings.
    await token.document.unsetFlag(game.system.id, "cprDvTable");
    await token.document.setFlag(game.system.id, "cprDvTable", dvSetting);
  }
}
