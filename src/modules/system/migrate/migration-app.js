import LOGGER from "../../utils/cpr-logger.js";
import Progress from "../../utils/Progress.js";
import CPR from "../config.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class MigrationApp extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  constructor(options = {}) {
    LOGGER.trace("constructor | MigrationApp");
    super(options);
    this.#migrationRunner = options.migrationRunner;
    /** @type {Progress[]} */
    this.progress = MigrationApp.prepareProgressBars();
    this.#currentPhase = "init";
  }

  /**
   * The possible phases of the migration application. An error
   * is thrown if you try to set a phase that isn't in this list.
   *
   * @type {Object<string, Object>}
   */
  static PHASES = {
    // This following phases are the standard flow of migrations,
    // from initialization to success.
    init: {
      statusChange: true,
    },
    documentsReady: {},
    migrateItems: {
      statusChange: true,
      docType: "items",
    },
    applyChangesItems: {},
    migrateActors: {
      statusChange: true,
      docType: "actors",
    },
    applyChangesActors: {},
    migrateScenes: {
      statusChange: true,
      docType: "scenesTokens",
    },
    migrateCompendia: {
      statusChange: true,
      docType: "packsDocs",
    },
    migrationComplete: {
      statusChange: true,
    },
    // Below this line are phases which don't follow
    // the standard flow of migration.
    error: {
      statusChange: true,
    },
    userPrevented: {
      statusChange: true,
    },
  };

  /**
   * The current phase of the migration application.
   * @type {string}
   */
  #currentPhase;

  /**
   * A private reference to the migration runner which created this app.
   *
   * @type {MigrationRunner}
   */
  #migrationRunner;

  /**
   * Getter to access the migration runner that created this app.
   * @returns {MigrationRunner}
   */
  get migrationRunner() {
    LOGGER.trace("get migrationRunner | MigrationApp");
    return this.#migrationRunner;
  }

  /**
   * Sets the current phase of the migration application,
   * and calls the appropriate method. Throws an error if
   * the provided phase value is not in the list of possible phases.
   *
   * @param {string} value - The new phase value to set.
   */
  set currentPhase(value) {
    LOGGER.trace("set currentPhase | MigrationApp");
    if (!Object.keys(MigrationApp.PHASES).includes(value)) {
      throw new Error(`Invalid phase: ${value}`);
    }
    this.#currentPhase = value;
    this.onPhaseChange();
  }

  /**
   * Calculates the localized current status of the migration application.
   *
   * @return {string|null}
   */
  get currentStatus() {
    LOGGER.trace("get currentStatus | MigrationApp");
    const phase = this.#currentPhase;
    const phaseData = MigrationApp.PHASES[phase];
    const { docType, statusChange } = phaseData;
    if (!statusChange) return null;
    let statusString = game.i18n.localize(`CPR.migration.status.${phase}`);
    if (docType) {
      statusString = game.i18n.format("CPR.migration.status.migratingDocs", {
        docType: game.i18n.localize(`CPR.migration.docType.${docType}`),
      });
    }
    return statusString;
  }

  /**
   * Checks if the MigrationRunner has successfully completed all migrations.
   * @returns {Boolean}
   */
  get migrationSuccessful() {
    LOGGER.trace("get migrationSuccessful | MigrationApp");
    return this.migrationRunner.migrationSuccessful;
  }

  /**
   * Not explicitly an override, but rather Foundry itself merges this object
   * up the prototype chain.
   */
  static DEFAULT_OPTIONS = {
    id: "cpr-migration",
    classes: ["dialog", "cpr-migration-dialog"],
    tag: "dialog",
    window: {
      title: "CPR Migration",
    },
    position: {
      width: 600,
      height: 500,
    },
    modal: true,
  };

  /**
   * This is how we tell AppV2 which templates to use. Note the following, taken from the wiki:
   *   - Each part should return a single HTML element, i.e. only one pair of top-level tags.
   *   - The parts are concatenated in the order of the static property
   *   - All parts are encapsulated by the top-level tag set in DEFAULT_OPTIONS.tag.
   */
  static PARTS = {
    body: {
      template: `systems/cyberpunk-red-core/templates/migration/migration-app.hbs`,
    },
  };

  /**
   * This is how we prepare the context for the template. Equivalent to `getData()`
   * in AppV1, but is always async.
   *
   * @override
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async _prepareContext(options) {
    LOGGER.trace("_prepareContext | MigrationApp");
    const context = await super._prepareContext(options);
    context.runner = this.migrationRunner;
    context.progress = this.progress;
    context.status = this.currentStatus;
    return context;
  }

  /** @override */
  _onFirstRender(_context, _options) {
    LOGGER.trace("_onFirstRender | MigrationApp");
    if (this.options.modal) this.element.showModal();
    else this.element.show();
  }

  /** @override */
  _onRender(context, options) {
    LOGGER.trace("_onRender | MigrationApp");
    const dialog = this.element;
    dialog.addEventListener("keydown", this._preventEscape.bind(this));
  }

  /**
   * Handle keypresses within the dialog. This code is taken from Foundry's.
   * @param {KeyboardEvent} event  The triggering event.
   * @protected
   */
  _preventEscape(event) {
    LOGGER.trace("_preventEscape | MigrationApp");
    // Capture Escape keypresses for dialogs to ensure that close is called properly.
    // The default behavior of `<dialog>` elements is to close on Escape keypress.
    if (event.key === "Escape") {
      event.preventDefault(); // Prevent default browser dialog dismiss behavior.
      event.stopPropagation();
      this.close();
    }
  }

  /**
   * Prevent user from closing dialog unless migration is successful.
   * @override
   */
  close(options = {}) {
    LOGGER.trace("close | MigrationApp");
    if (!this.migrationSuccessful) return;

    super.close(options);
  }

  /**
   * Prepares progress bars for each document type based on the total number of documents.
   *
   * @return {Object<Progress>} - An object containing progress bars for each document type.
   *                            - The keys are document types and values are Progress objects.
   */
  static prepareProgressBars() {
    LOGGER.trace("prepareProgressBars | MigrationApp");
    const progressBars = {};
    for (const [docType, label] of Object.entries(CPR.migrationDocTypes)) {
      const classes =
        docType === "tokens" || docType === "packDocuments"
          ? ["sub-category"]
          : [];
      progressBars[docType] = new Progress({
        id: `migration-progress-${docType}`,
        label,
        max: null, // We will set this later.
        classes,
      });
    }
    return progressBars;
  }

  /**
   * Handles the change of the current phase in the MigrationApp.
   * Calls the appropriate function for the current phase.
   *
   * @return {Promise<void>} A promise that resolves when the function for the current phase is called.
   */
  async onPhaseChange() {
    LOGGER.trace("onPhaseChange | MigrationApp");
    const phase = this.#currentPhase;
    const functionName = `on${phase.capitalize()}`;
    this.changeStatus(); // Change status message.
    if (typeof this[functionName] !== "function") return;
    await this[functionName](); // Call the function for this phase.
  }

  /**
   * Handles the phase of the MigrationApp when the documents are ready.
   * Sets the element, max value, and renders the progress bar
   * for each document type.
   *
   * @return {Promise<void>} A promise that resolves when the progress bars are set and rendered.
   */
  async onDocumentsReady() {
    LOGGER.trace("onDocumentsReady | MigrationApp");
    for (const [docType, progress] of Object.entries(this.progress)) {
      progress.element = this.element.querySelector(
        `#migration-progress-${docType}`
      );
      progress.max = this.migrationRunner.totalDocs[docType];
      progress.render();
    }
  }

  /**
   * Updates the status element based on the current phase.
   *
   * @return {void}
   */
  changeStatus() {
    LOGGER.trace("changeStatus | MigrationApp");
    const { element } = this;
    const statusString = this.currentStatus;
    const statusElement = element.querySelector(".progress-status");
    statusElement.innerHTML = statusString;
  }
}
