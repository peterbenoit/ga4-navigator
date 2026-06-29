const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

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

test("manifest declares icons at 16, 32, 48, and 128px", () => {
	assert.ok(manifest.icons, "manifest.icons is missing");
	for (const size of ["16", "32", "48", "128"]) {
		assert.ok(manifest.icons[size], `manifest.icons["${size}"] is missing`);
	}
});

test("all declared icon assets exist on disk", () => {
	const allIconPaths = [
		...Object.values(manifest.icons || {}),
		...Object.values(manifest.action?.default_icon || {})
	];
	const unique = [...new Set(allIconPaths)];
	for (const iconPath of unique) {
		assert.ok(
			fs.existsSync(path.resolve(iconPath)),
			`Icon asset missing from disk: ${iconPath}`
		);
	}
});

test("validate script exits 0 for a valid manifest and assets", () => {
	const { execSync } = require("node:child_process");
	assert.doesNotThrow(() => {
		execSync("node scripts/validate.js", { stdio: "pipe" });
	}, "validate.js should exit 0 when all assets are present");
});
