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
  filterCommands
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

const COMMAND_FIXTURES = [
  { label: "Traffic Acquisition", meta: "HOW they found you" },
  { label: "Top Pages", meta: "WHAT they looked at" },
  { label: "Realtime", meta: "Who's on your site right now" },
  { label: "My Custom Funnel", meta: "peterbenoit.com · /reports/explorer" }
];

test("filterCommands returns the original order unchanged for an empty query", () => {
  const result = filterCommands(COMMAND_FIXTURES, "");
  assert.deepEqual(result, COMMAND_FIXTURES);
});

test("filterCommands returns the original order unchanged for a whitespace-only query", () => {
  const result = filterCommands(COMMAND_FIXTURES, "   ");
  assert.deepEqual(result, COMMAND_FIXTURES);
});

test("filterCommands ranks an exact label match first", () => {
  const result = filterCommands(COMMAND_FIXTURES, "Realtime");
  assert.equal(result[0].label, "Realtime");
});

test("filterCommands is case-insensitive", () => {
  const result = filterCommands(COMMAND_FIXTURES, "TRAFFIC");
  assert.equal(result[0].label, "Traffic Acquisition");
});

test("filterCommands ranks label prefix matches above mid-word substring matches", () => {
  const result = filterCommands(COMMAND_FIXTURES, "top");
  assert.equal(result[0].label, "Top Pages");
});

test("filterCommands matches on metadata when the label does not match", () => {
  const result = filterCommands(COMMAND_FIXTURES, "peterbenoit.com");
  assert.equal(result.length, 1);
  assert.equal(result[0].label, "My Custom Funnel");
});

test("filterCommands excludes items with no match in label or meta", () => {
  const result = filterCommands(COMMAND_FIXTURES, "zzz-no-match");
  assert.deepEqual(result, []);
});

test("filterCommands treats special regex characters in the query as literal text", () => {
  const items = [
    { label: "Funnel (beta)", meta: "" },
    { label: "Other report", meta: "" }
  ];
  const result = filterCommands(items, "(beta)");
  assert.deepEqual(result, [items[0]]);
});

test("filterCommands handles a non-array items argument", () => {
  assert.deepEqual(filterCommands(null, "anything"), []);
  assert.deepEqual(filterCommands(undefined, "anything"), []);
});
