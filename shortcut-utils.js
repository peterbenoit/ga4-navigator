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

  // Scores a single searchable item against a query for the command palette.
  // Returns null when the item does not match at all.
  function scoreCommand(item, normalizedQuery) {
    const label = String(item?.label || "").trim().toLowerCase();
    const meta = String(item?.meta || "").trim().toLowerCase();

    if (!normalizedQuery) return 0;
    if (!label && !meta) return null;

    if (label === normalizedQuery) return 100;
    if (label.startsWith(normalizedQuery)) return 80;

    const labelWordBoundary = new RegExp(`\\b${normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
    if (labelWordBoundary.test(label)) return 65;
    if (label.includes(normalizedQuery)) return 55;
    if (meta.startsWith(normalizedQuery)) return 40;
    if (meta.includes(normalizedQuery)) return 30;

    return null;
  }

  // Filters and ranks a flat list of { label, meta } command items by a free-text query.
  // Empty query returns the original list order unchanged. Matching is case-insensitive
  // and favors exact/prefix label matches over substring or metadata matches.
  function filterCommands(items, query) {
    const list = Array.isArray(items) ? items : [];
    const normalizedQuery = String(query || "").trim().toLowerCase();

    if (!normalizedQuery) return list.slice();

    return list
      .map((item, index) => ({ item, index, score: scoreCommand(item, normalizedQuery) }))
      .filter(entry => entry.score !== null)
      .sort((a, b) => (b.score - a.score) || (a.index - b.index))
      .map(entry => entry.item);
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
    filterCommands
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.GA4ShortcutUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
