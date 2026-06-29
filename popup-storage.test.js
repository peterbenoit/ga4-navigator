const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const GA4ShortcutUtils = require("./shortcut-utils");

const popup = fs.readFileSync("popup.js", "utf8");

function loadPopupWithStorage({ legacy = {}, stored = {} } = {}) {
	const chromeStore = { ...stored };
	const localStore = { ...legacy };
	const context = {
		console,
		Date,
		URL,
		GA4ShortcutUtils,
		localStorage: {
			getItem(key) {
				return Object.hasOwn(localStore, key) ? localStore[key] : null;
			},
			setItem(key, value) {
				localStore[key] = value;
			}
		},
		document: { addEventListener() { } },
		chrome: {
			storage: {
				local: {
					get(keys, callback) {
						const result = {};
						keys.forEach(key => {
							if (Object.hasOwn(chromeStore, key)) result[key] = chromeStore[key];
						});
						callback(result);
					},
					set(values, callback) {
						Object.assign(chromeStore, values);
						callback?.();
					}
				}
			}
		},
		fetch() { }
	};

	vm.createContext(context);
	vm.runInContext(popup, context);
	return { context, chromeStore, localStore };
}

function plain(value) {
	return JSON.parse(JSON.stringify(value));
}

test("popup uses chrome.storage.local for extension settings", () => {
	assert.match(popup, /chrome\.storage\.local/);
});

test("popup does not seed a personal default property on first run", () => {
	assert.doesNotMatch(popup, /peterbenoit\.com \(Personal\)/);
	assert.doesNotMatch(popup, /a356198589p490540007/);
});

test("initStorage migrates legacy localStorage settings into chrome.storage.local", async () => {
	const { context, chromeStore } = loadPopupWithStorage({
		legacy: {
			ga4_properties: JSON.stringify([{ label: "Legacy", id: "a1p123" }]),
			ga4_selected: "0",
			ga4_date_range: "last7days",
			ga4_shortcuts: JSON.stringify([{ label: "Realtime", propertyId: "a1p123", path: "/realtime" }]),
			ga4_recent_reports: JSON.stringify([{ label: "Realtime", propertyId: "a1p123", path: "/realtime", openedAt: "2026-06-26T12:00:00.000Z" }])
		}
	});

	await context.initStorage();

	assert.deepEqual(plain(context.getProperties()), [{ label: "Legacy", id: "a1p123" }]);
	assert.equal(context.getDateRange(), "last7days");
	assert.equal(chromeStore.ga4_storage_migrated, true);
	assert.deepEqual(plain(chromeStore.ga4_properties), [{ label: "Legacy", id: "a1p123" }]);
});

test("initStorage writes schema version into chrome.storage.local on migration", async () => {
	const { context, chromeStore } = loadPopupWithStorage({
		legacy: {
			ga4_properties: JSON.stringify([{ label: "Old Site", id: "a1p111" }])
		}
	});

	await context.initStorage();

	assert.equal(typeof chromeStore.ga4_schema_version, "number");
	assert.ok(chromeStore.ga4_schema_version >= 2);
});

test("saveProperties writes through to chrome.storage.local", async () => {
	const { context, chromeStore } = loadPopupWithStorage({
		stored: { ga4_storage_migrated: true }
	});

	await context.initStorage();
	await context.saveProperties([{ label: "Saved", id: "a1p456" }]);

	assert.deepEqual(plain(context.getProperties()), [{ label: "Saved", id: "a1p456" }]);
	assert.deepEqual(plain(chromeStore.ga4_properties), [{ label: "Saved", id: "a1p456" }]);
});

// --- importProperties validation ---

function loadPopupWithImport({ stored = {}, inputValue = "" } = {}) {
	const chromeStore = { ga4_storage_migrated: true, ...stored };

	function createEl(id) {
		return {
			id,
			innerHTML: "",
			textContent: "",
			value: "",
			style: {},
			children: [],
			appendChild(child) { this.children.push(child); },
			setAttribute() { },
			getAttribute() { return null; }
		};
	}

	const importInput = createEl("import-input");
	importInput.value = inputValue;
	const importError = createEl("import-error");
	const importRow = createEl("import-row");
	importRow.style.display = "block";

	const knownElements = {
		"import-input": importInput,
		"import-error": importError,
		"import-row": importRow
	};

	const context = {
		console,
		Date,
		URL,
		GA4ShortcutUtils,
		localStorage: { getItem() { return null; }, setItem() { } },
		document: {
			addEventListener() { },
			createElement(tag) { return createEl(tag); },
			getElementById(id) { return knownElements[id] ?? createEl(id); }
		},
		chrome: {
			storage: {
				local: {
					get(keys, callback) {
						const result = {};
						keys.forEach(key => {
							if (Object.hasOwn(chromeStore, key)) result[key] = chromeStore[key];
						});
						callback(result);
					},
					set(values, callback) {
						Object.assign(chromeStore, values);
						callback?.();
					}
				}
			}
		},
		fetch() { }
	};

	vm.createContext(context);
	vm.runInContext(popup, context);
	return { context, chromeStore, importError, importInput, importRow };
}

test("importProperties rejects malformed JSON", async () => {
	const { context, importError } = loadPopupWithImport({ inputValue: "not valid json" });
	await context.initStorage();
	await context.importProperties();
	assert.equal(importError.textContent, "Invalid JSON.");
});

test("importProperties rejects null JSON with a format message", async () => {
	const { context, importError } = loadPopupWithImport({ inputValue: "null" });
	await context.initStorage();
	await context.importProperties();
	assert.match(importError.textContent, /Expected/);
});

test("importProperties rejects a plain number with a format message", async () => {
	const { context, importError } = loadPopupWithImport({ inputValue: "42" });
	await context.initStorage();
	await context.importProperties();
	assert.match(importError.textContent, /Expected/);
});

test("importProperties surfaces the specific error for an invalid property ID", async () => {
	const { context, importError } = loadPopupWithImport({
		inputValue: JSON.stringify([{ label: "Bad", id: "490540007" }])
	});
	await context.initStorage();
	await context.importProperties();
	assert.match(importError.textContent, /property id/i);
});

test("importProperties surfaces the specific error for a duplicate property ID", async () => {
	const { context, importError } = loadPopupWithImport({
		inputValue: JSON.stringify([
			{ label: "Site A", id: "a1p123" },
			{ label: "Site B", id: "a1p123" }
		])
	});
	await context.initStorage();
	await context.importProperties();
	assert.match(importError.textContent, /[Dd]uplicate/);
});

test("importProperties surfaces the specific error for an invalid shortcut path", async () => {
	const { context, importError } = loadPopupWithImport({
		inputValue: JSON.stringify({
			version: 2,
			properties: [{ label: "Site", id: "a1p123" }],
			shortcuts: [{ label: "Bad shortcut", propertyId: "a1p123", path: "no-leading-slash" }]
		})
	});
	await context.initStorage();
	await context.importProperties();
	assert.match(importError.textContent, /path/i);
});

test("importProperties accepts valid v1 array format and saves properties", async () => {
	const { context, chromeStore, importError, importRow } = loadPopupWithImport({
		inputValue: JSON.stringify([{ label: "My Site", id: "a1p123" }])
	});
	await context.initStorage();
	await context.importProperties();
	assert.equal(importError.textContent, "");
	assert.equal(importRow.style.display, "none");
	assert.deepEqual(plain(chromeStore.ga4_properties), [{ label: "My Site", id: "a1p123" }]);
	assert.deepEqual(plain(chromeStore.ga4_shortcuts), []);
});

test("importProperties accepts valid v2 object format with shortcuts", async () => {
	const { context, chromeStore, importError, importRow } = loadPopupWithImport({
		inputValue: JSON.stringify({
			version: 2,
			properties: [{ label: "Work Site", id: "a1p456" }],
			shortcuts: [{ label: "Realtime", propertyId: "a1p456", path: "/reports/realtime" }]
		})
	});
	await context.initStorage();
	await context.importProperties();
	assert.equal(importError.textContent, "");
	assert.equal(importRow.style.display, "none");
	assert.deepEqual(plain(chromeStore.ga4_properties), [{ label: "Work Site", id: "a1p456" }]);
	assert.deepEqual(plain(chromeStore.ga4_shortcuts), [
		{ label: "Realtime", propertyId: "a1p456", path: "/reports/realtime" }
	]);
});
