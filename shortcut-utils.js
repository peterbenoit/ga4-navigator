(function (root) {
  "use strict";

  function parseGa4ReportUrl(rawUrl) {
    const value = String(rawUrl || "").trim();
    let url;

    try {
      url = new URL(value);
    } catch {
      throw new Error("Enter a valid GA4 URL.");
    }

    if (url.hostname !== "analytics.google.com") {
      throw new Error("URL must be from analytics.google.com.");
    }

    const hashPrefix = "#/";
    if (!url.hash.startsWith(hashPrefix)) {
      throw new Error("URL must include a GA4 property and report path.");
    }

    const hashPath = url.hash.slice(hashPrefix.length);
    const match = hashPath.match(/^(a\d+p\d+)(\/.*)$/);
    if (!match) {
      throw new Error("URL must include a GA4 property id and report path.");
    }

    return {
      id: match[1],
      path: match[2]
    };
  }

  function normalizeShortcut(input) {
    const label = String(input?.label || "").trim();
    if (!label) {
      throw new Error("Shortcut label is required.");
    }

    const parsed = parseGa4ReportUrl(input?.url);
    return {
      label,
      propertyId: parsed.id,
      path: parsed.path
    };
  }

  function normalizeStoredShortcut(input) {
    const label = String(input?.label || "").trim();
    const propertyId = String(input?.propertyId || "").trim();
    const path = String(input?.path || "").trim();

    if (!label) {
      throw new Error("Shortcut label is required.");
    }

    if (!/^a\d+p\d+$/.test(propertyId)) {
      throw new Error("Shortcut property id is invalid.");
    }

    if (!path.startsWith("/")) {
      throw new Error("Shortcut path is invalid.");
    }

    return { label, propertyId, path };
  }

  function hasDuplicateShortcut(shortcuts, candidate, ignoreIndex) {
    return shortcuts.some((shortcut, index) => {
      if (index === ignoreIndex) return false;
      return shortcut.propertyId === candidate.propertyId && shortcut.path === candidate.path;
    });
  }

  function addRecentReport(existing, report, limit = 5) {
    const item = {
      label: String(report?.label || "").trim(),
      propertyId: String(report?.propertyId || "").trim(),
      path: String(report?.path || "").trim(),
      openedAt: String(report?.openedAt || new Date().toISOString())
    };

    const filtered = existing.filter(recent => {
      return recent.propertyId !== item.propertyId || recent.path !== item.path;
    });

    return [item, ...filtered].slice(0, limit);
  }

  function getApiDateRange(range) {
    const ranges = {
      last7days: { startDate: "7daysAgo", endDate: "today" },
      last28days: { startDate: "28daysAgo", endDate: "today" },
      last90days: { startDate: "90daysAgo", endDate: "today" }
    };

    return ranges[range] || ranges.last28days;
  }

  function formatMetricValue(value) {
    return Number(value || 0).toLocaleString();
  }

  function getMetric(report, index) {
    return report?.rows?.[0]?.metricValues?.[index]?.value || "0";
  }

  function buildDashboardMetrics(report, realtime) {
    return [
      { label: "Sessions", value: formatMetricValue(getMetric(report, 0)) },
      { label: "Users", value: formatMetricValue(getMetric(report, 1)) },
      { label: "Views", value: formatMetricValue(getMetric(report, 2)) },
      { label: "Events", value: formatMetricValue(getMetric(report, 3)) },
      { label: "Live", value: formatMetricValue(getMetric(realtime, 0)) }
    ];
  }

  const api = {
    parseGa4ReportUrl,
    normalizeShortcut,
    normalizeStoredShortcut,
    hasDuplicateShortcut,
    addRecentReport,
    getApiDateRange,
    buildDashboardMetrics
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.GA4ShortcutUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
