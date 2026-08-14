// @ts-check
const Logger = require('../../../utils/logger');

/** Slower keystrokes for fields that drop characters when typed too fast. */
const SLOW_TYPING_DELAY_MS = 200;

const INPUT_READY_DELAY_MS = 150;
const DEFAULT_TYPING_DELAY_MS = 100;

async function fillInputField({
  locator,
  text,
  name,
  clearBeforeFill = false,
  logAction = true,
  useSequentialTyping = true,
  typingDelay,
  isPassword = false,
  slowTyping = false,
}) {
  const resolvedTypingDelay =
    typingDelay ??
    (isPassword || slowTyping ? SLOW_TYPING_DELAY_MS : DEFAULT_TYPING_DELAY_MS);
  const displayText = isPassword
    ? '*'.repeat(Math.min(text.length, 8))
    : text;

  try {
    if (logAction) {
      Logger.info(`Filling text "${displayText}" in ${name}`);
      if (clearBeforeFill) {
        Logger.info(`Clearing existing text in ${name} before filling`);
      }
    }

    await locator.waitFor({ state: 'visible', timeout: 30000 });
    await locator.click();
    await locator.focus();

    if (clearBeforeFill) {
      await locator.fill('');
      await locator.page().waitForTimeout(INPUT_READY_DELAY_MS);
    }

    if (useSequentialTyping) {
      await locator.pressSequentially(text, { delay: resolvedTypingDelay });
      const actual = await locator.inputValue();
      if (actual !== text) {
        if (logAction) {
          Logger.warn(
            `Sequential typing mismatch in ${name} (expected length ${text.length}, got ${actual.length}); using fill fallback`
          );
        }
        await locator.fill(text);
      }
    } else {
      await locator.fill(text);
    }

    if (logAction) {
      Logger.info(`Successfully filled text "${displayText}" in ${name}`);
    }
  } catch (error) {
    if (logAction) {
      Logger.error(`Failed to fill text "${displayText}" in ${name}`, {
        error: error.message,
        stack: error.stack,
      });
    }
    throw new Error(
      `Failed to fill text "${displayText}" in ${name}: ${error.message}`,
      { cause: error }
    );
  }
}

module.exports = { fillInputField, SLOW_TYPING_DELAY_MS };
