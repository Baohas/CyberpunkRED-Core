const fs = require("fs-extra");
const path = require("path");
const del = require("del");

// Gulp
const gulp = require("gulp");
const less = require("gulp-less");

// Config
const distFolderPath = "dist";
const destFolder = path.resolve(process.cwd(), distFolderPath);
const sourceFiles = [
  {
    from: "src/cpr.js",
    to: "",
  },
  {
    from: "src/environment.js",
    to: "",
  },
  {
    from: "system.json",
    to: "",
  },
  {
    from: "template.json",
    to: "",
  },
];
const sourceFolders = [
  {
    from: "src/assets/**/*",
    to: "assets",
  },
  {
    from: "src/fonts/**/*",
    to: "fonts",
  },
  {
    from: "src/lang/**/*",
    to: "lang",
  },
  {
    from: "src/templates/**/*",
    to: "templates",
  },
  {
    from: "src/modules/**/*",
    to: "packs",
  },
];

async function cleanDist() {
  const files = fs.readdirSync(destFolder);
  const results = [];
  for (const file of files) {
    results.push(del(path.resolve(destFolder, file)));
  }
  await Promise.all(results);
}

async function compileLess() {
  return gulp.src("src/less/main.less")
    .pipe(less({ javascriptEnabled: true }))
    .pipe(gulp.dest(path.resolve(destFolder)));
}

async function copyAssets() {
  [...sourceFiles, ...sourceFolders].forEach((asset) => {
    gulp.src(asset.from).pipe(gulp.dest(path.resolve(destFolder, asset.to)));
  });
}

async function watch() {
  // Helper - watch the pattern, copy the output on change
  function watcher(pattern, out) {
    gulp.watch(pattern).on("change", () => gulp.src(pattern).pipe(gulp.dest(path.resolve(destFolder, out))));
  }

  sourceFolders.forEach((folder) => watcher(folder.from, folder.to));
  sourceFiles.forEach((file) => watcher(file.from, file.to));
  gulp.watch("src/**/*.less").on("change", async () => compileLess());
}

exports.clean = cleanDist;
exports.assets = copyAssets;
exports.less = compileLess;

exports.watch = gulp.series(watch);
exports.build = gulp.series(compileLess, copyAssets);
exports.rebuild = gulp.series(cleanDist, exports.build);
