const fs = require("fs-extra");
const path = require("path");
const gulp = require("gulp");
const less = require("gulp-less");
const config = require("./config.js");

const { SYSTEM_FILE } = require("./constants.js");

const destFolder = path.resolve(config.dataPath);
const srcFolder = "src";
const { sourceFiles } = config;
const { sourceFolders } = config;

async function createDist() {
  if (!fs.existsSync(destFolder)) {
    fs.mkdirSync(destFolder);
  }
}

async function cleanDist() {
  if (fs.existsSync(destFolder)) {
    fs.emptyDirSync(destFolder);
  }
}

async function compileLess() {
  createDist();
  return gulp.src(path.resolve(srcFolder, "less/main.less"))
    .pipe(less({ javascriptEnabled: true }))
    .pipe(gulp.dest(path.resolve(destFolder)));
}

async function copyAssets() {
  createDist();
  [...sourceFiles, ...sourceFolders].forEach((asset) => {
    gulp.src(asset.from).pipe(gulp.dest(path.resolve(destFolder, asset.to)));
  });
}

async function updateSystem() {
  createDist();
  // Read the template system.json from src/
  const systemRaw = fs.readFileSync(path.resolve(srcFolder, SYSTEM_FILE));
  const system = JSON.parse(systemRaw);
  // If we're in CI use $VERSION as the version, else use a dummy version
  const version = process.env.CI ? process.env.VERSION : "0.0.0";
  // Construct some URLs
  const repoUrl = process.env.CI ? process.env.REPO_URL : "http://example.com";
  const zipFile = process.env.CI ? process.env.ZIP_FILE : "cpr.zip";
  const downloadUrl = `${repoUrl}/${version}/${zipFile}`;
  // If we're in the release stage of CI use the `latest` url for the manifest
  // This will be used for the final release
  const manifestUrl = process.env.CI_JOB_NAME === "publish"
    ? `${repoUrl}/latest/${SYSTEM_FILE}`
    : `${repoUrl}/${version}/${SYSTEM_FILE}`;

  system.version = version;
  system.manifest = manifestUrl;
  system.download = downloadUrl;

  fs.writeFileSync(path.resolve(destFolder, SYSTEM_FILE), JSON.stringify(system, null, 2));
}

async function watch() {
  // Helper - watch the pattern, copy the output on change
  function watcher(pattern, out) {
    gulp.watch(pattern)
      .on("all", () => gulp.src(pattern)
        .pipe(gulp.dest(path.resolve(destFolder, out))));
  }

  sourceFiles.forEach((file) => watcher(file.from, file.to));
  sourceFolders.forEach((folder) => watcher(folder.from, folder.to));
  gulp.watch("src/**/*.less").on("change", () => compileLess());
}

exports.clean = cleanDist;
exports.assets = copyAssets;
exports.system = updateSystem;
exports.less = compileLess;
exports.watch = watch;
