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
      toggleRez: CPRNetrunningApp.#onToggleRez,
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
    const floorList = this.apActor?.getFloors() ?? [];
    // The deepest floor(s) are the "root" — the CPU/core; a Virus can only be planted on a root.
    const maxDepth = floorList.reduce((max, f) => Math.max(max, f.depth), 0);
    const processed = floorList.map((floor) => {
      const key = `${floor.depth}${floor.branch ?? ""}`;
      const isIce = floor.content === "blackIce" || floor.content === "demon";
      // Resolve the linked live program instance for its REZ (Black-ICE/Demon floors).
      const program =
        isIce && floor.programUuid ? fromUuidSync(floor.programUuid) : null;
      return {
        key,
        depth: floor.depth,
        branch: floor.branch,
        // Row label, e.g. "03a" — zero-padded depth + branch id.
        label: `${String(floor.depth).padStart(2, "0")}${floor.branch ?? ""}`,
        content: floor.content,
        contentLabel: CPR.netArchFloorContent[floor.content],
        dv: floor.dv,
        dvRevealed: floor.dvRevealed,
        revealed: floor.revealed,
        iceName: floor.iceName,
        isIce,
        isRoot: maxDepth > 0 && floor.depth === maxDepth,
        rez: program?.system.rez ?? null,
        derezzed: program ? program.system.rez.value <= 0 : false,
        runnersHere: runners.filter((runner) => runner.floor === key),
      };
    });
    // A split architecture renders as a column tree: the app template recurses over this structure,
    // stacking a line's floors and laying its child lines out side-by-side.
    context.tree = CPRNetrunningApp.#buildFloorTree(processed);
    // The runners the current viewer controls (GM controls all NPC runners), each enriched with
    // the programs installed on the deck they jacked in with (for rez/derez in the panel).
    context.myRunners = runners
      .filter((runner) => game.user.isGM || runner.userId === game.user.id)
      .map((runner) => {
        const deck = game.actors.get(runner.id)?.items.get(runner.deckId);
        const programs = (deck?.system.installedPrograms ?? []).map(
          (program) => ({
            id: program.id,
            name: program.name,
            classLabel: CPR.programClassList[program.system.class] ?? "",
            rezzed: !!program.system.isRezzed,
          }),
        );
        return { ...runner, programs };
      });
    context.abilities = CPRNetrunningApp.ABILITIES.map((key) => ({
      key,
      label: CPR.interfaceAbilities[key],
    }));
    // Reuse the pause-menu accessibility signal: calm the CRT effects under photosensitive mode.
    context.reducedMotion = game.settings.get("core", "photosensitiveMode");
    return context;
  }

  /**
   * Assemble the flat floor list into a nested line tree for the column-tree render. Floors are
   * grouped into lines by branch path; each line links under its parent (its path minus the last
   * ".segment"), so a split renders as sibling child lines laid out side-by-side.
   *
   * @param {Array} floors - processed floor objects (each with `depth` and `branch`)
   * @returns {Object} the root line node `{ path, floors, children }`
   */
  static #buildFloorTree(floors) {
    const lines = new Map();
    const lineFor = (branch) => {
      const key = branch ?? "";
      if (!lines.has(key)) {
        lines.set(key, { path: branch ?? null, floors: [], children: [] });
      }
      return lines.get(key);
    };
    [...floors]
      .sort((a, b) => a.depth - b.depth)
      .forEach((floor) => lineFor(floor.branch).floors.push(floor));
    [...lines.entries()].forEach(([key, line]) => {
      if (key === "") return; // the main spine is the root
      const segments = key.split(".");
      segments.pop();
      lineFor(segments.join(".") || null).children.push(line);
    });
    lines.forEach((line) =>
      line.children.sort((a, b) => (a.path ?? "").localeCompare(b.path ?? "")),
    );
    return lineFor(null);
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
    if (!runner) return;
    if (
      runner.controlledNode &&
      runner.controlledNode !== target.dataset.floor
    ) {
      await this.#revokeControl(runner);
    }
    await this.#updateRunner(runner.id, { floor: target.dataset.floor });
  }

  /** End the viewer's NET turn: reset the NET-action budget. @this {CPRNetrunningApp} */
  static async #onEndTurn() {
    const runner = this.#primaryRunner();
    if (runner) {
      await this.#updateRunner(runner.id, { netActions: runner.maxNetActions });
    }
  }

  /** Jack the viewer's runner out: revoke any control, then remove it. @this {CPRNetrunningApp} */
  static async #onJackOut() {
    const runner = this.#primaryRunner();
    if (!runner) return;
    await this.#revokeControl(runner);
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

  /** Eye-Dee a File floor: reveal it and open its linked Item/Journal, if any. @this {CPRNetrunningApp} */
  static async #onEyeDee() {
    const runner = this.#primaryRunner();
    if (!runner) return;
    const floor = this.#currentFloor(runner);
    if (floor?.content !== "file") {
      ui.notifications.warn(
        game.i18n.localize("CPR.netArchitecture.app.wrongFloor"),
      );
      return;
    }
    if (!(await this.#spendAction(runner))) return;
    await this.#updateFloor(runner.floor, { revealed: true, dvRevealed: true });
    if (floor.fileContentUuid) {
      const doc = await fromUuid(floor.fileContentUuid);
      doc?.sheet?.render(true);
    }
  }

  /**
   * Seize a Control Node floor: reveal it and grant the runner's user OWNER of the linked device
   * actors (so they gain control + vision), via the GM relay. The prior ownership is snapshotted
   * on the runner so it can be restored when they leave the floor or Jack Out. @this {CPRNetrunningApp}
   */
  static async #onControl() {
    const runner = this.#primaryRunner();
    if (!runner) return;
    const floor = this.#currentFloor(runner);
    if (floor?.content !== "controlNode") {
      ui.notifications.warn(
        game.i18n.localize("CPR.netArchitecture.app.wrongFloor"),
      );
      return;
    }
    if (!(await this.#spendAction(runner))) return;
    await this.#updateFloor(runner.floor, { revealed: true, dvRevealed: true });

    const OWNER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
    // Snapshot prior ownership as an ARRAY — UUIDs contain dots, and Foundry expands dotted
    // object keys into nested structures when persisted to flags, which would corrupt a map.
    const controlled = [];
    for (const uuid of floor.controlNodeDeviceUuids ?? []) {
      // eslint-disable-next-line no-await-in-loop
      const device = await fromUuid(uuid);
      if (!device) continue;
      controlled.push({
        uuid,
        prior:
          device.ownership?.[runner.userId] ?? device.ownership?.default ?? 0,
      });
      // eslint-disable-next-line no-await-in-loop
      await CPRNetSocket.request("ownership", {
        uuid,
        userId: runner.userId,
        level: OWNER,
      });
    }
    await this.#updateRunner(runner.id, {
      controlledNode: runner.floor,
      controlled,
    });
  }

  /** Restore prior ownership of any devices the runner controlled, and clear the grant. */
  async #revokeControl(runner) {
    const controlled = runner.controlled ?? [];
    for (const { uuid, prior } of controlled) {
      // eslint-disable-next-line no-await-in-loop
      await CPRNetSocket.request("ownership", {
        uuid,
        userId: runner.userId,
        level: prior,
      });
    }
    if (controlled.length) {
      await this.#updateRunner(runner.id, {
        controlled: [],
        controlledNode: null,
      });
    }
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
      if (runner.controlledNode) await this.#revokeControl(runner);
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

  /** Virus: plant a persistent virus — only on a root (deepest) floor. @this {CPRNetrunningApp} */
  static async #onVirus() {
    const runner = this.#primaryRunner();
    if (!runner) return;
    const floor = this.#currentFloor(runner);
    const floors = this.apActor?.getFloors() ?? [];
    const maxDepth = floors.reduce((max, f) => Math.max(max, f.depth), 0);
    if (!floor || floor.depth !== maxDepth) {
      ui.notifications.warn(
        game.i18n.localize("CPR.netArchitecture.app.virusRootOnly"),
      );
      return;
    }
    if (!(await this.#spendAction(runner))) return;
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

  /**
   * Rez / derez one of the runner's own deck programs (their actor, so no relay needed).
   *
   * @this {CPRNetrunningApp}
   * @param {PointerEvent} event
   * @param {HTMLElement} target - carries data-actor and data-program
   */
  static async #onToggleRez(event, target) {
    const program = game.actors
      .get(target.dataset.actor)
      ?.items.get(target.dataset.program);
    if (!program) return;
    await program.update({ "system.isRezzed": !program.system.isRezzed });
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
      if (doc.id === apId || doc.parent?.id === apId) {
        this.render();
        return;
      }
      // A jacked-in runner's own item changed (e.g. a deck program rez/derez).
      const runnerIds = Object.keys(
        this.apActor?.getFlag(game.system.id, "runners") ?? {},
      );
      if (doc.parent && runnerIds.includes(doc.parent.id)) this.render();
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
