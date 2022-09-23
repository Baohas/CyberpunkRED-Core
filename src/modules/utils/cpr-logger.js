/* eslint-disable foundry-cpr/logger-after-function-definition */
/* eslint no-console:0 */
/* global game */
export default class LOGGER {
  static log(msg) {
    console.log(`CPR LOG | ${msg}`);
  }

  static debug(msg) {
    if (game.settings.get("cyberpunk-red-core", "debugLogs")) {
      console.debug(`CPR DBG | ${msg}`);
      if (typeof msg === "object" && msg !== null) {
        console.log(msg);
      }
    }
  }

  static debugObject(obj) {
    if (game.settings.get("cyberpunk-red-core", "debugLogs")) {
      console.debug(obj);
    }
  }

  static warn(msg) {
    console.warn(`CPR WRN | ${msg}`);
  }

  static trace(msg) {
    if (game.settings.get("cyberpunk-red-core", "traceLogs")) {
      console.log(`CPR TRC | ${msg}`);
    }
  }

  static error(msg) {
    console.error(`CPR ERR | ${msg}`);
  }

  static credits() {
    console.log("SPECIAL THANKS TO MOO MAN FOR HIS PATIENCE AND HELP!");
    console.log(`
          (__)             (__)             (__)             (__)
          (oo)             (oo)             (oo)             (oo)
   /-------\\/      /-------\\/      /-------\\/      /-------\\/
  / |     ||       / |     ||       / |     ||       / |     ||
 *  ||----||      *  ||W---||      *  ||w---||      *  ||V---||
    ^^    ^^
    `);
  }
}
