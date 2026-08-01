import BaseMigrationScript from "../base-migration-script.js";

/**
 * Persist the fold of `system.derivedStats.*` into `system.stats.*` for existing worlds.
 *
 * The derived stats (currentWoundState, deathSave, hp, humanity, run, seriouslyWounded, walk) used to
 * live in their own `system.derivedStats` embedded model; they now sit alongside the ten base STATs in
 * a single `system.stats` object. The fold itself is performed by `CommonSchema.migrateData`, which
 * runs during data cleaning — the only place it *can* run, because Foundry v13 strips the now-unknown
 * `derivedStats` key from the source before a document is ever read via `toObject()` (so a migration
 * that read `toObject()` here would only see the already-folded data).
 *
 * This version-gated migration therefore does no folding of its own; it exists solely to re-write every
 * character/mook actor once, so the folded shape is persisted to the database instead of being derived
 * lazily on each load. The runner re-saves each matching document with `diff: false`, writing the
 * already-folded `toObject()`.
 */
export default class FoldDerivedStats extends BaseMigrationScript {
  static version = 43;

  static name = "Actor: Fold derivedStats into stats";

  static documentFilters = {
    Item: { types: [], mixins: [] },
    Actor: { types: ["character", "mook"], mixins: [] },
  };

  // No updateActor/updateItem override: the fold is done by CommonSchema.migrateData during cleaning.
  // This migration only needs to select the character/mook actors (via documentFilters) so the runner
  // re-saves each one (diff: false), persisting the already-folded data.
}
