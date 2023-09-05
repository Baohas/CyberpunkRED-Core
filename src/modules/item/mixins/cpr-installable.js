/* eslint-disable no-await-in-loop */
/* global game */
import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import CPRDialog from "../../dialog/cpr-dialog-application.js";

const Installable = function Installable() {
  /**
   * Install this item into a container type item
   *
   * This is only ever called from the actor sheet.
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
   * If specific container items are provided, this item will only be uninstalled from those.
   * Otherwise, the item will be installed from all locations.
   *
   * @async
   * @param {Array<CPRItem(Container)>} providedContainers - a list of specific containers to uninstall this item from.
   * @returns {Promise}
   */
  this.uninstall = async function uninstall(providedContainers) {
    LOGGER.trace("uninstall | Installable | Called.");
    const { actor } = this;

    // In theory, something could be installed in multiple items.
    // In practice, this is currently only true for ammo items.
    let containers;
    if (providedContainers?.length > 0) {
      containers = providedContainers;
    } else {
      containers = actor
        ? this.actor.getMultipleOwnedItems(this.system.installedIn)
        : game.items.filter((i) => this.system.installedIn.includes(i.id));
    }

    // Turn container item names into a string for the dialog.
    const containerItemNames = containers
      .map((c) => c.name)
      .reduce((accumulator, currentValue) => `${accumulator}, ${currentValue}`);

    // Show "Default" dialog.
    const confirmUninstall = await CPRDialog.showDialog(
      {
        dialogMessage: SystemUtils.Format(
          "CPR.dialog.uninstallConfirmation.message",
          {
            installableItemName: this.name,
            containerItemName: containerItemNames,
          }
        ),
      },
      // Set the options for the dialog.
      {
        title: SystemUtils.Localize("CPR.dialog.uninstallConfirmation.title"),
      }
    ).catch((err) => LOGGER.debug(err));

    if (!confirmUninstall) {
      return Promise.resolve();
    }

    const uninstallPromises = [];
    for (const container of containers) {
      // Generate a list of promises.
      uninstallPromises.push(container.uninstallItems([this]));
    }
    // Resolve all of the promises.
    return Promise.all(uninstallPromises);
  };
};

export default Installable;
