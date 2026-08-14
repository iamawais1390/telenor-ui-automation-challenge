const { expect } = require('@playwright/test');
const Logger = require('../../../utils/logger');

async function click({ locator, name, logAction = true }) {
  try {
    if (logAction) Logger.info(`Clicking on ${name}`);

    await locator.waitFor({ state: 'visible', timeout: 30000 });
    await expect(locator).toBeEnabled({ timeout: 30000 });
    await locator.click();

    if (logAction) Logger.info(`Successfully clicked ${name}`);
  } catch (error) {
    if (logAction) {
      Logger.error(`Failed to click ${name}`, {
        error: error.message,
        stack: error.stack,
      });
    }
    throw new Error(`Failed to click ${name}: ${error.message}`);
  }
}

module.exports = { click };
