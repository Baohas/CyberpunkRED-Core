/* global game document */
import LOGGER from "../utils/cpr-logger.js";

export default function setTheme() {
  const theme = game.settings.get(game.system.id, "theme")
    ? game.settings.get(game.system.id, "theme")
    : "default";

  LOGGER.log(`Using theme: ${theme}`);
  document.documentElement.setAttribute("data-cpr-theme", theme);
}
