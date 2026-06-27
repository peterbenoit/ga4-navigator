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

## Running Tests

```bash
npm test
```

Tests use Node's built-in test runner. No install required.

## Adding a Property

1. Click **+ Add** in the header.
2. Enter a nickname for the property.
3. Paste any URL from that GA4 account (the property ID is extracted automatically).
4. Click **Save Property**.

The property ID format is `a{accountId}p{propertyId}` (e.g. `a123456789p987654321`).

## Export / Import

Use **Manage → Data** to export your properties and shortcuts as JSON. This is useful for backing up settings or copying them to another browser profile.

## License

MIT
