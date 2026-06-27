const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const GA4ShortcutUtils = require("./shortcut-utils");
const GA4AnalyticsUtils = require("./analytics-utils");

function createElement(id) {
  return {
    id,
    innerHTML: "",
    textContent: "",
    children: [],
    attributes: {},
    addEventListener() {},
    appendChild(child) {
      this.children.push(child);
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return this.attributes[name];
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
    GA4ShortcutUtils: overrides.GA4ShortcutUtils || GA4ShortcutUtils,
    GA4AnalyticsUtils: overrides.GA4AnalyticsUtils || GA4AnalyticsUtils,
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

function deferredResponse() {
  let resolve;
  const promise = new Promise(done => {
    resolve = done;
  });
  return { promise, resolve };
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

test("fetchMetrics ignores stale responses from previously selected properties", async () => {
  const firstReport = deferredResponse();
  const firstRealtime = deferredResponse();
  const responsesByProperty = new Map([
    ["111", [firstReport.promise, firstRealtime.promise]],
    [
      "222",
      [
        Promise.resolve(jsonResponse(200, {
          rows: [{ metricValues: [{ value: "20" }, { value: "21" }, { value: "22" }, { value: "23" }] }]
        })),
        Promise.resolve(jsonResponse(200, {
          rows: [{ metricValues: [{ value: "24" }] }]
        }))
      ]
    ]
  ]);

  const context = loadPopup({
    chrome: {
      runtime: { lastError: null },
      identity: {
        getAuthToken({ interactive }, callback) {
          assert.equal(interactive, false);
          callback("cached-token");
        },
        removeCachedAuthToken() {
          assert.fail("successful requests should not clear the cached token");
        }
      }
    },
    fetch(url) {
      const propertyId = url.match(/properties\/(\d+):/)?.[1];
      const queue = responsesByProperty.get(propertyId);
      assert.ok(queue, `unexpected property request: ${url}`);
      return queue.shift();
    }
  });

  const staleRequest = context.fetchMetrics("a1p111");
  const latestRequest = context.fetchMetrics("a1p222");

  await latestRequest;

  assert.deepEqual(
    context.document.getElementById("dashboard-grid").children.map(card => card.valueEl.textContent),
    ["20", "21", "22", "23", "24"]
  );

  firstReport.resolve(jsonResponse(200, {
    rows: [{ metricValues: [{ value: "10" }, { value: "11" }, { value: "12" }, { value: "13" }] }]
  }));
  firstRealtime.resolve(jsonResponse(200, {
    rows: [{ metricValues: [{ value: "14" }] }]
  }));

  await staleRequest;

  assert.deepEqual(
    context.document.getElementById("dashboard-grid").children.map(card => card.valueEl.textContent),
    ["20", "21", "22", "23", "24"]
  );
});

test("fetchMetrics ignores stale silent-auth failures after a newer request renders", async () => {
  const firstTokenFailure = deferredResponse();
  const tokenCalls = [];

  const context = loadPopup({
    chrome: {
      runtime: { lastError: null },
      identity: {
        getAuthToken({ interactive }, callback) {
          tokenCalls.push(interactive);
          if (tokenCalls.length === 1) {
            firstTokenFailure.promise.then(() => {
              context.chrome.runtime.lastError = { message: "Not signed in" };
              callback();
              context.chrome.runtime.lastError = null;
            });
            return;
          }

          callback("cached-token");
        },
        removeCachedAuthToken() {
          assert.fail("successful latest request should not clear the cached token");
        }
      }
    },
    async fetch(url) {
      if (url.includes("runRealtimeReport")) {
        return jsonResponse(200, {
          rows: [{ metricValues: [{ value: "34" }] }]
        });
      }

      return jsonResponse(200, {
        rows: [{ metricValues: [{ value: "30" }, { value: "31" }, { value: "32" }, { value: "33" }] }]
      });
    }
  });

  const staleRequest = context.fetchMetrics("a1p111");
  const latestRequest = context.fetchMetrics("a1p222");

  await latestRequest;
  firstTokenFailure.resolve();
  await staleRequest;

  assert.deepEqual(
    context.document.getElementById("dashboard-grid").children.map(card => card.valueEl.textContent),
    ["30", "31", "32", "33", "34"]
  );
  assert.equal(context.document.getElementById("metrics-bar").innerHTML, "<span class=\"metric-hint\">Updated just now</span>");
});

test("fetchMetrics loads and renders top page insights", async () => {
  const requests = [];
  const fixedNow = new Date("2026-06-26T12:00:00");
  const fixedShortcutUtils = {
    ...GA4ShortcutUtils,
    buildGa4Href(propertyId, path, dateRange) {
      return GA4ShortcutUtils.buildGa4Href(propertyId, path, dateRange, fixedNow);
    }
  };

  const context = loadPopup({
    GA4ShortcutUtils: fixedShortcutUtils,
    chrome: {
      runtime: { lastError: null },
      identity: {
        getAuthToken({ interactive }, callback) {
          assert.equal(interactive, false);
          callback("cached-token");
        },
        removeCachedAuthToken() {
          assert.fail("successful requests should not clear the cached token");
        }
      }
    },
    async fetch(url, options) {
      requests.push(JSON.parse(options.body));
      if (url.includes("runRealtimeReport")) {
        return jsonResponse(200, {
          rows: [{ metricValues: [{ value: "5" }] }]
        });
      }

      if (requests.length === 3) {
        return jsonResponse(200, {
          rows: [
            {
              dimensionValues: [{ value: "Home" }, { value: "/" }],
              metricValues: [{ value: "42" }]
            }
          ]
        });
      }

      return jsonResponse(200, {
        rows: [{ metricValues: [{ value: "1" }, { value: "2" }, { value: "3" }, { value: "4" }] }]
      });
    }
  });

  await context.fetchMetrics("a356198589p490540007");

  assert.deepEqual(requests[2].dimensions, [
    { name: "pageTitle" },
    { name: "pagePath" }
  ]);
  assert.deepEqual(requests[2].metrics, [{ name: "screenPageViews" }]);

  const row = context.document.getElementById("insight-list").children[0];
  assert.equal(row.href, "https://analytics.google.com/analytics/web/#/a356198589p490540007/reports/explorer?params=_u..nav%3Dmaui%26_u.date00%3D20260530%26_u.date01%3D20260626&collectionId=business-objectives&ruid=all-pages-and-screens,business-objectives,examine-user-behavior&r=all-pages-and-screens");
  assert.deepEqual(row.children.map(child => child.textContent), ["Home", "/", "42", "Views"]);
});

test("runHealthCheck loads a batch report and renders actionable findings", async () => {
  const requests = [];
  const context = loadPopup({
    chrome: {
      runtime: { lastError: null },
      identity: {
        getAuthToken({ interactive }, callback) {
          assert.equal(interactive, false);
          callback("cached-token");
        },
        removeCachedAuthToken() {
          assert.fail("successful requests should not clear the cached token");
        }
      }
    },
    async fetch(url, options) {
      requests.push({ url, options });
      return jsonResponse(200, {
        reports: [
          { rows: [{ metricValues: [{ value: "0" }, { value: "0" }, { value: "0" }] }] },
          { rows: [{ metricValues: [{ value: "140" }] }] },
          { rows: [{ metricValues: [{ value: "150" }] }] }
        ]
      });
    }
  });

  await context.runHealthCheck("a356198589p490540007");

  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /properties\/490540007:batchRunReports$/);
  assert.equal(requests[0].options.headers.Authorization, "Bearer cached-token");
  assert.deepEqual(JSON.parse(requests[0].options.body), GA4AnalyticsUtils.buildHealthCheckRequest());

  const findings = context.document.getElementById("health-results").children;
  assert.equal(findings.length, 4);
  assert.equal(findings[0].className, "health-finding health-finding-critical");
  assert.equal(findings[0].children[1].children[0].textContent, "No sessions recorded today");
  assert.match(findings[0].href, /reports\/realtime\/overview/);
  assert.equal(context.document.getElementById("health-status").textContent, "4 checks complete");
});
