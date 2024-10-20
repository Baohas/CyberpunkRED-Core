/* eslint-disable no-param-reassign */

import BaseMigrationScript from "../base-migration-script.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class NetarchTilesMigration extends BaseMigrationScript {
  static version = 31;

  static name = "Misc: Netarch Tiles";

  async migrateMisc() {
    LOGGER.trace("migrateMisc | NetarchTiles");
    const scenes = game.scenes.contents;

    for (const scene of scenes) {
      const tiles = scene.tiles.contents;
      for (const tile of tiles) {
        const { src } = tile.texture;
        if (src.includes(`systems/${game.system.id}/tiles/netarch`)) {
          const newSrc = src.replace(/PNG/, "WebP").replace(/.png/, ".webp");
          tile.update({ "texture.src": newSrc });
        }
      }
    }
  }
}
