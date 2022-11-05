/* eslint-disable no-undef */
import LOGGER from "./cpr-logger.js";
import SystemUtils from "./cpr-systemUtils.js";

export default class DvUtils {
  static async GetDvTables() {
    LOGGER.trace("GetDvTables | DvUtils | called.");
    const tableList = await SystemUtils.GetCompendiumDocs(game.settings.get(game.system.id, "dvRollTableCompendium"));
    tableList.sort((a, b) => ((a.name > b.name) ? 1 : -1));
    return tableList;
  }

  static async GetDv(tableName, distance) {
    LOGGER.trace("GetDv | DvUtils | called.");
    const dvTables = await this.GetDvTables();
    let DV = null;
    if (dvTables.includes(tableName)) {
      const rollTable = (SystemUtils.GetRollTables(tableName, false))[0];
      const tableResult = rollTable.getResultsForRoll(distance);
      if (tableResult.length === 1) {
        DV = tableResult[0].text;
      }
    }
    return DV;
  }
}
