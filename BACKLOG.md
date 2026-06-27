# GA4 Navigator Backlog

## Priority 1: Fixes

### Add API host permissions for GA4 Data API calls

- **Why:** `popup.js` calls `https://analyticsdata.googleapis.com/...` from the extension popup, but `manifest.json` only declares the `identity` permission. MV3 extension fetches to remote origins should declare the matching `host_permissions`.
- **Where:** `manifest.json`, `popup.js`
- **Acceptance criteria:**
  - `manifest.json` includes host permissions for `https://analyticsdata.googleapis.com/*`.
  - Metrics fetches work from a freshly loaded unpacked extension without cross-origin permission errors.
  - Permission copy remains understandable during install/update.

### Handle expired or rejected Google auth tokens

- **Why:** `fetchMetrics()` falls back to interactive auth when silent token retrieval fails, but `loadMetrics()` does not handle API 401/403 responses by clearing the cached token. A stale token can leave the popup stuck until the user manually resets extension auth.
- **Where:** `popup.js`
- **Acceptance criteria:**
  - 401/403 responses call `chrome.identity.removeCachedAuthToken()` and retry interactive auth once.
  - User-facing messages distinguish auth failure, permission denial, and API/report errors.
  - Realtime and standard report failures are both checked instead of only `reportRes.ok`.

### Prevent stale metrics from overwriting the selected property

- **Why:** Switching properties quickly can start overlapping metric requests. A slower response from the previous property can overwrite the metrics bar for the currently selected property.
- **Where:** `popup.js`
- **Acceptance criteria:**
  - Metric requests use a request sequence id or `AbortController`.
  - Only the latest selected property is allowed to update `#metrics-bar`.
  - Rapid property changes leave the metrics bar matching the visible selection.

### Validate and normalize imported properties

- **Why:** Import currently accepts any objects with truthy `label` and `id`, including invalid GA4 IDs, duplicate entries, extra data, or untrimmed values.
- **Where:** `popup.js`
- **Acceptance criteria:**
  - Import trims labels and IDs.
  - Import accepts only valid IDs in the same format as manual entry, or explicitly documents any additional supported format.
  - Duplicate property IDs are rejected or merged predictably.
  - Saved imported objects contain only the expected `label` and `id` fields.

### Add GA4 Data API quota / rate-limit handling

- **Why:** The GA4 Data API enforces per-property and per-project quotas. The extension has no backoff, retry, or quota-awareness. A 429 response currently surfaces as a generic error.
- **Where:** `popup.js`
- **Acceptance criteria:**
  - 429 responses surface a clear "rate limit reached" message rather than a generic API error.
  - Requests are not retried immediately on 429; a minimum backoff window is enforced.
  - Health check and metrics requests do not stack if the popup is closed and reopened quickly.

### Handle network offline / no-connection state

- **Why:** Metrics and health checks fail silently when the user is offline. No distinct offline state is shown, which looks like a tracking problem.
- **Where:** `popup.js`, `popup.html`
- **Acceptance criteria:**
  - Extension detects offline state via `navigator.onLine` or a failed fetch.
  - A clear "no connection" message appears instead of a spinning or empty metrics bar.
  - When connectivity returns the user can refresh without reloading the popup.

## Priority 2: Improvements

### Move property storage from `localStorage` to `chrome.storage`

- **Why:** `localStorage` works in the extension origin, but `chrome.storage.local` is the standard extension storage API and makes future sync, migration, and quota handling clearer.
- **Where:** `popup.js`
- **Acceptance criteria:**
  - Storage helpers are asynchronous and use `chrome.storage.local`.
  - Existing `localStorage` users are migrated once without data loss.
  - Empty, corrupt, or legacy storage states fall back gracefully.

### Replace the hard-coded default personal property with onboarding

- **Why:** A new install silently seeds `peterbenoit.com (Personal)`. That is convenient for development but surprising for distribution and can send users to the wrong GA4 account.
- **Where:** `popup.js`, `popup.html`
- **Acceptance criteria:**
  - New installs start with no property unless a development flag or fixture is enabled.
  - The main view clearly prompts the user to add their first property.
  - Report links remain disabled or harmless until a property exists.

### Improve accessibility of controls and forms

- **Why:** Several labels are not programmatically associated with controls, emoji-only buttons depend on `title`, and generated date buttons lack explicit accessible pressed state.
- **Where:** `popup.html`, `popup.js`
- **Acceptance criteria:**
  - Labels use `for`/`id` pairs for select and input controls.
  - Icon-only buttons have `aria-label` values and `type="button"`.
  - Date range buttons expose `aria-pressed`.
  - Form errors are announced with an appropriate live region.

### Add robust clipboard failure handling

- **Why:** Copying property IDs and exports assumes `navigator.clipboard.writeText()` succeeds. Clipboard access can fail depending on permissions, focus, or browser behavior.
- **Where:** `popup.js`
- **Acceptance criteria:**
  - Copy failures show a concise error state.
  - Success states are not shown when the write fails.
  - Export JSON remains available through a fallback such as selecting text in the import/export area.

### Make GA4 URL generation more explicit and testable

- **Why:** `buildHref()` appends encoded date parameters with a regex against `params=...`. This is brittle if a report path lacks `params`, already contains date values, or changes format.
- **Where:** `popup.js`
- **Acceptance criteria:**
  - URL generation is centralized in small pure functions.
  - Paths with and without existing `params` are handled.
  - Date parameters are replaced instead of duplicated.
  - Unit tests cover the current report paths and edge cases.

### Add target safety to external report links

- **Why:** Report links use `target="_blank"` without `rel="noopener noreferrer"`.
- **Where:** `popup.js`
- **Acceptance criteria:**
  - Generated GA4 links include `rel="noopener noreferrer"`.
  - Link behavior remains unchanged for users.

### Debounce API calls on rapid property switching

- **Why:** Switching properties quickly fires multiple overlapping `fetchMetrics` and `runHealthCheck` calls. The sequence ID pattern in `runHealthCheck` is not applied to `fetchMetrics`, so stale metric responses can still overwrite the UI.
- **Where:** `popup.js`
- **Acceptance criteria:**
  - Property switch cancels or ignores any in-flight metric requests for the previous property.
  - A minimum 150ms debounce prevents a burst of requests when scrolling through the property select.

### Distinguish GA4 account from property in storage

- **Why:** The saved property object stores only `label` and `id`. There is no account ID, account name, or data stream ID. This limits future features (account grouping, multi-stream properties) and makes debugging auth issues harder.
- **Where:** `popup.js`, `shortcut-utils.js`
- **Acceptance criteria:**
  - Storage schema is versioned so future fields can be added without breaking existing saves.
  - Documentation or a comment explains what `id` represents (the `properties/XXXXXXXXX` numeric ID).

### Dark mode CSS token support

- **Why:** The extension is light-theme only. Adding a `prefers-color-scheme: dark` override of the CSS custom properties is lower-cost now than retrofitting it after many more components are added.
- **Where:** `popup.css`
- **Acceptance criteria:**
  - A `@media (prefers-color-scheme: dark)` block overrides color tokens only.
  - All text/background combinations meet 4.5:1 WCAG AA contrast in dark mode.
  - Layout and spacing are unchanged.

## Priority 3: Maintenance

### Add a README with setup and OAuth configuration

- **Why:** The repo has no README, and Chrome identity/OAuth setup depends on extension IDs, OAuth client configuration, and loading the unpacked extension correctly.
- **Where:** `README.md`
- **Acceptance criteria:**
  - README documents loading the extension locally.
  - README explains how to configure the Google OAuth client and Analytics Data API access.
  - README includes basic troubleshooting for auth and metrics failures.

### Add lightweight tests for pure logic

- **Why:** Date range calculation, ID parsing, URL building, import validation, and storage migration can be tested without a browser extension runtime.
- **Where:** new test files, `popup.js` refactor as needed
- **Acceptance criteria:**
  - Pure helpers are exported or isolated for tests.
  - Tests cover valid and invalid GA4 property IDs, imported property data, and generated report URLs.
  - A single documented command runs the test suite.

### Split CSS and JavaScript responsibilities for maintainability

- **Why:** `popup.html` contains all styles, while `popup.js` mixes rendering, storage, auth, URL generation, import/export, and metrics fetching.
- **Where:** `popup.html`, `popup.js`, optional new files
- **Acceptance criteria:**
  - Styles move to a dedicated CSS file if allowed by extension packaging.
  - Popup logic is grouped into small modules or clearly separated sections.
  - Existing behavior is preserved after the split.

### Declare all required extension icon sizes

- **Why:** `manifest.json` does not currently declare `icons` at 16, 32, 48, and 128px. Chrome Web Store requires these for listing, and missing sizes degrade the extension icon in the toolbar and OS app menus.
- **Where:** `manifest.json`, icon assets
- **Acceptance criteria:**
  - Manifest declares icons at 16, 32, 48, and 128px.
  - All sizes exist as actual files; no broken references.
  - Icon assets use a consistent style that matches the popup branding.

### Add release packaging checks

- **Why:** There is no automated validation for manifest shape, missing assets, or extension packaging.
- **Where:** new package/config files
- **Acceptance criteria:**
  - A documented command validates or packages the extension.
  - The check catches invalid manifest JSON and missing referenced files.
  - The packaged extension excludes development-only files.

