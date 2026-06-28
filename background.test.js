const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const background = fs.readFileSync("background.js", "utf8");

test("service worker configures action-click behavior at startup and handles rejection", () => {
  const calls = [];
  let rejectionHandler;
  const context = {
    chrome: {
      sidePanel: {
        setPanelBehavior(options) {
          calls.push(options);
          return {
            catch(handler) {
              rejectionHandler = handler;
            }
          };
        }
      }
    },
    console
  };

  vm.createContext(context);
  vm.runInContext(background, context);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].openPanelOnActionClick, true);
  assert.equal(typeof rejectionHandler, "function");
});
