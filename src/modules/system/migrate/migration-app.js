import LOGGER from "../../utils/cpr-logger.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class MigrationApp extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  constructor(options = {}) {
    LOGGER.trace("constructor | MigrationApp");
    super(options);
    this.#migrationRunner = options.migrationRunner;
  }

  /** A private reference to the migration runner which created this app. */
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
}
