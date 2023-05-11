import fs from "fs-extra";
import log from "fancy-log";
import gulp from "gulp";
import less from "gulp-less";
import path from "path";
import svgmin from "gulp-svgmin";
import MarkdownIt from "markdown-it";

import * as config from "./config.mjs";
import {
  DEBUG,
  SYSTEM_FILE,
  SYSTEM_TITLE,
  SYSTEM_VERSION,
} from "./constants.mjs";

const destFolder = path.resolve(config.dataPath);
const srcFolder = "src";
const { sourceFiles } = config;
const { sourceFolders } = config;

// Helter function to create the target directory we're building into
async function _createDist() {
  if (!fs.existsSync(destFolder)) {
    fs.mkdirSync(destFolder);
  }
}

// Blast the build directory to ensure it's fresh
async function cleanDist() {
  if (fs.existsSync(destFolder)) {
    fs.emptyDirSync(destFolder);
  }
}

// Compile less in to CSS
async function compileLess() {
  return new Promise((cb) => {
    log("Building CSS...");
    _createDist();
    gulp
      .src(path.resolve(srcFolder, "less/main.less"))
      .pipe(less({ javascriptEnabled: true }))
      .pipe(gulp.dest(path.resolve(destFolder)))
      .on("finish", () => {
        log("Finished Building CSS.");
        cb();
      });
  });
}

// Copy all static assets into the build directory
// defined in `./config.mjs`
async function copyAssets() {
  return new Promise((cb) => {
    log("Copying static assets...");
    _createDist();
    [...sourceFiles, ...sourceFolders].forEach((asset) => {
      if (DEBUG) {
        log(`DEBUG: Copying ${asset.from}`);
      }
      gulp.src(asset.from).pipe(gulp.dest(path.resolve(destFolder, asset.to)));
    });
    log("Finished copying static assets.");
    cb();
  });
}

async function buildManifest() {
  return new Promise((cb) => {
    log(`Building ${SYSTEM_FILE}...`);
    _createDist();
    // Read the template system.json from src/
    const systemRaw = fs.readFileSync(path.resolve(srcFolder, SYSTEM_FILE));
    const system = JSON.parse(systemRaw);
    // If we're in CI use $VERSION as the version, else use a dummy version
    const version = SYSTEM_VERSION;
    // Construct some URLs
    const repoUrl = process.env.CI
      ? process.env.REPO_URL
      : "http://example.com";
    const zipFile = process.env.CI ? process.env.ZIP_FILE : "cpr.zip";
    const manifestUrl = `${repoUrl}/latest/${SYSTEM_FILE}`;
    const downloadUrl = `${repoUrl}/${version}/${zipFile}`;

    system.version = version;
    system.manifest = manifestUrl;
    system.download = downloadUrl;
    system.title = SYSTEM_TITLE;

    fs.writeFileSync(
      path.resolve(destFolder, SYSTEM_FILE),
      JSON.stringify(system, null, 2)
    );
    log(`Finished building ${SYSTEM_FILE}.`);
    cb();
  });
}

// Create the release notes for the version and put it in the distDir
async function buildChangelog() {
  return new Promise((cb) => {
    log("Generating Release Notes...");
    const systemRaw = fs.readFileSync(path.resolve(srcFolder, SYSTEM_FILE));
    const system = JSON.parse(systemRaw);
    const { languages } = system;

    for (const [key, value] of Object.entries(languages)) {
      const { lang } = value;
      const changelogFile =
        lang !== "en" ? `CHANGELOG.${lang}.md` : "CHANGELOG.md";
      const changelog = fs.readFileSync(path.resolve(changelogFile), "utf-8");
      // This creates an array of all H2 (##) and sub elements in a markdown file
      // then we grab the first one and render that markdown to html and write
      // it to a release-notes file which is then rendered in Foundry
      const regex = /(?:^|\n)##\s[^\n]*\n(.*?)(?=\n##?\s|$)/gs;
      const release = regex.exec(changelog)[0];
      const md = new MarkdownIt();
      const result = md.render(release);

      // Create the lang/release-notes directory
      if (!fs.existsSync(path.join(destFolder, "lang/release-notes/"))) {
        fs.mkdirpSync(path.join(destFolder, "lang/release-notes/"));
      }

      fs.writeFileSync(
        path.join(
          destFolder,
          "lang/release-notes/",
          `${SYSTEM_VERSION}.${lang}`
        ),
        result,
        { mode: 0o644 }
      );
    }
    log("Finished Generating Release Notes.");
    cb();
  });
}

async function processImages() {
  return new Promise((cb) => {
    log("Processing Images...");
    gulp
      .src("src/**/*.{jpg,jpeg,png,webp,webm}", { base: srcFolder })
      .on("data", (file) => {
        if (DEBUG) {
          log(
            `DEBUG: Processing Image: ${path.relative(
              process.cwd(),
              file.path
            )}`
          );
        }
      })
      .pipe(gulp.dest(destFolder))
      .on("finish", () => {
        log("Finished Processing Images.");
        cb();
      });
  });
}

async function processSvgs() {
  return new Promise((cb) => {
    log("Processing SVGs...");
    gulp
      .src("src/**/*.svg", { base: srcFolder })
      .on("data", (file) => {
        if (DEBUG) {
          log(
            `DEBUG: Processing SVG: ${path.relative(process.cwd(), file.path)}`
          );
        }
      })
      .pipe(
        svgmin({
          multipass: true,
          plugins: ["convertStyleToAttrs"],
        })
      )
      .pipe(gulp.dest(destFolder))
      .on("finish", () => {
        log("Finished Processing SVGs.");
        cb();
      });
  });
}

async function watchSrc() {
  // Helper - watch the pattern, copy the output on change
  function watcher(pattern, out) {
    gulp
      .watch(pattern)
      .on("all", () =>
        gulp.src(pattern).pipe(gulp.dest(path.resolve(destFolder, out)))
      );
  }

  sourceFiles.forEach((file) => watcher(file.from, file.to));
  sourceFolders.forEach((folder) => watcher(folder.from, folder.to));
  gulp.watch("src/**/*.less").on("all", () => compileLess());
  // disabling while we fix Crowdin
  // gulp.watch("src/lang/*.json").on("all", () => propagateLangs());
  gulp
    .watch("src/**/*.{jpeg,jpg,png,webp,webm}")
    .on("all", () => processImages());
  gulp.watch("src/**/*.svg").on("all", () => processSvgs());
}

export {
  buildManifest,
  buildChangelog,
  cleanDist,
  copyAssets,
  compileLess,
  watchSrc,
  processImages,
  processSvgs,
};
