/**
 * Wraps the underlying Playwright/runtime error with a human-readable description
 * so assertion failures surface intent instead of raw matcher output.
 */
class AssertionError extends Error {
  constructor(description, cause) {
    const message = cause
      ? `Assertion failed: ${description}\n  cause: ${cause.message}`
      : `Assertion failed: ${description}`;
    super(message);
    this.name = 'AssertionError';
    this.cause = cause;
    if (cause?.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

module.exports = { AssertionError };
