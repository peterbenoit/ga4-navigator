# Agent Instructions — GA4 Navigator

This file is read automatically by Claude and other AI agents working in this repo.
Keep it up to date as architectural decisions are made.

---

## What this is

A Chrome extension that gives analysts quick access to GA4 reports, live metrics, and small
diagnostic utilities without having to navigate the full GA4 interface. Target users are
analytics practitioners and VA digital teams who live in GA4 daily.

---

## UI Architecture — Read before touching the popup

### The popup has limited vertical space. Respect it.

The extension popup is a fixed-size Chrome popup (~400px wide, scrollable but constrained).
The **landing card** — the first thing a user sees when they open the popup — must stay fast,
focused, and uncluttered. Do not add new sections, panels, or data cards directly to the
landing card without a strong reason.

### Use tabs for new functionality

The popup already has a tab bar: **Dashboard · Analysis · Reports · Favorites**.

- New data panels, report views, or utility features belong in a **new tab** or inside an
  **existing tab**, not stacked onto the Dashboard landing card.
- The Dashboard tab is for at-a-glance metrics only: the metric cards, date pills, AI digest,
  top insights, and health check. It is already near its content limit.
- The Analysis tab is where deeper data views live (e.g. landing pages table). New data tables
  or multi-row panels go here.
- The Reports tab is for navigation shortcuts to GA4 reports.
- The Favorites tab is for saved shortcuts and recent history.

### Adding a new tab

If a feature doesn't fit cleanly into an existing tab, add a new tab rather than expanding
the Dashboard. Follow the existing tab pattern in `popup.html` and `tabs.js`. Emit a
`ga4-tab-change` custom event when the tab activates so `popup.js` can lazy-load data.

### What belongs where — quick reference

| Feature type | Where it goes |
|---|---|
| At-a-glance metric card (single number) | Dashboard tab |
| Data table / ranked list / multi-row panel | Analysis tab (or new tab) |
| Links to GA4 reports | Reports tab |
| Saved shortcuts, recent history | Favorites tab |
| New self-contained utility | New tab |

---

## Key files

| File | Purpose |
|---|---|
| `popup.html` | All markup. Views: `main-view`, `add-view`, `manage-view`. Tabs inside `main-view`. |
| `popup.js` | All popup logic: storage, rendering, API calls, tab coordination |
| `popup.css` | All styles |
| `tabs.js` | Tab switching logic; emits `ga4-tab-change` events |
| `analytics-utils.js` | Pure functions: GA4 API request builders, response parsers, metric formatters |
| `shortcut-utils.js` | Pure functions: shortcut normalization, URL parsing, recent report helpers |
| `background.js` | Service worker; minimal — auth and alarm handling only |
| `manifest.json` | Extension manifest v3 |

---

## API patterns

- All GA4 Data API calls go through `chrome.identity.getAuthToken` for the OAuth token.
- Use `getIdentityToken(interactive)` and `removeIdentityToken(token)` helpers — do not
  call `chrome.identity` directly in new code.
- Request builders live in `analytics-utils.js`. Add new `buildXyzRequest()` functions there
  and keep `popup.js` focused on rendering and coordination.
- All API calls must handle: offline state, auth failure (401/403 → token refresh → retry),
  rate limit (429), and stale request (sequence ID check).
- Use a sequence ID counter (see `metricsRequestSequence`, `landingRequestSequence`) for any
  async data load that can be triggered multiple times. Discard out-of-order responses.

---

## Code conventions

- No frameworks. Vanilla JS, no build step, no bundler.
- DOM is built with `document.createElement` — do not use `innerHTML` for user-sourced
  content (only for trusted static templates).
- All persistent state goes through `chrome.storage.local` via `saveStorageValue()`.
  Do not use `localStorage` directly.
- Pure logic (request builders, parsers, formatters) goes in `analytics-utils.js` or
  `shortcut-utils.js` with matching test coverage.
- Tests live alongside source files as `*.test.js` and run with `node --test`.

---

## GA4 report URL paths — known gotcha

GA4's URL router requires `collectionId`, `ruid`, and `r` params for standard named reports.
Without them GA4 silently falls back to the overview page.

- **Do not** use bare paths like `/reports/events?params=_u..nav%3Dmaui` — they don't work.
- **Do use** full paths with `collectionId`, `ruid`, and `r` copied from a real GA4 browser URL.
- All shared report path constants live in `analytics-utils.js` (e.g. `TRAFFIC_ACQUISITION_PATH`, `EVENTS_REPORT_PATH`).
  Add new ones there — never inline a bare path in `popup.js`.
- `collectionId=life-cycle` is the baseline collection (present on all properties created before
  March 2023 or set up with "Get baseline reports"). Use `life-cycle` paths as the default.
  The `business-objectives` collection is only present on properties that selected a business
  objective during setup — do not rely on it for links that must work across all properties.
- **Realtime** is the one exception — `/reports/realtime/overview?params=_u..nav%3Dmaui`
  works without a `collectionId` because realtime is not part of any collection.

---

## Backlog and feature ideas

- `BACKLOG.md` — concrete, scoped items ready to implement
- `FEATURE_IDEAS.md` — longer-horizon ideas and product direction
- `docs/GA4_Question_Reference.xlsx` — reference spreadsheet mapping analyst questions to
  GA4 reports, dimensions, and metrics. Use this when deciding what data to surface.
