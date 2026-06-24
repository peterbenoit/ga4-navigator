const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseGa4ReportUrl,
  normalizeShortcut,
  normalizeStoredShortcut,
  hasDuplicateShortcut
} = require("./shortcut-utils");

test("parseGa4ReportUrl extracts property id and report path from a GA4 URL", () => {
  const parsed = parseGa4ReportUrl(
    "https://analytics.google.com/analytics/web/#/a356198589p490540007/reports/realtime?params=_u..nav%3Dmaui"
  );

  assert.deepEqual(parsed, {
    id: "a356198589p490540007",
    path: "/reports/realtime?params=_u..nav%3Dmaui"
  });
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
