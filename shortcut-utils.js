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

  const api = {
    parseGa4ReportUrl,
    normalizeShortcut,
    normalizeStoredShortcut,
    hasDuplicateShortcut
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.GA4ShortcutUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
