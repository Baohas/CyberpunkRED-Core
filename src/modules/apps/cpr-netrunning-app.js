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
      pathfinder: CPRNetrunningApp.#onPathfinder,
      backdoor: CPRNetrunningApp.#onBackdoor,
      eyedee: CPRNetrunningApp.#onEyeDee,
      control: CPRNetrunningApp.#onControl,
      slide: CPRNetrunningApp.#onSlide,
      cloak: CPRNetrunningApp.#onCloak,
      virus: CPRNetrunningApp.#onVirus,
      zap: CPRNetrunningApp.#onZap,
    },
  };

  /** The interface abilities shown as buttons in the runner panel. */
  static ABILITIES = [
    "pathfinder",
    "backdoor",
    "eyedee",
    "control",
    "zap",
    "slide",
    "cloak",
    "virus",
  ];

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
      const isIce = floor.content === "blackIce" || floor.content === "demon";
      // Resolve the linked live program instance for its REZ (Black-ICE/Demon floors).
      const program =
        isIce && floor.programUuid ? fromUuidSync(floor.programUuid) : null;
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
        isIce,
        rez: program?.system.rez ?? null,
        derezzed: program ? program.system.rez.value <= 0 : false,
        runnersHere: runners.filter((runner) => runner.floor === key),
      };
    });
    // The runners the current viewer controls (GM controls all NPC runners).
    context.myRunners = runners.filter(
      (runner) => game.user.isGM || runner.userId === game.user.id,
    );
    context.abilities = CPRNetrunningApp.ABILITIES.map((key) => ({
      key,
      label: CPR.interfaceAbilities[key],
    }));
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

  /** The floor the runner is standing on (matched by depth+branch key). */
  #currentFloor(runner) {
    return (this.apActor?.getFloors() ?? []).find(
      (floor) => `${floor.depth}${floor.branch ?? ""}` === runner.floor,
    );
  }

  /**
   * Spend one of the runner's NET actions. Warns and returns false when the budget is empty.
   *
   * @returns {Promise<boolean>}
   */
  async #spendAction(runner) {
    if (runner.netActions <= 0) {
      ui.notifications.warn(
        game.i18n.localize("CPR.netArchitecture.app.noNetActions"),
      );
      return false;
    }
    await this.#updateRunner(runner.id, { netActions: runner.netActions - 1 });
    return true;
  }

  /** Apply changes to a floor of the installed architecture via the GM relay. */
  async #updateFloor(floorKey, changes) {
    const netarch = this.apActor?.installedNetarch;
    if (!netarch) return;
    const floors = foundry.utils.deepClone(netarch.system.floors);
    const floor = floors.find(
      (entry) => `${entry.depth}${entry.branch ?? ""}` === floorKey,
    );
    if (!floor) return;
    Object.assign(floor, changes);
    await CPRNetSocket.request("update", {
      uuid: netarch.uuid,
      data: { "system.floors": floors },
    });
  }

  /** Reveal the current floor's content + DV if it matches a node type (Backdoor/Eye-Dee/Control). */
  async #openCurrentNode(contentType) {
    const runner = this.#primaryRunner();
    if (!runner) return;
    const floor = this.#currentFloor(runner);
    if (floor?.content !== contentType) {
      ui.notifications.warn(
        game.i18n.localize("CPR.netArchitecture.app.wrongFloor"),
      );
      return;
    }
    if (!(await this.#spendAction(runner))) return;
    await this.#updateFloor(runner.floor, { revealed: true, dvRevealed: true });
  }

  /** Pathfinder: reveal the next unrevealed floor. @this {CPRNetrunningApp} */
  static async #onPathfinder() {
    const runner = this.#primaryRunner();
    if (!runner || !(await this.#spendAction(runner))) return;
    const next = (this.apActor?.getFloors() ?? [])
      .filter((floor) => !floor.revealed)
      .sort((a, b) => a.depth - b.depth)[0];
    if (next) {
      await this.#updateFloor(`${next.depth}${next.branch ?? ""}`, {
        revealed: true,
      });
    }
  }

  /** Backdoor a Password floor. @this {CPRNetrunningApp} */
  static async #onBackdoor() {
    await this.#openCurrentNode("password");
  }

  /** Eye-Dee a File floor. @this {CPRNetrunningApp} */
  static async #onEyeDee() {
    await this.#openCurrentNode("file");
  }

  /** Seize a Control Node floor. @this {CPRNetrunningApp} */
  static async #onControl() {
    await this.#openCurrentNode("controlNode");
  }

  /** Slide: flee one floor shallower (toward the entry). @this {CPRNetrunningApp} */
  static async #onSlide() {
    const runner = this.#primaryRunner();
    if (!runner || !(await this.#spendAction(runner))) return;
    const current = this.#currentFloor(runner);
    const target = (this.apActor?.getFloors() ?? [])
      .filter(
        (floor) =>
          (floor.branch ?? "") === (current?.branch ?? "") &&
          floor.depth < (current?.depth ?? 1),
      )
      .sort((a, b) => b.depth - a.depth)[0];
    if (target) {
      await this.#updateRunner(runner.id, {
        floor: `${target.depth}${target.branch ?? ""}`,
      });
    }
  }

  /** Cloak: roll Interface + 1d10 and store the runner's Cloak DV. @this {CPRNetrunningApp} */
  static async #onCloak() {
    const runner = this.#primaryRunner();
    if (!runner || !(await this.#spendAction(runner))) return;
    const roll = await new Roll("1d10").evaluate();
    await this.#updateRunner(runner.id, { cloak: roll.total });
  }

  /** Virus: plant a persistent virus on the runner's current floor. @this {CPRNetrunningApp} */
  static async #onVirus() {
    const runner = this.#primaryRunner();
    if (!runner || !(await this.#spendAction(runner))) return;
    await this.#updateFloor(runner.floor, { virusPlanted: true });
  }

  /** Zap: 1d6 to the current-floor Black-ICE/Demon program's REZ (Derezzed at 0). @this {CPRNetrunningApp} */
  static async #onZap() {
    const runner = this.#primaryRunner();
    if (!runner) return;
    const floor = this.#currentFloor(runner);
    if (
      !floor ||
      !(floor.content === "blackIce" || floor.content === "demon")
    ) {
      ui.notifications.warn(
        game.i18n.localize("CPR.netArchitecture.app.wrongFloor"),
      );
      return;
    }
    const program = floor.programUuid
      ? await fromUuid(floor.programUuid)
      : null;
    if (!program) {
      ui.notifications.warn(
        game.i18n.localize("CPR.netArchitecture.app.noProgram"),
      );
      return;
    }
    if (!(await this.#spendAction(runner))) return;
    const roll = await new Roll("1d6").evaluate();
    const newRez = Math.max(0, program.system.rez.value - roll.total);
    await roll.toMessage({
      flavor: game.i18n.format("CPR.netArchitecture.app.zapRoll", {
        target: program.name,
        rez: newRez,
      }),
    });
    await CPRNetSocket.request("update", {
      uuid: program.uuid,
      data: { "system.rez.value": newRez },
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
