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
    document: { addEventListener() {} },
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
    fetch() {}
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

test("saveProperties writes through to chrome.storage.local", async () => {
  const { context, chromeStore } = loadPopupWithStorage({
    stored: { ga4_storage_migrated: true }
  });

  await context.initStorage();
  await context.saveProperties([{ label: "Saved", id: "a1p456" }]);

  assert.deepEqual(plain(context.getProperties()), [{ label: "Saved", id: "a1p456" }]);
  assert.deepEqual(plain(chromeStore.ga4_properties), [{ label: "Saved", id: "a1p456" }]);
});
