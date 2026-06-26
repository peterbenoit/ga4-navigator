const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("popup.html", "utf8");
const popup = fs.readFileSync("popup.js", "utf8");

test("popup form controls have programmatic labels", () => {
  assert.match(html, /<label\s+for="propertySelect">Property:<\/label>/);
  assert.match(html, /<label\s+for="prop-name">Nickname<\/label>/);
  assert.match(html, /<label\s+for="prop-id">Paste any GA4 URL from that account<\/label>/);
});

test("icon and action buttons declare button type and accessible labels", () => {
  assert.match(html, /<button[^>]*id="btn-manage"[^>]*type="button"[^>]*aria-label="Manage properties"/);
  assert.match(html, /<button[^>]*id="btn-add"[^>]*type="button"[^>]*aria-label="Add a property"/);
  assert.match(html, /<button[^>]*id="btn-empty-add"[^>]*type="button"/);
  assert.match(html, /<button[^>]*id="btn-save"[^>]*type="button"/);
});

test("form error containers are announced as live status messages", () => {
  assert.match(html, /<div id="add-error"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /<div id="shortcut-error"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /<div id="import-error"[^>]*role="status"[^>]*aria-live="polite"/);
});

function createElement(id) {
  return {
    id,
    attributes: {},
    children: [],
    innerHTML: "",
    textContent: "",
    appendChild(child) {
      this.children.push(child);
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return this.attributes[name];
    }
  };
}

test("date range buttons expose their selected state", () => {
  const datePills = createElement("date-pills");
  const context = {
    console,
    Date,
    URL,
    GA4ShortcutUtils: require("./shortcut-utils"),
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {}
    },
    document: {
      addEventListener() {},
      createElement,
      getElementById(id) {
        assert.equal(id, "date-pills");
        return datePills;
      }
    },
    fetch() {}
  };

  vm.createContext(context);
  vm.runInContext(popup, context);
  context.renderDatePills();

  assert.deepEqual(
    datePills.children.map(button => [button.textContent, button.type, button.getAttribute("aria-pressed")]),
    [
      ["7d", "button", "false"],
      ["28d", "button", "true"],
      ["90d", "button", "false"]
    ]
  );
});
