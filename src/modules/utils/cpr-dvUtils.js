import LOGGER from "./cpr-logger.js";
import SystemUtils from "./cpr-systemUtils.js";

export default class DvUtils {
  /**
   * Return an array of table names that are relevant for calculating ranged attack DVs
   *
   * @async
   * @static
   * @returns {Array} of table names, organized by weapon type
   */
  static async GetDvTables() {
    LOGGER.trace("GetDvTables | DvUtils | called.");
    const tableNames = [];
    const tableList = await SystemUtils.GetCompendiumDocs("dvTables");
    tableList.forEach((table) => tableNames.push(table.name));
    return tableNames.sort();
  }

  /**
   * Return the ranged DV by looking up the answer on a rollable table.
   *
   * @async
   * @static
   * @param {String} tableName - the table to look up a DV based on range
   * @param {Integer} distance - aka the range we're looking up
   * @returns {String} - the DV (which is a number, but as a string)
   */
  static async GetDv(tableName, distance) {
    LOGGER.trace("GetDv | DvUtils | called.");
    const dvTables = await this.GetDvTables();
    let DV = null;
    if (dvTables.includes(tableName)) {
      const rollTable = await SystemUtils.GetCompendiumDoc("dvTables", tableName);
      const tableResult = rollTable.getResultsForRoll(distance);
      if (tableResult.length === 1) {
        DV = tableResult[0].text;
      }
    }
    return DV;
  }
}
