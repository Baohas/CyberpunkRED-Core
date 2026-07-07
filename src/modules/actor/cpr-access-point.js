import LOGGER from "../utils/cpr-logger.js";

/**
 * A CPRAccessPointActor is a canvas anchor for a NET Architecture. Its linked tokens are the
 * physical access points a netrunner jacks into; its data (the installed NET Architecture +
 * embedded ICE/Demon Program instances) is read by the standalone Netrunning App. It extends
 * Foundry's Actor directly (like the other standalone NET actors), not the shared CPRActor.
 *
 * @extends {Actor}
 */
export default class CPRAccessPointActor extends Actor {
  /**
   * On creation, configure the prototype token so every dropped access point is a linked,
   * bar-less anchor rather than a creature token. Note: `hidden` is a placed-token-only field
   * (PrototypeToken has no `hidden`), so "hidden until Scanner reveals it" is applied when the
   * token is placed on the scene (Phase B: the dropCanvasData/preCreateToken install path),
   * not here.
   *
   * @static
   * @async
   * @param {Object} data - creation data
   * @param {Object} options - passed through to the parent
   */
  static async create(data, options) {
    const createData = data;
    if (typeof data.system === "undefined") {
      createData.prototypeToken = {
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
        bar1: { attribute: null },
        bar2: { attribute: null },
      };
    }
    return super.create(createData, options);
  }

  /**
   * The NET Architecture Item currently installed on this access point, if any.
   *
   * @returns {CPRItem|undefined}
   */
  get installedNetarch() {
    return this.itemTypes.netarch[0];
  }

  /**
   * The installed architecture's floors, sorted by branch then depth (main line first).
   *
   * @returns {Array} floor objects, or [] when nothing is installed
   */
  getFloors() {
    const netarch = this.installedNetarch;
    if (!netarch) return [];
    return [...netarch.system.floors].sort((a, b) => {
      const branchA = a.branch ?? "";
      const branchB = b.branch ?? "";
      if (branchA !== branchB) return branchA.localeCompare(branchB);
      return a.depth - b.depth;
    });
  }

  /**
   * Install a NET Architecture onto this access point: embed a snapshot copy of the Item and
   * instantiate an embedded Program for each Black-ICE/Demon floor that links one, so REZ is
   * live per-instance state. Any previously installed architecture is removed first.
   *
   * @async
   * @param {CPRItem} netarchItem - the source NET Architecture Item
   */
  async installArchitecture(netarchItem) {
    if (netarchItem?.type !== "netarch") {
      LOGGER.warn("installArchitecture | ignoring non-netarch item");
      return;
    }
    await this.uninstallArchitecture();

    const netarchData = netarchItem.toObject();
    delete netarchData._id;
    const [installed] = await this.createEmbeddedDocuments("Item", [
      netarchData,
    ]);

    // Instantiate the linked ICE/Demon programs as embedded copies (live REZ), then relink each
    // floor to its embedded instance so REZ is shared, live state the Netrunning App can mutate.
    const floors = foundry.utils.deepClone(installed.system.floors);
    const programData = [];
    const floorForProgram = [];
    for (let i = 0; i < floors.length; i += 1) {
      if (!floors[i].programUuid) continue;
      // eslint-disable-next-line no-await-in-loop
      const program = await fromUuid(floors[i].programUuid);
      if (program?.type === "program") {
        const data = program.toObject();
        delete data._id;
        programData.push(data);
        floorForProgram.push(i);
      }
    }
    if (programData.length) {
      const createdPrograms = await this.createEmbeddedDocuments(
        "Item",
        programData,
      );
      createdPrograms.forEach((program, idx) => {
        floors[floorForProgram[idx]].programUuid = program.uuid;
      });
      await installed.update({ "system.floors": floors });
    }
  }

  /**
   * Remove the installed architecture and all its instantiated programs.
   *
   * @async
   */
  async uninstallArchitecture() {
    const ids = this.items
      .filter((i) => i.type === "netarch" || i.type === "program")
      .map((i) => i.id);
    if (ids.length) await this.deleteEmbeddedDocuments("Item", ids);
  }
}
