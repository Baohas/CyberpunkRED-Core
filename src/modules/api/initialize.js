async function _loadActorFunctions() {
  const functions = {};

  const actorModuleFiles = [];

  const importPromises = actorModuleFiles.map(async (filePath) => {
    const module = await import(filePath);
    const defaultExport = module.default;

    // Infer the function name
    if (typeof defaultExport === "function" && defaultExport.name) {
      const functionName = defaultExport.name;
      functions[functionName] = defaultExport;
    }
  });

  await Promise.all(importPromises);

  return functions;
}

async function initializeAPI() {
  // Initialize the API root namespace
  if (!game.cpr) game.cpr = {};
  if (!game.cpr.api) game.cpr.api = {};
  if (!game.cpr.api.actor) {
    game.cpr.api.actor = {};
  }
  // Load actor functions
  const actorFunctions = await _loadActorFunctions();
  // Ensure game.cpr.api.actor remains defined
  if (!game.cpr.api.actor) {
    game.cpr.api.actor = {};
  }

  // Assign each of the actor functions to the namespace correctly
  Object.assign(game.cpr.api.actor, actorFunctions);
}

export default initializeAPI;
