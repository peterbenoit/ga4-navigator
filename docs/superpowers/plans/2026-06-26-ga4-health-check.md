# GA4 Health Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an on-demand GA4 collection and traffic diagnostic panel with actionable findings.

**Architecture:** Pure helpers construct one `batchRunReports` request and evaluate its three report snapshots. Popup code handles auth, stale requests, rendering, and report links without coupling failures to dashboard loading.

**Tech Stack:** Chrome Extension Manifest V3, vanilla JavaScript, GA4 Data API, Node test runner, HTML, CSS.

---

### Task 1: Diagnostic rules

**Files:**
- Modify: `shortcut-utils.js`
- Test: `shortcut-utils.test.js`

- [x] Write failing tests proving the request contains today/recent/previous snapshots and findings classify stopped collection, traffic drops, event inactivity, and healthy data.
- [x] Run `node --test shortcut-utils.test.js` and confirm failures report missing health-check helpers.
- [x] Implement `buildHealthCheckRequest` and `buildHealthFindings` with deterministic thresholds and GA4 report paths.
- [x] Run `node --test shortcut-utils.test.js` and confirm all helper tests pass.

### Task 2: Popup request and rendering

**Files:**
- Modify: `popup.html`
- Modify: `popup.js`
- Modify: `popup.css`
- Test: `popup-metrics.test.js`

- [x] Write a failing popup test proving Run Check sends one authenticated batch request and renders linked findings.
- [x] Run `node --test popup-metrics.test.js` and confirm the feature test fails because the health-check flow is absent.
- [x] Add the Health Check panel, loading/error states, auth retry, stale-request protection, finding renderer, and property-reset behavior.
- [x] Add compact severity styling that follows the current popup design system.
- [x] Run `node --test popup-metrics.test.js` and confirm all popup tests pass.

### Task 3: Regression verification

**Files:**
- Modify: `popup.html`

- [x] Restore the property selector's programmatic label lost in the dark-theme redesign.
- [x] Run `node --test *.test.js` and confirm every test passes with zero failures.
- [x] Review `git diff --check` and the final diff for unintended changes.
