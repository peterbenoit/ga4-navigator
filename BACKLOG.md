# GA4 Navigator Backlog

Items are checked when fully implemented.

## Priority 1: Fixes

- [x] **Add API host permissions for GA4 Data API calls**
  Manifest declares `host_permissions` for `https://analyticsdata.googleapis.com/*`.

- [x] **Handle expired or rejected Google auth tokens**
  401/403 responses call `removeCachedAuthToken` and retry interactive auth once. User-facing messages distinguish auth failure, permission denial, and API errors.

- [x] **Prevent stale metrics from overwriting the selected property**
  Metric requests use a request sequence ID. Only the latest selected property updates the metrics bar.

- [ ] **Validate and normalize imported properties**
  Import should trim labels/IDs, reject invalid GA4 IDs, deduplicate entries, and strip unexpected fields.

- [x] **Add GA4 Data API quota / rate-limit handling**
  429 responses surface a "rate limit reached" message. Requests are not retried immediately.

- [x] **Handle network offline / no-connection state**
  Extension detects offline via `navigator.onLine` and shows a clear "no connection" message.

## Priority 2: Improvements

- [ ] **Move property storage from `localStorage` to `chrome.storage`**
  Storage helpers should be fully async using `chrome.storage.local`. Existing `localStorage` state should migrate once without data loss.
  > Note: migration scaffolding exists in `initStorage()` but `localStorage` fallbacks are still in use.

- [ ] **Replace the hard-coded default personal property with onboarding**
  New installs should start empty and prompt the user to add their first property.

- [ ] **Improve accessibility of controls and forms**
  Several labels are not programmatically associated with controls. Form errors need live region announcements.
  > Note: `aria-pressed` and `aria-label` are partially in place; label/id pairs and error regions are still missing.

- [x] **Add robust clipboard failure handling**
  Copy failures show a concise error state. Success states are not shown on write failure.

- [x] **Make GA4 URL generation more explicit and testable**
  URL generation is centralized. Date parameters are replaced rather than duplicated.

- [x] **Add target safety to external report links**
  Generated GA4 links include `rel="noopener noreferrer"`.

- [ ] **Debounce API calls on rapid property switching**
  A minimum 150ms debounce should prevent a burst of requests when scrolling through the property select.

- [ ] **Distinguish GA4 account from property in storage**
  Storage schema should be versioned. Documentation should clarify what `id` represents.

- [ ] **Dark mode CSS token support**
  `@media (prefers-color-scheme: dark)` block overrides color tokens only. DO NOT implement until everything else in this list is done.

## Priority 3: Maintenance

- [ ] **Add a README with setup and OAuth configuration**
  README should cover loading the extension locally, configuring the Google OAuth client, Analytics Data API access, and basic troubleshooting.
  > Note: `README.md` exists but may not cover all of the above.

- [x] **Add lightweight tests for pure logic**
  Test files exist for analytics utils, popup metrics, popup storage, popup links, popup accessibility, shortcuts, and background.

- [ ] **Split CSS and JavaScript responsibilities for maintainability**
  Styles should move to a dedicated CSS file. Popup logic should be grouped into small modules or clearly separated sections.

- [ ] **Declare all required extension icon sizes**
  Manifest should declare icons at 16, 32, 48, and 128px with matching asset files.

- [ ] **Add release packaging checks**
  A documented command should validate the manifest, check for missing assets, and exclude dev-only files from the package.
