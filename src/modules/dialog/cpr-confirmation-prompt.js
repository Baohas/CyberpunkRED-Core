/* global renderTemplate, Dialog */
import SystemUtils from "../utils/cpr-systemUtils.js";
import LOGGER from "../utils/cpr-logger.js";

// Make this generic to be used as a Cancel/Confirm for any action (delete item, etc
export default class ConfirmationPrompt {
  // INFO - ConfirmPrompt is a generic prompt to display on confirming an action.
  // Based on type of action, setup data to display based on given input.
  // Call to RenderPrompt should take one object as input, based on input type, prepare template and titles...
  static async RenderPrompt(title, data) {
    LOGGER.trace("RenderPrompt | ConfirmationPrompt | called.");
    const template = "systems/cyberpunk-red-core/templates/dialog/cpr-confirmation-prompt.hbs";
    return new Promise((resolve, reject) => {
      renderTemplate(template, data).then((html) => {
        const _onCancel = () => {
          LOGGER.trace("_onCancel | Dialog ConfirmationPrompt | called.");
          reject(new Error("Promise rejected: Window Closed"));
        };
        const _onConfirm = () => {
          LOGGER.trace("_onConfirm | Dialog ConfirmationPrompt | called.");
          resolve(true);
        };
        new Dialog({
          title,
          content: html,
          buttons: {
            cancel: {
              icon: "<i class=\"fas fa-times\"></i>",
              label: SystemUtils.Localize("CPR.dialog.common.cancel"),
              callback: () => _onCancel(),
            },
            confirm: {
              icon: "<i class=\"fas fa-check\"></i>",
              label: SystemUtils.Localize("CPR.dialog.common.confirm"),
              callback: () => _onConfirm(),
            },
          },
          default: "cancel",
          render: LOGGER.trace("confirm | Dialog VerifyRollPrompt | called."),
          close: () => {
            // Closing the window can be interpreded as pressing cancel, thus it also resoles to false
            resolve(false);
          },
        }).render(true);
      });
    });
  }
}
