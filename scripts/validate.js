#!/usr/bin/env node
/**
 * validate.js
 *
 * Checks that the extension is ready to package:
 *   1. manifest.json parses as valid JSON
 *   2. Every icon path declared in manifest `icons` and `action.default_icon` exists on disk
 *   3. The side panel path declared in manifest `side_panel.default_path` exists on disk
 *   4. The background service worker declared in manifest `background.service_worker` exists on disk
 *   5. Required manifest fields are present (name, version, manifest_version)
 *
 * Exits with code 0 on success, 1 on any failure.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const errors = [];

// --- Load manifest ---

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
} catch (err) {
  console.error("✖ manifest.json is not valid JSON:", err.message);
  process.exit(1);
}

// --- Required top-level fields ---

const required = ["name", "version", "manifest_version"];
for (const field of required) {
  if (!manifest[field]) {
    errors.push(`manifest.json is missing required field: "${field}"`);
  }
}

// --- Collect all declared icon paths ---

const iconPaths = new Set();

function collectIcons(obj) {
  if (!obj || typeof obj !== "object") return;
  for (const value of Object.values(obj)) {
    if (typeof value === "string") iconPaths.add(value);
  }
}

collectIcons(manifest.icons);
collectIcons(manifest.action?.default_icon);

for (const iconPath of iconPaths) {
  const full = path.join(ROOT, iconPath);
  if (!fs.existsSync(full)) {
    errors.push(`Icon asset missing: ${iconPath}`);
  }
}

if (iconPaths.size === 0) {
  errors.push("manifest.json declares no icons. Add an \"icons\" field with 16, 32, 48, and 128px entries.");
}

// --- Side panel path ---

const sidePanelPath = manifest.side_panel?.default_path;
if (!sidePanelPath) {
  errors.push("manifest.json is missing side_panel.default_path");
} else if (!fs.existsSync(path.join(ROOT, sidePanelPath))) {
  errors.push(`Side panel file missing: ${sidePanelPath}`);
}

// --- Background service worker ---

const workerPath = manifest.background?.service_worker;
if (!workerPath) {
  errors.push("manifest.json is missing background.service_worker");
} else if (!fs.existsSync(path.join(ROOT, workerPath))) {
  errors.push(`Background service worker missing: ${workerPath}`);
}

// --- Report ---

if (errors.length > 0) {
  console.error("Validation failed:\n");
  for (const err of errors) {
    console.error(`  ✖ ${err}`);
  }
  process.exit(1);
}

console.log("✔ Validation passed — extension is ready to package.");
