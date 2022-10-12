const fs = require("fs-extra");
const path = require("path");

const { DEFAULT_DESTINATION_FOLDER, SYSTEM_NAME } = require("./constants.js");

const SOURCE_FILES = [
  { from: "src/cpr.js", to: "" },
  { from: "src/environment.js", to: "" },
  { from: "src/template.json", to: "" },
];

const SOURCE_FOLDERS = [
  { from: "src/assets/**/*", to: "assets" },
  { from: "src/babele/**/*", to: "babele" },
  { from: "src/fonts/**/*", to: "fonts" },
  { from: "src/icons/**/*", to: "icons" },
  { from: "src/images/**/*", to: "images" },
  { from: "src/lang/**/*", to: "lang" },
  { from: "src/maps/**/*", to: "maps" },
  { from: "src/modules/**/*", to: "modules" },
  { from: "src/packs/**/*", to: "packs" },
  { from: "src/templates/**/*", to: "templates" },
  { from: "src/tiles/**/*", to: "tiles" },
];

// Read foundryconfig.json if it exists, else use default vaules
// This allows for devs to overwrite `dist/` as the build dir to
// wherever they need it for their local Foundry install.
function resolveDestinationDir() {
  const localConfigPath = path.resolve("foundryconfig.json");
  const localConfigExists = fs.existsSync(localConfigPath);

  if (localConfigExists) {
    const localDataPath = fs.readJSONSync(localConfigPath).dataPath;
    const dataPath = path.resolve(
      path.join(localDataPath, "Data", "systems", SYSTEM_NAME),
    );
    if (fs.existsSync(path.join(dataPath, ".git"))) {
      // Check if a .git directoy exists in the dataPath. This will hopefully
      // prevent people blasting their repo if they stored it in their
      // Foundry datapath previously.
      throw Error(`'dataPath' appears to contain a '.git' directory.\n\n`
             + `Please check your foundryconfig.json and update 'dataPath' `
             + `If you have previously \n`
             + `cloned the git repo to `
             + `'${dataPath}'\n`
             + `please check CONTRIBUTING.md and clone the repo to another `
             + `location.`);
    } else {
      return dataPath;
    }
  }
  return DEFAULT_DESTINATION_FOLDER;
}

exports.dataPath = resolveDestinationDir();
exports.sourceFiles = SOURCE_FILES;
exports.sourceFolders = SOURCE_FOLDERS;
