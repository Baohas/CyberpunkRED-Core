const gulp = require("gulp");
const build = require("./gulp/build.js");

gulp.task("clean", build.clean);
gulp.task("assets", build.assets);
gulp.task("system", build.system);
gulp.task("less", build.less);

exports.build = gulp.series(build.assets, build.system, build.less);
exports.watch = gulp.series(build.clean, exports.build, build.watch);
