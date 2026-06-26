(function (root) {
  "use strict";

  function normalizePropertyId(rawId) {
    const value = String(rawId || "").trim();
    if (!/^(?:a\d+)?p\d+$/.test(value)) {
      throw new Error("GA4 property id is invalid.");
    }
    return value;
  }

  function dateRangeToParams(range, now = new Date()) {
    const days = { last7days: 6, last28days: 27, last90days: 89 };
    const n = days[range];
    if (n === undefined) return null;
    const fmt = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    const end = new Date(now);
    const start = new Date(end);
    start.setDate(end.getDate() - n);
    return `&_u.date00=${fmt(start)}&_u.date01=${fmt(end)}`;
  }

  function buildGa4Href(propertyId, path, dateRange, now) {
    if (!propertyId) return "#";
    const routePropertyId = normalizePropertyId(propertyId);
    const url = `https://analytics.google.com/analytics/web/#/${routePropertyId}${path}`;
    if (!dateRange) return url;
    const params = dateRangeToParams(dateRange, now);
    if (!params) return url;
    return url.replace(/(params=[^&]*)/, `$1${encodeURIComponent(params)}`);
  }

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
    const match = hashPath.match(/^((?:a\d+)?p\d+)(\/.*)$/);
    if (!match) {
      throw new Error("URL must include a GA4 property id and report path.");
    }

    return {
      id: normalizePropertyId(match[1]),
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
    let propertyId;
    const path = String(input?.path || "").trim();

    if (!label) {
      throw new Error("Shortcut label is required.");
    }

    try {
      propertyId = normalizePropertyId(input?.propertyId);
    } catch {
      throw new Error("Shortcut property id is invalid.");
    }

    if (!path.startsWith("/")) {
      throw new Error("Shortcut path is invalid.");
    }

    return { label, propertyId, path };
  }

  function normalizeStoredProperty(input) {
    const label = String(input?.label || "").trim();
    let id;

    if (!label) {
      throw new Error("Property label is required.");
    }

    try {
      id = normalizePropertyId(input?.id);
    } catch {
      throw new Error("Imported property id is invalid.");
    }

    return { label, id };
  }

  function normalizeStoredProperties(input) {
    if (!Array.isArray(input)) {
      throw new Error("Property data is invalid.");
    }

    const seenIds = new Set();
    return input.map(property => {
      const normalized = normalizeStoredProperty(property);
      if (seenIds.has(normalized.id)) {
        throw new Error("Duplicate property id.");
      }
      seenIds.add(normalized.id);
      return normalized;
    });
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

  const TOP_INSIGHT_CONFIGS = {
    pages: {
      label: "Pages",
      dimension: "pageTitle",
      secondaryDimension: "pagePath",
      metric: "screenPageViews",
      metricLabel: "Views",
      path: "/reports/explorer?params=_u..nav%3Dmaui&collectionId=business-objectives&ruid=all-pages-and-screens,business-objectives,examine-user-behavior&r=all-pages-and-screens"
    },
    sources: {
      label: "Sources",
      dimension: "sessionSourceMedium",
      metric: "sessions",
      metricLabel: "Sessions",
      path: "/reports/dashboard?params=_u..nav%3Dmaui%26_r.3..selmet%3D%5B%22conversions%22%5D&collectionId=business-objectives&ruid=business-objectives-generate-leads-overview,business-objectives,generate-leads&r=business-objectives-generate-leads-overview"
    },
    campaigns: {
      label: "Campaigns",
      dimension: "sessionCampaignName",
      metric: "sessions",
      metricLabel: "Sessions",
      path: "/reports/acquisition-traffic-acquisition?params=_u..nav%3Dmaui"
    },
    events: {
      label: "Events",
      dimension: "eventName",
      metric: "eventCount",
      metricLabel: "Events",
      path: "/reports/events?params=_u..nav%3Dmaui"
    }
  };

  function getTopInsightConfig(type) {
    return TOP_INSIGHT_CONFIGS[type] || TOP_INSIGHT_CONFIGS.pages;
  }

  function buildTopInsightRows(report, config) {
    return (report?.rows || []).map(row => {
      const dimensions = row.dimensionValues || [];
      const primary = String(dimensions[0]?.value || "").trim();
      const secondary = String(dimensions[1]?.value || "").trim();
      return {
        label: primary || secondary || "(not set)",
        meta: primary && secondary && primary !== secondary ? secondary : "",
        value: formatMetricValue(row.metricValues?.[0]?.value || "0"),
        metricLabel: config.metricLabel
      };
    });
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
    normalizePropertyId,
    dateRangeToParams,
    buildGa4Href,
    normalizeShortcut,
    normalizeStoredShortcut,
    normalizeStoredProperty,
    normalizeStoredProperties,
    hasDuplicateShortcut,
    addRecentReport,
    getApiDateRange,
    buildDashboardMetrics,
    getTopInsightConfig,
    buildTopInsightRows
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.GA4ShortcutUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
