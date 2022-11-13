/* eslint-disable no-param-reassign  */
import Datastore from "nedb";
import YAML from "js-yaml";
import fs from "fs-extra";
import path from "path";
import sanitize from "sanitize-filename";

import * as config from "./config.mjs";
import { SYSTEM_FILE } from "./constants.mjs";

const destFolder = path.resolve(config.dataPath);
const srcFolder = "src";

// Make sure we have a nice filename
function cleanFileName(data) {
  return sanitize(data)
    .replace(/\u2211/g, "")
    .replace(/\u03B2/g, "")
    .replace(/[‘’]/gu, "")
    .replace(/[“”]/gu, "")
    .replace(/['"]/g, "")
    .replace(/[()]/g, "")
    .replace(/[&]/g, "and")
    .replace(/ /g, ".")
    .replace(/\.\./g, ".")
    .toLowerCase();
}

// Removes invisible whitespace chars and normalises single and double-quotes.
function cleanString(str) {
  return str
    .replace(/\u2060/gu, "")
    .replace(/[‘’]/gu, "'")
    .replace(/[“”]/gu, "\"");
}

// Remove unwanted flags, permission, and other data
function cleanPackData(data, { clearSourceId = true } = {}) {
  if (clearSourceId) delete data.flags?.core?.sourceId;
  if (data.origin) delete data.origin;
  if (data.ownership) data.ownership = { default: 0 };
  if (data.name) data.name = cleanString(data.name);
  if (data.label) data.label = cleanString(data.label);
  delete data.flags?.importSource;
  delete data.flags?.exportSource;
  if (data._stats?.lastModifiedBy) {
    data._stats.lastModifiedBy = "00CPRCBuildBot00";
  }

  // Remove empty values from system.ammoVariety
  if (data.type === "weapon") {
    const ammo = data.system.ammoVariety;
    const result = ammo.filter((i) => i !== "");
    data.system.ammoVariety = result;
  }

  // Sanitize description
  if (data.system?.description?.value) {
    data.system.description.value = cleanString(data.system.description.value);
  }
  // Run the function over any effects
  if (data.effects) {
    data.effects.forEach((i) => cleanPackData(i, { clearSourceId: false }));
  }
  return data;
}

// Export from Foundry Packs to fragments
// Loop over each pack.db in `dataDir/packs` and create a directory for install
// in `src/packs`
async function extPacks() {
  const fragmentDir = path.resolve(srcFolder, "packs");
  const packsDir = path.resolve(destFolder, "packs");
  const sysFile = JSON.parse(
    fs.readFileSync(path.resolve(srcFolder, SYSTEM_FILE)),
  );
  const { packs } = sysFile;

  if (fs.existsSync(packsDir)) {
    // This is a bit convoluted as our packs `name` doesn't match `path` always
    // So we need to grab the path then split it up to get the name.
    packs.forEach((pack) => {
      const packName = pack.path.split("/")[1].split(".")[0];
      const packPath = path.resolve(packsDir, `${packName}.db`);

      // Check the pack exists
      if (fs.existsSync(packPath)) {
        // Check if the output dir exists, if not create it
        if (!fs.existsSync(path.join(fragmentDir, packName))) {
          fs.mkdirSync(path.join(fragmentDir, packName), { mode: 0o755 });
        }

        // Load the pack into nedb
        const db = new Datastore({ filename: packPath, autoload: true });
        db.loadDatabase();

        // Find each entry and output to YAML file in `src/packs`
        db.find({}, (err, entries) => {
          entries.forEach((entry) => {
            const itemName = cleanFileName(entry.name);
            const data = cleanPackData(entry);
            const output = YAML.dump(data, null, 2);
            fs.writeFileSync(path.join(fragmentDir, packName, `${itemName}.yaml`), output, { mode: 0o644 });
          });
        });
      } else {
        throw Error(`${packPath} does not exist`);
      }
    });
  } else {
    throw Error(`${packsDir} does not exist.`);
  }
}

async function genPacks() {
  const fragmentDir = path.resolve(srcFolder, "packs");
  const packsDir = path.resolve(destFolder, "packs");
  const sysFile = JSON.parse(
    fs.readFileSync(path.resolve(srcFolder, SYSTEM_FILE)),
  );
  const { packs } = sysFile;

  // Create the packs dir if it doesn't exist.
  if (!fs.existsSync(packsDir)) {
    fs.mkdirSync(packsDir);
  }

  // This is a bit convoluted as our packs `name` doesn't match `path` always
  // So we need to grab the path then split it up to get the name.
  packs.forEach((pack) => {
    const packName = pack.path.split("/")[1].split(".")[0];
    const packPath = path.resolve(packsDir, `${packName}.db`);

    // If the fragment dir exists, do stuff, else error
    if (fs.existsSync(path.join(fragmentDir, packName))) {
      const fragments = fs.readdirSync(path.join(fragmentDir, packName));
      const db = fs.createWriteStream(packPath, { flags: "a", mode: 0o644 });
      const data = [];

      // Loop over each file
      fragments.forEach((fragment) => {
        // Uncomment the following if pack building fails and you're unsure which YAML file is the issue
        // console.log(`Processing ${packName}/${fragment}`);
        const fragmentPath = path.join(fragmentDir, packName, fragment);
        const entry = YAML.load(fs.readFileSync(fragmentPath), "UTF-8");

        cleanPackData(entry);
        data.push(entry);
      });
      // Sort the pack
      data.sort((lhs, rhs) => (lhs._id > rhs._id ? 1 : -1));
      // Write each entry to the pack
      data.forEach((entry) => db.write(`${JSON.stringify(entry)}\n`));
    } else {
      throw Error(`${path.join(fragmentDir, packName)} does not exist`);
    }
  });
}

export { extPacks, genPacks };
