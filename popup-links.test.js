const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const popup = fs.readFileSync("popup.js", "utf8");

test("built-in realtime link uses GA4 copied realtime overview route", () => {
  assert.match(popup, /path: "\/realtime\/overview\?params=_u\.\.nav%3Dmaui&collectionId=business-objectives"/);
});

test("built-in pages link uses the copied all-pages-and-screens report context", () => {
  assert.match(popup, /ruid=all-pages-and-screens,business-objectives,examine-user-behavior&r=all-pages-and-screens/);
});
