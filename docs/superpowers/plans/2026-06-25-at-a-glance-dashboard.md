# At A Glance Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the small text metrics bar with a compact dashboard that shows key GA4 metrics for the selected property and date range.

**Architecture:** Keep the no-build extension structure. Add pure metric parsing/formatting helpers to `shortcut-utils.js` for testability, then wire `popup.js` to request a date-range-aware GA4 report and render metric cards.

**Tech Stack:** Chrome MV3 popup, plain HTML/CSS/JavaScript, Google Analytics Data API, Node `node:test`.

---

### Task 1: Dashboard Utility Behavior

**Files:**
- Modify: `shortcut-utils.js`
- Modify: `shortcut-utils.test.js`

- [ ] Write failing tests for converting GA4 `runReport` and realtime responses into display metric cards.
- [ ] Write failing tests for mapping the selected date range to GA4 Data API date ranges.
- [ ] Run `node --test shortcut-utils.test.js` and verify the tests fail because the helpers are missing.
- [ ] Implement `getApiDateRange()` and `buildDashboardMetrics()`.
- [ ] Run `node --test shortcut-utils.test.js` and verify all tests pass.

### Task 2: Popup Dashboard UI

**Files:**
- Modify: `manifest.json`
- Modify: `popup.html`
- Modify: `popup.js`

- [ ] Add `https://analyticsdata.googleapis.com/*` to `host_permissions`.
- [ ] Replace `#metrics-bar` text rendering with dashboard card rendering.
- [ ] Update the GA4 report request to use selected date range and metrics: sessions, totalUsers, screenPageViews, eventCount.
- [ ] Keep realtime active users as a dashboard card.
- [ ] Render loading, connect, auth failure, and API error states in the dashboard area.

### Task 3: Verification

**Files:**
- Modify as needed based on verification.

- [ ] Run `node --test shortcut-utils.test.js`.
- [ ] Run `node --check shortcut-utils.js`.
- [ ] Run `node --check popup.js`.
- [ ] Parse `manifest.json`.
- [ ] Review `popup.html` and `popup.js` for stale `metrics-bar` assumptions.

### Notes

- This slice does not add comparison percentages yet.
- This slice does not add top pages or traffic source lists yet.
- The existing OAuth connection flow stays in place.

