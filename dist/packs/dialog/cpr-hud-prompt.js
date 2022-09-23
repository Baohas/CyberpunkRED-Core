/* eslint-disable no-shadow */
/* eslint-disable no-undef */
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

export default class HudPrompt {
  static async RenderPrompt(type, data) {
    LOGGER.trace("RenderPrompt | HudPrompt | called.");
    const template = `systems/cyberpunk-red-core/templates/dialog/hud/cpr-${type}-prompt.hbs`;
    return new Promise((resolve, reject) => {
      renderTemplate(template, data).then((html) => {
        const _onCancel = () => {
          LOGGER.trace("_onCancel | Dialog HudPrompt | called.");
          reject(new Error("Promise rejected: Window Closed"));
        };
        const _onConfirm = (html) => {
          LOGGER.trace("_onConfirm | Dialog HudPrompt | called.");
          const fd = new FormDataExtended(html.find("form")[0]);
          const formData = foundry.utils.expandObject(fd.object);
          resolve(formData);
        };
        new Dialog({
          title: SystemUtils.Localize("CPR.dialog.dv.hudPromptTitle"),
          content: html,
          buttons: {
            cancel: {
              icon: "<i class=\"fas fa-times\"></i>",
              label: SystemUtils.Localize("CPR.dialog.common.cancel"),
              /* eslint-disable no-shadow */
              callback: (html) => _onCancel(html),
              /* eslint-enable no-shadow */
            },
            confirm: {
              icon: "<i class=\"fas fa-check\"></i>",
              label: SystemUtils.Localize("CPR.dialog.common.confirm"),
              /* eslint-disable no-shadow */
              callback: (html) => _onConfirm(html),
              /* eslint-enable no-shadow */
            },
          },
          default: "confirm",
          render: LOGGER.trace("confirm | Dialog HudPrompt | called."),
          close: () => {
            reject(new Error("Promise rejected: Window Closed"));
          },
        }).render(true);
      });
    });
  }
}
