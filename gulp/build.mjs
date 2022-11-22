import fs from "fs-extra";
import path from "path";
import gulp from "gulp";
import less from "gulp-less";

import * as config from "./config.mjs";
import { SYSTEM_FILE, SYSTEM_TITLE } from "./constants.mjs";

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

async function buildManifest() {
  createDist();
  // Read the template system.json from src/
  const systemRaw = fs.readFileSync(path.resolve(srcFolder, SYSTEM_FILE));
  const system = JSON.parse(systemRaw);
  // If we're in CI use $VERSION as the version, else use a dummy version
  const version = process.env.CI ? process.env.VERSION : "0.0.0";
  // Construct some URLs
  const repoUrl = process.env.CI ? process.env.REPO_URL : "http://example.com";
  const zipFile = process.env.CI ? process.env.ZIP_FILE : "cpr.zip";
  const manifestUrl = `${repoUrl}/latest/${SYSTEM_FILE}`;
  const downloadUrl = `${repoUrl}/${version}/${zipFile}`;

  system.version = version;
  system.manifest = manifestUrl;
  system.download = downloadUrl;
  system.title = SYSTEM_TITLE;

  fs.writeFileSync(path.resolve(destFolder, SYSTEM_FILE), JSON.stringify(system, null, 2));
}

async function watchSrc() {
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

export {
  buildManifest,
  cleanDist,
  copyAssets,
  compileLess,
  watchSrc,
};
