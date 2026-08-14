// @ts-check
const { expect } = require('@playwright/test');
const Logger = require('../utils/logger');
const { AssertionError } = require('./assertionError');

const assertAttributeValuesOnMany = async (
  locator,
  attribute,
  values,
  partial
) => {
  const elements = await locator.all();
  const found = await Promise.all(
    elements.map((el) => el.getAttribute(attribute))
  );

  for (const expected of values) {
    const hit = partial
      ? found.some((attr) => attr?.includes(expected))
      : found.includes(expected);

    if (!hit) {
      const kind = partial ? 'containing' : 'with';
      throw new Error(
        `Expected to find attribute "${attribute}" ${kind} value "${expected}" in elements. Found values: ${found.join(', ')}`
      );
    }
  }
};

const ElementAssertions = {
  assertContainsText: async (locator, text, description, options) => {
    Logger.info(`Asserting text content for: ${description}`);
    try {
      if (options?.matchAny && Array.isArray(text)) {
        const elements = await locator.all();
        const elementTexts = await Promise.all(
          elements.map(async (el) => (await el.textContent()) || '')
        );

        const hasMatch = text.some((expectedText) =>
          elementTexts.some((elementText) =>
            typeof expectedText === 'string'
              ? elementText.includes(expectedText)
              : expectedText.test(elementText)
          )
        );

        if (!hasMatch) {
          throw new Error(
            `Expected to find at least one element containing any of: [${text.join(', ')}], but found: [${elementTexts.join(', ')}]`
          );
        }
      } else {
        await expect(locator).toContainText(text, {
          timeout: options?.timeout,
        });
      }
      Logger.info(`Assertion passed: ${description}`);
    } catch (error) {
      if (error instanceof Error) {
        throw new AssertionError(description, error);
      }
      throw error;
    }
  },

  assertHasAttribute: async (
    locator,
    attribute,
    value,
    description,
    partial = false
  ) => {
    Logger.info(`Asserting attribute "${attribute}" for: ${description}`);
    try {
      if (Array.isArray(value)) {
        await assertAttributeValuesOnMany(locator, attribute, value, partial);
      } else if (partial) {
        const attributeValue = await locator.getAttribute(attribute);
        if (!attributeValue?.includes(value)) {
          throw new Error(
            `Expected attribute "${attribute}" to contain value "${value}", but found "${attributeValue}".`
          );
        }
      } else {
        await expect(locator).toHaveAttribute(attribute, value);
      }
      Logger.info(`Assertion passed: ${description}`);
    } catch (error) {
      if (error instanceof Error) {
        throw new AssertionError(description, error);
      }
      throw error;
    }
  },

  assertIsNotEmpty: async (locator, description, options) => {
    Logger.info(`Asserting collection is not empty for: ${description}`);
    try {
      await expect
        .poll(() => locator.count(), { timeout: options?.timeout })
        .toBeGreaterThan(0);
      Logger.info(`Assertion passed: ${description}`);
    } catch (error) {
      if (error instanceof Error) {
        throw new AssertionError(description, error);
      }
      throw error;
    }
  },

  assertIsEmpty: async (locator, description, options) => {
    Logger.info(`Asserting collection is empty for: ${description}`);
    try {
      await expect(locator).toHaveCount(0, { timeout: options?.timeout });
      Logger.info(`Assertion passed: ${description}`);
    } catch (error) {
      if (error instanceof Error) {
        throw new AssertionError(description, error);
      }
      throw error;
    }
  },
};

module.exports = { ElementAssertions };
