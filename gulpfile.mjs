import gulp from "gulp";

import * as b from "./gulp/build.mjs";

export const clean = gulp.series(b.cleanDist);
export const assets = gulp.series(b.copyAssets);
export const system = gulp.series(b.buildManifest);
export const less = gulp.series(b.compileLess);
export const build = gulp.series(b.copyAssets, b.buildManifest, b.compileLess);
export const watch = gulp.series(b.cleanDist, build, b.watchSrc);
