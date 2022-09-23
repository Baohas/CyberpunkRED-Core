/* global Hooks */
import LOGGER from "../utils/cpr-logger.js";
import enablePauseAnimation from "../system/pause-animation.js";

/**
 * Hooks have a set of args that are passed to them from Foundry. Even if we do not use them here,
 * we document them all for clarity's sake and to make future development/debugging easier.
 */
const uiHooks = () => {
  /**
   * The renderPause Hook is provided by Foundry and triggered here. When the game is paused, an animation is
   * rendered in the bottom-middle of the screen to indicate the paused state. When this rendering happens,
   * this hook is called. We use it to change the animation from the default to something more in theme.
   *
   * @public
   * @memberof hookEvents
   */
  Hooks.on("renderPause", () => {
    LOGGER.trace("renderPause | uiHooks | Called.");
    enablePauseAnimation();
  });
};

export default uiHooks;
