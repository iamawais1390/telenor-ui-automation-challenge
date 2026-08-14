const { BasePage } = require('./common/BasePage');
const { BredbandPage } = require('./bredband');

class HomePage extends BasePage {
  get pageElement() {
    return { selector: this.page.locator('.tn-hero-main-content') };
  }

  get bredbandNavToggle() {
    return this.page.locator('nav').getByRole('button', {
      name: 'Bredband',
      exact: true,
    });
  }

  get bredbandDropdownLink() {
    return this.page
      .getByLabel('Undermeny')
      .getByRole('link', { name: 'Bredband', exact: true });
  }

  /**
   * The site has no literal "Handla" nav element — the "Handla" and
   * "Bredband" challenge steps map to opening the "Bredband" nav dropdown
   * and clicking the "Bredband" heading link inside it.
   */
  async goToBredband() {
    return this.navigateTo(async () => {
      await this.click({
        locator: this.bredbandNavToggle,
        name: 'Bredband nav toggle (Handla)',
      });
      await this.click({
        locator: this.bredbandDropdownLink,
        name: 'Bredband dropdown link',
      });
    }, BredbandPage);
  }
}

module.exports = { HomePage };
