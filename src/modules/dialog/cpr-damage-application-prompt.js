/* eslint-disable no-shadow */
/* global renderTemplate, Dialog, FormDataExtended, foundry */
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
        const _onConfirm = (html) => {
          LOGGER.trace("_onConfirm | Dialog DamageApplicationPrompt | called.");
          const damageReductionRole = html.find("[name=\"damageReductionRole\"");
          const damageReductionAE = html.find("[name=\"damageReductionAE\"");
          const useShield = html.find("[name=\"useShield\"");
          const brainDamageReduction = html.find("[name=\"brainDamageReduction\"");
          const fd = new FormDataExtended(html.find("form")[0]);
          const formData = foundry.utils.expandObject(fd.object);
          if (useShield.checked) {
            formData.useShield = true;
          }
          if (damageReductionRole.checked) {
            formData.damageReductionRole = true;
          }
          if (damageReductionAE.checked) {
            formData.damageReductionAE = true;
          }
          if (brainDamageReduction.checked) {
            formData.brainDamageReduction = true;
          }
          resolve(formData);
        };
        new Dialog({
          title,
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
