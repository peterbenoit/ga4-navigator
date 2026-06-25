# Recent Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track GA4 reports opened from the popup and show a compact Recent section for one-click reopening.

**Architecture:** Keep the current static extension structure. Add pure recent-report helpers to `shortcut-utils.js` so ordering, dedupe, and capping are testable with Node, then wire click tracking and rendering into `popup.js`.

**Tech Stack:** Chrome MV3 popup, plain HTML/CSS/JavaScript, Node `node:test`.

---

### Task 1: Recent Report Utility Behavior

**Files:**
- Modify: `shortcut-utils.js`
- Modify: `shortcut-utils.test.js`

- [ ] Write failing tests for `addRecentReport()` adding a newest-first item with `openedAt`.
- [ ] Write failing tests for duplicate reports moving to the top instead of duplicating.
- [ ] Write failing tests for capping the recent list at five items.
- [ ] Run `node --test shortcut-utils.test.js` and verify the tests fail because the helper is missing.
- [ ] Implement `addRecentReport()`.
- [ ] Run `node --test shortcut-utils.test.js` and verify all tests pass.

### Task 2: Popup Recent Section

**Files:**
- Modify: `popup.html`
- Modify: `popup.js`

- [ ] Add a `#recent-list` container between Favorites and built-in reports.
- [ ] Add popup storage helpers for `ga4_recent_reports`.
- [ ] Render Recent reports with report label, property label, and last opened date/time.
- [ ] Add click tracking to built-in report links and favorite links.
- [ ] Add a Clear control that removes recent history.

### Task 3: Verification

**Files:**
- Modify as needed based on verification.

- [ ] Run `node --test shortcut-utils.test.js`.
- [ ] Run `node --check shortcut-utils.js`.
- [ ] Run `node --check popup.js`.
- [ ] Parse `manifest.json`.
- [ ] Review `popup.html` and `popup.js` for stale selectors or missing script dependencies.

### Notes

- Recent reports are local-only and should export/import later, not in this first slice.
- This project already has uncommitted favorites work; keep this change additive and do not revert existing edits.

