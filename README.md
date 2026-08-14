# Telenor UI Automation Challenge

End-to-end UI tests for the Telenor.se Bredband (broadband) address-search flow — navigate from the homepage, search an address, and verify the product results — implemented with Playwright and JavaScript.

**Live Allure report:** https://iamawais1390.github.io/telenor-ui-automation-challenge/

See `challenge.md` for the original brief.

## Setup

```bash
npm install
npx playwright install --with-deps
```

## Commands

```bash
npx playwright test                          # run the full suite (chromium, firefox, webkit)
npx playwright test --project=chromium        # run on one browser
npx playwright test -g "serviceable address"  # run by test name
npx playwright test --ui                      # interactive UI mode
npx playwright show-report                    # view the last HTML report
```

## Architecture

Each layer only talks to the one below it:

- **`tests/*.spec.js`** — orchestration and assertions only. No raw Playwright `expect()`; every check goes through `assertions/`.
- **`pages/`** — Page Object Model. `pages/common/BasePage.js` is the shared base: `pageElement` (a subclass-defined getter used to verify "am I on the right page"), `navigateTo()`/`navigateToPath()`, `dismissCookieConsent()`, and thin wrappers (`click`, `fillInputField`) around `pages/common/interactions/`. `pages/HomePage.js` and `pages/bredband.js` extend it with page-specific locators and actions.
- **`pages/common/interactions/`** — low-level, logged Playwright actions (`click.js`, `input.js`) shared by every page object.
- **`assertions/`** — `assertions/elementAssertions.js` and `assertions/pageAssertions.js` wrap Playwright's `expect()` for every check used in this suite (`assertIsNotEmpty`, `assertIsEmpty`, `assertContainsText`, `assertHasAttribute`, `assertHasTitle`, `assertHasURL`). Each method logs before/after via `utils/logger.js` and, on failure, rethrows as `AssertionError` (`assertions/assertionError.js`) with the custom description on top and the original Playwright failure chained underneath.
- **`fixture/testData.js`** — test data (addresses, expected product text, expected messages) kept out of the spec files.
- **`utils/`** — `logger.js` (winston, console + file transport) and `TestListener.js`, a custom Playwright reporter.

### Reporters

`playwright.config.js` runs four reporters together: `line` (progress ticks + the terminal summary), `html`, `allure-playwright`, and `utils/TestListener.js` — a custom reporter. Tests run in parallel across multiple workers, so without grouping, console output (e.g. `Logger`'s `[info]` lines) from different tests would interleave in the terminal. `TestListener.js` buffers each test's stdout/stderr (keyed by `test.id`, which Playwright tags correctly even across workers) and flushes it as one contiguous, separator-bounded block at `onTestEnd`, so output reads as one test's full story at a time regardless of parallelism.

This requires `quiet: true` in the config — without it, `line`'s own `onStdOut` handler prints raw chunks live as they arrive (a built-in behavior, not something we added), which would both duplicate every line and defeat the grouping. `quiet` only suppresses that raw dump; `line`'s progress ticks and final summary are unaffected.

### Test coverage (`tests/bredband.spec.js`)

- **Serviceable address** — homepage → dismiss cookie consent → open the "Bredband" nav dropdown → click "Bredband" → search `Kungsgatan 103, Uppsala` → the featured product grid is not empty and contains the expected 5G broadband offer.
- **No search yet** — a fresh load of the Bredband page (no address entered) has an empty product grid, the natural counterpart to the above.
- **Unrecognized address** — searching `Wrong address` shows the site's "address not found" message and the product grid stays empty.

## CI / CD

One GitHub Actions workflow (`.github/workflows/test.yml`), triggered on every push/PR to `main` (plus manual `workflow_dispatch`):

- Installs Playwright's browsers (chromium, firefox, webkit) and runs the suite.
- Uploads the Playwright HTML report as a downloadable artifact on every run.
- On pushes/dispatches against `main` only, additionally generates the Allure report (via `simple-elf/allure-report-action`, a Docker-based action that bundles its own Java runtime — no JDK setup needed on the runner) and publishes it to `allure-reports-branch`, which GitHub Pages serves at the URL above.

Branch protection on `main` requires a pull request for every change (no direct pushes, including for the repo owner) and the branch to be up to date before merging.

### Allure report history

The Allure report action keeps up to the last 20 CI runs, each individually browsable, plus a `history/` folder carried forward run-to-run so trend charts inside any report reflect all retained runs, not just the latest. The root URL always redirects to the most recent run.

## Assumptions & decisions

See `ASSUMPTIONS.md` for the full running log. Summary:

- **"Handla" has no literal element on telenor.se.** Implemented as one combined interaction: open the "Bredband" nav dropdown, then click "Bredband" inside it.
- **The address field is a real autocomplete combobox**, not a plain text input — typing must fire real keystrokes and `Enter` must commit the matched suggestion for a search to trigger.
- **`featured-product-grid` isn't a literal class** anywhere in the DOM; the real per-product class is `featured-product-grid-item`, treated as the item collection the brief refers to.
- **Repository visibility is public** (rather than private), so branch protection can be enabled for free.

## Known gaps

- The product-offer text assertion (`Bredband via 5G – 250 Mbit/s`) checks live promotional copy on telenor.se, not a stable data-testid — it will need updating if Telenor changes that campaign.
- Allure history is retained for the last 20 CI runs; there's no index page listing them — older runs are reachable via `allure-reports-branch`'s file tree.
