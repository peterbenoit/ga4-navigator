const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseGa4ReportUrl,
  normalizePropertyId,
  buildGa4Href,
  normalizeShortcut,
  normalizeStoredShortcut,
  normalizeStoredProperties,
  hasDuplicateShortcut,
  addRecentReport,
  getApiDateRange,
  buildDashboardMetrics,
  getTopInsightConfig,
  buildTopInsightRows,
  buildHealthCheckRequest,
  buildHealthFindings
} = require("./shortcut-utils");

test("parseGa4ReportUrl extracts the GA4 route id and report path from a GA4 URL", () => {
  const parsed = parseGa4ReportUrl(
    "https://analytics.google.com/analytics/web/#/a356198589p490540007/reports/realtime?params=_u..nav%3Dmaui"
  );

  assert.deepEqual(parsed, {
    id: "a356198589p490540007",
    path: "/reports/realtime?params=_u..nav%3Dmaui"
  });
});

test("parseGa4ReportUrl accepts GA4 URLs that use only the property route id", () => {
  const parsed = parseGa4ReportUrl(
    "https://analytics.google.com/analytics/web/#/p490540007/reports/reportinghub"
  );

  assert.deepEqual(parsed, {
    id: "p490540007",
    path: "/reports/reportinghub"
  });
});

test("normalizePropertyId preserves copied GA4 account-property route ids", () => {
  assert.equal(normalizePropertyId("a356198589p490540007"), "a356198589p490540007");
  assert.equal(normalizePropertyId(" p490540007 "), "p490540007");
});

test("buildGa4Href preserves copied GA4 account-property route ids", () => {
  const href = buildGa4Href(
    "a356198589p490540007",
    "/reports/realtime?params=_u..nav%3Dmaui",
    "last28days",
    new Date("2026-06-25T12:00:00")
  );

  assert.match(href, /#\/a356198589p490540007\/reports\/realtime/);
});

test("parseGa4ReportUrl rejects non-GA4 URLs", () => {
  assert.throws(
    () => parseGa4ReportUrl("https://example.com/analytics/web/#/a1p2/reports/realtime"),
    /analytics\.google\.com/
  );
});

test("normalizeShortcut trims labels and saves only expected fields", () => {
  const shortcut = normalizeShortcut({
    label: "  Realtime check  ",
    url: " https://analytics.google.com/analytics/web/#/a356198589p490540007/reports/realtime?params=_u..nav%3Dmaui ",
    ignored: true
  });

  assert.deepEqual(shortcut, {
    label: "Realtime check",
    propertyId: "a356198589p490540007",
    path: "/reports/realtime?params=_u..nav%3Dmaui"
  });
});

test("normalizeShortcut rejects missing labels", () => {
  assert.throws(
    () => normalizeShortcut({
      label: " ",
      url: "https://analytics.google.com/analytics/web/#/a356198589p490540007/reports/realtime"
    }),
    /label/
  );
});

test("hasDuplicateShortcut compares property id and report path", () => {
  const existing = [
    {
      label: "Realtime",
      propertyId: "a356198589p490540007",
      path: "/reports/realtime"
    }
  ];

  assert.equal(
    hasDuplicateShortcut(existing, {
      label: "Realtime again",
      propertyId: "a356198589p490540007",
      path: "/reports/realtime"
    }),
    true
  );

  assert.equal(
    hasDuplicateShortcut(existing, {
      label: "Pages",
      propertyId: "a356198589p490540007",
      path: "/reports/pages"
    }),
    false
  );
});

test("normalizeStoredShortcut trims imported shortcut fields", () => {
  const shortcut = normalizeStoredShortcut({
    label: "  Pages  ",
    propertyId: " a356198589p490540007 ",
    path: " /reports/pages "
  });

  assert.deepEqual(shortcut, {
    label: "Pages",
    propertyId: "a356198589p490540007",
    path: "/reports/pages"
  });
});

test("normalizeStoredShortcut rejects invalid imported shortcut paths", () => {
  assert.throws(
    () => normalizeStoredShortcut({
      label: "Bad",
      propertyId: "a356198589p490540007",
      path: "reports/pages"
    }),
    /path/
  );
});

test("normalizeStoredProperties trims imported property fields and removes extra data", () => {
  const properties = normalizeStoredProperties([
    {
      label: "  Personal site  ",
      id: " a356198589p490540007 ",
      ignored: true
    }
  ]);

  assert.deepEqual(properties, [
    {
      label: "Personal site",
      id: "a356198589p490540007"
    }
  ]);
});

test("normalizeStoredProperties rejects invalid imported property ids", () => {
  assert.throws(
    () => normalizeStoredProperties([
      {
        label: "Bad",
        id: "490540007"
      }
    ]),
    /property id/
  );
});

test("normalizeStoredProperties rejects duplicate imported property ids", () => {
  assert.throws(
    () => normalizeStoredProperties([
      {
        label: "Personal",
        id: "a356198589p490540007"
      },
      {
        label: "Duplicate personal",
        id: " a356198589p490540007 "
      }
    ]),
    /Duplicate/
  );
});

test("addRecentReport adds a newest-first item with openedAt", () => {
  const recents = addRecentReport([], {
    label: "Realtime",
    propertyId: "a356198589p490540007",
    path: "/reports/realtime",
    openedAt: "2026-06-25T12:00:00.000Z"
  });

  assert.deepEqual(recents, [
    {
      label: "Realtime",
      propertyId: "a356198589p490540007",
      path: "/reports/realtime",
      openedAt: "2026-06-25T12:00:00.000Z"
    }
  ]);
});

test("addRecentReport moves duplicate reports to the top", () => {
  const existing = [
    {
      label: "Pages",
      propertyId: "a356198589p490540007",
      path: "/reports/pages",
      openedAt: "2026-06-25T11:00:00.000Z"
    },
    {
      label: "Realtime",
      propertyId: "a356198589p490540007",
      path: "/reports/realtime",
      openedAt: "2026-06-25T10:00:00.000Z"
    }
  ];

  const recents = addRecentReport(existing, {
    label: "Realtime",
    propertyId: "a356198589p490540007",
    path: "/reports/realtime",
    openedAt: "2026-06-25T12:00:00.000Z"
  });

  assert.equal(recents.length, 2);
  assert.equal(recents[0].label, "Realtime");
  assert.equal(recents[0].openedAt, "2026-06-25T12:00:00.000Z");
  assert.equal(recents[1].label, "Pages");
});

test("addRecentReport caps recent reports at five items", () => {
  const existing = Array.from({ length: 5 }, (_, index) => ({
    label: `Report ${index}`,
    propertyId: "a356198589p490540007",
    path: `/reports/${index}`,
    openedAt: `2026-06-25T0${index}:00:00.000Z`
  }));

  const recents = addRecentReport(existing, {
    label: "Newest",
    propertyId: "a356198589p490540007",
    path: "/reports/newest",
    openedAt: "2026-06-25T12:00:00.000Z"
  });

  assert.equal(recents.length, 5);
  assert.equal(recents[0].label, "Newest");
  assert.equal(recents.at(-1).label, "Report 3");
});

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
    { label: "Sessions", value: "1,234" },
    { label: "Users", value: "987" },
    { label: "Views", value: "4,567" },
    { label: "Events", value: "321" },
    { label: "Live", value: "12" }
  ]);
});

test("buildDashboardMetrics uses zeroes for missing API rows", () => {
  const metrics = buildDashboardMetrics({}, {});

  assert.deepEqual(metrics, [
    { label: "Sessions", value: "0" },
    { label: "Users", value: "0" },
    { label: "Views", value: "0" },
    { label: "Events", value: "0" },
    { label: "Live", value: "0" }
  ]);
});

test("getTopInsightConfig returns GA4 request settings for top pages", () => {
  assert.deepEqual(getTopInsightConfig("pages"), {
    label: "Pages",
    dimension: "pageTitle",
    secondaryDimension: "pagePath",
    metric: "screenPageViews",
    metricLabel: "Views",
    path: "/reports/explorer?params=_u..nav%3Dmaui&collectionId=business-objectives&ruid=all-pages-and-screens,business-objectives,examine-user-behavior&r=all-pages-and-screens"
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
