/* eslint-disable no-await-in-loop */
/* global fromUuidSync game */
import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import CPRDialog from "../../dialog/cpr-dialog-application.js";

const Installable = function Installable() {
  /**
   * Install this item into a container type item
   *
   * @async
   */
  this.install = async function install() {
    LOGGER.trace("install | Installable | Called.");
    if (!this.actor) {
      return;
    }

    const { actor } = this;
    const installationType = this.type;
    const containerTypes = SystemUtils.GetTemplateItemTypes("container");

    const installationTargets = [];
    const installationTargetTypes = [];

    for (const containerType of containerTypes) {
      for (const item of actor.itemTypes[containerType]) {
        if (
          item.system.installedItems.allowed &&
          item.system.installedItems.allowedTypes.includes(installationType) &&
          item.availableInstallSlots() >= this.system.size
        ) {
          if (installationType === "itemUpgrade") {
            if (item.type === this.system.type) {
              installationTargets.push(item);
            }
          } else {
            installationTargets.push(item);
          }
          if (
            installationTargets.includes(item) &&
            !installationTargetTypes.includes(item.type)
          ) {
            installationTargetTypes.push(item.type);
          }
        }
      }
    }
    const dialogPromptHeader =
      installationTargets.length > 0
        ? SystemUtils.Format("CPR.dialog.selectInstallTarget.header", {
            installable: this.name,
          })
        : SystemUtils.Format("CPR.dialog.selectInstallTarget.noOptions", {
            target: this.name,
          });

    let dialogData = {
      header: dialogPromptHeader,
      installationTargetTypes,
      installationTargets,
      size: this.system.size,
    };

    // Show "Select Intall Targets" dialog.
    dialogData = await CPRDialog.showDialog(
      dialogData,
      // Set options for the dialog.
      {
        title: SystemUtils.Localize("CPR.dialog.selectInstallTarget.title"),
        template: `systems/${game.system.id}/templates/dialog/cpr-select-install-targets-prompt.hbs`,
      }
    ).catch((err) => LOGGER.debug(err));
    if (dialogData === undefined || dialogData.selectedTarget === null) {
      return;
    }

    const targetItem = actor.getOwnedItem(dialogData.selectedTarget);

    if (targetItem) {
      await targetItem.installItems([this]);
    }
  };

  /**
   * Uninstall this item.
   *
   * @async
   */
  this.uninstall = async function uninstall() {
    LOGGER.trace("uninstall | Installable | Called.");
    const actor = this.isEmbedded ? this.actor : false;
    const container = actor
      ? actor.getOwnedItem(this.system.installedIn)
      : game.items.get(this.system.installedIn);
    return container.uninstallItems([this]);
  };
};

export default Installable;
