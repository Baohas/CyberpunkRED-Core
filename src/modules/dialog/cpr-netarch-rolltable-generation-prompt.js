/* eslint-disable no-shadow */
/* global Dialog renderTemplate FormDataExtended foundry */
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

export default class NetarchRolltableGenerationPrompt {
  static async RenderPrompt() {
    LOGGER.trace("RenderPrompt | NetarchRolltableGenerationPrompt | called.");
    const template = "systems/cyberpunk-red-core/templates/dialog/cpr-netarch-rolltable-generation-prompt.hbs";
    return new Promise((resolve, reject) => {
      renderTemplate(template).then((html) => {
        const _onCancel = () => {
          LOGGER.trace("_onCancel | Dialog NetarchRolltableGenerationPrompt | called.");
          reject(new Error("Promise rejected: Window Closed"));
        };
        const _onConfirm = (html) => {
          LOGGER.trace("_onConfirm | Dialog NetarchRolltableGenerationPrompt | called.");
          const fd = new FormDataExtended(html.find("form")[0]);
          const formData = foundry.utils.expandObject(fd.object);
          resolve(formData);
        };
        new Dialog({
          title: SystemUtils.Localize("CPR.dialog.netArchitectureRolltableSelection.title"),
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
          render: LOGGER.trace("confirm | Dialog NetarchRolltableGenerationPrompt | called."),
          close: () => {
            reject(new Error("Promise rejected: Window Closed"));
          },
        }).render(true);
      });
    });
  }
}
