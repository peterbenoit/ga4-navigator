const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));

test("manifest declares popup.html as the default side panel", () => {
  assert.equal(manifest.side_panel?.default_path, "popup.html");
});

test("manifest requests the sidePanel permission", () => {
  assert.ok(manifest.permissions.includes("sidePanel"));
});

test("toolbar action does not use a default popup", () => {
  assert.equal(manifest.action.default_popup, undefined);
});

test("manifest registers a background service worker for side panel behavior", () => {
  assert.equal(manifest.background?.service_worker, "background.js");
});
