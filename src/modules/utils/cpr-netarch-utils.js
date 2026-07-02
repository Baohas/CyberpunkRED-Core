import CPR from "../system/config.js";
import LOGGER from "./cpr-logger.js";
import SystemUtils from "./cpr-systemUtils.js";

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

    const floorCount = (await new Roll("3d6").evaluate()).total;
    const branchCount = await CPRNetArchUtils.#rollBranches();
    // Lines the floors are distributed across: null = main line, then branch letters.
    const lines = [
      null,
      ...["a", "b", "c", "d", "e", "f", "g", "h"].slice(0, branchCount),
    ];
    const depth = new Map(lines.map((l) => [l, 1]));

    const floors = [];
    const seen = new Set();
    for (let i = 0; i < floorCount; i += 1) {
      // First two floors are the Lobby (main line); the rest use the difficulty table and are
      // distributed round-robin across the main line and any branches.
      const isLobby = i < 2;
      const line = isLobby ? null : lines[(i - 2) % lines.length];
      const table = isLobby ? lobby : difficultyTable;
      const floor = await CPRNetArchUtils.#drawFloor(table, seen);
      floor.branch = line;
      floor.depth = depth.get(line);
      depth.set(line, floor.depth + 1);
      floors.push(floor);
    }
    return floors;
  }

  /** Roll for branches: 1d10, +1 branch on 7+, repeat while 7+. */
  static async #rollBranches() {
    let branches = 0;
    // eslint-disable-next-line no-await-in-loop
    while ((await new Roll("1d10").evaluate()).total >= 7) branches += 1;
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
