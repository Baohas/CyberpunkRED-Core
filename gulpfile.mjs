import gulp from "gulp";

import * as bld from "./gulp/build.mjs";
import * as packs from "./gulp/packs.mjs";

// Cleans the target dir. MUST Be run on it's own in series
export const clean = gulp.series(bld.cleanDist);

// Functions that can run in parallel
export const assets = gulp.parallel(
  bld.compileLess,
  packs.genPacks,
  bld.processSvgs,
  bld.processImages,
  bld.buildManifest,
  bld.buildChangelog,
  bld.copyAssets
);

// Export packs from Foundry to src/packs
export const extractPacks = gulp.series(packs.extPacks, packs.genPacksBabele);

// Generate the Babele translation files from the YAML fragments
export const generateBabele = gulp.series(packs.genPacksBabele);

//
export const build = gulp.series(clean, assets);

// Don't just call `build` & `bld.watch` because `build` cleans the directory
// so we have a clean build, but if we clean the directory foundry dies because
// the file descriptors to the packs change which it does not like.
export const watch = gulp.series(assets, bld.watchSrc);
