# Side Panel Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert GA4 Navigator from a cramped action popup into a Chrome side panel using `chrome.sidePanel`.

**Architecture:** Reuse the current `popup.html` and `popup.js` as the side panel page to avoid duplicating UI. Update `manifest.json` so the toolbar action opens the side panel, then adjust CSS from fixed popup sizing to a responsive side-panel layout.

**Tech Stack:** Chrome MV3, `chrome.sidePanel`, plain HTML/CSS/JavaScript, Node `node:test`.

---

### Task 1: Manifest Side Panel Contract

**Files:**
- Create: `manifest.test.js`
- Modify: `manifest.json`

- [ ] Write a failing test that requires `sidePanel.default_path` to point at `popup.html`.
- [ ] Write a failing test that requires the `sidePanel` permission.
- [ ] Write a failing test that requires `action.default_popup` to be absent.
- [ ] Run `node --test manifest.test.js` and verify it fails against the current popup manifest.
- [ ] Update `manifest.json` for side panel behavior.
- [ ] Run `node --test manifest.test.js` and verify it passes.

### Task 2: Responsive Side Panel Layout

**Files:**
- Modify: `popup.html`

- [ ] Remove the fixed `body` width.
- [ ] Add side-panel-friendly sizing with min/max width, full-height scrolling, and a wider layout.
- [ ] Let the dashboard card grid use responsive columns instead of five cramped columns.
- [ ] Keep forms, report buttons, recent cards, and manage rows readable at narrow and wider panel widths.

### Task 3: Verification

**Files:**
- Modify as needed based on verification.

- [ ] Run `node --test shortcut-utils.test.js`.
- [ ] Run `node --test manifest.test.js`.
- [ ] Run `node --check popup.js`.
- [ ] Run `node --check shortcut-utils.js`.
- [ ] Parse `manifest.json`.
- [ ] Review `popup.html` for fixed popup assumptions.

### Notes

- Chrome side panel support requires Chromium 114+.
- This slice does not rename `popup.html`; keeping the filename reduces churn.
- Live Chrome extension verification still needs manual reload in `chrome://extensions`.

