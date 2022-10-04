/* global renderTemplate, Dialog */
import SystemUtils from "../utils/cpr-systemUtils.js";
import LOGGER from "../utils/cpr-logger.js";

export default class ContainerVendorSellToPrompt {
  static async RenderPrompt(data) {
    LOGGER.trace("RenderPrompt | ContainerVendorPurchaseOrderPrompt | called.");
    return new Promise((resolve, reject) => {
      renderTemplate("systems/cyberpunk-red-core/templates/dialog/cpr-confirmation-prompt.hbs", data).then((html) => {
        const _onCancel = () => {
          LOGGER.trace("_onCancel | Dialog ContainerVendorPurchaseOrderPrompt | called.");
          reject(new Error("Promise rejected: Window Closed"));
        };
        // eslint-disable-next-line no-shadow
        const _onConfirm = () => {
          LOGGER.trace("_onConfirm | Dialog ContainerVendorPurchaseOrderPrompt | called.");
          resolve(true);
        };
        new Dialog({
          title: SystemUtils.Localize("CPR.dialog.container.vendor.purchaseOrderTitle"),
          content: html,
          buttons: {
            cancel: {
              icon: "<i class=\"fas fa-times\"></i>",
              label: SystemUtils.Localize("CPR.dialog.container.vendor.decline"),
              callback: () => _onCancel(),
            },
            confirm: {
              icon: "<i class=\"fas fa-check\"></i>",
              label: SystemUtils.Localize("CPR.dialog.container.vendor.accept"),
              // eslint-disable-next-line no-shadow
              callback: () => _onConfirm(),
            },
          },
          default: "confirm",
          render: LOGGER.trace("confirm | Dialog ContainerVendorPurchaseOrderPrompt | called."),
          close: () => {
            reject(new Error("Promise rejected: Window Closed"));
          },
        }).render(true);
      });
    });
  }
}
