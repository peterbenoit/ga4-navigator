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

- [x] **Exportable quick reports**
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

- [ ] **Question-to-report navigator**
  User types or selects a plain-English question (e.g., "Where is our traffic coming from?") and the extension opens the exact GA4 report, pre-filtered where possible. Questions sourced from the GA4 Question Reference. Organized by category (Traffic, Campaigns, Content, etc.).

- [ ] **Category-based report shortcuts**
  Pre-built shortcut groups matching the question reference categories: Traffic & Acquisition, Campaign Performance, Content & Page Performance, User Behavior, Technical & Device, Audience & Demographics, Conversions & Events, Site Search, Real-Time, Trends & Comparisons. Each group opens as a collapsed/expandable section.

- [ ] **Engagement metrics spotlight** *(already listed — expand scope)*
  Add avg. engagement time per page alongside engagement rate and engaged sessions. Surface the "90% scroll depth" event count for a selected page using the scroll enhanced measurement.

- [ ] **Top events panel**
  Top events for the selected date range with counts. Rows deep-link to the GA4 Events report filtered to that event. Calls out enhanced measurement events (scroll, file_download, outbound click, video_start, site search) specifically so users know which are auto-collected.

- [ ] **File download and outbound click tracker**
  Shows `file_download` and `click` (outbound) event counts for the selected date range. Lists top file URLs and top outbound domains. Links to the filtered GA4 Events report. Requires enhanced measurement to be on — shows a setup warning if event counts are zero.

- [ ] **Site search term viewer**
  Shows top `search_term` values from the `view_search_results` or `search` event for the selected property and date range. Highlights high-frequency terms with no matching shortcut or page as potential content gaps. Links to the GA4 Events report filtered to the search event.

- [ ] **Traffic source breakdown card**
  Compact channel group summary (Organic Search, Direct, Referral, Paid Search, Organic Social, Email, Unassigned) with session counts and engagement rate per channel. Each row links to Traffic Acquisition filtered to that channel. Flags Unassigned traffic above a threshold as a UTM tagging issue.

- [ ] **Device and browser snapshot**
  Shows sessions split by device category (Desktop / Mobile / Tablet) with engagement rate per category. Second tab shows top browsers. Flags high IE/legacy browser share. Links to GA4 Tech reports. Useful before responsive design or compatibility decisions.

- [x] **New vs. returning user card**
  Pulls new user and returning user counts for the selected date range. Shows as a simple ratio card with a link to the GA4 Retention report.

- [ ] **"Answerable by GA4?" diagnostic**
  When a user asks a question or selects a category the extension can't fetch data for (e.g., page load speed, individual user identity, connection type), show a clear explanation of the limitation and point to the right tool (Search Console, Lighthouse, Hotjar). Modeled on the "Unanswerable by GA4" and "Partial" rows in the question reference.

- [ ] **Landing page quick view**
  Shows top landing pages for the selected date range with sessions, engagement rate, and bounce rate — without navigating to GA4. Row click opens the Landing Page report filtered to that path. Distinct from Pages and Screens (entry points only).

- [ ] **Conversion / key event by source**
  Shows conversion counts broken down by default channel group so users can immediately see which traffic source converts best. Links to Traffic Acquisition sorted by conversion rate.

- [ ] **Real-time active users badge and panel**
  Existing browser action badge idea — expand to show a small real-time panel: active users in last 30 min, top active pages, top active channels. Auto-refreshes on a slow interval (e.g., every 60s) to avoid quota issues. Panel displays a "launched something? watch live" prompt.

- [ ] **Trends & comparison quick picks**
  One-click date comparison presets beyond prior period: same week last year, same month last year, last 90 days vs prior 90. Applied to whatever report or metric card is active. Helps answer YoY and long-term trend questions without manually setting GA4 date pickers.

- [ ] **Campaign performance card**
  Shows sessions, engaged sessions, engagement rate, and conversions broken down by `sessionCampaign` for the selected date range. Surfaces cost and cost-per-session when a linked Google Ads account is available. Flags campaigns with sessions but no UTM medium/source as a likely tagging gap. Row click opens Traffic Acquisition filtered to that campaign.
  Real-world validation (Slack, 2026-07-01): a customer asked "is there a way to compare the number of appts scheduled from a campaign in GA4?" — i.e. a specific key event (appointment scheduled) broken down by `sessionCampaign` rather than total conversions. Card should let the user pick which key event to break down by campaign, not just show the aggregate conversions count, and should flag `(not set)` campaign values so users know UTM tagging is the likely cause of missing data.

- [ ] **Audience and demographics snapshot**
  Compact breakdown of country/region, age, gender, and language for the selected property and date range, pulled from `Reports > User > Demographics`. Notes when Google Signals is required and shows an "unknown" share where data is unavailable. Includes a VA-region view comparing engagement and conversions by region. Links to the matching GA4 Demographics report.

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
