import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";

const InitializePopOutIntegration = () => {
  /**
   * Set the CSS theme in PopOut! Module
   * https://foundryvtt.com/packages/popout/
   *
   * @public
   * @memberof hookEvents
   */
  Hooks.on("PopOut:loaded", async (_, node) => {
    LOGGER.trace("setTheme | uiHooks | called");
    SystemUtils.SetTheme(node);
  });
};

export default InitializePopOutIntegration;
