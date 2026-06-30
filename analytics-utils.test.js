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
  buildDeviceCategoryRequest,
  buildDeviceCategoryRows,
  buildLandingPagesRequest,
  buildLandingPageRows,
  buildHealthCheckRequest,
  buildHealthFindings,
  TECH_OVERVIEW_PATH
} = require("./analytics-utils");

test("getApiDateRange maps saved date range values to GA4 API ranges", () => {
  assert.deepEqual(getApiDateRange("last7days"), {
    startDate: "7daysAgo",
    endDate: "today"
  });
  assert.deepEqual(getApiDateRange("last28days"), {
    startDate: "28daysAgo",
    endDate: "today"
  });
  assert.deepEqual(getApiDateRange("last90days"), {
    startDate: "90daysAgo",
    endDate: "today"
  });
});

test("getApiDateRange falls back to 28 days for unknown ranges", () => {
  assert.deepEqual(getApiDateRange("tomorrowish"), {
    startDate: "28daysAgo",
    endDate: "today"
  });
});

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

test("buildDashboardMetrics converts GA4 report and realtime responses to display cards", () => {
  const metrics = buildDashboardMetrics(
    {
      rows: [
        {
          metricValues: [
            { value: "1234" },
            { value: "987" },
            { value: "4567" },
            { value: "321" }
          ]
        }
      ]
    },
    {
      rows: [
        {
          metricValues: [{ value: "12" }]
        }
      ]
    }
  );

  assert.deepEqual(metrics, [
    { label: "Sessions", value: "1,234", delta: null },
    { label: "Users",    value: "987",   delta: null },
    { label: "Views",    value: "4,567", delta: null },
    { label: "Events",   value: "321",   delta: null },
    { label: "Live",     value: "12",    delta: null }
  ]);
});

test("buildDashboardMetrics uses zeroes for missing API rows", () => {
  const metrics = buildDashboardMetrics({}, {});

  assert.deepEqual(metrics, [
    { label: "Sessions", value: "0", delta: null },
    { label: "Users",    value: "0", delta: null },
    { label: "Views",    value: "0", delta: null },
    { label: "Events",   value: "0", delta: null },
    { label: "Live",     value: "0", delta: null }
  ]);
});

test("getTopInsightConfig returns GA4 request settings for top pages", () => {
  assert.deepEqual(getTopInsightConfig("pages"), {
    label: "Pages",
    dimension: "pageTitle",
    secondaryDimension: "pagePath",
    metric: "screenPageViews",
    metricLabel: "Views",
    path: "/reports/explorer?params=_u..nav%3Dmaui&r=all-pages-and-screens"
  });
});

test("getTopInsightConfig returns GA4 request settings for top sources", () => {
  assert.deepEqual(getTopInsightConfig("sources"), {
    label: "Sources",
    dimension: "sessionSourceMedium",
    metric: "sessions",
    metricLabel: "Sessions",
    path: "/reports/dashboard?params=_u..nav%3Dmaui&r=traffic-acquisition"
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

test("buildTopInsightRows converts GA4 rows to ranked display rows", () => {
  const rows = buildTopInsightRows(
    {
      rows: [
        {
          dimensionValues: [{ value: "Home" }, { value: "/" }],
          metricValues: [{ value: "1234" }]
        },
        {
          dimensionValues: [{ value: "" }, { value: "/contact" }],
          metricValues: [{ value: "45" }]
        }
      ]
    },
    getTopInsightConfig("pages")
  );

  assert.deepEqual(rows, [
    { label: "Home", meta: "/", value: "1,234", metricLabel: "Views" },
    { label: "/contact", meta: "", value: "45", metricLabel: "Views" }
  ]);
});

test("buildTopInsightRows returns an empty list when GA4 has no rows", () => {
  assert.deepEqual(buildTopInsightRows({}, getTopInsightConfig("sources")), []);
});

test("buildLandingPagesRequest requests landing performance ordered by sessions", () => {
  assert.deepEqual(buildLandingPagesRequest("last28days"), {
    dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
    dimensions: [{ name: "landingPagePlusQueryString" }],
    metrics: [
      { name: "sessions" },
      { name: "engagementRate" },
      { name: "bounceRate" }
    ],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 10
  });
});

test("buildLandingPageRows normalizes counts, rates, and missing data", () => {
  assert.deepEqual(buildLandingPageRows({
    rows: [
      {
        dimensionValues: [{ value: " /services?ref=home " }],
        metricValues: [{ value: "1234" }, { value: "0.625" }, { value: "0.375" }]
      },
      {
        dimensionValues: [],
        metricValues: [{ value: "bad" }, { value: "bad" }]
      }
    ]
  }), [
    { path: "/services?ref=home", sessions: "1,234", engagementRate: "62.5%", bounceRate: "37.5%" },
    { path: "(not set)", sessions: "0", engagementRate: "0.0%", bounceRate: "0.0%" }
  ]);
  assert.deepEqual(buildLandingPageRows({}), []);
});

test("buildHealthCheckRequest requests today and two complete seven-day periods", () => {
  assert.deepEqual(buildHealthCheckRequest(), {
    requests: [
      {
        dateRanges: [{ startDate: "today", endDate: "today" }],
        metrics: [{ name: "sessions" }, { name: "eventCount" }, { name: "keyEvents" }]
      },
      {
        dateRanges: [{ startDate: "7daysAgo", endDate: "yesterday" }],
        metrics: [{ name: "sessions" }]
      },
      {
        dateRanges: [{ startDate: "14daysAgo", endDate: "8daysAgo" }],
        metrics: [{ name: "sessions" }]
      }
    ]
  });
});

test("buildHealthFindings flags stopped collection as critical", () => {
  const findings = buildHealthFindings([
    { rows: [{ metricValues: [{ value: "0" }, { value: "0" }, { value: "0" }] }] },
    { rows: [{ metricValues: [{ value: "140" }] }] },
    { rows: [{ metricValues: [{ value: "150" }] }] }
  ]);

  assert.equal(findings[0].severity, "critical");
  assert.equal(findings[0].title, "No sessions recorded today");
  assert.match(findings[0].detail, /20 per day/);
});

test("buildHealthFindings flags a fifty percent traffic drop", () => {
  const findings = buildHealthFindings([
    { rows: [{ metricValues: [{ value: "8" }, { value: "40" }, { value: "2" }] }] },
    { rows: [{ metricValues: [{ value: "50" }] }] },
    { rows: [{ metricValues: [{ value: "100" }] }] }
  ]);

  const traffic = findings.find(finding => finding.id === "traffic-trend");
  assert.equal(traffic.severity, "warning");
  assert.match(traffic.detail, /down 50%/);
});

test("buildHealthFindings reports healthy collection signals", () => {
  const findings = buildHealthFindings([
    { rows: [{ metricValues: [{ value: "12" }, { value: "80" }, { value: "4" }] }] },
    { rows: [{ metricValues: [{ value: "105" }] }] },
    { rows: [{ metricValues: [{ value: "100" }] }] }
  ]);

  assert.deepEqual(findings.map(finding => finding.severity), ["info", "info", "info", "info"]);
  assert.deepEqual(findings.map(finding => finding.id), [
    "collection",
    "traffic-trend",
    "events",
    "key-events"
  ]);
});

test("buildDeviceCategoryRequest returns correct dimensions and metrics", () => {
  const request = buildDeviceCategoryRequest("last7days");
  assert.deepEqual(request.dateRanges, [{ startDate: "7daysAgo", endDate: "today" }]);
  assert.deepEqual(request.dimensions, [{ name: "deviceCategory" }]);
  assert.deepEqual(request.metrics, [
    { name: "sessions" },
    { name: "engagementRate" }
  ]);
  assert.equal(request.orderBys[0].metric.metricName, "sessions");
  assert.equal(request.orderBys[0].desc, true);
});

test("buildDeviceCategoryRows calculates sessions, share, and engagement correctly", () => {
  const report = {
    rows: [
      {
        dimensionValues: [{ value: "desktop" }],
        metricValues: [{ value: "600" }, { value: "0.75" }]
      },
      {
        dimensionValues: [{ value: "mobile" }],
        metricValues: [{ value: "300" }, { value: "0.5" }]
      },
      {
        dimensionValues: [{ value: "tablet" }],
        metricValues: [{ value: "100" }, { value: "0.4" }]
      }
    ]
  };

  const rows = buildDeviceCategoryRows(report);
  assert.equal(rows.length, 3);

  assert.equal(rows[0].device, "desktop");
  assert.equal(rows[0].sessions, "600");
  assert.equal(rows[0].share, 60);
  assert.equal(rows[0].engagementRate, "75.0%");
  assert.equal(rows[0].path, TECH_OVERVIEW_PATH);

  assert.equal(rows[1].device, "mobile");
  assert.equal(rows[1].share, 30);

  assert.equal(rows[2].device, "tablet");
  assert.equal(rows[2].share, 10);
});

test("buildDeviceCategoryRows handles empty report", () => {
  assert.deepEqual(buildDeviceCategoryRows({}), []);
  assert.deepEqual(buildDeviceCategoryRows(null), []);
});

test("buildDeviceCategoryRows handles zero total sessions without dividing by zero", () => {
  const report = {
    rows: [
      {
        dimensionValues: [{ value: "desktop" }],
        metricValues: [{ value: "0" }, { value: "0" }]
      }
    ]
  };
  const rows = buildDeviceCategoryRows(report);
  assert.equal(rows[0].share, 0);
});

test("buildDeviceCategoryRows falls back to (not set) for missing device name", () => {
  const report = {
    rows: [
      {
        dimensionValues: [{ value: "" }],
        metricValues: [{ value: "10" }, { value: "0.5" }]
      }
    ]
  };
  const rows = buildDeviceCategoryRows(report);
  assert.equal(rows[0].device, "(not set)");
});

test("TECH_OVERVIEW_PATH contains tech-overview report identifier", () => {
  assert.ok(TECH_OVERVIEW_PATH.includes("tech-overview"));
});
