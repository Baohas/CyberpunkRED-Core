/* eslint-disable no-shadow */
/* global Dialog renderTemplate FormDataExtended foundry */
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

export default class NetarchLevelPrompt {
  static async RenderPrompt(data) {
    LOGGER.trace("RenderPrompt | NetarchLevelPrompt | called.");
    const template = "systems/cyberpunk-red-core/templates/dialog/cpr-netarch-level-prompt.hbs";
    return new Promise((resolve, reject) => {
      renderTemplate(template, data).then((html) => {
        const _onCancel = () => {
          LOGGER.trace("_onCancel | Dialog NetarchLevelPrompt | called.");
          reject(new Error("Promise rejected: Window Closed"));
        };
        const _onConfirm = (html) => {
          LOGGER.trace("_onConfirm | Dialog NetarchLevelPrompt | called.");
          const fd = new FormDataExtended(html.find("form")[0]);
          const formData = foundry.utils.expandObject(fd.object);
          resolve(formData);
        };
        new Dialog({
          title: SystemUtils.Localize("CPR.dialog.netArchitectureNewFloor.title"),
          content: html,
          buttons: {
            cancel: {
              icon: "<i class=\"fas fa-times\"></i>",
              label: "Cancel",
              callback: (html) => _onCancel(html),
            },
            confirm: {
              icon: "<i class=\"fas fa-check\"></i>",
              label: "Confirm",
              callback: (html) => _onConfirm(html),
            },
          },
          default: "confirm",
          render: LOGGER.trace("confirm | Dialog NetarchLevelPrompt | called."),
          close: () => {
            reject(new Error("Promise rejected: Window Closed"));
          },
        }).render(true);
      });
    });
  }
}
