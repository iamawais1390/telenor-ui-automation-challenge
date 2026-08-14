// @ts-check
const { expect } = require('@playwright/test');
const Logger = require('../utils/logger');
const { AssertionError } = require('./assertionError');

const PageAssertions = {
  assertHasTitle: async (page, title, description) => {
    Logger.info(`Asserting page title: ${description}`);
    try {
      await expect(page).toHaveTitle(title);
      Logger.info(`Assertion passed: ${description}`);
    } catch (error) {
      if (error instanceof Error) {
        throw new AssertionError(description, error);
      }
      throw error;
    }
  },

  assertHasURL: async (page, url, description) => {
    Logger.info(`Asserting page URL: ${description}`);
    try {
      await expect(page).toHaveURL(url);
      Logger.info(`Assertion passed: ${description}`);
    } catch (error) {
      if (error instanceof Error) {
        throw new AssertionError(description, error);
      }
      throw error;
    }
  },
};

module.exports = { PageAssertions };
