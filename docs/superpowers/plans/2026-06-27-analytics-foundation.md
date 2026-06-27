# Analytics Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the baseline tests, create a pure GA4 analytics utility boundary, and record the expanded analytics roadmap without adding new dashboard UI.

**Architecture:** Create `analytics-utils.js` using the same browser-global/CommonJS wrapper pattern as `shortcut-utils.js`. Pure date, request, normalization, health-check, and comparison functions live there; `popup.js` retains Chrome identity, fetch orchestration, stale-request protection, DOM rendering, and events. Existing behavior remains unchanged while unused comparison helpers establish the tested foundation for the next feature phase.

**Tech Stack:** Chrome Extension Manifest V3, browser JavaScript, Node.js built-in test runner, CommonJS test exports.

---

## File Structure

- Create `analytics-utils.js`: pure GA4 date, request-payload, response-normalization, comparison, and health-check functions.
- Create `analytics-utils.test.js`: direct unit tests for the new analytics module.
- Modify `shortcut-utils.js`: retain URL, property, shortcut, import, and recent-report concerns; remove analytics concerns.
- Modify `shortcut-utils.test.js`: retain shortcut tests; move analytics expectations to `analytics-utils.test.js`.
- Modify `popup.js`: consume request builders and normalizers through `GA4AnalyticsUtils`.
- Modify `popup.html`: load `analytics-utils.js` before `popup.js`.
- Modify `popup-accessibility.test.js`: test the property label semantically instead of requiring obsolete exact markup.
- Modify `popup-metrics.test.js`: inject analytics utilities and a controlled URL-date dependency.
- Modify `FEATURE_IDEAS.md`: record script-derived GA4 analysis ideas and later opt-in Search Console integration.

### Task 1: Repair the two baseline test failures

**Files:**
- Modify: `popup-accessibility.test.js:9-13`
- Modify: `popup-metrics.test.js:53-72,325-376`

- [ ] **Step 1: Make the accessibility assertion semantic**

Replace the exact property-label assertion with one that allows attributes and validates the visible label text:

```js
assert.match(html, /<label\b[^>]*\bfor="propertySelect"[^>]*>\s*Property\s*<\/label>/);
```

This test remains capable of failing if `for="propertySelect"` or the label text is removed.

- [ ] **Step 2: Inject test utilities through `loadPopup`**

Change the VM context setup to:

```js
GA4ShortcutUtils: overrides.GA4ShortcutUtils || GA4ShortcutUtils,
GA4AnalyticsUtils: overrides.GA4AnalyticsUtils,
```

The analytics value is added now so the same harness supports the extraction in Task 3.

- [ ] **Step 3: Control the date used by the top-insight URL test**

Inside `fetchMetrics loads and renders top page insights`, create and pass a wrapper that injects a fixed date without replacing production globals:

```js
const fixedNow = new Date("2026-06-26T12:00:00");
const fixedShortcutUtils = {
  ...GA4ShortcutUtils,
  buildGa4Href(propertyId, path, dateRange) {
    return GA4ShortcutUtils.buildGa4Href(propertyId, path, dateRange, fixedNow);
  }
};

const context = loadPopup({
  GA4ShortcutUtils: fixedShortcutUtils,
  // existing chrome and fetch fixtures
});
```

Keep the existing expected URL ending in `_u.date00=20260530` and `_u.date01=20260626`. The assertion is now deterministic.

- [ ] **Step 4: Run the repaired baseline tests**

Run:

```bash
node --test popup-accessibility.test.js popup-metrics.test.js
```

Expected: both files pass with zero failures.

- [ ] **Step 5: Run the full baseline suite**

Run:

```bash
node --test *.test.js
```

Expected: 48 tests pass and zero fail before extraction begins.

- [ ] **Step 6: Commit the baseline repairs**

```bash
git add popup-accessibility.test.js popup-metrics.test.js
git commit -m "Fix brittle popup test fixtures"
```

### Task 2: Define the analytics utility contract test-first

**Files:**
- Create: `analytics-utils.test.js`
- Test source to move: `shortcut-utils.test.js:255-416`

- [ ] **Step 1: Write failing module-contract tests**

Create `analytics-utils.test.js` beginning with:

```js
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getApiDateRange,
  getComparisonDateRanges,
  calculateMetricDelta,
  buildOverviewRequest,
  buildRealtimeRequest,
  buildDashboardMetrics,
  getTopInsightConfig,
  buildTopInsightRequest,
  buildTopInsightRows,
  buildHealthCheckRequest,
  buildHealthFindings
} = require("./analytics-utils");
```

Move the existing tests for `getApiDateRange`, `buildDashboardMetrics`, `getTopInsightConfig`, `buildTopInsightRows`, `buildHealthCheckRequest`, and `buildHealthFindings` from `shortcut-utils.test.js` unchanged.

Add these new contract tests:

```js
test("getComparisonDateRanges returns adjacent equivalent 28-day periods", () => {
  assert.deepEqual(
    getComparisonDateRanges("last28days", new Date("2026-06-27T12:00:00")),
    [
      { startDate: "2026-05-31", endDate: "2026-06-27" },
      { startDate: "2026-05-03", endDate: "2026-05-30" }
    ]
  );
});

test("calculateMetricDelta distinguishes change, new activity, and unavailable values", () => {
  assert.deepEqual(calculateMetricDelta(120, 100), {
    current: 120,
    previous: 100,
    absolute: 20,
    percent: 20,
    state: "changed"
  });
  assert.deepEqual(calculateMetricDelta(5, 0), {
    current: 5,
    previous: 0,
    absolute: 5,
    percent: null,
    state: "new"
  });
  assert.deepEqual(calculateMetricDelta(5, null), {
    current: 5,
    previous: null,
    absolute: null,
    percent: null,
    state: "unavailable"
  });
  assert.deepEqual(calculateMetricDelta("invalid", 10), {
    current: null,
    previous: 10,
    absolute: null,
    percent: null,
    state: "unavailable"
  });
});

test("buildOverviewRequest creates the existing dashboard report payload", () => {
  assert.deepEqual(buildOverviewRequest("last28days"), {
    dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "screenPageViews" },
      { name: "eventCount" }
    ]
  });
});

test("buildRealtimeRequest requests active users", () => {
  assert.deepEqual(buildRealtimeRequest(), {
    metrics: [{ name: "activeUsers" }]
  });
});

test("buildTopInsightRequest creates the selected ranked report payload", () => {
  assert.deepEqual(buildTopInsightRequest("pages", "last7days"), {
    dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
    dimensions: [{ name: "pageTitle" }, { name: "pagePath" }],
    metrics: [{ name: "screenPageViews" }],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: 5
  });
});
```

- [ ] **Step 2: Run the contract tests to verify RED**

Run:

```bash
node --test analytics-utils.test.js
```

Expected: FAIL with `Cannot find module './analytics-utils'`.

### Task 3: Implement and integrate the pure analytics module

**Files:**
- Create: `analytics-utils.js`
- Modify: `shortcut-utils.js:155-359`
- Modify: `shortcut-utils.test.js:1-16,255-416`
- Modify: `popup.html:151-153`
- Modify: `popup.js:473-519,521-634,697-709,751-754`
- Modify: `popup-accessibility.test.js:34-64`
- Modify: `popup-metrics.test.js:53-72,379-412`

- [ ] **Step 1: Create the module wrapper and date/comparison helpers**

Start `analytics-utils.js` with:

```js
(function (root) {
  "use strict";

  const RANGE_DAYS = {
    last7days: 7,
    last28days: 28,
    last90days: 90
  };

  function getApiDateRange(range) {
    const days = RANGE_DAYS[range] || RANGE_DAYS.last28days;
    return { startDate: `${days}daysAgo`, endDate: "today" };
  }

  function formatApiDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function shiftDate(date, days) {
    const shifted = new Date(date);
    shifted.setDate(shifted.getDate() + days);
    return shifted;
  }

  function getComparisonDateRanges(range, now = new Date()) {
    const days = RANGE_DAYS[range] || RANGE_DAYS.last28days;
    const currentEnd = new Date(now);
    const currentStart = shiftDate(currentEnd, -(days - 1));
    const previousEnd = shiftDate(currentStart, -1);
    const previousStart = shiftDate(previousEnd, -(days - 1));
    return [
      { startDate: formatApiDate(currentStart), endDate: formatApiDate(currentEnd) },
      { startDate: formatApiDate(previousStart), endDate: formatApiDate(previousEnd) }
    ];
  }

  function calculateMetricDelta(currentValue, previousValue) {
    const current = Number(currentValue);
    if (!Number.isFinite(current)) {
      const previous = Number(previousValue);
      return {
        current: null,
        previous: Number.isFinite(previous) ? previous : null,
        absolute: null,
        percent: null,
        state: "unavailable"
      };
    }
    if (previousValue === null || previousValue === undefined || previousValue === "") {
      return { current, previous: null, absolute: null, percent: null, state: "unavailable" };
    }
    const previous = Number(previousValue);
    if (!Number.isFinite(previous)) {
      return { current, previous: null, absolute: null, percent: null, state: "unavailable" };
    }
    const absolute = current - previous;
    if (previous === 0) {
      return { current, previous, absolute, percent: null, state: current === 0 ? "unchanged" : "new" };
    }
    return {
      current,
      previous,
      absolute,
      percent: Number(((absolute / previous) * 100).toFixed(1)),
      state: absolute === 0 ? "unchanged" : "changed"
    };
  }
```

- [ ] **Step 2: Move existing analytics normalizers and health rules**

Move `formatMetricValue`, `getMetric`, `TOP_INSIGHT_CONFIGS`, `getTopInsightConfig`, `buildTopInsightRows`, `buildHealthCheckRequest`, `getMetricNumber`, `buildHealthFindings`, and `buildDashboardMetrics` from `shortcut-utils.js` into the wrapper without behavior changes.

- [ ] **Step 3: Add pure request builders**

Add:

```js
function buildOverviewRequest(dateRange) {
  return {
    dateRanges: [getApiDateRange(dateRange)],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "screenPageViews" },
      { name: "eventCount" }
    ]
  };
}

function buildRealtimeRequest() {
  return { metrics: [{ name: "activeUsers" }] };
}

function buildTopInsightRequest(type, dateRange) {
  const config = getTopInsightConfig(type);
  const dimensions = [{ name: config.dimension }];
  if (config.secondaryDimension) dimensions.push({ name: config.secondaryDimension });
  return {
    dateRanges: [getApiDateRange(dateRange)],
    dimensions,
    metrics: [{ name: config.metric }],
    orderBys: [{ metric: { metricName: config.metric }, desc: true }],
    limit: 5
  };
}
```

- [ ] **Step 4: Export the pure API for browser and Node**

Finish the module with:

```js
const api = {
  getApiDateRange,
  getComparisonDateRanges,
  calculateMetricDelta,
  buildOverviewRequest,
  buildRealtimeRequest,
  buildDashboardMetrics,
  getTopInsightConfig,
  buildTopInsightRequest,
  buildTopInsightRows,
  buildHealthCheckRequest,
  buildHealthFindings
};

if (typeof module !== "undefined" && module.exports) module.exports = api;
root.GA4AnalyticsUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
```

- [ ] **Step 5: Run analytics unit tests to verify GREEN**

Run:

```bash
node --test analytics-utils.test.js
```

Expected: all moved and new analytics tests pass.

- [ ] **Step 6: Remove analytics exports from shortcut utilities**

Delete the moved functions and configuration from `shortcut-utils.js`. Remove their imports and tests from `shortcut-utils.test.js`. Run:

```bash
node --test shortcut-utils.test.js analytics-utils.test.js
```

Expected: both focused suites pass with no duplicate analytics ownership.

- [ ] **Step 7: Load the browser module before popup orchestration**

Change the scripts at the end of `popup.html` to:

```html
<script src="shortcut-utils.js"></script>
<script src="analytics-utils.js"></script>
<script src="popup.js"></script>
<script src="tabs.js"></script>
```

Update VM test contexts in `popup-accessibility.test.js` and `popup-metrics.test.js` to include:

```js
GA4AnalyticsUtils: require("./analytics-utils"),
```

- [ ] **Step 8: Delegate request construction and normalization in `popup.js`**

In `loadMetrics`, replace inline bodies with:

```js
body: JSON.stringify(GA4AnalyticsUtils.buildOverviewRequest(dateRange))
```

and:

```js
body: JSON.stringify(GA4AnalyticsUtils.buildRealtimeRequest())
```

Render with:

```js
renderDashboard(GA4AnalyticsUtils.buildDashboardMetrics(report, realtime));
```

In top-insight rendering/loading, use `GA4AnalyticsUtils.getTopInsightConfig`, `GA4AnalyticsUtils.buildTopInsightRequest`, and `GA4AnalyticsUtils.buildTopInsightRows`. In the health-check path, use `GA4AnalyticsUtils.buildHealthCheckRequest` and `GA4AnalyticsUtils.buildHealthFindings`.

- [ ] **Step 9: Verify popup integration**

Run:

```bash
node --test popup-accessibility.test.js popup-metrics.test.js
```

Expected: popup tests pass and existing request bodies remain unchanged.

- [ ] **Step 10: Commit the analytics boundary**

```bash
git add analytics-utils.js analytics-utils.test.js shortcut-utils.js shortcut-utils.test.js popup.js popup.html popup-accessibility.test.js popup-metrics.test.js
git commit -m "Extract pure GA4 analytics utilities"
```

### Task 4: Record the expanded feature roadmap

**Files:**
- Modify: `FEATURE_IDEAS.md`

- [ ] **Step 1: Expand the GA4 analysis ideas**

Add a high-value feature entry titled `Expanded analysis views` covering:

```markdown
- Landing-page performance: sessions, engagement rate, and bounce rate.
- Device breakdown: sessions and engagement rate by device category.
- Audience composition: total, new, and returning users.
- Engagement diagnostics: engaged sessions, average session duration, views, and bounce rate.
- Load optional datasets on demand so opening the extension does not trigger every report request.
```

- [ ] **Step 2: Strengthen comparison and quick-report requirements**

Update `Date comparison mode` to specify adjacent equivalent periods, unavailable previous values, and zero-baseline handling. Update `Exportable quick reports` to specify local deterministic Markdown/text generation from normalized data, partial-section behavior, and no required AI provider.

- [ ] **Step 3: Add Search Console to larger/later ideas**

Add `Optional Search Console integration` with these requirements:

```markdown
- Request the `webmasters.readonly` OAuth scope only when the user opts in.
- Map Search Console site resources to GA4 properties explicitly.
- Show top queries, query-to-page mappings, low-CTR opportunities, and queries near page one.
- Keep Search Console failures isolated from GA4 dashboard data.
```

- [ ] **Step 4: Check documentation consistency**

Run:

```bash
rg -n "Expanded analysis views|Date comparison mode|Exportable quick reports|Optional Search Console integration" FEATURE_IDEAS.md
git diff --check
```

Expected: all four roadmap headings are found and `git diff --check` reports no errors.

- [ ] **Step 5: Commit the roadmap update**

```bash
git add FEATURE_IDEAS.md
git commit -m "Expand analytics feature roadmap"
```

### Task 5: Full verification

**Files:**
- Verify only; no planned modifications.

- [ ] **Step 1: Run the complete test suite**

Run:

```bash
node --test *.test.js
```

Expected: every test passes with zero failures.

- [ ] **Step 2: Verify manifest and script references**

Run:

```bash
node -e 'const fs=require("node:fs"); const html=fs.readFileSync("popup.html","utf8"); for (const file of ["shortcut-utils.js","analytics-utils.js","popup.js","tabs.js"]) { if (!html.includes(`src="${file}"`) || !fs.existsSync(file)) process.exitCode=1; }'
```

Expected: exit code 0 with every referenced local script present.

- [ ] **Step 3: Review final scope and cleanliness**

Run:

```bash
git diff --check
git status --short
git log -4 --oneline
```

Expected: no whitespace errors; only intentional changes, if any, remain; recent commits show the design, test repair, analytics extraction, and roadmap update.
