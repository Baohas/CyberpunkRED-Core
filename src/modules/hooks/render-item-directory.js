/* global $ Hooks game */
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

/**
 * This function is the thing that actually puts the list together in `prepareSubList()`. It works
 * recursively, calling itself if child items also have installed items.
 *
 * @param {CPRItem(Container)} parentItem - The parent item (not necessarily the top-most item)
 * @param {String} topLevelId - ID of the top-most item.
 * @param {Number} [level = 0] - The amount of indentation.
 * @returns {String}
 */
function recursiveHTML(parentItem, topLevelId, level = 0) {
  // Get all items installed in the parent and sort.
  const installedItems = parentItem.getInstalledItems().sort((a, b) => {
    // If items are the same type, sort alphabetically.
    if (a.type === b.type) return a.name > b.name ? 1 : -1;

    let sortOrder = [];
    switch (parentItem.type) {
      case "weapon":
      case "itemUpgrade":
        // For weapons and item upgrades, show loaded ammo at the top.
        sortOrder = ["ammo"];
        break;
      case "cyberdeck":
        // For cyberdecks, show installed programs at the top.
        sortOrder = ["program"];
        break;
      case "cyberware":
        // For cyberware, show installed cyberware at the top.
        sortOrder = ["cyberware"];
        break;
      default:
        break;
    }
    return sortOrder.indexOf(a.type) > sortOrder.indexOf(b.type) ? -1 : 1;
  }); // Sort so ammo always comes first

  let listItem = "";
  // For each installed item, create an <li> element with information about that item.
  for (const childItem of installedItems) {
    listItem += `<li class="item flexrow" data-row-level=${level} data-top-level-parent="${topLevelId}"
                       data-item-id="${childItem.id}">`;
    listItem += `  <a class="name item-view flex-center">${childItem.name}</a>`;
    listItem += `</li>`;
    // If the child item has its own installed items, call this function on the child item
    // and increase the indent.
    if (childItem.system.installedItems?.list?.length > 0) {
      listItem += recursiveHTML(childItem, topLevelId, level + 1);
    }
  }
  return listItem;
}

/**
 * Prepare the html for the install tree sub-list. To be appended after each item which contains
 * other items
 *
 * @private
 * @param {jQuery} element - the element which represents an item with items installed into it.
 * @returns {String} - HTML of the element's install tree
 */
function _prepareSubList(element) {
  const item = game.items.get(element.dataset.documentId);
  // Only create a dropdown if the item has installed items.
  if (item.system.installedItems?.list.length > 0) {
    const installFlag = item.getFlag(game.system.id, "showInstalled");
    const listItems = recursiveHTML(item, item.id);
    // Is subitem hidden or not
    const display = installFlag ? "" : "item-hidden";
    // Here we wrap the whole sub-list in a div, so that we can animate it
    return `<div class="sub-list ${display}" data-items-wrapper-for-parent="${item.id}"><ol>${listItems}</ol></div>`;
  }
  // Otherwise return a blank string.
  return "";
}

/**
 * Prepare the html for the chevron button/icon. Its state depends on whether or not the
 * install tree is displayed.
 *
 * @private
 * @param {jQuery} element - the element which represents an item with items installed into it.
 * @returns {String} - HTML for the chevron button.
 */
function _prepareChevron(element) {
  const item = game.items.get(element.dataset.documentId);
  const display = item.getFlag(game.system.id, "showInstalled")
    ? "fa-flip-vertical"
    : "";
  return `<a class="toggle-install-list-button"><i class="fas fa-chevron-down ${display}"></i></a>`;
}

/**
 * Render the sheet of an installed item. For now, installed item sheets are view only.
 *
 * @callback
 * @private
 * @param {*} event - object with details of the event
 */
function _renderViewOnlyItemSheet(event) {
  const itemId = SystemUtils.GetEventDatum(event, "data-item-id");
  const item = game.items.get(itemId);
  item.sheet.render(true, { editable: false });
}

/**
 * Toggle display of nested installed items in the item directory.
 *
 * @callback
 * @private
 * @param {*} event - object with details of the event
 */
function _toggleInstalledVisibility(event) {
  // Step 1: Prepare data
  const itemId = SystemUtils.GetEventDatum(event, "data-document-id");
  const item = game.items.get(itemId);

  // Step 2: Toggle the icon rotation to indicate state change.
  const iconElement = event.currentTarget.querySelector("i");
  if (iconElement) {
    iconElement.classList.toggle("fa-flip-vertical");
  }

  // Step 3: Identify the HTML elements in the sub-list involved in the toggling.
  const installedRow = $(event.currentTarget.closest(".directory-list")).find(
    `div[data-items-wrapper-for-parent="${itemId}"]`
  );

  installedRow.toggleClass("item-hidden");

  // Wait for the expand/collapse animation to complete before updating the installFlags (because it re-renders the handlebars)
  installedRow.one("transitionend", async () => {
    const installFlag = item.getFlag(game.system.id, "showInstalled");
    // Update the installFlags.
    await item.setFlag(game.system.id, "showInstalled", !installFlag);
  });
}

/**
 * This is where we inject HTML and listeners for the item directory. The content we inject displays
 * an items install tree.
 *
 * Note: Hooks have a set of args that are passed to them from Foundry. Even if we do not use them here,
 * we document them all for clarity's sake and to make future development/debugging easier.
 */
const renderItemDirHooks = () => {
  Hooks.on("renderItemDirectory", (_, html) => {
    LOGGER.trace("renderItemDirectory | renderItemDirHooks | Called.");
    const itemElements = html.find("li.item");

    // Get elements that represent items which have other items installed in them.
    const itemsWithInstalledElements = itemElements.filter((__, element) => {
      const item = game.items.get(element.dataset.documentId);
      return item.system.installedItems?.list.length > 0;
    });

    // Append the list to each element that represents an item with installed items.
    for (const element of Array.from(itemsWithInstalledElements)) {
      // Prepare the chevron icon (whether or not it should be in the open or closed position).
      const chevronIcon = _prepareChevron(element);
      // Append the chevron icon to the parent item.
      $(element).append(chevronIcon);

      // Prepare the html for the install tree.
      const installedListHTML = _prepareSubList(element);
      // Append the installed list to every parent element.
      $(element).after(installedListHTML);
    }

    // Give each item in the sublist an event listener for viewing sheets.
    html
      .find(".sub-list")
      .on("click", ".item-view", (event) => _renderViewOnlyItemSheet(event));

    // Give each button an event listener for toggling display of the install tree.
    itemElements.on("click", ".toggle-install-list-button", (event) => {
      _toggleInstalledVisibility(event);
    });
  });
};
export default renderItemDirHooks;
