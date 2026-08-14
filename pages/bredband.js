// @ts-check
const { BasePage } = require('./common/BasePage');

class BredbandPage extends BasePage {
  get pageElement() {
    return { selector: this.addressInput };
  }

  get addressInput() {
    return this.page.locator('.address-search-input__wrapper__input');
  }

  get featuredProductGrid() {
    return this.page.locator('.featured-product-grid-item');
  }

  get addressNotFoundAlert() {
    return this.page.locator('.tn-alert__content');
  }

  /**
   * The address field is an autocomplete combobox: typing alone doesn't
   * trigger results, the matching suggestion (if any) must be committed
   * with Enter. Doesn't wait on an outcome — an unmatched address never
   * populates the grid, so that's left to the caller's assertion.
   */
  async enterAddress(address) {
    await this.fillInputField({
      locator: this.addressInput,
      text: address,
      name: 'Bredband address search input',
    });
    await this.page.keyboard.press('Enter');
  }
}

module.exports = { BredbandPage };
