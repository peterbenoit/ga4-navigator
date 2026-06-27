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
  addRecentReport
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
