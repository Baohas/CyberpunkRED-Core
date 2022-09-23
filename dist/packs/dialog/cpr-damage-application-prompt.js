/* global renderTemplate, Dialog */
import SystemUtils from "../utils/cpr-systemUtils.js";
import LOGGER from "../utils/cpr-logger.js";

export default class DamageApplicationPrompt {
  static async RenderPrompt(title, data) {
    LOGGER.trace("RenderPrompt | DamageApplicationPrompt | called.");
    const template = "systems/cyberpunk-red-core/templates/dialog/cpr-damage-application-prompt.hbs";
    return new Promise((resolve, reject) => {
      renderTemplate(template, data).then((html) => {
        const _onCancel = () => {
          LOGGER.trace("_onCancel | Dialog DamageApplicationPrompt | called.");
          reject(new Error("Promise rejected: Window Closed"));
        };
        const _onConfirm = () => {
          LOGGER.trace("_onConfirm | Dialog DamageApplicationPrompt | called.");
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
          render: LOGGER.trace("confirm | Dialog DamageApplicationPrompt | called."),
          close: () => {
            // Closing the window can be interpreded as pressing cancel, thus it also resoles to false
            resolve(false);
          },
        }).render(true);
      });
    });
  }
}
