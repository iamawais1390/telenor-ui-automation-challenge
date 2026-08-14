// @ts-check
const { AssertionError } = require('./assertionError');
const { ElementAssertions } = require('./elementAssertions');
const { PageAssertions } = require('./pageAssertions');

/**
 * Single flat namespace for specs:
 *
 *   const { Assert } = require('../assertions');
 *   await Assert.assertIsNotEmpty(...);
 *   await Assert.assertHasURL(...);
 *
 * Register new assertion groups by spreading them here.
 */
const Assert = {
  ...ElementAssertions,
  ...PageAssertions,
};

module.exports = { Assert, AssertionError, ElementAssertions, PageAssertions };
