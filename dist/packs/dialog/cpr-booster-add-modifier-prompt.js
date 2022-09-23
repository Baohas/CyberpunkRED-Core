/* eslint-disable no-shadow */
/* global renderTemplate Dialog FormDataExtended foundry */
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

export default class BoosterAddModifierPrompt {
  static async RenderPrompt(data) {
    LOGGER.trace("RenderPrompt | BoosterAddModifierPrompt | called.");
    const template = "systems/cyberpunk-red-core/templates/dialog/cpr-booster-add-modifier-prompt.hbs";
    return new Promise((resolve, reject) => {
      renderTemplate(template, data).then((html) => {
        const _onCancel = () => {
          LOGGER.trace("_onCancel | Dialog BoosterAddModifierPrompt | called.");
          reject(new Error("Promise rejected: Window Closed"));
        };
        const _onConfirm = (html) => {
          LOGGER.trace("_onConfirm | Dialog BoosterAddModifierPrompt | called.");
          const fd = new FormDataExtended(html.find("form")[0]);
          const formData = foundry.utils.expandObject(fd.object);
          resolve(formData);
        };
        new Dialog({
          title: SystemUtils.Localize("CPR.itemSheet.cyberdeck.configureInstalledPrograms"),
          content: html,
          buttons: {
            cancel: {
              icon: "<i class=\"fas fa-times\"></i>",
              label: SystemUtils.Localize("CPR.dialog.common.cancel"),
              callback: (html) => _onCancel(html),
            },
            confirm: {
              icon: "<i class=\"fas fa-check\"></i>",
              label: SystemUtils.Localize("CPR.dialog.common.confirm"),
              callback: (html) => _onConfirm(html),
            },
          },
          default: "confirm",
          render: LOGGER.trace("confirm | Dialog BoosterAddModifierPrompt | called."),
          close: () => {
            reject(new Error("Promise rejected: Window Closed"));
          },
        }).render(true);
      });
    });
  }
}
