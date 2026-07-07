import CPR from "../../system/config.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import CPRNetrunningApp from "../../apps/cpr-netrunning-app.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * The Access Point actor's sheet — the GM's config surface. It shows the installed NET
 * Architecture (or an empty state), lets the GM install/replace/remove one (by dropping a NET
 * Architecture Item on it or picking from the dropdown), and launches the standalone Netrunning
 * App. It is an owner-gated document sheet (only the GM configures it); the shared board is a
 * separate standalone app opened for players via their cyberdeck.
 */
export default class CPRAccessPointSheet extends HandlebarsApplicationMixin(
  ActorSheetV2,
) {
  static DEFAULT_OPTIONS = {
    classes: ["cyberpunk-red-core", "sheet", "actor", "access-point"],
    position: { width: 520, height: "auto" },
    window: { icon: "fa-solid fa-network-wired", resizable: true },
    actions: {
      openApp: CPRAccessPointSheet.#onOpenApp,
      uninstall: CPRAccessPointSheet.#onUninstall,
    },
    form: { submitOnChange: true },
  };

  static PARTS = {
    body: {
      template: `systems/${CPR.systemId}/templates/actor/access-point/cpr-access-point-sheet.hbs`,
    },
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.system = this.actor.system;
    context.installedNetarch = this.actor.installedNetarch ?? null;
    context.floors = this.actor.getFloors();
    context.netArchFloorContent = CPR.netArchFloorContent;
    context.availableNetarchs = game.items
      .filter((item) => item.type === "netarch")
      .map((item) => ({ uuid: item.uuid, name: item.name }));
    context.enrichedNotes =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.actor.system.notes,
        { relativeTo: this.actor, secrets: this.actor.isOwner },
      );
    return context;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this.element
      .querySelector(".ap-netarch-select")
      ?.addEventListener("change", this.#onSelectNetarch.bind(this));
    // Accept drops of a NET Architecture Item to install it.
    this.element.addEventListener("dragover", (event) =>
      event.preventDefault(),
    );
    this.element.addEventListener("drop", this.#onDrop.bind(this));
  }

  /**
   * Install (or replace/remove) the architecture chosen in the dropdown.
   *
   * @param {Event} event
   */
  async #onSelectNetarch(event) {
    const { value } = event.target;
    if (!value) {
      await this.actor.uninstallArchitecture();
      this.render();
      return;
    }
    const netarch = await fromUuid(value);
    if (netarch?.type === "netarch" && (await this.#confirmReplace(netarch))) {
      await this.actor.installArchitecture(netarch);
    }
    this.render();
  }

  /**
   * Install a NET Architecture Item dropped onto the sheet.
   *
   * @param {DragEvent} event
   */
  async #onDrop(event) {
    event.preventDefault();
    const data =
      foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (data?.type !== "Item") return;
    const item = await fromUuid(data.uuid);
    if (item?.type !== "netarch") return;
    if (await this.#confirmReplace(item)) {
      await this.actor.installArchitecture(item);
      this.render();
    }
  }

  /**
   * If an architecture is already installed, confirm replacing it.
   *
   * @param {Item} netarch - the incoming architecture
   * @returns {Promise<boolean>} true to proceed
   */
  async #confirmReplace(netarch) {
    const installed = this.actor.installedNetarch;
    if (!installed) return true;
    return foundry.applications.api.DialogV2.confirm({
      window: { title: SystemUtils.Localize("CPR.netArchitecture.app.remove") },
      content: SystemUtils.Format("CPR.netArchitecture.app.replaceConfirm", {
        current: installed.name,
        incoming: netarch.name,
      }),
    });
  }

  /**
   * Launch the standalone Netrunning App for this access point.
   *
   * @this {CPRAccessPointSheet}
   */
  static async #onOpenApp() {
    CPRNetrunningApp.open(this.actor);
  }

  /**
   * Remove the installed architecture.
   *
   * @this {CPRAccessPointSheet}
   */
  static async #onUninstall() {
    await this.actor.uninstallArchitecture();
    this.render();
  }
}
