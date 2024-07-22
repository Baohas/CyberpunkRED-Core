import LOGGER from "../../utils/cpr-logger.js";
import CPRSystemUtils from "../../utils/cpr-systemUtils.js";
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
    /** @type {Object<string,Progress>} */
    this.progress = MigrationApp.prepareProgressBars();

    /** @type {string[]} */
    this.messages = [game.i18n.localize("CPR.migration.messages.init")];
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
      addMessage: true,
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
      addMessage: true,
      buttons: {
        showChangelog: {
          label: "CPR.migration.buttons.showChangelog",
          icon: "fas fa-file-signature",
        },
        close: {
          label: "APPLICATION.TOOLS.Close",
          icon: "fas fa-times",
        },
      },
    },
    // This phase is called no matter the result of migration.
    end: {},
    // Below this line are phases which don't follow
    // the standard flow of migration.
    error: {
      statusChange: true,
      addMessage: true,
      buttons: {
        generateReport: {
          label: "CPR.migration.buttons.generateReport",
          icon: "fas fa-bug",
        },
        returnToSetup: {
          label: "GAME.ReturnSetup",
          icon: "fas fa-home",
        },
      },
    },
    userPrevented: {
      statusChange: true,
      addMessage: true,
      buttons: {
        returnToSetup: {
          label: "GAME.ReturnSetup",
          icon: "fas fa-home",
        },
      },
    },
  };

  /** The current phase of the migration application. */
  #currentPhase = "init";

  /** The index of the currently viewed message. */
  currentMessageIndex = 0;

  /** Whether the user has changed the message. */
  userChangedMessage = false;

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
   * Gets the buttons based on the current phase.
   *
   * @return {object}
   */
  get buttons() {
    LOGGER.trace("get buttons | MigrationApp");
    const phase = this.#currentPhase;
    return MigrationApp.PHASES[phase].buttons || null;
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
      height: 550,
    },
    actions: {
      showChangelog: MigrationApp.showChangelog,
      returnToSetup: MigrationApp.returnToSetup,
      navigate: MigrationApp.navigateMessages,
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
   * Note: Basic DOM manipulation is what is used to change things in the migration app,
   * so this is really only called on first render.
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
    context.messages = this.messages;
    context.currentMessage = this.currentMessageIndex + 1;
    context.buttons = this.buttons;
    return context;
  }

  /** @override */
  _onFirstRender(_context, _options) {
    LOGGER.trace("_onFirstRender | MigrationApp");
    const { element } = this;
    if (this.options.modal) element.showModal();
    else element.show();

    // Hide the progress count until we actually have calculated the max.
    element.querySelectorAll(".progress-count").forEach((elem) => {
      elem.style = "display: none";
    });

    this.renderNav(); // Hide nav buttons.
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
   * Navigate between messages, forward or back.
   *
   * The following parameters were taken from the wiki.
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
   */
  static navigateMessages(event, target) {
    LOGGER.trace("navigateMessages | MigrationApp");
    if (!this.userChangedMessage) this.userChangedMessage = true;
    const { direction } = target.dataset;

    const { currentMessageIndex } = this;

    const newIndex =
      direction === "back" ? currentMessageIndex - 1 : currentMessageIndex + 1;
    if (newIndex < 0 || newIndex >= this.messages.length) return;
    this.currentMessageIndex = newIndex;

    const message = this.messages[newIndex];
    const messagesElement = this.element.querySelector(".messages");
    const messageElement = messagesElement.querySelector(".message");
    messageElement.innerHTML = message;
    this.renderNav(); // Show/hide nav buttons.
  }

  /**
   * Shows the changelog journal.
   *
   * @return {Promise<void>}
   */
  static async showChangelog() {
    LOGGER.trace("showChangelog | MigrationApp");
    // Pop Up the relevant Changelog Journal from
    const changelog = await CPRSystemUtils.GetCompendiumDoc(
      CPR.changelogCompendium,
      `Changelog ${CONFIG.supportedLanguages[game.i18n.lang]}`
    );
    changelog.sheet.render(true);
  }

  static returnToSetup() {
    LOGGER.trace("returnToSetup | MigrationApp");
    game.shutDown();
  }

  /**
   * Prepares progress bars for each document type based on the total number of documents.
   *
   * @return {Object<string,Progress>} - An object containing progress bars for each document type.
   *                                   - The keys are document types and values are Progress objects.
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
   * Sets the current phase of the migration application,
   * and calls the appropriate method. Throws an error if
   * the provided phase value is not in the list of possible phases.
   *
   * @param {string} value - The new phase value to set.
   */
  async setCurrentPhase(value) {
    LOGGER.trace("setCurrentPhase | MigrationApp");
    if (!Object.keys(MigrationApp.PHASES).includes(value)) {
      throw new Error(`Invalid phase: ${value}`);
    }
    this.#currentPhase = value;
    await this.onPhaseChange();
  }

  /**
   * Handles the change of the current phase in the MigrationApp.
   * Calls the appropriate function for the current phase.
   *
   * NOTE: Phase-change functions should only change the state of the MigrationApp,
   * not the state of the migration/runner itself.
   *
   * @return {Promise<void>} A promise that resolves when the function for the current phase is called.
   */
  async onPhaseChange() {
    LOGGER.trace("onPhaseChange | MigrationApp");
    const phase = this.#currentPhase;
    const functionName = `on${phase.capitalize()}`;
    this.changeStatus(); // Change status message.
    await this.addMessage();
    await this.addButtons();
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

    // Show the progress count once we have calculated the max.
    this.element.querySelectorAll(".progress-count").forEach((elem) => {
      elem.style = "";
    });
  }

  /**
   * Handles the end phase of the MigrationApp, which is reached regardless
   * of migration outcome.
   *
   * Remove spinner.
   *
   * @return {Promise<void>}
   */
  async onEnd() {
    LOGGER.trace("onEnd | MigrationApp");
    const { element } = this;
    const spinner = element.querySelector(".spinner");
    spinner.style = "display: none";
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
    if (!statusString) return;
    const statusElement = element.querySelector(".progress-status");
    statusElement.innerHTML = statusString;
  }

  /**
   * Adds a message to the MigrationApp based on the current phase.
   *
   * @return {Promise<void>}
   */
  async addMessage() {
    LOGGER.trace("addMessage | MigrationApp");
    const phase = this.#currentPhase;
    const phaseData = MigrationApp.PHASES[phase];
    const { addMessage } = phaseData;
    if (!addMessage) return;

    // Add the messagge.
    const message = game.i18n.localize(`CPR.migration.messages.${phase}`);
    this.messages.push(message);

    // We force show a message if migration was aborted.
    // Otherwise, we only show it if the user has not changed the message manually.
    const forceShowMessage = phase === "error" || phase === "userPrevented";
    if (forceShowMessage || !this.userChangedMessage) {
      this.currentMessageIndex = this.messages.length - 1;
      const messagesElement = this.element.querySelector(".messages");
      const messageElement = messagesElement.querySelector(".message");
      messageElement.innerHTML = message;
    }

    this.renderNav(); // Show/hide nav buttons and update message count.
  }

  /**
   * Shows/hides navigation icons based on the number of messages and current message index.
   * Updates message count.
   *
   */
  renderNav() {
    LOGGER.trace("renderNav | MigrationApp");
    const messageCount = this.messages.length;
    const { currentMessageIndex } = this;
    const [prevIcon, nextIcon] =
      this.element.querySelectorAll(".message-nav > i");

    const messageCountElement = this.element.querySelector(".message-count");
    const messageCountString = `${currentMessageIndex + 1}/${messageCount}`;
    messageCountElement.innerHTML = messageCountString;

    prevIcon.style = "";
    nextIcon.style = "";

    if (messageCount <= 1) {
      prevIcon.style = "display: none";
      nextIcon.style = "display: none";
      return;
    }

    const atFirst = currentMessageIndex === 0;
    const atLast = currentMessageIndex === messageCount - 1;
    if (atFirst) {
      prevIcon.style = "display: none";
    }
    if (atLast) {
      nextIcon.style = "display: none";
    }
  }

  /**
   * Adds buttons to the migration app based on the current phase.
   *
   * @return {Promise<void>}
   */
  async addButtons() {
    LOGGER.trace("addButtons | MigrationApp");
    if (!this.buttons) return;
    const buttonsTemplate = await renderTemplate(
      `systems/${game.system.id}/templates/migration/migration-buttons.hbs`,
      this.buttons
    );
    const messagesElement = this.element.querySelector(".messages");
    const htmlTemplate = document.createElement("template");
    htmlTemplate.innerHTML = buttonsTemplate;
    const [element] = htmlTemplate.content.children;
    messagesElement.appendChild(element);
  }
}
