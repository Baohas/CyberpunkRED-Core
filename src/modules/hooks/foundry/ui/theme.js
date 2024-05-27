import LOGGER from "../../../utils/cpr-logger.js";
import SystemUtils from "../../../utils/cpr-systemUtils.js";

const SetTheme = () => {
  /**
   * Set the CSS theme on init
   *
   * @public
   * @memberof hookEvents
   */
  Hooks.on("init", () => {
    LOGGER.trace("setTheme | uiHooks | called");
    SystemUtils.SetTheme();
  });
};

export default SetTheme;
