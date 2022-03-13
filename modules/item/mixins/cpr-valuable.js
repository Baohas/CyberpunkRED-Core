import LOGGER from "../../utils/cpr-logger.js";

/**
 * Valuable Items have a price and a price category. This might belong in "common" if we agree
 * every item in the game should have a price.
 */
const Valuable = function Valuable() {
  /**
   * Return the price of an Item that is set with the category.
   * This will be useful for future automation that sets the category
   * automatically based on the price. Not currently used anywhere.
   *
   * @param {String} category - the price category for an Item
   * @returns {Number} - the price of the item per the core rules
   */
  this.calcPrice = function calcPrice(category) {
    LOGGER.trace("calcPrice | Valuable | Called.");
    // Note: since we use "const", this map is not persisted on the Item object the mixin is added to
    const PRICE_CATEGORY_MAPPINGS = {
      free: 0,
      cheap: 5,
      everyday: 20,
      costly: 50,
      premium: 100,
      expensive: 500,
      veryExpensive: 1000,
      luxury: 5000,
      superLuxury: 10000,
    };

    let price = PRICE_CATEGORY_MAPPINGS[category];
    const itemData = this.data;
    if (itemData.type === "ammo") {
      if (itemData.variety !== "grenade" && itemData.variety !== "rocket") price /= 10;
    }
    return price;
  };

  /**
   * Opposite of calcPrice. Given a price, return the category. Used in the AE migration code.
   *
   * @param {Number} price
   * @returns {String}
   */
  this.getPriceCategory = function getPriceCategory(price) {
    if (price === 0) return "free";
    if (price > 0 && price <= 5) return "cheap";
    if (price > 5 && price <= 20) return "everyday";
    if (price > 20 && price <= 50) return "costly";
    if (price > 50 && price <= 100) return "premium";
    if (price > 100 && price <= 500) return "expensive";
    if (price > 500 && price <= 1000) return "veryExpensive";
    if (price > 1000 && price <= 5000) return "luxury";
    if (price > 5000 && price <= 10000) return "superLuxury";
    return "extravagant";
  };
};

export default Valuable;
