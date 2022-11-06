import gulp from "gulp";

import * as bld from "./gulp/build.mjs";
import * as packs from "./gulp/packs.mjs";

export const clean = gulp.series(bld.cleanDist);
export const assets = gulp.series(bld.copyAssets);
export const system = gulp.series(bld.buildManifest);
export const less = gulp.series(bld.compileLess);
export const extractPacks = gulp.series(packs.extPacks);
export const generatePacks = gulp.series(packs.genPacks);

export const build = gulp.series(
  clean,
  assets,
  system,
  less,
  generatePacks,
);

export const watch = gulp.series(
  build,
  bld.watchSrc,
);
