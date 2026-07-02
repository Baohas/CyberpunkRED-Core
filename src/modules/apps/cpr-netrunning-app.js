import CPR from "../system/config.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * The Netrunning App renders a NET Architecture (installed on an Access Point actor) as an
 * 80s-CRT phosphor terminal. It is a standalone ApplicationV2 — NOT a document sheet — so it can
 * be opened for players who do not own the Access Point actor (a DocumentSheet would refuse to
 * render without ownership). It reads the AP actor's data and re-renders when it changes.
 *
 * Keyed by AP actor id, so every access point into one architecture focuses the same window.
 */
export default class CPRNetrunningApp extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  constructor(options = {}) {
    super(options);
    this.apActor = options.apActor;
  }

  static DEFAULT_OPTIONS = {
    classes: ["cpr-netrunning-app"],
    tag: "div",
    position: { width: 920, height: 660 },
    window: {
      title: "CPR.netArchitecture.app.title",
      icon: "fa-solid fa-network-wired",
      resizable: true,
    },
    actions: {},
  };

  static PARTS = {
    body: {
      template: `systems/${CPR.systemId}/templates/apps/netrunning/cpr-netrunning-app.hbs`,
    },
  };

  /** @override */
  get title() {
    const arch = this.apActor?.installedNetarch;
    return `NET // ${arch ? arch.name : "—"}`;
  }

  /**
   * Open (or focus) the Netrunning App for an Access Point actor.
   *
   * @param {Actor} apActor - the accessPoint actor whose installed architecture to render
   * @returns {CPRNetrunningApp}
   */
  static open(apActor) {
    const id = `netrunning-app-${apActor.id}`;
    const existing = foundry.applications.instances.get(id);
    if (existing) {
      existing.bringToFront();
      return existing;
    }
    const app = new CPRNetrunningApp({ id, apActor });
    app.render(true);
    return app;
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const arch = this.apActor?.installedNetarch;
    context.hasArch = !!arch;
    context.archName = arch?.name ?? "";
    context.difficulty = arch
      ? CPR.netArchDifficulty[arch.system.difficulty]
      : "";
    context.floors = (this.apActor?.getFloors() ?? []).map((floor) => ({
      depth: floor.depth,
      branch: floor.branch,
      content: floor.content,
      contentLabel: CPR.netArchFloorContent[floor.content],
      dv: floor.dv,
      dvRevealed: floor.dvRevealed,
      revealed: floor.revealed,
      iceName: floor.iceName,
      isIce: floor.content === "blackIce" || floor.content === "demon",
    }));
    // Reuse the pause-menu accessibility signal: calm the CRT effects under photosensitive mode.
    context.reducedMotion = game.settings.get("core", "photosensitiveMode");
    return context;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    // Re-render when the backing AP actor or one of its embedded items changes.
    if (this.#updateActorHook) return;
    this.#updateActorHook = Hooks.on("updateActor", (actor) => {
      if (actor.id === this.apActor?.id) this.render();
    });
    this.#updateItemHook = Hooks.on("updateItem", (item) => {
      if (item.parent?.id === this.apActor?.id) this.render();
    });
  }

  /** @override */
  async close(options) {
    if (this.#updateActorHook) Hooks.off("updateActor", this.#updateActorHook);
    if (this.#updateItemHook) Hooks.off("updateItem", this.#updateItemHook);
    this.#updateActorHook = null;
    this.#updateItemHook = null;
    return super.close(options);
  }

  #updateActorHook = null;

  #updateItemHook = null;
}
