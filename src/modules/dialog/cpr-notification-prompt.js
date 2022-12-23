/* global game renderTemplate, Dialog */
import SystemUtils from "../utils/cpr-systemUtils.js";
import LOGGER from "../utils/cpr-logger.js";

// Make this generic to be used as a Cancel/Confirm for any action (delete item, etc
export default class NotificationPrompt {
  // INFO - ConfirmPrompt is a generic prompt to display on confirming an action.
  // Based on type of action, setup data to display based on given input.
  // Call to RenderPrompt should take one object as input, based on input type, prepare template and titles...
  static async RenderPrompt(title, data) {
    LOGGER.trace("RenderPrompt | NotificationPrompt | called.");
    const template = `systems/${game.system.id}/templates/dialog/cpr-confirmation-prompt.hbs`;
    return new Promise((resolve) => {
      renderTemplate(template, data).then((html) => {
        const _onOk = () => {
          LOGGER.trace("_onOk | Dialog NotificationPrompt | called.");
          resolve(true);
        };
        new Dialog({
          title,
          content: html,
          buttons: {
            ok: {
              icon: "<i class=\"fas fa-check\"></i>",
              label: SystemUtils.Localize("CPR.dialog.common.ok"),
              callback: () => _onOk(),
            },
          },
          default: "ok",
          render: LOGGER.trace("confirm | Dialog NotificationPrompt | called."),
          close: () => {
            // Closing the window can be interpreded as pressing cancel, thus it also resoles to false
            resolve(false);
          },
        }).render(true);
      });
    });
  }
}
