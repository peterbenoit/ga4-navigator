const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const GA4ShortcutUtils = require("./shortcut-utils");

function createElement(id) {
  return {
    id,
    innerHTML: "",
    textContent: "",
    children: [],
    appendChild(child) {
      this.children.push(child);
    },
    querySelector(selector) {
      if (selector === ".metric-card-value") return this.valueEl;
      if (selector === ".metric-card-label") return this.labelEl;
      return null;
    }
  };
}

function createDocument() {
  const elements = new Map();

  return {
    addEventListener() {},
    createElement(tag) {
      const el = createElement(tag);
      if (tag === "div") {
        el.valueEl = createElement("metric-card-value");
        el.labelEl = createElement("metric-card-label");
      }
      return el;
    },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, createElement(id));
      return elements.get(id);
    }
  };
}

function loadPopup(overrides = {}) {
  const context = {
    console,
    Date,
    URL,
    GA4ShortcutUtils,
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {}
    },
    document: createDocument(),
    chrome: overrides.chrome,
    fetch: overrides.fetch
  };

  vm.createContext(context);
  vm.runInContext(fs.readFileSync("popup.js", "utf8"), context);
  return context;
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    }
  };
}

test("fetchMetrics clears a rejected cached token and retries interactively once", async () => {
  const tokenCalls = [];
  const removedTokens = [];
  const fetchTokens = [];

  const chrome = {
    runtime: { lastError: null },
    identity: {
      getAuthToken({ interactive }, callback) {
        tokenCalls.push(interactive);
        callback(interactive ? "interactive-token" : "cached-token");
      },
      removeCachedAuthToken({ token }, callback) {
        removedTokens.push(token);
        callback();
      }
    }
  };

  const context = loadPopup({
    chrome,
    async fetch(url, options) {
      fetchTokens.push(options.headers.Authorization);
      if (fetchTokens.length <= 2) {
        return jsonResponse(401, { error: { message: "Invalid Credentials" } });
      }
      return jsonResponse(200, {
        rows: [{ metricValues: [{ value: "1" }, { value: "2" }, { value: "3" }, { value: "4" }] }]
      });
    }
  });

  await context.fetchMetrics("a356198589p490540007");

  assert.deepEqual(tokenCalls, [false, true]);
  assert.deepEqual(removedTokens, ["cached-token"]);
  assert.deepEqual(fetchTokens, [
    "Bearer cached-token",
    "Bearer cached-token",
    "Bearer interactive-token",
    "Bearer interactive-token"
  ]);
  assert.equal(context.document.getElementById("metrics-bar").textContent, "");
  assert.equal(context.document.getElementById("dashboard-grid").children.length, 5);
});

test("fetchMetrics shows a permission message when an interactive retry still gets 403", async () => {
  const tokenCalls = [];
  const removedTokens = [];

  const chrome = {
    runtime: { lastError: null },
    identity: {
      getAuthToken({ interactive }, callback) {
        tokenCalls.push(interactive);
        callback(interactive ? "interactive-token" : "cached-token");
      },
      removeCachedAuthToken({ token }, callback) {
        removedTokens.push(token);
        callback();
      }
    }
  };

  const context = loadPopup({
    chrome,
    async fetch() {
      return jsonResponse(403, { error: { message: "Permission denied" } });
    }
  });

  await context.fetchMetrics("a356198589p490540007");

  assert.deepEqual(tokenCalls, [false, true]);
  assert.deepEqual(removedTokens, ["cached-token"]);
  assert.match(context.document.getElementById("metrics-bar").innerHTML, /Analytics permission denied/);
  assert.equal(context.document.getElementById("dashboard-grid").children.length, 0);
});

test("fetchMetrics reports realtime API failures separately", async () => {
  let fetchCount = 0;
  const chrome = {
    runtime: { lastError: null },
    identity: {
      getAuthToken({ interactive }, callback) {
        assert.equal(interactive, false);
        callback("cached-token");
      },
      removeCachedAuthToken() {
        assert.fail("non-auth API failures should not clear the cached token");
      }
    }
  };

  const context = loadPopup({
    chrome,
    async fetch() {
      fetchCount += 1;
      if (fetchCount === 1) {
        return jsonResponse(200, {
          rows: [{ metricValues: [{ value: "1" }, { value: "2" }, { value: "3" }, { value: "4" }] }]
        });
      }
      return jsonResponse(500, { error: { message: "Realtime unavailable" } });
    }
  });

  await context.fetchMetrics("a356198589p490540007");

  assert.equal(fetchCount, 2);
  assert.match(context.document.getElementById("metrics-bar").innerHTML, /Realtime metrics unavailable/);
  assert.equal(context.document.getElementById("dashboard-grid").children.length, 0);
});
