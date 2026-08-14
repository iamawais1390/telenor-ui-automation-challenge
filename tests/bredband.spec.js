// @ts-check
const { test } = require('@playwright/test');
const { HomePage } = require('../pages/HomePage');
const { BredbandPage } = require('../pages/bredband');
const { ElementAssertions } = require('../assertions/elementAssertions');
const { bredband } = require('../fixture/testData');

test.describe('Bredband address search', () => {
  test('shows featured products for a serviceable address', async ({
    page,
  }) => {
    await page.goto('/');
    const homePage = await HomePage.create(page);
    await homePage.dismissCookieConsent();

    const bredbandPage = await homePage.goToBredband();
    await bredbandPage.enterAddress(bredband.validAddress);

    await ElementAssertions.assertIsNotEmpty(
      bredbandPage.featuredProductGrid,
      'Featured product grid has results for a serviceable address'
    );
    await ElementAssertions.assertContainsText(
      bredbandPage.featuredProductGrid,
      [bredband.expectedProductText],
      'Featured product grid contains the expected 5G broadband offer',
      { matchAny: true }
    );
  });

  test('shows no featured products before an address is searched', async ({
    page,
  }) => {
    await page.goto('/handla/bredband/');
    const bredbandPage = await BredbandPage.create(page);

    await ElementAssertions.assertIsEmpty(
      bredbandPage.featuredProductGrid,
      'Featured product grid is empty before a search'
    );
  });

  test('shows an address-not-found message for an unrecognized address', async ({
    page,
  }) => {
    await page.goto('/');
    const homePage = await HomePage.create(page);
    await homePage.dismissCookieConsent();

    const bredbandPage = await homePage.goToBredband();
    await bredbandPage.enterAddress(bredband.unknownAddress);

    await ElementAssertions.assertContainsText(
      bredbandPage.addressNotFoundAlert,
      bredband.addressNotFoundMessage,
      'Address-not-found alert is shown for an unrecognized address'
    );
    await ElementAssertions.assertIsEmpty(
      bredbandPage.featuredProductGrid,
      'Featured product grid stays empty for an unrecognized address'
    );
  });
});
