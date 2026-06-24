# Custom Shortcuts Favorites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user-created GA4 report shortcuts that appear as favorites above the built-in report links.

**Architecture:** Keep the existing no-build extension structure. Add a small pure utility file for shortcut parsing/validation so it can be tested with Node's built-in test runner, then wire those utilities into the popup UI and `localStorage` persistence.

**Tech Stack:** Chrome MV3 popup, plain HTML/CSS/JavaScript, Node `node:test` for pure logic tests.

---

### Task 1: Shortcut Utility Tests

**Files:**
- Create: `shortcut-utils.test.js`
- Create: `shortcut-utils.js`
- Modify: `popup.html`
- Modify: `popup.js`

- [ ] Write failing tests for extracting property IDs and report paths from GA4 URLs.
- [ ] Run `node --test shortcut-utils.test.js` and verify the tests fail because `shortcut-utils.js` is missing.
- [ ] Add the minimal shortcut utility implementation.
- [ ] Run `node --test shortcut-utils.test.js` and verify the tests pass.

### Task 2: Shortcut Storage and Rendering

**Files:**
- Modify: `popup.html`
- Modify: `popup.js`
- Modify: `shortcut-utils.test.js`
- Modify: `shortcut-utils.js`

- [ ] Add failing tests for normalized shortcut objects, duplicate URL detection, and invalid URL rejection.
- [ ] Run `node --test shortcut-utils.test.js` and verify the tests fail for missing behavior.
- [ ] Add storage helpers and rendering for favorites in the popup.
- [ ] Add UI for creating, renaming, deleting, and reordering custom shortcuts.
- [ ] Run `node --test shortcut-utils.test.js` and verify tests pass.

### Task 3: Manual Extension Verification

**Files:**
- Modify as needed based on verification.

- [ ] Load `popup.html` in a browser-like context enough to inspect layout.
- [ ] Verify favorites render above built-in reports.
- [ ] Verify empty shortcut state, add form validation, reorder, delete, and export/import compatibility.
- [ ] Update `FEATURE_IDEAS.md` or `BACKLOG.md` if implementation leaves follow-up work.

### Notes

- This workspace is not a Git repository, so commit steps are intentionally omitted.
- Keep built-in report links intact.
- Do not request the `tabs` permission in this first slice; shortcut creation uses pasted GA4 URLs.

