import CPR from "../system/config.js";
import LOGGER from "./cpr-logger.js";
import SystemUtils from "./cpr-systemUtils.js";
import { CPRRoll } from "../rolls/cpr-rolls.js";

/**
 * Helpers for generating NET Architecture floor data from the RAW rolltables (Core p.210-211).
 * This replaces the legacy scene/tile generator entirely — it produces plain floor data for the
 * netarch Item's data model, which the Netrunning App renders.
 */
export default class CPRNetArchUtils {
  /** Difficulty key -> the "All Other Floors" rolltable name. */
  static #DIFFICULTY_TABLE = {
    basic: "All Other Floors (Basic)",
    standard: "All Other Floors (Standard)",
    uncommon: "All Other Floors (Uncommon)",
    advanced: "All Other Floors (Advanced)",
  };

  static #LOBBY_TABLE = "First Two Floors (The Lobby)";

  /**
   * Generate an architecture's floors per RAW: 3d6 floors; 1d10 >= 7 adds a branch (none before
   * floor 3); the first two floors roll on the Lobby table, the rest on the chosen difficulty's
   * table (duplicate Password/File/Control-Node results re-rolled).
   *
   * @param {String} difficulty - a key of CPR.netArchDifficulty
   * @returns {Promise<Array>} new-shape floor objects for netarch `system.floors`
   */
  static async generateFromTables(difficulty = "standard") {
    const tables = await CPRNetArchUtils.#getTables(difficulty);
    if (!tables) return [];
    const { lobby, difficultyTable } = tables;

    const floorCount = await CPRNetArchUtils.#roll("3d6");
    let splitsLeft = await CPRNetArchUtils.#rollBranches();

    // Build a split-tree of "lines". A line is a vertical run of floors; when it splits it ends and
    // forks into TWO child lines (rendered side-by-side in the app). `path` is the branch id — null
    // on the main spine, else dot-separated ("a", then "a.a"/"a.b" for a nested split). Global
    // `depth` (the row) is assigned after the tree is built; the deepest floors are the roots.
    const seen = new Set();
    const root = { path: null, floors: [], children: [] };
    const openLines = [root];

    // The first two floors are the Lobby, on the main spine.
    for (let i = 0; i < 2 && i < floorCount; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      root.floors.push(await CPRNetArchUtils.#drawFloor(lobby, seen));
    }
    let remaining = floorCount - root.floors.length;

    while (remaining > 0) {
      // A split forks a line (with ≥1 floor) into two children, giving each a floor up front so no
      // leaf is empty — hence it needs two floors left in the budget.
      const splittable = openLines.filter((l) => l.floors.length >= 1);
      // eslint-disable-next-line no-await-in-loop
      const split =
        splitsLeft > 0 &&
        remaining >= 2 &&
        splittable.length > 0 &&
        // eslint-disable-next-line no-await-in-loop
        (await CPRNetArchUtils.#roll("1d2")) === 1;

      if (split) {
        const parent =
          // eslint-disable-next-line no-await-in-loop
          splittable[
            (await CPRNetArchUtils.#roll(`1d${splittable.length}`)) - 1
          ];
        openLines.splice(openLines.indexOf(parent), 1); // the parent line ends at the split
        for (const letter of ["a", "b"]) {
          const child = {
            path: parent.path ? `${parent.path}.${letter}` : letter,
            // eslint-disable-next-line no-await-in-loop
            floors: [await CPRNetArchUtils.#drawFloor(difficultyTable, seen)],
            children: [],
          };
          parent.children.push(child);
          openLines.push(child);
          remaining -= 1;
        }
        splitsLeft -= 1;
      } else {
        const line =
          // eslint-disable-next-line no-await-in-loop
          openLines[(await CPRNetArchUtils.#roll(`1d${openLines.length}`)) - 1];
        // eslint-disable-next-line no-await-in-loop
        line.floors.push(
          await CPRNetArchUtils.#drawFloor(difficultyTable, seen),
        );
        remaining -= 1;
      }
    }

    // Flatten to floor objects, assigning each its global depth (row): a child line begins on the
    // row just below its parent line's last floor.
    const floors = [];
    const assign = (line, startDepth) => {
      line.floors.forEach((floor, i) => {
        floor.branch = line.path;
        floor.depth = startDepth + i;
        floors.push(floor);
      });
      const childStart = startDepth + line.floors.length;
      line.children.forEach((child) => assign(child, childStart));
    };
    assign(root, 1);
    return floors;
  }

  /** Roll a plain formula through the CPR roll system and return its total. */
  static async #roll(formula) {
    const roll = CPRRoll.create(
      SystemUtils.Localize("CPR.rolls.roll"),
      formula,
    );
    await roll.roll();
    return roll.resultTotal;
  }

  /** Roll for branches: 1d10, +1 branch on 7+, repeat while 7+. */
  static async #rollBranches() {
    let branches = 0;
    // eslint-disable-next-line no-await-in-loop
    while ((await CPRNetArchUtils.#roll("1d10")) >= 7) branches += 1;
    return branches;
  }

  /**
   * Draw one floor from a table, re-rolling duplicate Password/File/Control-Node results.
   *
   * @param {RollTable} table
   * @param {Set<String>} seen - node-result keys already used
   * @returns {Promise<Object>} a partial floor (content/dv/iceName/... ; branch/depth set by caller)
   */
  static async #drawFloor(table, seen) {
    let parsed;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      const draw = await table.draw({ displayChat: false });
      const text = draw.results[0]?.description ?? "";
      parsed = CPRNetArchUtils.#parseResult(text);
      // Re-roll a duplicate password/file/controlNode node; ICE may repeat.
      if (parsed.content === "blackIce") break;
      const key = `${parsed.content}:${parsed.dv}`;
      if (!seen.has(key)) {
        seen.add(key);
        break;
      }
    }
    return {
      content: parsed.content,
      dv: parsed.dv,
      iceName: parsed.iceName,
      programUuid: "",
      fileContentUuid: "",
      controlNodeDeviceUuids: [],
      revealed: false,
      dvRevealed: false,
      virusPlanted: false,
      description: "",
    };
  }

  /** Parse a rolltable result's text into { content, dv, iceName }. */
  static #parseResult(text) {
    const node = text.match(/^(Password|File|Control Node)\s+DV\s*(\d+)/i);
    if (node) {
      const content = {
        password: "password",
        file: "file",
        "control node": "controlNode",
      }[node[1].toLowerCase()];
      return { content, dv: parseInt(node[2], 10), iceName: "" };
    }
    // Anything else is Black ICE named by the table (stats are GM-supplied, so keep the label).
    return { content: "blackIce", dv: null, iceName: text.trim() };
  }

  /** Resolve the Lobby + difficulty rolltables from the configured compendium. */
  static async #getTables(difficulty) {
    const compendiumId =
      game.settings.get(game.system.id, "netArchRollTableCompendium") ||
      CPR.defaultNetArchTable;
    const pack = game.packs.get(compendiumId);
    if (!pack) {
      LOGGER.warn(
        `generateFromTables | rolltable compendium "${compendiumId}" not found`,
      );
      SystemUtils.DisplayMessage(
        "warn",
        SystemUtils.Localize("CPR.netArchitecture.generation.noTables"),
      );
      return null;
    }
    const docs = await pack.getDocuments();
    const lobby = docs.find((d) => d.name === CPRNetArchUtils.#LOBBY_TABLE);
    const difficultyTable = docs.find(
      (d) => d.name === CPRNetArchUtils.#DIFFICULTY_TABLE[difficulty],
    );
    if (!lobby || !difficultyTable) {
      LOGGER.warn(
        `generateFromTables | missing lobby/difficulty table in "${compendiumId}"`,
      );
      return null;
    }
    return { lobby, difficultyTable };
  }
}
