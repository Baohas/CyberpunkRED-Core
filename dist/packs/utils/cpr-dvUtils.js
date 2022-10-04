/* eslint-disable no-undef */
import LOGGER from "./cpr-logger.js";
import SystemUtils from "./cpr-systemUtils.js";

export default class DvUtils {
  static GetDvTables() {
    LOGGER.trace("GetDvTables | DvUtils | called.");
    const tableNames = [];
    const tableList = SystemUtils.GetRollTables("^DV", true);
    tableList.forEach((table) => tableNames.push(table.name));
    return tableNames.sort();
  }

  static GetDv(tableName, distance) {
    LOGGER.trace("GetDv | DvUtils | called.");
    const dvTables = this.GetDvTables();
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
