const DEV_MODE_DEFAULTS = {
  devMode: {
    migrations: {
      enforceMinimumVersion: true,
      remigrateAlreadyMigrated: false,
      batchMigrations: true,
      migrateSystemCompendia: false,
      simulateMigrationError: false,
      app: {
        returnToSetup: true,
        modal: true,
      },
    },
  },
};

export default DEV_MODE_DEFAULTS;
