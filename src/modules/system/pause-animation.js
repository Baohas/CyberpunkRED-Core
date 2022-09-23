/* eslint-env jquery */
/* global game */
import LOGGER from "../utils/cpr-logger.js";

export default function enablePauseAnimation() {
  const setting = game.settings.get(
    "cyberpunk-red-core",
    "enablePauseAnimation",
  );

  if (setting) {
    LOGGER.log("Enabling pause animation");
    $("#pause figcaption").attr("class", "pause-glitch");
    $("#pause figcaption").attr("data-text", game.i18n.localize("GAME.Paused"));
    $("#pause img").attr("class", "fa-spin pause-image");
  }
}
