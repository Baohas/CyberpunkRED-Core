/* global renderTemplate, FormDataExtended, Dialog foundry */
import SystemUtils from "../utils/cpr-systemUtils.js";
import LOGGER from "../utils/cpr-logger.js";

export default class SplitItemPrompt {
  static async RenderPrompt(itemText) {
    LOGGER.trace("RenderPrompt | SplitItemPrompt | called.");
    return new Promise((resolve, reject) => {
      renderTemplate("systems/cyberpunk-red-core/templates/dialog/cpr-split-item-prompt.hbs", itemText).then((html) => {
        const _onCancel = () => {
          LOGGER.trace("_onCancel | Dialog SplitItemPrompt | called.");
          reject(new Error("Promise rejected: Window Closed"));
        };
        // eslint-disable-next-line no-shadow
        const _onConfirm = (html) => {
          LOGGER.trace("_onConfirm | Dialog SplitItemPrompt | called.");
          const fd = new FormDataExtended(html.find("form")[0]);
          const formData = foundry.utils.expandObject(fd.object);
          resolve(formData);
        };
        new Dialog({
          title: SystemUtils.Localize("CPR.dialog.splitItem.title"),
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
          default: "confirm",
          render: LOGGER.trace("confirm | Dialog SplitItemPrompt | called."),
          close: () => {
            reject(new Error("Promise rejected: Window Closed"));
          },
        }).render(true);
      });
    });
  }
}
