import CPR from "../../system/config.js";
import CPRNetrunningApp from "../../apps/cpr-netrunning-app.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * The Access Point actor's sheet — the GM's config surface. It shows the installed NET
 * Architecture (or an empty state), lets the GM install/replace/remove one, and launches the
 * standalone Netrunning App. It is an owner-gated document sheet (only the GM configures it);
 * the shared board is a separate standalone app opened for players via their cyberdeck.
 *
 * NOTE: the drag-to-install and dropdown wiring is completed under live testing (Task #4);
 * this class currently renders the installed/empty state and the Open App / Remove actions.
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
    context.enrichedNotes =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.actor.system.notes,
        { relativeTo: this.actor, secrets: this.actor.isOwner },
      );
    return context;
  }

  /**
   * Launch the standalone Netrunning App for this access point (implemented in Phase B).
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
