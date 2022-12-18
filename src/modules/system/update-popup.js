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
      template: `systems/${game.system.id}/templates/dialog/cpr-update-announcement.hbs`,
      resizable: true,
      width: 800,
      height: 650,
      title,
    });
  }

  // eslint-disable-next-line no-unused-vars
  async getData(options = {}) {
    LOGGER.trace("getData | UpdateScreen | Called.");
    const featureVideoLink = (typeof game.system.flags.featureVideoURL === "undefined") ? "" : game.system.flags.featureVideoURL;

    // Check if we have release notes in a localised language if not default
    // to English. Then if English dosn't exist return an empty string
    const releaseNotesFile = `systems/${game.system.id}/lang/release-notes/${game.system.version}`;

    const lang = game.i18n;
    let response = await fetch(`${releaseNotesFile}.${lang}`);

    if (response.status !== 200) {
      response = await fetch(`${releaseNotesFile}.en`);
    }

    const releaseNotes = (response.status === 200) ? await response.text() : "";

    // TODO: releaseNotes is external html, should Handlebars.SafeString be
    // called? It seems to always returns nothing though.
    const data = {
      updateBanner: SystemUtils.Format("CPR.system.update.welcomeToSystem", { system: game.system.title }),
      releaseVersion: game.system.version,
      releaseNotes,
      featureVideoTitle: SystemUtils.Format("CPR.system.update.videoInformationTitle"),
      featureVideoInformation: SystemUtils.Format("CPR.system.update.videoInformation"),
      featureVideoLink,
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
