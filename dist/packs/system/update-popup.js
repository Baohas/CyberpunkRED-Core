/* global game, Application, mergeObject */
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

export default class UpdateScreen extends Application {
  static get defaultOptions() {
    LOGGER.trace("defaultOptions | UpdateScreen | Called.");
    const systemTitle = game.system.title;
    const { version } = game.system;
    const title = SystemUtils.Format("CPR.system.update.popupTitle", { systemTitle, version });
    return mergeObject(super.defaultOptions, {
      template: `systems/cyberpunk-red-core/templates/dialog/cpr-update-announcement.hbs`,
      resizable: true,
      width: 450,
      height: 636,
      title,
    });
  }

  async getData(options = {}) {
    LOGGER.trace("getData | UpdateScreen | Called.");
    const featureVideoLink = (typeof game.system.flags.featureVideoURL === "undefined") ? "" : game.system.flags.featureVideoURL;

    const releaseSpecificInstructions = `systems/cyberpunk-red-core/lang/release-notes/v${game.system.version}`;

    let { lang } = game.i18n;
    let response = await fetch(`${releaseSpecificInstructions}.${lang}`);

    if (response.status !== 200) {
      lang = "en";
      response = await fetch(`${releaseSpecificInstructions}.${lang}`);
    }

    const releaseInstructions = (response.status === 200) ? await response.text() : "";

    // TODO: releaseInstructions is external html, should Handlebars.SafeString be called? It seems to
    //       always returns nothing though.
    const data = {
      updateBanner: SystemUtils.Format("CPR.system.update.welcomeToSystem", { system: game.system.title }),
      releaseVersion: game.system.version,
      changelogInformation: SystemUtils.Format("CPR.system.update.changelogInformation"),
      featureVideoTitle: SystemUtils.Format("CPR.system.update.videoInformationTitle"),
      featureVideoInformation: SystemUtils.Format("CPR.system.update.videoInformation"),
      featureVideoLink,
      releaseInstructionsTitle: SystemUtils.Format("CPR.system.update.releaseInstructionsTitle"),
      releaseInstructions,
      HERE: SystemUtils.Format("CPR.system.update.here"),
    };
    return data;
  }

  static async RenderPopup() {
    LOGGER.trace("RenderPopup | UpdateScreen | Called.");
    const popup = new UpdateScreen();
    popup.render(true);
  }
}
