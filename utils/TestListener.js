// @ts-check
const Logger = require('./logger');

const TEST_SEPARATOR =
  '-----------------------------------------------------------------------------';

class TestListener {
  constructor() {
    this.testLogs = new Map();
  }

  onTestBegin(test) {
    this.testLogs.set(test.id, []);
    this.logForTest(
      test.id,
      this.formatMessage(`TEST: ${test.title} - STARTED`),
      true
    );
  }

  onTestEnd(test, result) {
    const retryMessage = result.retry > 0 ? ` (Retry #${result.retry})` : '';
    const statusMessage = `TEST: ${test.title} - ${result.status.toUpperCase()}${retryMessage}`;
    this.logForTest(
      test.id,
      result.status === 'failed' || result.status === 'timedOut'
        ? this.formatError(statusMessage)
        : this.formatMessage(statusMessage),
      true
    );

    if (
      (result.status === 'failed' || result.status === 'timedOut') &&
      result.error
    ) {
      this.logForTest(
        test.id,
        this.formatError(`Error: ${result.error.message}`)
      );
      if (result.error.stack) {
        this.logForTest(
          test.id,
          this.formatError(`Stack trace:\n${result.error.stack}`)
        );
      }
    }

    const logs = this.testLogs.get(test.id) || [];
    console.log(logs.join('\n'));

    this.testLogs.delete(test.id);
  }

  onStdOut(chunk, test) {
    if (test) {
      this.logForTest(test.id, chunk.toString());
    } else {
      console.log(chunk.toString());
    }
  }

  onStdErr(chunk, test) {
    if (test) {
      this.logForTest(test.id, chunk.toString());
    } else {
      console.error(chunk.toString());
    }
  }

  onError(error) {
    Logger.error(`Message: ${error.message}`);
    Logger.error(`Stack: ${error.stack}`);
    Logger.error(`Value: ${error.value}`);
  }

  async onEnd(result) {
    if (result.status === 'passed') {
      Logger.info('\n✓ Build passed!\n');
    } else if (result.status === 'failed') {
      Logger.error('\n✗ Build failed!\n');
    }
  }

  formatMessage(msg) {
    const blue = '\x1b[34m';
    const reset = '\x1b[0m';
    return `${blue}${msg}${reset}`;
  }

  formatError(msg) {
    const red = '\x1b[31m';
    const reset = '\x1b[0m';
    return `${red}${msg}${reset}`;
  }

  formatSeparator(separator) {
    const yellow = '\x1b[33m';
    const reset = '\x1b[0m';
    return `${yellow}${separator}${reset}`;
  }

  logForTest(testId, message, withSeparator = false) {
    const logs = this.testLogs.get(testId) || [];
    if (withSeparator) {
      logs.push(this.formatSeparator(TEST_SEPARATOR));
    }
    logs.push(message);
    if (withSeparator) {
      logs.push(this.formatSeparator(TEST_SEPARATOR));
    }
    this.testLogs.set(testId, logs);
  }
}

module.exports = TestListener;
