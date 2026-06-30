# GA4 Navigator Backlog

Items are checked when fully implemented.

## Priority 1: Fixes

- [x] **Add API host permissions for GA4 Data API calls**
  Manifest declares `host_permissions` for `https://analyticsdata.googleapis.com/*`.

- [x] **Handle expired or rejected Google auth tokens**
  401/403 responses call `removeCachedAuthToken` and retry interactive auth once. User-facing messages distinguish auth failure, permission denial, and API errors.

- [x] **Prevent stale metrics from overwriting the selected property**
  Metric requests use a request sequence ID. Only the latest selected property updates the metrics bar.

- [x] **Validate and normalize imported properties**
  Import should trim labels/IDs, reject invalid GA4 IDs, deduplicate entries, and strip unexpected fields.

- [x] **Add GA4 Data API quota / rate-limit handling**
  429 responses surface a "rate limit reached" message. Requests are not retried immediately.

- [x] **Handle network offline / no-connection state**
  Extension detects offline via `navigator.onLine` and shows a clear "no connection" message.

## Priority 2: Improvements

- [x] **Move property storage from `localStorage` to `chrome.storage`**
  Storage helpers should be fully async using `chrome.storage.local`. Existing `localStorage` state should migrate once without data loss.

- [x] **Replace the hard-coded default personal property with onboarding**
  New installs should start empty and prompt the user to add their first property.

- [x] **Improve accessibility of controls and forms**
  Several labels are not programmatically associated with controls. Form errors need live region announcements.

- [x] **Add robust clipboard failure handling**
  Copy failures show a concise error state. Success states are not shown on write failure.

- [x] **Make GA4 URL generation more explicit and testable**
  URL generation is centralized. Date parameters are replaced rather than duplicated.

- [x] **Add target safety to external report links**
  Generated GA4 links include `rel="noopener noreferrer"`.

- [x] **Debounce API calls on rapid property switching**
  A minimum 150ms debounce should prevent a burst of requests when scrolling through the property select.

- [x] **Distinguish GA4 account from property in storage**
  Storage schema should be versioned. Documentation should clarify what `id` represents.

- [x] **Top events panel**
  Fetch top 10 events by count for the selected property and date range using the GA4 Data API. Display event name and count. Rows link to the GA4 Events report filtered to that event name. Show a notice if scroll, file_download, click, and video_start events are all absent (likely enhanced measurement is off).

- [x] **Traffic source breakdown card**
  Fetch sessions and engagement rate by `sessionDefaultChannelGroup` for the selected date range. Display as a compact ranked list. Each row deep-links to Traffic Acquisition filtered to that channel. Flag rows where channel is "Unassigned" and count exceeds 5% of sessions.

- [x] **Device category snapshot**
  Fetch sessions and engagement rate split by `deviceCategory` (Desktop / Mobile / Tablet). Display as a small card alongside the existing metrics bar. Link to Tech > Tech Overview. Keep the API call lightweight — single-dimension, single-date-range request.

- [x] **New vs. returning user card**
  Fetch `newUsers` and `activeUsers` for the selected date range. Derive returning users. Display as a ratio card with a link to the Retention report.

- [ ] **Site search term viewer**
  Fetch top 10 `searchTerm` dimension values from the `view_search_results` event using the GA4 Data API. Display with event counts. Link to Events report filtered to the search event. Show a setup warning if no results are returned (enhanced measurement may not be configured).

- [ ] **Dark mode CSS token support**
  `@media (prefers-color-scheme: dark)` block overrides color tokens only. DO NOT implement until everything else in this list is done.

## Priority 3: Maintenance

- [x] **Add a README with setup and OAuth configuration**
  README should cover loading the extension locally, configuring the Google OAuth client, Analytics Data API access, and basic troubleshooting.

- [x] **Add lightweight tests for pure logic**
  Test files exist for analytics utils, popup metrics, popup storage, popup links, popup accessibility, shortcuts, and background.

- [x] **Split CSS and JavaScript responsibilities for maintainability**
  Styles should move to a dedicated CSS file. Popup logic should be grouped into small modules or clearly separated sections.

- [x] **Declare all required extension icon sizes**
  Manifest should declare icons at 16, 32, 48, and 128px with matching asset files.

- [x] **Add release packaging checks**
  A documented command should validate the manifest, check for missing assets, and exclude dev-only files from the package.
