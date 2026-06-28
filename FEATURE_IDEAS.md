# GA4 Navigator Feature Ideas

Items are checked when fully implemented. Unchecked items are candidates for future sprints.

## Product Direction

The current extension is useful as a shortcut panel, but it can become a lightweight GA4 operating console: quick answers, saved workflows, account health checks, and small utilities that reduce how often a user has to dig through the GA4 interface.

## High-Value Additions

- [x] **At-a-glance property dashboard**
  Shows key metrics (users, sessions, conversions, engagement rate) for the selected property and date range, including loading, error, and empty states.

- [x] **Date comparison mode**
  Toggle compares the selected period against the prior period of equal length. Metrics show absolute and percent change. Zero prior values are handled as new activity.

- [x] **Top pages and traffic sources**
  Ranked lists for top pages and top acquisition channels. Each row opens the matching GA4 report. Handles missing data cleanly.

- [x] **Expanded analysis views — landing page performance**
  Landing pages show sessions, engagement rate, and bounce rate. Loads on demand.

- [x] **GA4 health check**
  Diagnostic panel checks whether the selected property is collecting useful data. Results are grouped by severity (Info, Warning, Critical) and link to relevant GA4 reports.

- [x] **Favorites and custom shortcuts**
  Users can create, label, and delete custom report shortcuts. Custom shortcuts appear alongside built-in reports. Shortcuts are saved to storage and export/import with property settings.

- [x] **Recent reports**
  Tracks GA4 links opened from the extension. Recent items include property, report label, and timestamp. History is clearable.

- [ ] **Smart search / command palette**
  A single input that filters properties, reports, and shortcuts by keyword. Keyboard-navigable with arrow keys and Enter.

- [ ] **Alerts and monitors**
  User-defined local checks on GA4 metrics (e.g., "alert me if active users are 0"). Badge or popup warning. Avoids excessive API calls.

- [ ] **Annotations and notes**
  Dated notes tied to a property (e.g., "launched new homepage"). Notes appear when the selected date range includes the note date. Notes export/import with property data.

- [ ] **UTM builder and campaign links**
  Small form that generates tagged campaign URLs for the selected property. Saves common values as presets. Validates URLs before copy.

- [ ] **Event lookup**
  Top events for the selected date range. Event rows show count and open the relevant GA4 event report. Works with custom events.

- [ ] **Conversion / key event tracker**
  User can pin key events to the dashboard. Pinned events show counts. Zero-count events are clearly visible.

- [ ] **Multi-property overview**
  Compact row-per-property view showing live users, sessions today, and health status. Loads progressively. Rows show stale/error states independently.

- [ ] **Saved report bundles**
  Named bundles that open a set of reports for a repeated workflow. Respects selected property and date range.

- [ ] **Exportable quick reports**
  Generates a Markdown summary from normalized metrics. Includes property name, date range, and timestamp. Copies to clipboard. Does not require an AI provider.

- [x] **Plain-English metric digest (on-device AI)**
  Uses Chrome's built-in Prompt API (Gemini Nano via `LanguageModel`) to summarize metric changes in 2-3 sentences. No external API, no data leaves the browser. Section hidden when API unavailable.

- [ ] **Anomaly spotter**
  Compares today vs the same day last week, and last 7 days vs prior 7. Flags anything that moved more than 20% in either direction. Shown as a "what changed" card.

- [ ] **Report URL parser**
  Parses a pasted GA4 URL to extract property ID, report path, and date params. Can create a property or custom shortcut from the parsed result. Covered by tests.

- [ ] **Browser action badge**
  Shows live user count or a status indicator on the extension icon. Toggleable. Does not update so frequently that it risks API quota issues.

- [ ] **Setup wizard**
  Guided first-run flow: connect Google, paste GA4 URL, name property, test metrics access. Users can skip and import JSON instead.

- [ ] **Property tags and grouping**
  Users can tag saved properties and filter the dropdown by tag. Tags export/import with property data.

- [ ] **Channel grouping snapshot**
  Compact default channel group breakdown (Organic, Direct, Paid, Referral) for the selected date range. Unknown/Unassigned traffic is surfaced. Row click opens the GA4 acquisition report filtered to that channel.

- [ ] **Engagement metrics spotlight**
  Engagement rate, avg. session duration, and engaged sessions as dashboard cards. Each includes a plain-English label and links to the engagement report.

- [ ] **Data freshness indicator**
  Shows approximate GA4 data latency from API response metadata. Realtime data is labeled separately. Stale states are explained rather than silently shown.

- [ ] **Dark mode / system theme support**
  Honors `prefers-color-scheme: dark`. DO NOT implement until everything else is done.

- [ ] **Quick-launch GA4 Explorations**
  Shortcut buttons to create new Explorations (free form, funnel, path, segment overlap) for the selected property.

## Larger / Later Ideas

- [ ] **Page-specific GA4 context**
  When the user is viewing their own website, show GA4 stats for the current page. Requires `activeTab` or host permissions and careful privacy scoping.

- [ ] **Tag and consent debugging helper**
  Detect whether the current page has Google tag, GTM, consent mode signals, or common tracking issues. Requires content scripts.

- [ ] **Looker Studio / dashboard links**
  Let users attach related Looker Studio dashboards to each property. Start as simple external links.

- [ ] **Optional Search Console integration**
  Opt-in connection for search performance data (top queries, CTR, pages near page one). Separate OAuth scope, kept isolated from GA4 errors.

- [ ] **GA4 account and property hierarchy**
  Distinguish GA4 accounts from properties. Requires the Analytics Admin API to enumerate account/property relationships.

- [ ] **Attribution model indicator**
  Show which attribution model is active for the selected property. Display only, no changes.

- [ ] **AI-assisted metric summaries (external API)**
  Generate plain-English summaries via an external AI provider. Requires API strategy, privacy decisions, and clear data handling rules. See on-device option above as the lower-friction alternative.
