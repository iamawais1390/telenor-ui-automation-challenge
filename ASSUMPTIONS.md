# Assumptions & Decisions

Running log of decisions made during this challenge, folded into `README.md`'s summary.

---

## The "Handla" step has no literal UI element

The brief's step 2 is "Click **Handla**." Investigated the live site (`telenor.se`) directly: there is no nav element, link, or button anywhere on the homepage with the literal text "Handla" — checked every `<a href="/handla/">`/`<a href="/handla">` on the page and found zero. A `/handla/` landing page does exist (breadcrumb-reachable from subpages, titled "Handla | Här hittar du hela vårt utbud"), but nothing on the homepage links to it directly.

**Decision:** implemented "Click Handla" → "Click Bredband" as one combined interaction, matching the site's actual UI: open the "Bredband" nav dropdown (`HomePage.bredbandNavToggle`), then click the "Bredband" heading link that appears inside it (`HomePage.bredbandDropdownLink`), which navigates to `/handla/bredband/`. This was confirmed with the user before implementing rather than guessed silently.

**Related gotcha:** the dropdown link's accessible name ("Bredband") also matches a quick-menu link and a footer link elsewhere on the page — a plain `getByRole('link', { name: 'Bredband' })` throws a Playwright strict-mode violation (3 matches). Scoped to the open submenu via `getByLabel('Undermeny')` to disambiguate.

---

## The address field is a real autocomplete combobox

Initially assumed a plain text input that could be `.fill()`-ed directly. Live testing (in a cookie-cleared, fresh browser context — the reference-relevant condition, since Playwright's default context is always cookie-less) showed it's a genuine autocomplete `combobox`: typing must fire real keystrokes (Playwright `pressSequentially`, which `fillInputField` already uses) to populate a suggestion listbox, and `Enter` is required afterward to commit the matching suggestion and trigger the product search. A `.fill()`-only approach never populates results.

**Decision:** `BredbandPage.enterAddress()` types via `fillInputField` then presses `Enter`. It deliberately does **not** wait for the product grid internally — an early version did, which caused a 15s hang/timeout when testing an address with no matching suggestion (see below). Waiting for the actual expected outcome is left to each test's assertion.

---

## Negative-test design: verified live rather than guessed

Two "negative" scenarios were considered and both verified against the real site (in a clean browser context) before being implemented, rather than assumed:

1. **No search yet** — a fresh load of `/handla/bredband/` has an empty product grid (`.featured-product-grid-item` count 0). This is guaranteed by Playwright's per-test cookie-less context, independent of what a manually-used Chrome profile might have cached from prior browsing (which did show a "sticky" pre-filled address during manual investigation — a first-party cookie from earlier manual testing, not a site-wide default for anonymous visitors).
2. **Unrecognized address** — searching `Wrong address` (no autocomplete match) surfaces a real "address not found" alert (`.tn-alert__content`, text: "Vi hittar inte din adress just nu, men ring oss på 0770-77 70 10 så hjälper vi dig gärna vidare!") and the grid stays empty. Confirmed via a throwaway script in a clean context — no revert-to-previous-value behavior, contrary to what an earlier manual test in a cookie-contaminated browser profile suggested.

---

## `featured-product-grid` is not a literal class

The brief says to verify `featured-product-grid` is not empty. Inspected the live DOM: no element anywhere carries an exact class `featured-product-grid`. The real, per-product-card class is `featured-product-grid-item` (wrapped in `.featured-fixed-product-container` / `.address-search-results`).

**Decision:** treated "featured-product-grid" as referring to this item collection — `BredbandPage.featuredProductGrid` locates `.featured-product-grid-item`, and "not empty" is asserted as `count > 0` via a custom `ElementAssertions.assertIsNotEmpty` helper (added specifically because raw `expect.poll`/`expect(...).toHaveCount()` calls in test files aren't allowed in this project — all assertions must go through `assertions/`).

---

## Cookie consent banner

telenor.se serves a OneTrust cookie-consent banner on every first load in a fresh browser context. Left un-dismissed, its overlay (`.onetrust-pc-dark-filter`) intercepts pointer events and blocks the nav-dropdown click, failing the test with a 30s timeout. `BasePage.dismissCookieConsent()` clicks "Avvisa alla" (`#onetrust-reject-all-handler`, "Reject all") — chosen as the privacy-preserving default over "Accept all," per this project's general policy of declining non-essential cookies unless told otherwise. It's a no-op (5s soft wait, then continues) when the banner isn't showing.

---

## Product-offer text assertion is tied to live promotional copy

One assertion checks the product grid contains `Bredband via 5G – 250 Mbit/s` — the exact current campaign copy (paired with a "299 kr/mån, previously 399 kr/mån" discounted price). This is fragile: if Telenor changes the campaign, wording, or price, this specific assertion will need updating. Kept as an exact string per explicit request rather than loosened to a more durable substring/prefix check; flagged to the user as a known trade-off.

---

## Repository visibility (public, not private)

The repo (`iamawais1390/telenor-ui-automation-challenge`) needs GitHub branch protection to actually enforce the brief's "practice git branching practices" ask (no direct pushes to `main`, PR required). Per prior experience on a similar challenge (`iamawais1390/trello-automation-challenge`), branch protection requires either a public repo or a paid GitHub Pro plan on this account.

**Decision:** made the repo public rather than upgrading to GitHub Pro. Reasonable trade-off for a take-home challenge a reviewer needs to access anyway — no sensitive data lives in this repo (no API keys/secrets are needed for this suite at all, unlike the Trello challenge).

**What's enforced on `main`:** PR required to merge (no direct pushes, including for the repo owner), branch must be up to date before merging, force-pushes and branch deletion disabled.

---

## Git branching practice

The initial Page Object Model scaffold (BasePage, interactions, assertions, HomePage/BredbandPage, the three tests) was built iteratively in one continuous working session, with the user reviewing and directing each file, before branch protection was enabled — that initial batch went directly to `main`. Branching discipline (feature branch → PR → merge) applies to every change from the CI/Allure/docs work in this PR onward.

---

## Browser coverage in CI: all three, not just Chromium

Unlike a prior similar project (which ran Chromium-only in CI for speed, given a much larger test suite), this suite only has 3 tests, so running all three configured browsers (chromium, firefox, webkit) in CI is cheap and gives fuller coverage without a meaningful time cost. All three were also verified passing locally before this decision.
