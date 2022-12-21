/* eslint-disable no-param-reassign  */
import Datastore from "nedb";
import YAML from "js-yaml";
import fs from "fs-extra";
import log from "fancy-log";
import path from "path";
import sanitize from "sanitize-filename";

import * as config from "./config.mjs";
import { DEBUG, SYSTEM_FILE } from "./constants.mjs";

const destFolder = path.resolve(config.dataPath);
const srcFolder = "src";

// Make sure we have a nice filename
function _cleanFileName(data) {
  if (DEBUG) {
    log("DEBUG: Cleaning Filename");
  }
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
    .replace(/\.-\./g, ".")
    .toLowerCase();
}

// Removes invisible whitespace chars and normalises single and double-quotes.
function _cleanString(str) {
  return str
    .replace(/\u2060/gu, "")
    .replace(/[‘’]/gu, "'")
    .replace(/[“”]/gu, '"');
}

// Remove unwanted flags, permission, and other data
function _cleanPackData(data, { clearSourceId = true } = {}) {
  if (clearSourceId) delete data.flags?.core?.sourceId;
  if (data.origin) delete data.origin;
  if (data.ownership) data.ownership = { default: 0 };
  if (data.name) data.name = _cleanString(data.name);
  if (data.label) data.label = _cleanString(data.label);
  delete data.flags?.importSource;
  delete data.flags?.exportSource;

  // _stats gets auto generated when foundry imports the compendia
  if (data._stats) {
    delete data._stats;
  }

  // Remove empty values from system.ammoVariety
  if (data.type === "weapon") {
    const ammo = data.system.ammoVariety;
    const result = ammo.filter((i) => i !== "");
    data.system.ammoVariety = result;
  }

  // Sanitize description
  if (data.system?.description?.value) {
    data.system.description.value = _cleanString(data.system.description.value);
  }
  // Run the function over any effects
  if (data.effects) {
    data.effects.forEach((i) => _cleanPackData(i, { clearSourceId: false }));
  }
  return data;
}

// Export from Foundry Packs to fragments
// Loop over each pack.db in `dataDir/packs` and create a directory for install
// in `src/packs`
async function extPacks() {
  return new Promise((cb) => {
    log("Extracting Packs...");
    const fragmentDir = path.resolve(srcFolder, "packs");
    const packsDir = path.resolve(destFolder, "packs");
    const sysFile = JSON.parse(
      fs.readFileSync(path.resolve(srcFolder, SYSTEM_FILE))
    );
    const { packs } = sysFile;

    if (fs.existsSync(packsDir)) {
      // This is a bit convoluted as our packs `name` doesn't match `path` always
      // So we need to grab the path then split it up to get the name.
      packs.forEach((pack) => {
        const packName = pack.path.split("/")[1].split(".")[0];
        const packPath = path.resolve(packsDir, `${packName}.db`);
        if (DEBUG) {
          log(`DEEBUG: Processing ${packName}`);
        }

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
              const itemName = (typeof entry.type !== 'string')
                ? _cleanFileName(entry.name)
                : `${_cleanFileName(entry.type)}.${_cleanFileName(entry.name)}`;
              if (DEBUG) {
                log(`Processing ${itemName}`);
              }
              const data = _cleanPackData(entry);
              const output = YAML.dump(data, { sortKeys: true }, 2);
              fs.writeFileSync(
                path.join(fragmentDir, packName, `${itemName}.yaml`),
                output,
                { mode: 0o644 }
              );
            });
          });
        } else {
          throw Error(`${packPath} does not exist`);
        }
      });
    } else {
      throw Error(`${packsDir} does not exist.`);
    }
    log("Finished Extracting Packs...");
    cb();
  });
}

async function genPacks() {
  return new Promise((cb) => {
    log("Generating Packs...");
    const fragmentDir = path.resolve(srcFolder, "packs");
    const packsDir = path.resolve(destFolder, "packs");
    const sysFile = JSON.parse(
      fs.readFileSync(path.resolve(srcFolder, SYSTEM_FILE))
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
      if (DEBUG) {
        log(`DEBUG: Processing ${packName}`);
      }

      // If the fragment dir exists, do stuff, else error
      if (fs.existsSync(path.join(fragmentDir, packName))) {
        const fragments = fs.readdirSync(path.join(fragmentDir, packName));
        const db = fs.createWriteStream(packPath, { flags: "a", mode: 0o644 });
        const data = [];

        // Loop over each file
        fragments.forEach((fragment) => {
          if (DEBUG) {
            log(`DEBUG: Processing ${packName}/${fragment}`);
          }
          const fragmentPath = path.join(fragmentDir, packName, fragment);
          const entry = YAML.load(fs.readFileSync(fragmentPath), "UTF-8");

          _cleanPackData(entry);
          data.push(entry);
        });
        // Sort the pack
        data.sort((lhs, rhs) => (lhs._id > rhs._id ? 1 : -1));
        // Write each entry to the pack
        for (const entry of data) {
          db.write(`${JSON.stringify(entry)}\n`);
        }
        db.end();
      } else {
        throw Error(`${path.join(fragmentDir, packName)} does not exist`);
      }
    });
    log("Finished Generating Packs...");
    cb();
  });
}

export { extPacks, genPacks };
