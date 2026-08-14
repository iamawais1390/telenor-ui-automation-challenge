# Telenor UI Automation Challenge

End-to-end UI tests for the Telenor.se Bredband (broadband) address-search flow: navigate to `telenor.se`, click through to Bredband, search the address `Kungsgatan 103, Uppsala`, and verify the featured product grid isn't empty — implemented with Playwright and JavaScript.

**Live Allure report:** https://iamawais1390.github.io/telenor-ui-automation-challenge/

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

npm run lint                                  # ESLint (core rules + eslint-plugin-playwright on tests/)
npm run typecheck                             # tsc --noEmit, enforcing the // @ts-check pragma used throughout
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

Three independent GitHub Actions workflows, each its own status check, run on every push/PR to `main`:

- **Lint** (`.github/workflows/lint.yml`)
- **Typecheck** (`.github/workflows/typecheck.yml`)
- **Test** (`.github/workflows/test.yml`, plus manual `workflow_dispatch`) — installs Playwright's browsers (chromium, firefox, webkit), runs the suite, and uploads the Playwright HTML report as a downloadable artifact on every run. On pushes/dispatches against `main` only, additionally generates the Allure report (via `simple-elf/allure-report-action`, a Docker-based action that bundles its own Java runtime — no JDK setup needed on the runner) and publishes it to `allure-reports-branch`, which GitHub Pages serves at the URL above.

Branch protection on `main` requires a pull request for every change (no direct pushes, including for the repo owner), all three checks to pass, and the branch to be up to date before merging.

### Allure report history

The Allure report action keeps up to the last 20 CI runs, each individually browsable, plus a `history/` folder carried forward run-to-run so trend charts inside any report reflect all retained runs, not just the latest. The root URL always redirects to the most recent run.

## Assumptions & decisions

### The "Handla" step has no literal UI element

The brief's step 2 is "Click **Handla**." Investigated the live site (`telenor.se`) directly: there is no nav element, link, or button anywhere on the homepage with the literal text "Handla" — checked every `<a href="/handla/">`/`<a href="/handla">` on the page and found zero. A `/handla/` landing page does exist (breadcrumb-reachable from subpages, titled "Handla | Här hittar du hela vårt utbud"), but nothing on the homepage links to it directly.

Implemented "Click Handla" → "Click Bredband" as one combined interaction, matching the site's actual UI: open the "Bredband" nav dropdown (`HomePage.bredbandNavToggle`), then click the "Bredband" heading link that appears inside it (`HomePage.bredbandDropdownLink`), which navigates to `/handla/bredband/`. This was confirmed with the user before implementing rather than guessed silently.

Related gotcha: the dropdown link's accessible name ("Bredband") also matches a quick-menu link and a footer link elsewhere on the page — a plain `getByRole('link', { name: 'Bredband' })` throws a Playwright strict-mode violation (3 matches). Scoped to the open submenu via `getByLabel('Undermeny')` to disambiguate.

### The address field is a real autocomplete combobox

Initially assumed a plain text input that could be `.fill()`-ed directly. Live testing (in a cookie-cleared, fresh browser context — the relevant condition, since Playwright's default context is always cookie-less) showed it's a genuine autocomplete `combobox`: typing must fire real keystrokes (Playwright `pressSequentially`, which `fillInputField` already uses) to populate a suggestion listbox, and `Enter` is required afterward to commit the matching suggestion and trigger the product search. A `.fill()`-only approach never populates results.

`BredbandPage.enterAddress()` types via `fillInputField` then presses `Enter`. It deliberately does **not** wait for the product grid internally — an early version did, which caused a 15s hang/timeout when testing an address with no matching suggestion. Waiting for the actual expected outcome is left to each test's assertion.

### Negative-test design: verified live rather than guessed

Two "negative" scenarios were considered and both verified against the real site (in a clean browser context) before being implemented:

1. **No search yet** — a fresh load of `/handla/bredband/` has an empty product grid (`.featured-product-grid-item` count 0). Guaranteed by Playwright's per-test cookie-less context, independent of what a manually-used Chrome profile might have cached from prior browsing.
2. **Unrecognized address** — searching `Wrong address` (no autocomplete match) surfaces a real "address not found" alert (`.tn-alert__content`, text: "Vi hittar inte din adress just nu, men ring oss på 0770-77 70 10 så hjälper vi dig gärna vidare!") and the grid stays empty. Confirmed via a throwaway script in a clean context.

### `featured-product-grid` is not a literal class

The brief says to verify `featured-product-grid` is not empty. Inspected the live DOM: no element anywhere carries an exact class `featured-product-grid`. The real, per-product-card class is `featured-product-grid-item` (wrapped in `.featured-fixed-product-container` / `.address-search-results`).

Treated "featured-product-grid" as referring to this item collection — `BredbandPage.featuredProductGrid` locates `.featured-product-grid-item`, and "not empty" is asserted as `count > 0` via a custom `ElementAssertions.assertIsNotEmpty` helper (added specifically because raw `expect.poll`/`expect(...).toHaveCount()` calls in test files aren't allowed in this project — all assertions must go through `assertions/`).

### Cookie consent banner

telenor.se serves a OneTrust cookie-consent banner on every first load in a fresh browser context. Left un-dismissed, its overlay (`.onetrust-pc-dark-filter`) intercepts pointer events and blocks the nav-dropdown click, failing the test with a 30s timeout. `BasePage.dismissCookieConsent()` clicks "Avvisa alla" (`#onetrust-reject-all-handler`, "Reject all") — chosen as the privacy-preserving default over "Accept all." It's a no-op (5s soft wait, then continues) when the banner isn't showing.

### Product-offer text assertion is tied to live promotional copy

One assertion checks the product grid contains `Bredband via 5G – 250 Mbit/s` — the exact current campaign copy (paired with a "299 kr/mån, previously 399 kr/mån" discounted price). This is fragile: if Telenor changes the campaign, wording, or price, this specific assertion will need updating. Kept as an exact string per explicit request rather than loosened to a more durable substring/prefix check.

### Repository visibility (public, not private)

The repo needs GitHub branch protection to actually enforce "practice git branching practices" (no direct pushes to `main`, PR required). Branch protection requires either a public repo or a paid GitHub Pro plan on this account.

Made the repo public rather than upgrading to GitHub Pro. Reasonable trade-off for a take-home challenge a reviewer needs to access anyway — no sensitive data lives in this repo.

**What's enforced on `main`:** PR required to merge (no direct pushes, including for the repo owner), all three CI checks (`test`, `lint`, `typecheck`) must pass, branch must be up to date before merging, force-pushes and branch deletion disabled.

### Git branching practice

The initial Page Object Model scaffold (BasePage, interactions, assertions, HomePage/BredbandPage, the three tests) was built iteratively in one continuous working session, with the user reviewing and directing each file, before branch protection was enabled — that initial batch went directly to `main`. Branching discipline (feature branch → PR → merge) applies to every change from the CI/Allure/docs work onward.

### Browser coverage in CI: all three, not just Chromium

This suite only has 3 tests, so running all three configured browsers (chromium, firefox, webkit) in CI is cheap and gives fuller coverage without a meaningful time cost.

### Lint/typecheck setup

`eslint.config.mjs` and `jsconfig.json` use `"type": "commonjs"` (`require`/`module.exports`, this project's convention) — `sourceType: 'commonjs'` in ESLint, `"module": "CommonJS"`/`"moduleResolution": "Node"` in `jsconfig.json`. `playwright.config.js` is the one exception (Playwright's config loader accepts `import`/`export` regardless of `package.json`'s `type`), so it gets its own `sourceType: 'module'` override block in `eslint.config.mjs`.

`typescript` is pinned to `^5.9.3` rather than the `^7.x` version npm resolves by default, for stability. `eslint-plugin-playwright`'s `expect-expect` rule's `assertFunctionNames` option only matches the bare trailing property name of a call expression (e.g. `assertIsNotEmpty`), not a dotted path or glob — verified by reading the rule's source.

Running `eslint`'s recommended config surfaced a real, worth-fixing issue in three files (`BasePage.js`, `click.js`, `input.js`): each re-threw a new `Error` inside a `catch` block without chaining the original via the `cause` option (rule: `preserve-caught-error`) — fixed by adding `{ cause: error }` to each `throw new Error(...)`. Running `tsc` surfaced two real gaps once `// @ts-check` was added to every owned `.js` file: `BasePage`'s `pageElement` getter had no return-type annotation, and `BasePage.create()`/`navigateTo()` weren't polymorphic (calling `HomePage.create(page)` typechecked as returning a plain `BasePage`) — fixed with JSDoc `@template`/`@this` annotations mirroring explicit TypeScript generics.

## Known gaps

- The product-offer text assertion (`Bredband via 5G – 250 Mbit/s`) checks live promotional copy on telenor.se, not a stable data-testid — it will need updating if Telenor changes that campaign.
- Allure history is retained for the last 20 CI runs; there's no index page listing them — older runs are reachable via `allure-reports-branch`'s file tree.
