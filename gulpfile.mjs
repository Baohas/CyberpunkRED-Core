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

// Don't just call `build` & `bld.watch` because `build` cleans the directory
// so we have a clean build, but if we clean the directory foundry dies because
// the file descriptors to the packs change which it does not like.
export const watch = gulp.series(
  assets,
  system,
  less,
  generatePacks,
  bld.watchSrc,
);
