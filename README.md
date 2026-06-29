# GA4 Navigator

A Chrome extension for jumping to GA4 reports, viewing live metrics, and managing multiple GA4 properties without navigating the full Google Analytics interface.

## Features

- Switch between saved GA4 properties from a single dropdown
- View key metrics (sessions, users, conversions, active users) at a glance
- Navigate to common GA4 reports in one click
- Save custom report shortcuts (favorites)
- Track recently opened reports per property
- Run a health check to surface common data collection issues
- Export and import property settings as JSON

## Local Development

### Prerequisites

- Google Chrome (or Chromium-based browser)
- A Google Cloud project with the **Google Analytics Data API** enabled
- An OAuth 2.0 client ID configured for a Chrome extension

### 1. Clone the repo

```bash
git clone https://github.com/peterbenoit/ga4-navigator.git
cd ga4-navigator
```

### 2. Configure OAuth

The extension uses `chrome.identity` for Google OAuth. You need a Chrome extension OAuth client:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create or open a project.
2. Enable the **Google Analytics Data API**.
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
4. Select **Chrome Extension** as the application type.
5. Enter the extension ID (see step 4 below for how to get it).
6. Copy the generated client ID.
7. Update `manifest.json`:

```json
"oauth2": {
  "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "scopes": ["https://www.googleapis.com/auth/analytics.readonly"]
}
```

### 3. Load the unpacked extension

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked** and select this repo directory.
4. Copy the **Extension ID** shown on the extension card.

### 4. Set the extension ID in OAuth

Paste the extension ID back into your Google Cloud OAuth client configuration (under "Authorized extensions"), then save.

### 5. Reload and test

Click the extension icon to open the side panel. Use the **+ Add** button to add a GA4 property. Paste any URL from that GA4 account and the property ID is detected automatically.

## Connecting to Google Analytics

When you first load metrics, you will see a **Connect Google →** button. Click it to complete the OAuth flow. You must have **Viewer** access or higher on the GA4 property.

Common auth issues:
- **Auth expired** — Click "Connect Google →" again to re-authenticate.
- **Permission denied** — Ensure your Google account has access to the GA4 property.
- **Rate limit reached** — The GA4 Data API has per-property quotas. Wait a moment and try again.

## Project Structure

```
ga4-navigator/
├── manifest.json          # Extension manifest (MV3)
├── popup.html             # Side panel UI
├── popup.js               # All popup logic — storage, rendering, API calls
├── popup.css              # All popup styles
├── tabs.js                # Tab-switching behaviour (fires ga4-tab-change events)
├── analytics-utils.js     # Pure GA4 Data API request builders and response parsers
├── shortcut-utils.js      # URL parsing, property/shortcut normalisation helpers
├── background.js          # Service worker — opens the side panel on toolbar click
├── icons/                 # Extension icons at 16, 32, 48, and 128px
├── scripts/
│   ├── validate.js        # Pre-package checks (assets, manifest fields)
│   └── package.js         # Builds a distributable zip
└── *.test.js              # Tests (Node built-in test runner, no install needed)
```

## Running Tests

```bash
npm test
```

Tests use Node's built-in test runner. No install required. Test files cover:

| File | What it tests |
|---|---|
| `analytics-utils.test.js` | API request builders, response parsers, delta calculations |
| `shortcut-utils.test.js` | URL parsing, property ID normalisation, import validation |
| `popup-storage.test.js` | chrome.storage migration, import/export, save/load cycle |
| `popup-metrics.test.js` | fetchMetrics auth flow, stale-request guards, health check |
| `popup-links.test.js` | Built-in report path correctness |
| `popup-accessibility.test.js` | ARIA labels, live regions, tab panel associations |
| `manifest.test.js` | Manifest fields, icon asset presence, validate script |
| `background.test.js` | Service worker side panel behaviour |

## Adding a Property

1. Click **+ Add** in the header.
2. Enter a nickname for the property.
3. Paste any URL from that GA4 account (the property ID is extracted automatically).
4. Click **Save Property**.

The property ID format is `a{accountId}p{propertyId}` (e.g. `a123456789p987654321`).

## Export / Import

Use **Manage → Data** to export your properties and shortcuts as JSON. This is useful for backing up settings or copying them to another browser profile.

## Packaging a Release

Before packaging, validate that all manifest-declared assets are present:

```bash
npm run validate
```

To build a distributable zip (runs validation first, then excludes dev-only files):

```bash
npm run package
```

This produces `ga4-navigator-{version}.zip` in the project root, ready to upload to the Chrome Web Store. Dev-only files (`*.test.js`, `scripts/`, `docs/`, `BACKLOG.md`, etc.) are excluded from the zip automatically.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "Metrics: load as extension" | Running popup.html directly in a browser tab | Load the extension via `chrome://extensions` → Load unpacked |
| "Connect Google →" always appears | OAuth client not linked to this extension ID | Copy the extension ID from `chrome://extensions` and add it to your OAuth client in Google Cloud Console |
| Auth works but metrics show an error | Google account lacks GA4 access | Ensure the account has Viewer access or higher on the GA4 property |
| "Rate limit reached" | GA4 Data API quota exceeded | Wait 60 seconds and try again; the API has per-property daily quotas |
| Extension ID changes after reload | Loading from a different directory | Always load from the same directory, or pin the ID in your OAuth client |

## License

MIT
