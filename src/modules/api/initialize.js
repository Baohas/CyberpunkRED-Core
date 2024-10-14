import empableItems from "./actor/empable-items.js";

/**
 * Loads actor functions from predefined modules and returns them as an object.
 *
 * @private
 * @returns {Object} An object where keys are function names and values
 *                   are the corresponding functions.
 */
function _loadActorFunctions() {
  const functions = {};

  // Statically added modules
  const modules = [empableItems];

  modules.forEach((module) => {
    if (typeof module === "function" && module.name) {
      // Function's name is used as the key
      const functionName = module.name;
      functions[functionName] = module;
    }
  });

  return functions;
}

/**
 * Initializes the API by creating the `game.cpr.api.actor` namespace and
 * loading actor functions.
 *
 * @returns {Object} The initialized `game.cpr.api` object with actor functions.
 */
function initializeAPI() {
  // Initialize the API root namespace
  if (!game.cpr) game.cpr = {};
  if (!game.cpr.api) game.cpr.api = {};

  if (!game.cpr.api.actor) {
    game.cpr.api.actor = {};
  }

  // Load actor functions synchronously
  const actorFunctions = _loadActorFunctions();

  // Ensure game.cpr.api.actor remains defined
  if (!game.cpr.api.actor) {
    game.cpr.api.actor = {};
  }

  // Assign each of the actor functions to the namespace correctly
  Object.assign(game.cpr.api.actor, actorFunctions);

  // Return the initialized API object
  return game.cpr.api;
}

export default initializeAPI;
