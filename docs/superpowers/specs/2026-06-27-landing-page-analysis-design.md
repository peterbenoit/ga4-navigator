# Landing Page Analysis Design

## Goal

Add the first dedicated Analysis panel to GA4 Navigator without adding more content to the busy dashboard. The first analysis view shows landing-page performance and establishes a scalable home for later device, audience, and engagement views.

## Navigation and Layout

Add a fourth top-level tab named **Analysis** beside Dashboard, Reports, and Favorites. The Analysis tab contains focused analysis sections; only Landing Pages appears in this iteration. Do not show disabled placeholders for future sections.

The Landing Pages panel includes:

- a heading and short description;
- a status region for loading, empty, authentication, permission, offline, and API-error states;
- up to 10 landing-page rows;
- columns for page path, sessions, engagement rate, and bounce rate;
- row links that open the relevant GA4 landing-page report in a new tab.

The layout must remain usable at the side panel's narrowest supported width. Page paths may wrap, while numeric columns remain aligned and scannable.

## Data Flow

Landing-page data loads only when the Analysis tab is selected. Opening the extension on Dashboard must not trigger this additional report request.

When Analysis is active:

1. Resolve the currently selected property and date range.
2. Obtain a Google identity token using the existing authentication behavior.
3. Send one GA4 `runReport` request.
4. Normalize the response through `analytics-utils.js`.
5. Render the rows or an explicit empty state.

Changing the property or date range reloads landing-page data immediately only when Analysis is active. Otherwise, the panel is considered stale and refreshes the next time Analysis opens.

Use a landing-page request sequence identifier. A response may render only when it belongs to the latest property/date request.

## GA4 Request

Add `buildLandingPagesRequest(dateRange)` to `analytics-utils.js`. It returns a request with:

- date range from the existing `getApiDateRange` helper;
- dimension `landingPagePlusQueryString`;
- metrics `sessions`, `engagementRate`, and `bounceRate`;
- descending session ordering;
- limit 10.

Add `buildLandingPageRows(report)` to normalize GA4 response rows. Each normalized row contains:

- `path`: trimmed dimension value, falling back to `(not set)`;
- `sessions`: locale-formatted count;
- `engagementRate`: percentage with one decimal place;
- `bounceRate`: percentage with one decimal place.

Missing or malformed metric values normalize to `0` / `0.0%` and must never render `NaN`.

## Responsibilities

### `analytics-utils.js`

- Build the landing-page request payload.
- Normalize landing-page rows.
- Format rate values safely.

### `tabs.js`

- Preserve current tab and panel ARIA behavior.
- Dispatch a `ga4-tab-change` custom event containing the selected tab name after a tab is activated.

### `popup.js`

- Track whether Analysis is active or stale.
- Obtain and refresh identity tokens using existing patterns.
- Make the landing-page request.
- Reject stale responses.
- Render landing-page loading, rows, empty, and error states.
- Build safe external report links and record them as recent reports.

### `popup.html` and `popup.css`

- Add the Analysis tab and panel markup.
- Provide responsive, accessible landing-page list/table styling.

## Error Handling

- No property: show a prompt to add or select a property; do not request data.
- No extension identity API: explain that analysis requires the installed extension.
- Silent token failure: show a Connect Google button; clicking it requests an interactive token once.
- API 401/403: remove the cached token and retry interactively once.
- Offline state: show the existing offline language and do not erase successful dashboard data.
- Empty rows: show “No landing pages found for this date range.”
- Other API failure: show “Landing page analysis unavailable.”
- Stale response: discard it without changing the current panel.

All states remain local to Analysis and must not clear dashboard metrics or Top Insights.

## Accessibility

- The Analysis control uses the existing tab semantics and identifies its tabpanel.
- The panel heading labels the landing-page region.
- Loading and failure messages use a polite live status region.
- Use a real table so column headings are programmatically associated with their values. CSS may change its visual layout at narrow widths without changing table semantics.
- Row links include `rel="noopener noreferrer"` and descriptive accessible text.
- Status is not conveyed by color alone.

## Testing

### Pure utility tests

- Exact landing-page request payload for each supported date-range key.
- Normalization of valid rows.
- Empty rows.
- Missing dimensions and metrics.
- Malformed rate values never produce `NaN`.

### Popup tests

- Dashboard startup does not request landing-page data.
- Selecting Analysis triggers one landing-page request.
- Rows render path, sessions, engagement rate, and bounce rate.
- Row links use the selected property and date range.
- Property/date changes reload only while Analysis is active.
- Older responses cannot overwrite the latest property/date request.
- Authentication retry, permission, offline, empty, and API-error states render locally.

### Accessibility tests

- Analysis tab and tabpanel references match.
- The landing-page region has an accessible heading.
- The status region is live.
- Numeric columns or labels are programmatically exposed.

Run the complete `node --test *.test.js` suite after focused tests pass.

## Out of Scope

- Device, audience, or engagement analysis sections.
- Period comparisons within landing-page rows.
- Search, filtering, pagination, or sorting controls.
- Background loading or caching across extension sessions.
- Search Console data.
- AI-generated analysis.
