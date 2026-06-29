#!/usr/bin/env node
/**
 * package.js
 *
 * Builds a distributable zip of the extension, excluding:
 *   - Dev-only files (test files, scripts/, docs/, .git/, .vscode/, .claude/)
 *   - Project meta files (BACKLOG.md, FEATURE_IDEAS.md, package.json, *.zip)
 *
 * Output: ga4-navigator-{version}.zip in the project root.
 * Run via: npm run package  (which runs validate.js first)
 *
 * Requires no external dependencies — uses Node built-ins only.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
const version = manifest.version;
const outFile = path.join(ROOT, `ga4-navigator-${version}.zip`);

// Files and directories to exclude from the package
const EXCLUDE = [
  ".git",
  ".vscode",
  ".claude",
  "scripts",
  "docs",
  "node_modules",
  "BACKLOG.md",
  "FEATURE_IDEAS.md",
  "package.json",
  "package-lock.json",
  "*.test.js",
  "*.zip"
];

// Build the zip using the system `zip` command (available on macOS and Linux).
// For cross-platform CI you can swap this for a Node zip library.
const excludeArgs = EXCLUDE.map(p => `--exclude='${p}' --exclude='*/${p}/*' --exclude='${p}/*'`).join(" ");

if (fs.existsSync(outFile)) {
  fs.rmSync(outFile);
}

try {
  execSync(
    `cd "${ROOT}" && zip -r "${outFile}" . ${excludeArgs}`,
    { stdio: "inherit" }
  );
  const bytes = fs.statSync(outFile).size;
  console.log(`\n✔ Packaged: ${path.relative(ROOT, outFile)} (${(bytes / 1024).toFixed(1)} KB)`);
} catch (err) {
  console.error("✖ Packaging failed:", err.message);
  process.exit(1);
}
