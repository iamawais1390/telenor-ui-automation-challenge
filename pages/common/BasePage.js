const { expect } = require('@playwright/test');
const Logger = require('../../utils/logger');
const interact = require('./interactions');

class BasePage {
  constructor(page) {
    this.page = page;
  }

  static async create(page) {
    const instance = new this(page);
    await instance.waitForPageLoad();
    return instance;
  }

  get pageElement() {
    throw new Error(`${this.constructor.name} must implement "pageElement".`);
  }

  async waitForPageLoad(timeout = 30000) {
    const locator = this.pageElement.selector;
    try {
      await locator.waitFor({ state: 'visible', timeout });
    } catch (error) {
      const pageName = this.constructor.name;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Wrong page detected: Expected ${pageName} but page element not found. ${errorMessage}`
      );
    }
  }

  /**
   * Run a Playwright `expect(...)` with pass/fail logging.
   * Works for any matcher — pass the full expect call in `run`.
   */
  async check(description, run) {
    Logger.info(`Expecting: ${description}`);
    await run();
    Logger.info(`Passed: ${description}`);
  }

  async navigateTo(action, TargetPage) {
    await action();
    const instance = new TargetPage(this.page);
    await instance.waitForPageLoad();
    return instance;
  }

  async navigate() {
    // Subclasses override to navigate to their canonical URL.
  }

  async navigateToPath(path) {
    const response = await this.page.goto(path);
    await this.check('Navigation response is successful', async () => {
      expect(response?.status()).toBeLessThan(400);
    });
    await this.waitForPageLoad();
  }

  async waitForElementToBeVisible(locator) {
    await locator.waitFor({ state: 'visible' });
    await this.check('Element is visible', () =>
      expect(locator, 'Element is visible').toBeVisible()
    );
  }

  async waitForCount(locator, expectedCount, options) {
    const message = options?.message || `Count should be ${expectedCount}`;
    await this.check(message, () =>
      expect
        .poll(async () => locator.count(), {
          message,
          timeout: options?.timeout || 10000,
        })
        .toBe(expectedCount)
    );
  }

  /**
   * Reject non-essential cookies on the OneTrust consent banner, if it's
   * showing. Fresh browser contexts (every Playwright test) hit this on
   * first load; a no-op when the banner isn't present (already dismissed).
   */
  async dismissCookieConsent() {
    const rejectButton = this.page.locator('#onetrust-reject-all-handler');
    try {
      await rejectButton.waitFor({ state: 'visible', timeout: 5000 });
      await rejectButton.click();
    } catch {
      // Banner never appeared — nothing to dismiss.
    }
  }

  async fillInputField(options) {
    await interact.fillInputField(options);
  }

  async click(options) {
    await interact.click(options);
  }
}

module.exports = { BasePage };
