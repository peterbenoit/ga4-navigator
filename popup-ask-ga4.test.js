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
    className: "",
    hidden: false,
    href: "",
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
    },
    querySelectorAll() {
      return [];
    }
  };
}

function loadPopup(overrides = {}) {
  const context = {
    console,
    Date,
    URL,
    AbortController,
    LanguageModel: overrides.LanguageModel,
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

function fakeSession({ intentReply, answerChunks = [] }) {
  const calls = { prompts: [], streamPrompts: [] };
  const session = {
    async prompt(promptText) {
      calls.prompts.push(promptText);
      return intentReply;
    },
    async *promptStreaming(promptText) {
      calls.streamPrompts.push(promptText);
      for (const chunk of answerChunks) yield chunk;
    },
    destroy() {}
  };
  return { session, calls };
}

// --- Pure logic ---

test("classifyIntentPrompt lists every intent key and embeds the question", () => {
  const context = loadPopup();
  const prompt = context.classifyIntentPrompt("Where is my traffic coming from?");
  assert.match(prompt, /Where is my traffic coming from\?/);
  assert.match(prompt, /- traffic:/);
  assert.match(prompt, /- devices:/);
  assert.match(prompt, /- events:/);
  assert.match(prompt, /- landing:/);
  assert.match(prompt, /- retention:/);
  assert.match(prompt, /- search:/);
  assert.match(prompt, /- overview:/);
});

test("parseIntentKey accepts a clean known key", () => {
  const context = loadPopup();
  assert.equal(context.parseIntentKey("traffic"), "traffic");
});

test("parseIntentKey strips punctuation and whitespace from the model output", () => {
  const context = loadPopup();
  assert.equal(context.parseIntentKey("  Devices.\n"), "devices");
});

test("parseIntentKey returns null for an unrecognized key", () => {
  const context = loadPopup();
  assert.equal(context.parseIntentKey("weather forecast"), null);
});

test("summarizeIntentData formats traffic rows", () => {
  const context = loadPopup();
  const summary = context.summarizeIntentData("traffic", [
    { channel: "Direct", sessions: "1,477", share: 80, engagementRate: "17.1%" }
  ]);
  assert.equal(summary, "Direct: 1,477 sessions (80% share, 17.1% engagement)");
});

test("summarizeIntentData returns null for empty traffic rows", () => {
  const context = loadPopup();
  assert.equal(context.summarizeIntentData("traffic", []), null);
});

test("summarizeIntentData formats the events row shape with a nested rows array", () => {
  const context = loadPopup();
  const summary = context.summarizeIntentData("events", {
    rows: [{ name: "page_view", count: "5,179", users: "1,500" }],
    hasEnhancedEvent: true
  });
  assert.equal(summary, "page_view: 5,179 events, 1,500 users");
});

test("summarizeIntentData formats new vs. returning data", () => {
  const context = loadPopup();
  const summary = context.summarizeIntentData("retention", {
    total: 1542,
    newUsersFormatted: "1,498",
    returningUsersFormatted: "44",
    newShare: 97,
    returningShare: 3,
    totalFormatted: "1,542"
  });
  assert.equal(
    summary,
    "New users: 1,498 (97%); Returning users: 44 (3%); Total: 1,542"
  );
});

test("summarizeIntentData returns null when retention total is zero", () => {
  const context = loadPopup();
  assert.equal(context.summarizeIntentData("retention", { total: 0 }), null);
});

test("buildGroundedAnswerPrompt embeds the question, period, and data summary", () => {
  const context = loadPopup();
  const prompt = context.buildGroundedAnswerPrompt(
    "How are my devices doing?",
    "Device categories",
    "desktop: 1,703 sessions",
    "peterbenoit.com",
    "last28days"
  );
  assert.match(prompt, /peterbenoit\.com/);
  assert.match(prompt, /the last 28 days/);
  assert.match(prompt, /How are my devices doing\?/);
  assert.match(prompt, /desktop: 1,703 sessions/);
});

// --- End-to-end orchestration ---

test("askGa4 routes a traffic question to the traffic API and streams a grounded answer", async () => {
  const requests = [];
  const { session, calls } = fakeSession({
    intentReply: "traffic",
    answerChunks: ["Direct traffic ", "leads with 1,477 sessions."]
  });

  const context = loadPopup({
    LanguageModel: { async create() { return session; } },
    chrome: {
      runtime: { lastError: null },
      identity: {
        getAuthToken({ interactive }, callback) {
          assert.equal(interactive, false);
          callback("cached-token");
        }
      }
    },
    async fetch(url, options) {
      requests.push({ url, body: JSON.parse(options.body) });
      return jsonResponse(200, {
        rows: [{
          dimensionValues: [{ value: "Direct" }],
          metricValues: [{ value: "1477" }, { value: "0.171" }]
        }]
      });
    }
  });

  await context.saveProperties([{ label: "peterbenoit.com", id: "a356198589p490540007" }]);
  await context.saveSelectedIndex(0);

  await context.askGa4("Where is my traffic coming from?");

  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /properties\/490540007:runReport$/);
  assert.deepEqual(requests[0].body, GA4AnalyticsUtils.buildTrafficSourceRequest("last28days"));

  assert.deepEqual(calls.prompts.length, 1);
  assert.match(calls.prompts[0], /Where is my traffic coming from\?/);
  assert.match(calls.streamPrompts[0], /Direct: 1,477 sessions/);

  const output = context.document.getElementById("ask-ga4-output");
  assert.equal(output.textContent, "Direct traffic leads with 1,477 sessions.");

  const link = context.document.getElementById("ask-ga4-link");
  assert.equal(link.hidden, false);
  assert.equal(link.textContent, "Open Traffic sources report →");
  assert.match(link.href, /analytics\.google\.com/);
});

test("askGa4 answers an overview question from already-loaded dashboard metrics without fetching", async () => {
  const requests = [];
  const { session, calls } = fakeSession({
    intentReply: "overview",
    answerChunks: ["Sessions are at 1,200 this period."]
  });

  const context = loadPopup({
    LanguageModel: { async create() { return session; } },
    chrome: { runtime: { lastError: null }, identity: { getAuthToken() {} } },
    async fetch(url, options) {
      requests.push({ url, options });
      return jsonResponse(200, { rows: [] });
    }
  });

  await context.saveProperties([{ label: "peterbenoit.com", id: "a356198589p490540007" }]);
  await context.saveSelectedIndex(0);

  context.renderDashboard([
    { label: "Sessions", value: "1,200", delta: null },
    { label: "Live", value: "3", delta: null }
  ]);

  await context.askGa4("How is my account doing overall?");

  assert.equal(requests.length, 0);
  assert.match(calls.streamPrompts[0], /Sessions: 1,200/);
  assert.ok(!calls.streamPrompts[0].includes("Live:"));

  const output = context.document.getElementById("ask-ga4-output");
  assert.equal(output.textContent, "Sessions are at 1,200 this period.");

  const link = context.document.getElementById("ask-ga4-link");
  assert.equal(link.hidden, true);
});

test("askGa4 shows guidance text when the model can't match a known category", async () => {
  const requests = [];
  const { session } = fakeSession({ intentReply: "I have no idea what you mean" });

  const context = loadPopup({
    LanguageModel: { async create() { return session; } },
    chrome: { runtime: { lastError: null }, identity: { getAuthToken() {} } },
    async fetch(url, options) {
      requests.push({ url, options });
      return jsonResponse(200, { rows: [] });
    }
  });

  await context.saveProperties([{ label: "peterbenoit.com", id: "a356198589p490540007" }]);
  await context.saveSelectedIndex(0);

  await context.askGa4("What's the meaning of life?");

  assert.equal(requests.length, 0);
  const output = context.document.getElementById("ask-ga4-output");
  assert.equal(output.className, "ai-digest-output error");
  assert.match(output.textContent, /Couldn't match that to data/);
});

test("askGa4 shows a no-data message with a report link when the API returns no rows", async () => {
  const { session } = fakeSession({ intentReply: "devices" });

  const context = loadPopup({
    LanguageModel: { async create() { return session; } },
    chrome: {
      runtime: { lastError: null },
      identity: { getAuthToken({ interactive }, callback) { callback("cached-token"); } }
    },
    async fetch() {
      return jsonResponse(200, { rows: [] });
    }
  });

  await context.saveProperties([{ label: "peterbenoit.com", id: "a356198589p490540007" }]);
  await context.saveSelectedIndex(0);

  await context.askGa4("What devices do people use?");

  const output = context.document.getElementById("ask-ga4-output");
  assert.match(output.textContent, /No device categories data found/);

  const link = context.document.getElementById("ask-ga4-link");
  assert.equal(link.hidden, false);
  assert.match(link.href, /analytics\.google\.com/);
});

test("askGa4 clears a rejected cached token and retries interactively once", async () => {
  const tokenCalls = [];
  const removedTokens = [];
  const fetchCount = { n: 0 };
  const { session } = fakeSession({
    intentReply: "events",
    answerChunks: ["page_view leads with 5,179 events."]
  });

  const context = loadPopup({
    LanguageModel: { async create() { return session; } },
    chrome: {
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
    },
    async fetch() {
      fetchCount.n += 1;
      if (fetchCount.n === 1) {
        return jsonResponse(401, { error: { message: "Invalid Credentials" } });
      }
      return jsonResponse(200, {
        rows: [{
          dimensionValues: [{ value: "page_view" }],
          metricValues: [{ value: "5179" }, { value: "1500" }]
        }]
      });
    }
  });

  await context.saveProperties([{ label: "peterbenoit.com", id: "a356198589p490540007" }]);
  await context.saveSelectedIndex(0);

  await context.askGa4("What are my top events?");

  assert.deepEqual(tokenCalls, [false, true]);
  assert.deepEqual(removedTokens, ["cached-token"]);
  assert.equal(fetchCount.n, 2);

  const output = context.document.getElementById("ask-ga4-output");
  assert.equal(output.textContent, "page_view leads with 5,179 events.");
});

test("askGa4 shows an error and skips the model entirely when no property is selected", async () => {
  let modelCreated = false;

  const context = loadPopup({
    LanguageModel: { async create() { modelCreated = true; return fakeSession({ intentReply: "overview" }).session; } }
  });

  await context.askGa4("How is my traffic?");

  assert.equal(modelCreated, false);
  const output = context.document.getElementById("ask-ga4-output");
  assert.equal(output.className, "ai-digest-output error");
  assert.match(output.textContent, /Add or select a property/);
});

test("askGa4 does nothing for a blank question", async () => {
  let modelCreated = false;

  const context = loadPopup({
    LanguageModel: { async create() { modelCreated = true; } }
  });

  await context.saveProperties([{ label: "peterbenoit.com", id: "a356198589p490540007" }]);
  await context.saveSelectedIndex(0);

  await context.askGa4("   ");

  assert.equal(modelCreated, false);
});
