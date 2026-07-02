import CPR from "../system/config.js";
import CPRNetSocket from "../system/net-socket.js";

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
    actions: {
      moveTo: CPRNetrunningApp.#onMoveTo,
      endTurn: CPRNetrunningApp.#onEndTurn,
      jackOut: CPRNetrunningApp.#onJackOut,
    },
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
    const runners = this.#runners();
    context.floors = (this.apActor?.getFloors() ?? []).map((floor) => {
      const key = `${floor.depth}${floor.branch ?? ""}`;
      return {
        key,
        depth: floor.depth,
        branch: floor.branch,
        content: floor.content,
        contentLabel: CPR.netArchFloorContent[floor.content],
        dv: floor.dv,
        dvRevealed: floor.dvRevealed,
        revealed: floor.revealed,
        iceName: floor.iceName,
        isIce: floor.content === "blackIce" || floor.content === "demon",
        runnersHere: runners.filter((runner) => runner.floor === key),
      };
    });
    // The runners the current viewer controls (GM controls all NPC runners).
    context.myRunners = runners.filter(
      (runner) => game.user.isGM || runner.userId === game.user.id,
    );
    // Reuse the pause-menu accessibility signal: calm the CRT effects under photosensitive mode.
    context.reducedMotion = game.settings.get("core", "photosensitiveMode");
    return context;
  }

  /** The runners currently jacked in to this architecture (from shared AP flag state). */
  #runners() {
    const runners = this.apActor?.getFlag(game.system.id, "runners") ?? {};
    return Object.entries(runners).map(([id, data]) => ({ id, ...data }));
  }

  /** The runner the current viewer acts as (their own, or the first for a GM). */
  #primaryRunner() {
    const runners = this.#runners();
    return (
      runners.find((runner) => runner.userId === game.user.id) ??
      (game.user.isGM ? runners[0] : null)
    );
  }

  /** Merge changes into a runner's shared state via the GM relay. */
  async #updateRunner(id, changes) {
    const runners = foundry.utils.deepClone(
      this.apActor.getFlag(game.system.id, "runners") ?? {},
    );
    if (!runners[id]) return;
    Object.assign(runners[id], changes);
    await CPRNetSocket.request("update", {
      uuid: this.apActor.uuid,
      data: { [`flags.${game.system.id}.runners`]: runners },
    });
  }

  /** Move the viewer's runner to a floor (free action). @this {CPRNetrunningApp} */
  static async #onMoveTo(event, target) {
    const runner = this.#primaryRunner();
    if (runner)
      await this.#updateRunner(runner.id, { floor: target.dataset.floor });
  }

  /** End the viewer's NET turn: reset the NET-action budget. @this {CPRNetrunningApp} */
  static async #onEndTurn() {
    const runner = this.#primaryRunner();
    if (runner) {
      await this.#updateRunner(runner.id, { netActions: runner.maxNetActions });
    }
  }

  /** Jack the viewer's runner out: remove it from the shared state. @this {CPRNetrunningApp} */
  static async #onJackOut() {
    const runner = this.#primaryRunner();
    if (!runner) return;
    await CPRNetSocket.request("update", {
      uuid: this.apActor.uuid,
      data: { [`flags.${game.system.id}.runners.-=${runner.id}`]: null },
    });
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    if (this.#hooks.length) return;
    // Re-render on any change to the AP actor (flags = runners; notes) or its embedded items
    // (installing/uninstalling an architecture creates/deletes embedded netarch + programs;
    // floor/REZ changes update them).
    const rerenderIfMine = (doc) => {
      const apId = this.apActor?.id;
      if (doc.id === apId || doc.parent?.id === apId) this.render();
    };
    for (const event of [
      "updateActor",
      "createItem",
      "updateItem",
      "deleteItem",
    ]) {
      this.#hooks.push([event, Hooks.on(event, rerenderIfMine)]);
    }
  }

  /** @override */
  async close(options) {
    for (const [event, id] of this.#hooks) Hooks.off(event, id);
    this.#hooks = [];
    return super.close(options);
  }

  #hooks = [];
}
