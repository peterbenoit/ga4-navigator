# GA4 Health Check Design

## Goal

Add an on-demand diagnostic panel that tells users whether a selected GA4 property is collecting useful data and highlights meaningful traffic problems.

## User Experience

The main view includes a Health Check panel with a Run Check button. Running it shows a compact summary and ordered Critical, Warning, and Info findings. Each finding links to the most relevant GA4 report. Results remain visible until the property changes or the user runs the check again.

## Diagnostics

One GA4 `batchRunReports` request retrieves three metric snapshots: today, the previous seven complete days, and the seven days before that. The checks evaluate sessions, event count, and key-event count.

- Critical: zero sessions today when the previous period had meaningful traffic.
- Warning: recent sessions fell by at least 50 percent, no events were recorded today, no key events were recorded today, or the property has no meaningful recent traffic baseline.
- Info: sessions are collecting, traffic is stable, events are collecting, and key events are active.

The panel describes observed data only. It does not claim that a key event is unconfigured when the Data API can only prove that its count is zero.

## Architecture

Pure helpers in `shortcut-utils.js` build the batch request and convert API reports into deterministic findings. `popup.js` owns authentication, request lifecycle, and DOM rendering. The health check has its own request sequence so stale results cannot overwrite a newly selected property.

## Error Handling

The check retries once with interactive authentication after a 401 or 403, matching dashboard behavior. API, permission, and authentication failures render inside the panel without clearing dashboard metrics or top insights.

## Testing

Unit tests cover request shape, severity thresholds, zero-data behavior, and healthy results. Popup tests cover the authenticated batch request and rendered actionable findings. The full Node test suite remains the release gate.
