import LOGGER from "./cpr-logger.js";

export default class Progress {
  constructor({ max = 100, label = "" } = {}) {
    LOGGER.trace("constructor | Progress");
    this.value = 0;
    this.max = max;
    this.label = label;
    this.element = null;
  }

  /**
   * Advances the progress by the specified amount and updates the progress bar.
   * Inspired by PF2e.
   *
   * @param {Object} options - The options for advancing the progress.
   * @param {number} [options.by=1] - The amount to advance the progress by.
   * @param {string} [options.label=this.label] - The label to display on the progress bar.
   * @return {void}
   */
  advance({ by = 1, label = this.label } = {}) {
    LOGGER.trace("advance | Progress");

    if (this.value === this.max) return;
    this.value += Math.abs(by);
    const percent = Math.floor((this.value / this.max) * 100);
    this.updateBar({ label, percent });
  }

  /**
   * Closes the progress bar by fading it out over a specified duration.
   *
   * @return {void}
   */
  close() {
    LOGGER.trace("close | Progress");
    const bar = this.element;
    if (bar !== null) {
      if (!bar.hidden) {
        $(bar).fadeOut(2000);
      }
    }
  }

  /**
   * Renders the progress bar with the specified percentage.
   *
   * @param {number} [percent=0] - The percentage value to render the progress bar.
   * @return {void}
   */
  render(percent = 0) {
    LOGGER.trace("render | Progress");
    // Add the migration bar to the document since it is not there
    const migrationNode = document.createElement("div");
    migrationNode.id = "cpr-migrating";
    migrationNode.style = `display: block;`;
    const migrationBar = document.createElement("div");
    migrationBar.id = "cpr-migration-bar";
    migrationBar.style = `width: ${percent}%`;
    migrationBar.className = "migration-bar";
    const migrationContext = document.createElement("label");
    migrationContext.id = "cpr-mig-context";
    migrationContext.innerHTML = this.label;
    const migrationProgress = document.createElement("label");
    migrationProgress.id = "cpr-mig-progress";
    migrationProgress.innerHTML = `${percent}%`;
    migrationBar.appendChild(migrationContext);
    migrationBar.appendChild(migrationProgress);
    migrationNode.appendChild(migrationBar);
    const uiTop = document.getElementById("ui-top");
    uiTop.appendChild(migrationNode);
    this.element = migrationNode;
  }

  /**
   * Updates the bar at the top of the page.
   * The last time this is called should set the percentage to 100 so it will clear the bar.
   *
   * @param {Number} percent - Percentage complete
   * @param {String} label - The words to display on the migration status bar
   */
  updateBar({ percent, label } = {}) {
    LOGGER.trace("updateBar | CPRSystemUtils");
    const bar = this.element;
    if (bar === null) {
      this.render();
    } else {
      // Update the existing bar
      bar.querySelector("#cpr-mig-context").textContent = label;
      bar.querySelector("#cpr-mig-progress").textContent = `${percent}%`;
      bar.children["cpr-migration-bar"].style = `width: ${percent}%`;
      bar.style.display = "block";
      if (percent === 100 && !bar.hidden) this.close();
    }
  }
}
