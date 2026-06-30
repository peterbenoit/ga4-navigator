const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const popup = fs.readFileSync("popup.js", "utf8");

test("built-in realtime link uses GA4 copied realtime overview route", () => {
  assert.match(popup, /path: "\/reports\/realtime\/overview\?params=_u\.\.nav%3Dmaui"/);
});

test("built-in pages link uses the copied all-pages-and-screens report context", () => {
  assert.match(popup, /&r=all-pages-and-screens/);
});

test("built-in links do not use stale life-cycle report contexts", () => {
  assert.doesNotMatch(popup, /life-cycle-engagement-pages-screens/);
  assert.doesNotMatch(popup, /life-cycle-acquisition-traffic-acquisition/);
});
