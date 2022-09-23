/* global renderTemplate, Dialog, FormDataExtended foundry */
import SystemUtils from "../utils/cpr-systemUtils.js";
import LOGGER from "../utils/cpr-logger.js";

// Make this generic to be used as a Cancel/Confirm for any action (delete item, etc
export default class InitiativeTypePrompt {
  static async RenderPrompt(data) {
    LOGGER.trace("RenderPrompt | InitiativeTypePrompt | called.");
    const template = "systems/cyberpunk-red-core/templates/dialog/cpr-initiative-type-prompt.hbs";
    return new Promise((resolve, reject) => {
      renderTemplate(template, data).then((html) => {
        const _onCancel = () => {
          LOGGER.trace("_onCancel | Dialog InitiativeTypePrompt | called.");
          reject(new Error("Promise rejected: Window Closed"));
        };
        // eslint-disable-next-line no-shadow
        const _onConfirm = (html) => {
          LOGGER.trace("_onConfirm | Dialog InitiativeTypePrompt | called.");
          const fd = new FormDataExtended(html.find("form")[0]);
          const formData = foundry.utils.expandObject(fd.object);
          resolve(formData);
        };
        new Dialog({
          title: data.title,
          content: html,
          buttons: {
            cancel: {
              icon: "<i class=\"fas fa-times\"></i>",
              label: SystemUtils.Localize("CPR.dialog.common.cancel"),
              callback: () => _onCancel(html),
            },
            confirm: {
              icon: "<i class=\"fas fa-check\"></i>",
              label: SystemUtils.Localize("CPR.dialog.common.confirm"),
              // eslint-disable-next-line no-shadow
              callback: (html) => _onConfirm(html),
            },
          },
          default: "cancel",
          render: LOGGER.trace("confirm | Dialog InitiativeTypePrompt | called."),
          close: () => {
            // Closing the window can be interpreded as pressing cancel, thus it also resoles to false
            resolve(false);
          },
        }).render(true);
      });
    });
  }
}
