# GA4 Analytics Expansion Design

## Goal

Move GA4 Navigator beyond report links into a lightweight analytics console. Build an interactive analysis foundation first, then reuse its normalized data for local, shareable reports. Keep Google Search Console and AI-assisted interpretation as explicitly separate future integrations.

## Immediate Maintenance

Complete this work before implementing new product features:

1. Repair the two failing baseline tests.
   - The property-select accessibility test must verify the label association without depending on obsolete exact HTML.
   - Date-sensitive tests must use a controlled clock instead of fixed calendar dates.
2. Extract pure analytics logic from `popup.js` into `analytics-utils.js`.
   - Date-range and equivalent comparison-period calculations.
   - GA4 request payload construction.
   - Metric and dimension response normalization.
   - Absolute and percentage delta calculations.
3. Keep authentication, network requests, stale-request protection, DOM rendering, and event handling in `popup.js`.

The extraction follows the existing browser-and-Node utility pattern used by `shortcut-utils.js`: browser globals for the extension and CommonJS exports for direct unit testing.

## Architecture

### Pure analytics layer

`analytics-utils.js` owns deterministic transformations. It accepts plain values and GA4-shaped response objects and returns plain objects. It must not access the DOM, Chrome APIs, storage, authentication, or the network.

The layer provides stable interfaces for:

- converting a saved date-range key into current and previous GA4 date ranges;
- constructing report request bodies;
- safely reading missing dimensions and metrics;
- normalizing overview, ranked-list, and comparison results;
- calculating deltas when the previous value is positive, zero, or missing;
- formatting a future text or Markdown report from already-normalized data.

### Popup orchestration layer

`popup.js` remains responsible for obtaining an identity token, making GA4 requests, rejecting stale responses, choosing which dataset to load, and rendering results. It delegates payload construction and response calculations to the pure analytics layer.

Datasets remain independently loadable. A failed landing-page or device request must not erase successful overview metrics or other insight lists.

### API usage

The dashboard continues to load only its primary metrics automatically. Deeper datasets are loaded when their panel or insight type is selected. This avoids copying the attached command-line report's six-request burst into every extension opening.

## Feature Roadmap

### Phase 1: Period comparisons

Show the selected period beside the immediately preceding equivalent period.

- Display current value, absolute change, and percentage change for dashboard metrics.
- Treat a missing previous value as unavailable rather than zero.
- Treat a zero previous value as a new-activity state rather than displaying an infinite percentage.
- Use neutral language and visual treatment where a higher value is not inherently better.

### Phase 2: Expanded interactive analysis

Add analysis available in the attached GA4 reporting script without overwhelming the dashboard.

- Landing pages: sessions, engaged sessions or engagement rate, and bounce rate.
- Device breakdown: sessions and engagement rate by device category.
- Audience composition: total, new, and returning users.
- Engagement: engaged sessions, engagement rate, average session duration, and page views.
- Existing pages, channels, campaigns, and events remain available through Top Insights.

Where a dataset fits the existing Top Insights interaction, extend that control. Use a dedicated compact panel only when the data is structurally different, such as a device distribution.

### Phase 3: Shareable quick reports

Generate a deterministic text or Markdown summary locally from normalized data.

- Include property name, current date range, comparison period, and generation timestamp.
- Include overview metrics and selected ranked sections such as pages, channels, and events.
- Omit unavailable sections with a concise note instead of failing the entire report.
- Copy to the clipboard with a visible success or failure state.
- Do not send analytics data to an AI provider.

### Phase 4: Saved report workflows

Allow repeated analytics reviews to be configured and reused.

- Save named templates such as “Weekly review.”
- Select which metric and ranked-list sections a template includes.
- Generate a report from the selected property and date range.
- Include templates in the existing settings export and import format.

### Later: Multi-property overview and monitoring

- Load saved properties progressively and isolate per-property errors.
- Show a compact comparison or health row per property.
- Add opt-in local checks without frequent background API polling.

### Later: Google Search Console

Search Console is a potential feature, not part of the GA4 implementation phases.

- Add it as a separate, opt-in connection because it requires the `webmasters.readonly` OAuth scope and Search Console API host access.
- Map Search Console site resources to GA4 properties explicitly; do not assume their identifiers match.
- Potential views include top queries, top pages, query-to-page mappings, low-CTR opportunities, and queries near page one.
- Permission copy must make clear why the additional Google access is requested.

### Later: AI-assisted interpretation

AI-generated recommendations require a separate product decision covering provider choice, credentials, cost, analytics-data disclosure, user consent, and failure behavior. Local deterministic summaries must work without this layer.

## Error Handling

- Authentication and permission failures use the existing token retry and user-facing error paths.
- Each optional dataset exposes its own loading, empty, and error state.
- Partial API failure preserves successful datasets.
- Missing GA4 rows normalize to explicit empty values.
- Report generation identifies unavailable sections rather than inventing zeroes.
- Comparison calculations distinguish missing, zero, positive, and negative previous values.

## Testing

- Unit-test every pure date, payload, normalization, and delta helper directly in Node.
- Freeze the clock in date-sensitive tests.
- Cover missing rows, malformed values, zero previous values, and partial datasets.
- Retain popup-level tests for authentication retry, stale requests, API failure messages, and rendering integration.
- Run the complete `node --test *.test.js` suite after each extraction step and feature slice.

## Out of Scope for the Immediate Change

- Implementing period-comparison UI.
- Adding landing-page, device, or audience panels.
- Generating quick reports.
- Requesting Search Console permissions.
- Calling an AI service.
- Changing extension storage formats beyond what the extraction requires.

The immediate change repairs the baseline tests, creates the pure analytics boundary, and updates feature documentation. New functionality follows in separately testable phases.
