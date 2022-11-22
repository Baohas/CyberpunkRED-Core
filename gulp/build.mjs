import fs from "fs-extra";
import gulp from "gulp";
import less from "gulp-less";
import path from "path";
import MarkdownIt from "markdown-it";

import * as config from "./config.mjs";
import {
  CHANGELOG_FILE,
  SYSTEM_FILE,
  SYSTEM_TITLE,
  SYSTEM_VERSION,
} from "./constants.mjs";

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

function getLangs() {
  const systemRaw = fs.readFileSync(path.resolve(srcFolder, SYSTEM_FILE));
  const system = JSON.parse(systemRaw);
  const langs = system.languages;
  return langs;
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
  const version = SYSTEM_VERSION;
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

// Create the release notes for the version and put it in the distDir
async function buildChangelog() {
  // Check if the target dir is created
  if (!fs.existsSync(path.join(destFolder, "lang/release-notes/"))) {
    fs.mkdirpSync(path.join(destFolder, "lang/release-notes/"));
  }

  // If we don't have a manually created file then generate one
  if (!fs.existsSync(path.join(srcFolder, "lang/release-notes", `${SYSTEM_VERSION}.en`))) {
    const changelog = fs.readFileSync(path.resolve(CHANGELOG_FILE), "utf-8");
    const regex = /(?:^|\n)##\s[^\n]*\n(.*?)(?=\n##?\s|$)/gs;
    const release = regex.exec(changelog)[0];
    const md = new MarkdownIt();
    const result = md.render(release);

    fs.writeFileSync(path.join(destFolder, "lang/release-notes/", `${SYSTEM_VERSION}.en`), result, { mode: 0o644 });
  }
}

async function propagateLangs() {
  const enFile = fs.readFileSync(path.resolve(srcFolder, "lang/en.json"));
  const enStrings = JSON.parse(enFile);
  const allLangs = getLangs();
  // Remove en from the languages
  const langs = allLangs.filter((item) => item.lang !== "en");

  // Loop over each language file in `src/lang` except `en.json`
  langs.forEach((lang) => {
    const langFile = path.resolve(srcFolder, lang.path);
    const langData = JSON.parse(fs.readFileSync(path.resolve(langFile)));
    const data = {};

    // Loop over `enStrings` and check they are in the current lang file
    // If it does not exist, add the en key/value to the file.
    Object.entries(enStrings).forEach(([key, value]) => {
      if (!(key in langData)) {
        data[key] = value;
      }
    });

    // Get a list of language strings, loop over and check if they exist in
    // en.json if not delete the key/value from the langiage file.
    Object.entries(langData).forEach(([key]) => {
      if (!(key in enStrings)) {
        delete langData[key];
      }
    });

    // Merge the new strings and the (trimmed) language strings
    const newData = { ...data, ...langData };
    // Write the new files out, sort by JSON key to ensure clean diffs
    fs.writeFileSync(langFile, JSON.stringify(newData, Object.keys(newData)
      .sort(), 2));
  });
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
  gulp.watch("src/**/*.less").on("all", () => compileLess());
  gulp.watch("src/lang/*.json").on("all", () => propagateLangs());
}

export {
  buildManifest,
  buildChangelog,
  cleanDist,
  copyAssets,
  compileLess,
  watchSrc,
  propagateLangs,
};
