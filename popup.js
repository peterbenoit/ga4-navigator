const GA4_API = "https://analyticsdata.googleapis.com/v1beta/properties/";

const FALLBACK_REPORT_PATHS = {
	EVENTS_REPORT_PATH: "/reports/explorer?params=_u..nav%3Dmaui&collectionId=business-objectives&ruid=events,business-objectives,examine-user-behavior&r=events",
	TRAFFIC_ACQUISITION_PATH: "/reports/dashboard?params=_u..nav%3Dmaui&collectionId=business-objectives&ruid=traffic-acquisition,business-objectives,acquire-new-users&r=traffic-acquisition",
	PAGES_SCREENS_PATH: "/reports/explorer?params=_u..nav%3Dmaui&collectionId=business-objectives&ruid=all-pages-and-screens,business-objectives,examine-user-behavior&r=all-pages-and-screens"
};
const REPORT_PATHS = typeof GA4AnalyticsUtils !== "undefined"
	? { ...FALLBACK_REPORT_PATHS, ...GA4AnalyticsUtils }
	: FALLBACK_REPORT_PATHS;

const REPORTS = [
	{
		section: "Quick Access",
		items: [
			{ icon: "🟢", title: "Realtime", desc: "Who's on your site right now", path: "/reports/realtime/overview?params=_u..nav%3Dmaui" },
			{ icon: "🏠", title: "Home", desc: "Your overview dashboard", path: "/reports/intelligenthome?params=_u..nav%3Dmaui&collectionId=business-objectives" },
			{ icon: "📋", title: "Reports Snapshot", desc: "Quick summary of everything", path: "/reports/reportinghub?params=_u..nav%3Dmaui&collectionId=business-objectives" }
		]
	},
	{
		section: "Audience",
		items: [
			{ icon: "👥", title: "WHO visited", desc: "Countries, cities, languages", path: "/reports/explorer?params=_u..nav%3Dmaui&collectionId=business-objectives&ruid=demographic-details,business-objectives,examine-user-behavior&r=demographic-details" },
			{ icon: "🗺️", title: "HOW they found you", desc: "Google, direct, social, referral", path: REPORT_PATHS.TRAFFIC_ACQUISITION_PATH },
			{ icon: "📄", title: "WHAT they looked at", desc: "Pages and screens visited", path: REPORT_PATHS.PAGES_SCREENS_PATH },
			{ icon: "⏱️", title: "Engagement", desc: "Session duration, bounce rate", path: REPORT_PATHS.PAGES_SCREENS_PATH }
		]
	}
];

const DATE_RANGES = [
	{ label: "7d", value: "last7days" },
	{ label: "28d", value: "last28days" },
	{ label: "90d", value: "last90days" }
];

const TOP_INSIGHT_TYPES = ["pages", "sources", "campaigns", "events"];
const LANDING_PAGES_PATH = REPORT_PATHS.PAGES_SCREENS_PATH;

let metricsRequestSequence = 0;
let healthRequestSequence = 0;
let landingRequestSequence = 0;
let trafficRequestSequence = 0;
let eventsRequestSequence = 0;
let selectedTopInsightType = "pages";
let propertySelectTimer = null;
let compareMode = false;
let activeMainTab = "dashboard";
let landingPagesStale = true;
let trafficSourceStale = true;
let topEventsStale = true;

// --- Storage ---

// Storage schema version. Increment when the shape of stored data changes.
// v1 — initial shape (localStorage era)
// v2 — migrated to chrome.storage.local; added ga4_shortcuts, ga4_recent_reports
//
// Property objects: { label: string, id: string }
//   id — the full GA4 route identifier copied from an analytics.google.com URL.
//        Format: "a{accountId}p{propertyId}" (e.g. "a111222333p444555666")
//        where accountId is the GA4 account ID and propertyId is the GA4
//        property ID. Properties added via a property-only URL omit the account
//        segment and are stored as "p{propertyId}" (e.g. "p444555666").
const SCHEMA_VERSION = 2;

const STORAGE_DEFAULTS = {
	ga4_schema_version: SCHEMA_VERSION,
	ga4_properties: [],
	ga4_selected: 0,
	ga4_date_range: "last28days",
	ga4_shortcuts: [],
	ga4_recent_reports: [],
	ga4_storage_migrated: false
};

const STORAGE_KEYS = Object.keys(STORAGE_DEFAULTS);
let storageState = { ...STORAGE_DEFAULTS };

function hasChromeStorage() {
	return typeof chrome !== "undefined" && chrome.storage?.local;
}

function parseLegacyJson(key, fallback) {
	try {
		return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
	} catch {
		return fallback;
	}
}

function getLegacyStorageState() {
	return {
		ga4_properties: parseLegacyJson("ga4_properties", []),
		ga4_selected: parseInt(localStorage.getItem("ga4_selected") || "0"),
		ga4_date_range: localStorage.getItem("ga4_date_range") || "last28days",
		ga4_shortcuts: parseLegacyJson("ga4_shortcuts", []),
		ga4_recent_reports: parseLegacyJson("ga4_recent_reports", [])
	};
}

function getChromeStorage(keys) {
	return new Promise(resolve => {
		chrome.storage.local.get(keys, result => resolve(result || {}));
	});
}

function setChromeStorage(values) {
	return new Promise(resolve => {
		chrome.storage.local.set(values, resolve);
	});
}

async function initStorage() {
	if (!hasChromeStorage()) {
		storageState = { ...STORAGE_DEFAULTS, ...getLegacyStorageState(), ga4_storage_migrated: true };
		return;
	}

	const stored = await getChromeStorage(STORAGE_KEYS);
	if (!stored.ga4_storage_migrated) {
		const legacy = getLegacyStorageState();
		storageState = { ...STORAGE_DEFAULTS, ...legacy, ...stored, ga4_storage_migrated: true };
		await setChromeStorage(storageState);
		return;
	}

	storageState = { ...STORAGE_DEFAULTS, ...stored };
}

async function saveStorageValue(key, value) {
	storageState[key] = value;
	if (hasChromeStorage()) {
		await setChromeStorage({ [key]: value });
		return;
	}
	// chrome.storage is unavailable (e.g. running outside the extension context).
	// In-memory storageState is already updated above; nothing is persisted.
}

function getProperties() { return storageState.ga4_properties; }
function saveProperties(p) { return saveStorageValue("ga4_properties", p); }
function getSelectedIndex() { return Number.parseInt(storageState.ga4_selected || "0"); }
function saveSelectedIndex(i) { return saveStorageValue("ga4_selected", i); }
function getDateRange() { return storageState.ga4_date_range || "last28days"; }
function saveDateRange(r) { return saveStorageValue("ga4_date_range", r); }
function getShortcuts() { return storageState.ga4_shortcuts; }
function saveShortcuts(s) { return saveStorageValue("ga4_shortcuts", s); }
function getRecentReports() { return storageState.ga4_recent_reports; }
function saveRecentReports(r) { return saveStorageValue("ga4_recent_reports", r); }

function buildHref(propertyId, path, dateRange) {
	return GA4ShortcutUtils.buildGa4Href(propertyId, path, dateRange);
}

function updateLinks(propertyId) {
	const range = getDateRange();
	document.querySelectorAll(".ga4-link").forEach(a => {
		a.href = buildHref(propertyId, a.dataset.path, range);
	});
	document.querySelectorAll(".shortcut-link").forEach(a => {
		a.href = buildHref(a.dataset.propertyId, a.dataset.path, range);
	});
}

// --- Render reports ---

function getPropertyLabel(propertyId) {
	const property = getProperties().find(p => p.id === propertyId);
	return property?.label || propertyId;
}

function formatOpenedAt(value) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleString([], {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit"
	});
}

function recordRecentReport(report) {
	const next = GA4ShortcutUtils.addRecentReport(getRecentReports(), {
		...report,
		openedAt: new Date().toISOString()
	});
	saveRecentReports(next);
	renderRecentReports();
}

function renderShortcuts() {
	const container = document.getElementById("shortcut-list");
	container.innerHTML = "";

	const shortcuts = getShortcuts();
	if (shortcuts.length === 0) {
		const label = document.createElement("div");
		label.className = "section-label with-action";
		label.innerHTML = `<span>Favorites</span>`;

		const addBtn = document.createElement("button");
		addBtn.className = "section-action";
		addBtn.type = "button";
		addBtn.textContent = "Add";
		addBtn.onclick = showManage;
		label.appendChild(addBtn);

		container.appendChild(label);
		return;
	}

	const label = document.createElement("div");
	label.className = "section-label with-action";
	label.innerHTML = `<span>Favorites</span>`;

	const manageBtn = document.createElement("button");
	manageBtn.className = "section-action";
	manageBtn.type = "button";
	manageBtn.textContent = "Manage";
	manageBtn.onclick = showManage;
	label.appendChild(manageBtn);
	container.appendChild(label);

	shortcuts.forEach(shortcut => {
		const a = document.createElement("a");
		a.className = "btn shortcut-link";
		a.dataset.propertyId = shortcut.propertyId;
		a.dataset.path = shortcut.path;
		a.href = buildHref(shortcut.propertyId, shortcut.path, getDateRange());
		a.target = "_blank";
		a.rel = "noopener noreferrer";
		a.onclick = () => {
			recordRecentReport({
				label: shortcut.label,
				propertyId: shortcut.propertyId,
				path: shortcut.path
			});
		};
		a.innerHTML = `
      <span class="btn-icon">⭐</span>
      <span class="btn-text">
        <span class="btn-title"></span>
        <span class="btn-desc"></span>
        <span class="shortcut-meta"></span>
      </span>`;
		a.querySelector(".btn-title").textContent = shortcut.label;
		a.querySelector(".btn-desc").textContent = getPropertyLabel(shortcut.propertyId);
		a.querySelector(".shortcut-meta").textContent = shortcut.path.replace(/^\//, "");
		container.appendChild(a);
	});
}

function renderRecentReports() {
	const container = document.getElementById("recent-list");
	container.innerHTML = "";

	const recents = getRecentReports();
	if (recents.length === 0) return;

	const label = document.createElement("div");
	label.className = "section-label with-action";
	label.innerHTML = `<span>Recent</span>`;

	const clearBtn = document.createElement("button");
	clearBtn.className = "section-action";
	clearBtn.type = "button";
	clearBtn.textContent = "Clear";
	clearBtn.onclick = () => {
		saveRecentReports([]);
		renderRecentReports();
	};
	label.appendChild(clearBtn);
	container.appendChild(label);

	recents.forEach(recent => {
		const a = document.createElement("a");
		a.className = "btn";
		a.href = buildHref(recent.propertyId, recent.path, getDateRange());
		a.target = "_blank";
		a.rel = "noopener noreferrer";
		a.onclick = () => {
			recordRecentReport({
				label: recent.label,
				propertyId: recent.propertyId,
				path: recent.path
			});
		};
		a.innerHTML = `
      <span class="btn-icon">↩</span>
      <span class="btn-text">
        <span class="btn-title"></span>
        <span class="btn-desc"></span>
        <span class="shortcut-meta"></span>
      </span>`;
		a.querySelector(".btn-title").textContent = recent.label;
		a.querySelector(".btn-desc").textContent = getPropertyLabel(recent.propertyId);
		a.querySelector(".shortcut-meta").textContent = formatOpenedAt(recent.openedAt);
		container.appendChild(a);
	});
}

function renderReports() {
	const container = document.getElementById("report-list");
	container.innerHTML = "";
	REPORTS.forEach(section => {
		const label = document.createElement("div");
		label.className = "section-label";
		label.textContent = section.section;
		container.appendChild(label);
		section.items.forEach(item => {
			const a = document.createElement("a");
			a.className = "btn ga4-link";
			a.dataset.path = item.path;
			a.href = "#";
			a.rel = "noopener noreferrer";
			a.onclick = (e) => {
				e.preventDefault();
				const props = getProperties();
				const property = props[getSelectedIndex()];
				if (!property) return;
				const url = buildHref(property.id, item.path, getDateRange());
				if (url && url !== "#") chrome.tabs.create({ url });
				recordRecentReport({
					label: item.title,
					propertyId: property.id,
					path: item.path
				});
			};
			a.innerHTML = `
        <span class="btn-icon">${item.icon}</span>
        <span class="btn-text">
          <span class="btn-title">${item.title}</span>
          <span class="btn-desc">${item.desc}</span>
        </span>`;
			container.appendChild(a);
		});
	});
}

// --- Date pills ---

function renderDatePills() {
	const container = document.getElementById("date-pills");
	container.innerHTML = "";
	const current = getDateRange();

	DATE_RANGES.forEach(({ label, value }) => {
		const btn = document.createElement("button");
		btn.className = "date-pill" + (value === current ? " active" : "");
		btn.type = "button";
		btn.setAttribute("aria-pressed", value === current ? "true" : "false");
		btn.textContent = label;
		btn.onclick = () => {
			saveDateRange(value);
			const props = getProperties();
			updateLinks(props[getSelectedIndex()]?.id || "");
			renderShortcuts();
			renderRecentReports();
			fetchMetrics(props[getSelectedIndex()]?.id || "");
			landingPagesStale = true;
			trafficSourceStale = true;
			topEventsStale = true;
			if (activeMainTab === "analysis") {
				loadLandingPages(props[getSelectedIndex()]?.id || "");
				loadTrafficSources(props[getSelectedIndex()]?.id || "");
				loadTopEvents(props[getSelectedIndex()]?.id || "");
			}
			renderDatePills();
		};
		container.appendChild(btn);
	});

	const compareBtn = document.createElement("button");
	compareBtn.className = "date-pill compare-toggle" + (compareMode ? " active" : "");
	compareBtn.type = "button";
	compareBtn.setAttribute("aria-pressed", compareMode ? "true" : "false");
	compareBtn.title = "Compare to previous period";
	compareBtn.textContent = "vs prev";
	compareBtn.onclick = () => {
		compareMode = !compareMode;
		renderDatePills();
		const props = getProperties();
		fetchMetrics(props[getSelectedIndex()]?.id || "");
	};
	container.appendChild(compareBtn);
}

// --- GA4 Data API metrics ---

function getNumericId(id) {
	const m = id.match(/p(\d+)$/);
	return m ? m[1] : null;
}

async function fetchMetrics(propertyId) {
	const requestId = ++metricsRequestSequence;
	const el = document.getElementById("metrics-bar");
	clearDashboard();
	clearTopInsights();
	if (!propertyId) { el.textContent = ""; return; }

	if (typeof navigator !== "undefined" && !navigator.onLine) {
		el.innerHTML = `<span class="metric-hint">No connection</span>`;
		return;
	}

	const numericId = getNumericId(propertyId);
	if (!numericId) return;

	el.innerHTML = `<span class="metric-hint">Loading...</span>`;

	// chrome.identity only works in a real extension context
	if (typeof chrome === "undefined" || !chrome.identity) {
		el.innerHTML = `<span class="metric-hint">Metrics: load as extension</span>`;
		return;
	}

	const getToken = (interactive) => new Promise((resolve, reject) => {
		chrome.identity.getAuthToken({ interactive }, token => {
			if (chrome.runtime.lastError || !token) reject(chrome.runtime.lastError);
			else resolve(token);
		});
	});

	const removeCachedToken = (cachedToken) => new Promise(resolve => {
		if (!chrome.identity.removeCachedAuthToken) {
			resolve();
			return;
		}

		chrome.identity.removeCachedAuthToken({ token: cachedToken }, resolve);
	});

	let token;
	try {
		token = await getToken(false);
	} catch {
		if (!isCurrentMetricsRequest(requestId)) return;

		el.innerHTML = `<button class="metric-connect" id="btn-connect" type="button">Connect Google →</button>`;
		document.getElementById("btn-connect")?.addEventListener("click", async () => {
			let interactiveToken;
			try {
				interactiveToken = await getToken(true);
			} catch {
				el.innerHTML = `<span class="metric-hint">Auth failed</span>`;
				return;
			}

			try {
				if (!isCurrentMetricsRequest(requestId)) return;
				await loadMetrics(el, numericId, interactiveToken, getDateRange(), requestId);
				await loadTopInsights(numericId, propertyId, interactiveToken, getDateRange(), requestId);
			} catch (err) {
				if (!isCurrentMetricsRequest(requestId)) return;
				clearDashboard();
				el.innerHTML = `<span class="metric-hint">${getMetricsFailureMessage(err)}</span>`;
			}
		});
		return;
	}

	try {
		await loadMetrics(el, numericId, token, getDateRange(), requestId);
		await loadTopInsights(numericId, propertyId, token, getDateRange(), requestId);
	} catch (err) {
		if (!isCurrentMetricsRequest(requestId)) return;

		if (isAuthApiError(err)) {
			await removeCachedToken(token);

			try {
				const interactiveToken = await getToken(true);
				if (!isCurrentMetricsRequest(requestId)) return;
				await loadMetrics(el, numericId, interactiveToken, getDateRange(), requestId);
				await loadTopInsights(numericId, propertyId, interactiveToken, getDateRange(), requestId);
				return;
			} catch (retryErr) {
				if (!isCurrentMetricsRequest(requestId)) return;
				clearDashboard();
				el.innerHTML = `<span class="metric-hint">${getMetricsFailureMessage(retryErr)}</span>`;
				return;
			}
		}

		clearDashboard();
		el.innerHTML = `<span class="metric-hint">${getMetricsFailureMessage(err)}</span>`;
	}
}

function isCurrentMetricsRequest(requestId) {
	return requestId === metricsRequestSequence;
}

function isAuthApiError(err) {
	return err?.status === 401 || err?.status === 403;
}

function getMetricsFailureMessage(err) {
	if (err?.status === 429) return "Rate limit reached. Try again in a moment.";
	if (err?.status === 401) return "Auth expired. Connect Google again.";
	if (err?.status === 403) return "Analytics permission denied.";
	if (err?.source === "realtime") return "Realtime metrics unavailable.";
	if (err?.source === "report") return "Report metrics unavailable.";
	return "Metrics unavailable.";
}

function clearDashboard() {
	document.getElementById("dashboard-grid").innerHTML = "";
}

function clearTopInsights() {
	document.getElementById("insight-tabs").innerHTML = "";
	document.getElementById("insight-list").innerHTML = "";
	document.getElementById("insight-status").textContent = "";
}

function formatDelta(delta) {
	if (!delta || delta.state === "unavailable") return null;
	if (delta.state === "unchanged") return { text: "—", dir: "flat" };
	if (delta.state === "new") return { text: "New", dir: "up" };
	const pct = delta.percent !== null
		? `${delta.percent > 0 ? "+" : ""}${delta.percent}%`
		: `${delta.absolute > 0 ? "+" : ""}${delta.absolute}`;
	return { text: pct, dir: delta.absolute > 0 ? "up" : "down" };
}

function renderDashboard(metrics) {
	const grid = document.getElementById("dashboard-grid");
	grid.innerHTML = "";
	metrics.forEach(metric => {
		const card = document.createElement("div");
		card.className = "metric-card";
		card.innerHTML = `
      <span class="metric-card-value"></span>
      <span class="metric-card-label"></span>`;
		card.querySelector(".metric-card-value").textContent = metric.value;
		card.querySelector(".metric-card-label").textContent = metric.label;

		const d = metric.delta ? formatDelta(metric.delta) : null;
		if (d) {
			const badge = document.createElement("span");
			badge.className = `metric-card-delta metric-card-delta-${d.dir}`;
			badge.textContent = d.text;
			card.appendChild(badge);
		}

		grid.appendChild(card);
	});

	resetAiDigest(metrics);
}

// --- AI Digest ---

let lastDigestMetrics = null;

function resetAiDigest(metrics) {
	lastDigestMetrics = metrics;
	const output = document.getElementById("ai-digest-output");
	if (output) output.textContent = "";
}

function buildDigestPrompt(metrics, propertyLabel, dateRange) {
	const DATE_LABELS = {
		last7days: "the last 7 days",
		last28days: "the last 28 days",
		last90days: "the last 90 days"
	};
	const period = DATE_LABELS[dateRange] || dateRange;

	const lines = metrics
		.filter(m => m.label !== "Live")
		.map(m => {
			let line = `${m.label}: ${m.value}`;
			if (m.delta && m.delta.state !== "unavailable") {
				if (m.delta.state === "unchanged") {
					line += " (unchanged vs prior period)";
				} else if (m.delta.state === "new") {
					line += " (new activity, no prior period data)";
				} else if (m.delta.percent !== null) {
					const dir = m.delta.absolute > 0 ? "up" : "down";
					line += ` (${dir} ${Math.abs(m.delta.percent)}% vs prior period)`;
				}
			}
			return line;
		});

	const live = metrics.find(m => m.label === "Live");
	if (live) lines.push(`Live users right now: ${live.value}`);

	return `You are a concise analytics assistant. A user is reviewing GA4 metrics for "${propertyLabel}" over ${period}.

Here are the current metrics:
${lines.join("\n")}

Write 2-3 plain English sentences summarizing what these numbers mean. Focus on the most notable changes or patterns. Be direct and specific. Do not use bullet points or headers.`;
}

let digestAbortController = null;

async function generateAiDigest() {
	const output = document.getElementById("ai-digest-output");
	const btn = document.getElementById("btn-ai-digest");
	if (!output || !btn) return;

	// If already running, cancel it
	if (digestAbortController) {
		digestAbortController.abort();
		digestAbortController = null;
		btn.textContent = "Summarize";
		output.className = "ai-digest-output error";
		output.textContent = "Cancelled.";
		return;
	}

	if (!lastDigestMetrics) return;

	const props = getProperties();
	const idx = getSelectedIndex();
	const propertyLabel = props[idx]?.label || "this property";
	const dateRange = getDateRange();

	digestAbortController = new AbortController();
	btn.textContent = "Cancel";
	output.className = "ai-digest-output loading";
	output.textContent = "Generating summary…";

	try {
		const langOptions = { expectedInputLanguages: ["en"], expectedOutputLanguages: ["en"] };
		const availability = await LanguageModel.availability(langOptions);
		if (availability === "unavailable") {
			output.className = "ai-digest-output error";
			output.textContent = "Chrome's built-in AI is not available on this device. It requires Chrome 138+, 22 GB free storage, and either a capable GPU or 16 GB RAM.";
			return;
		}

		if (availability === "downloadable" || availability === "downloading") {
			output.textContent = "Downloading AI model… this may take a moment. Click Cancel to stop.";
		}

		const session = await LanguageModel.create({
			signal: digestAbortController.signal,
			expectedInputLanguages: ["en"],
			expectedOutputLanguages: ["en"],
			monitor(m) {
				m.addEventListener("downloadprogress", e => {
					const pct = Math.round(e.loaded * 100);
					output.textContent = `Downloading AI model: ${pct}%${pct < 100 ? " — Click Cancel to stop." : ""}`;
				});
			}
		});

		const prompt = buildDigestPrompt(lastDigestMetrics, propertyLabel, dateRange);
		output.textContent = "";
		output.className = "ai-digest-output";

		const stream = session.promptStreaming(prompt, { signal: digestAbortController.signal });
		for await (const chunk of stream) {
			output.textContent += chunk;
		}

		session.destroy();
	} catch (err) {
		if (err.name === "AbortError") return;
		output.className = "ai-digest-output error";
		const isDownloadStall = err.message?.toLowerCase().includes("download");
		output.textContent = isDownloadStall
			? "Model download stalled. Try again — Chrome will resume from where it left off. If it keeps stalling, check chrome://components and look for 'Optimization Guide On Device Model'."
			: "Could not generate summary: " + (err.message || "unknown error");
	} finally {
		digestAbortController = null;
		btn.textContent = "Summarize";
	}
}

async function initAiDigest() {
	if (!("LanguageModel" in self)) return;

	const section = document.getElementById("ai-digest");
	if (section) section.hidden = false;

	const btn = document.getElementById("btn-ai-digest");
	if (btn) btn.addEventListener("click", generateAiDigest);
}

async function loadMetrics(el, numericId, token, dateRange, requestId) {
	const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
	const compRanges = compareMode ? GA4AnalyticsUtils.getComparisonDateRanges(dateRange) : null;

	const fetches = [
		fetch(`${GA4_API}${numericId}:runReport`, {
			method: "POST",
			headers,
			body: JSON.stringify(GA4AnalyticsUtils.buildOverviewRequest(dateRange))
		}),
		fetch(`${GA4_API}${numericId}:runRealtimeReport`, {
			method: "POST",
			headers,
			body: JSON.stringify(GA4AnalyticsUtils.buildRealtimeRequest())
		})
	];

	if (compRanges) {
		fetches.push(fetch(`${GA4_API}${numericId}:runReport`, {
			method: "POST",
			headers,
			body: JSON.stringify(GA4AnalyticsUtils.buildOverviewRequest(dateRange, compRanges[1]))
		}));
	}

	const [reportRes, realtimeRes, prevReportRes] = await Promise.all(fetches);

	const report = await reportRes.json();
	const realtime = await realtimeRes.json();
	const previous = prevReportRes ? await prevReportRes.json() : null;

	if (!reportRes.ok) {
		const err = new Error(report.error?.message || "Report API error");
		err.status = reportRes.status;
		err.source = "report";
		throw err;
	}

	if (!realtimeRes.ok) {
		const err = new Error(realtime.error?.message || "Realtime API error");
		err.status = realtimeRes.status;
		err.source = "realtime";
		throw err;
	}

	if (!isCurrentMetricsRequest(requestId)) return;

	const prevReport = (previous && prevReportRes.ok) ? previous : null;
	renderDashboard(GA4AnalyticsUtils.buildDashboardMetrics(report, realtime, prevReport));
	el.innerHTML = `<span class="metric-hint">Updated just now</span>`;
}

function renderTopInsightTabs() {
	const tabs = document.getElementById("insight-tabs");
	tabs.innerHTML = "";

	TOP_INSIGHT_TYPES.forEach(type => {
		const config = GA4AnalyticsUtils.getTopInsightConfig(type);
		const btn = document.createElement("button");
		btn.className = "insight-tab" + (type === selectedTopInsightType ? " active" : "");
		btn.type = "button";
		btn.setAttribute("aria-pressed", type === selectedTopInsightType ? "true" : "false");
		btn.textContent = config.label;
		btn.onclick = () => {
			selectedTopInsightType = type;
			const property = getProperties()[getSelectedIndex()];
			if (property) fetchMetrics(property.id);
			else clearTopInsights();
		};
		tabs.appendChild(btn);
	});
}

function setTopInsightsStatus(message) {
	document.getElementById("insight-status").textContent = message;
}

function renderTopInsightRows(rows, propertyId, config) {
	const list = document.getElementById("insight-list");
	list.innerHTML = "";

	if (rows.length === 0) {
		setTopInsightsStatus(`No ${config.label.toLowerCase()} found for this date range.`);
		return;
	}

	setTopInsightsStatus("");
	rows.forEach(row => {
		const a = document.createElement("a");
		a.className = "insight-row";
		a.href = buildHref(propertyId, config.path, getDateRange());
		a.target = "_blank";
		a.rel = "noopener noreferrer";
		a.onclick = () => {
			recordRecentReport({
				label: config.label,
				propertyId,
				path: config.path
			});
		};

		const title = document.createElement("span");
		title.className = "insight-row-title";
		title.textContent = row.label;

		const meta = document.createElement("span");
		meta.className = "insight-row-meta";
		meta.textContent = row.meta;

		const value = document.createElement("span");
		value.className = "insight-row-value";
		value.textContent = row.value;

		const metric = document.createElement("span");
		metric.className = "insight-row-metric";
		metric.textContent = row.metricLabel;

		a.appendChild(title);
		a.appendChild(meta);
		a.appendChild(value);
		a.appendChild(metric);
		list.appendChild(a);
	});
}

async function loadTopInsights(numericId, propertyId, token, dateRange, requestId) {
	if (!isCurrentMetricsRequest(requestId)) return;

	renderTopInsightTabs();
	setTopInsightsStatus("Loading insights...");

	const config = GA4AnalyticsUtils.getTopInsightConfig(selectedTopInsightType);

	try {
		const res = await fetch(`${GA4_API}${numericId}:runReport`, {
			method: "POST",
			headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
			body: JSON.stringify(GA4AnalyticsUtils.buildTopInsightRequest(selectedTopInsightType, dateRange))
		});
		const report = await res.json();

		if (!res.ok) {
			throw new Error(report.error?.message || "Insight API error");
		}

		if (!isCurrentMetricsRequest(requestId)) return;
		renderTopInsightRows(GA4AnalyticsUtils.buildTopInsightRows(report, config), propertyId, config);
	} catch {
		if (!isCurrentMetricsRequest(requestId)) return;
		document.getElementById("insight-list").innerHTML = "";
		setTopInsightsStatus("Top insights unavailable.");
	}
}

// --- Traffic source breakdown ---

function renderTrafficSourceRows(rows, propertyId) {
	const body = document.getElementById("traffic-source-body");
	body.innerHTML = "";

	rows.forEach(row => {
		const tr = document.createElement("tr");
		if (row.flagUnassigned) tr.classList.add("traffic-row-warning");

		const channelCell = document.createElement("td");
		const link = document.createElement("a");
		link.href = buildHref(propertyId, row.path, getDateRange());
		link.target = "_blank";
		link.rel = "noopener noreferrer";
		link.textContent = row.channel;
		if (row.flagUnassigned) {
			const flag = document.createElement("span");
			flag.className = "traffic-flag";
			flag.title = "High Unassigned traffic may indicate missing UTM parameters";
			flag.textContent = "⚠";
			link.appendChild(flag);
		}
		link.setAttribute("aria-label", `Open GA4 traffic report for ${row.channel}`);
		link.onclick = () => recordRecentReport({
			label: `Traffic: ${row.channel}`,
			propertyId,
			path: row.path
		});
		channelCell.appendChild(link);
		tr.appendChild(channelCell);

		[row.sessions, `${row.share}%`, row.engagementRate].forEach(value => {
			const cell = document.createElement("td");
			cell.textContent = value;
			tr.appendChild(cell);
		});

		body.appendChild(tr);
	});
}

async function fetchTrafficSourceReport(numericId, token, dateRange) {
	const response = await fetch(`${GA4_API}${numericId}:runReport`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
		body: JSON.stringify(GA4AnalyticsUtils.buildTrafficSourceRequest(dateRange))
	});
	const body = await response.json();
	if (!response.ok) {
		const error = new Error(body.error?.message || "Traffic source API error");
		error.status = response.status;
		throw error;
	}
	return body;
}

function showTrafficConnect(propertyId, requestId) {
	const status = document.getElementById("traffic-source-status");
	status.innerHTML = "";
	const button = document.createElement("button");
	button.className = "metric-connect";
	button.type = "button";
	button.textContent = "Connect Google →";
	button.addEventListener("click", () => {
		if (requestId === trafficRequestSequence) loadTrafficSources(propertyId, true);
	});
	status.appendChild(button);
}

async function loadTrafficSources(propertyId, interactive = false) {
	const requestId = ++trafficRequestSequence;
	const status = document.getElementById("traffic-source-status");
	const body = document.getElementById("traffic-source-body");
	body.innerHTML = "";

	const numericId = getNumericId(propertyId || "");
	if (!numericId) {
		status.textContent = "Add or select a property to view traffic sources.";
		return;
	}
	if (typeof navigator !== "undefined" && !navigator.onLine) {
		status.textContent = "No connection. Check your network.";
		return;
	}
	if (typeof chrome === "undefined" || !chrome.identity) {
		status.textContent = "Traffic source breakdown requires the installed extension.";
		return;
	}

	status.textContent = "Loading traffic sources...";

	let token;
	try {
		token = await getIdentityToken(interactive);
	} catch {
		if (requestId !== trafficRequestSequence) return;
		if (!interactive) showTrafficConnect(propertyId, requestId);
		else status.textContent = "Google authentication failed.";
		return;
	}

	try {
		let report;
		try {
			report = await fetchTrafficSourceReport(numericId, token, getDateRange());
		} catch (error) {
			if (!isAuthApiError(error)) throw error;
			await removeIdentityToken(token);
			token = await getIdentityToken(true);
			report = await fetchTrafficSourceReport(numericId, token, getDateRange());
		}

		if (requestId !== trafficRequestSequence) return;
		const rows = GA4AnalyticsUtils.buildTrafficSourceRows(report);
		renderTrafficSourceRows(rows, propertyId);
		status.textContent = rows.length
			? `${rows.length} channel${rows.length === 1 ? "" : "s"} · click any row to open in GA4`
			: "No traffic sources found for this date range.";
		trafficSourceStale = false;
	} catch (error) {
		if (requestId !== trafficRequestSequence) return;
		if (error?.status === 429) status.textContent = "Rate limit reached. Try again in a moment.";
		else if (error?.status === 403) status.textContent = "Analytics permission denied.";
		else if (error?.status === 401) status.textContent = "Google authentication expired.";
		else status.textContent = "Traffic source breakdown unavailable.";
	}
}

// --- Top events ---

function renderTopEventRows(rows, hasEnhancedEvent, propertyId) {
	const body = document.getElementById("top-events-body");
	const notice = document.getElementById("top-events-notice");
	body.innerHTML = "";

	if (!hasEnhancedEvent) {
		notice.textContent = "No enhanced measurement events detected (scroll, file_download, click, etc.). Check GA4 Admin → Data Streams → Enhanced Measurement.";
		notice.hidden = false;
	} else {
		notice.hidden = true;
	}

	rows.forEach(row => {
		const tr = document.createElement("tr");
		if (row.isEnhanced) tr.classList.add("event-row-enhanced");

		const nameCell = document.createElement("td");
		const link = document.createElement("a");
		link.href = buildHref(propertyId, row.path, getDateRange());
		link.target = "_blank";
		link.rel = "noopener noreferrer";
		link.textContent = row.name;
		if (row.isEnhanced) {
			const badge = document.createElement("span");
			badge.className = "event-enhanced-badge";
			badge.title = "Auto-collected by GA4 enhanced measurement";
			badge.textContent = "auto";
			link.appendChild(badge);
		}
		link.setAttribute("aria-label", `Open GA4 events report for ${row.name}`);
		link.onclick = () => recordRecentReport({
			label: `Event: ${row.name}`,
			propertyId,
			path: row.path
		});
		nameCell.appendChild(link);
		tr.appendChild(nameCell);

		[row.count, row.users].forEach(value => {
			const cell = document.createElement("td");
			cell.textContent = value;
			tr.appendChild(cell);
		});

		body.appendChild(tr);
	});
}

async function fetchTopEventsReport(numericId, token, dateRange) {
	const response = await fetch(`${GA4_API}${numericId}:runReport`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
		body: JSON.stringify(GA4AnalyticsUtils.buildTopEventsRequest(dateRange))
	});
	const body = await response.json();
	if (!response.ok) {
		const error = new Error(body.error?.message || "Events API error");
		error.status = response.status;
		throw error;
	}
	return body;
}

function showEventsConnect(propertyId, requestId) {
	const status = document.getElementById("top-events-status");
	status.innerHTML = "";
	const button = document.createElement("button");
	button.className = "metric-connect";
	button.type = "button";
	button.textContent = "Connect Google →";
	button.addEventListener("click", () => {
		if (requestId === eventsRequestSequence) loadTopEvents(propertyId, true);
	});
	status.appendChild(button);
}

async function loadTopEvents(propertyId, interactive = false) {
	const requestId = ++eventsRequestSequence;
	const status = document.getElementById("top-events-status");
	const body = document.getElementById("top-events-body");
	const notice = document.getElementById("top-events-notice");
	body.innerHTML = "";
	notice.hidden = true;

	const numericId = getNumericId(propertyId || "");
	if (!numericId) {
		status.textContent = "Add or select a property to view top events.";
		return;
	}
	if (typeof navigator !== "undefined" && !navigator.onLine) {
		status.textContent = "No connection. Check your network.";
		return;
	}
	if (typeof chrome === "undefined" || !chrome.identity) {
		status.textContent = "Top events requires the installed extension.";
		return;
	}

	status.textContent = "Loading events...";

	let token;
	try {
		token = await getIdentityToken(interactive);
	} catch {
		if (requestId !== eventsRequestSequence) return;
		if (!interactive) showEventsConnect(propertyId, requestId);
		else status.textContent = "Google authentication failed.";
		return;
	}

	try {
		let report;
		try {
			report = await fetchTopEventsReport(numericId, token, getDateRange());
		} catch (error) {
			if (!isAuthApiError(error)) throw error;
			await removeIdentityToken(token);
			token = await getIdentityToken(true);
			report = await fetchTopEventsReport(numericId, token, getDateRange());
		}

		if (requestId !== eventsRequestSequence) return;
		const { rows, hasEnhancedEvent } = GA4AnalyticsUtils.buildTopEventRows(report);
		renderTopEventRows(rows, hasEnhancedEvent, propertyId);
		status.textContent = rows.length
			? `Top ${rows.length} events · click any row to open in GA4`
			: "No events found for this date range.";
		topEventsStale = false;
	} catch (error) {
		if (requestId !== eventsRequestSequence) return;
		if (error?.status === 429) status.textContent = "Rate limit reached. Try again in a moment.";
		else if (error?.status === 403) status.textContent = "Analytics permission denied.";
		else if (error?.status === 401) status.textContent = "Google authentication expired.";
		else status.textContent = "Top events unavailable.";
	}
}

// --- Landing page analysis ---

function renderLandingPageRows(rows, propertyId) {
	const body = document.getElementById("landing-pages-body");
	body.innerHTML = "";

	rows.forEach(row => {
		const tr = document.createElement("tr");
		const pathCell = document.createElement("td");
		const link = document.createElement("a");
		link.href = buildHref(propertyId, LANDING_PAGES_PATH, getDateRange());
		link.target = "_blank";
		link.rel = "noopener noreferrer";
		link.textContent = row.path;
		link.setAttribute("aria-label", `Open GA4 landing page report for ${row.path}`);
		link.onclick = () => recordRecentReport({
			label: `Landing page: ${row.path}`,
			propertyId,
			path: LANDING_PAGES_PATH
		});
		pathCell.appendChild(link);
		tr.appendChild(pathCell);

		[row.sessions, row.engagementRate, row.bounceRate].forEach(value => {
			const cell = document.createElement("td");
			cell.textContent = value;
			tr.appendChild(cell);
		});

		body.appendChild(tr);
	});
}

async function fetchLandingPageReport(numericId, token, dateRange) {
	const response = await fetch(`${GA4_API}${numericId}:runReport`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
		body: JSON.stringify(GA4AnalyticsUtils.buildLandingPagesRequest(dateRange))
	});
	const body = await response.json();
	if (!response.ok) {
		const error = new Error(body.error?.message || "Landing page API error");
		error.status = response.status;
		throw error;
	}
	return body;
}

function showLandingConnect(propertyId, requestId) {
	const status = document.getElementById("landing-pages-status");
	status.innerHTML = "";
	const button = document.createElement("button");
	button.className = "metric-connect";
	button.type = "button";
	button.textContent = "Connect Google →";
	button.addEventListener("click", () => {
		if (requestId === landingRequestSequence) loadLandingPages(propertyId, true);
	});
	status.appendChild(button);
}

async function loadLandingPages(propertyId, interactive = false) {
	const requestId = ++landingRequestSequence;
	const status = document.getElementById("landing-pages-status");
	const body = document.getElementById("landing-pages-body");
	body.innerHTML = "";

	const numericId = getNumericId(propertyId || "");
	if (!numericId) {
		status.textContent = "Add or select a property to view landing pages.";
		return;
	}
	if (typeof navigator !== "undefined" && !navigator.onLine) {
		status.textContent = "No connection. Check your network.";
		return;
	}
	if (typeof chrome === "undefined" || !chrome.identity) {
		status.textContent = "Landing page analysis requires the installed extension.";
		return;
	}

	status.textContent = "Loading landing pages...";

	let token;
	try {
		token = await getIdentityToken(interactive);
	} catch {
		if (requestId !== landingRequestSequence) return;
		if (!interactive) showLandingConnect(propertyId, requestId);
		else status.textContent = "Google authentication failed.";
		return;
	}

	try {
		let report;
		try {
			report = await fetchLandingPageReport(numericId, token, getDateRange());
		} catch (error) {
			if (!isAuthApiError(error)) throw error;
			await removeIdentityToken(token);
			token = await getIdentityToken(true);
			report = await fetchLandingPageReport(numericId, token, getDateRange());
		}

		if (requestId !== landingRequestSequence) return;
		const rows = GA4AnalyticsUtils.buildLandingPageRows(report);
		renderLandingPageRows(rows, propertyId);
		status.textContent = rows.length
			? `Showing ${rows.length} landing page${rows.length === 1 ? "" : "s"}`
			: "No landing pages found for this date range.";
		landingPagesStale = false;
	} catch (error) {
		if (requestId !== landingRequestSequence) return;
		if (error?.status === 429) status.textContent = "Rate limit reached. Try again in a moment.";
		else if (error?.status === 403) status.textContent = "Analytics permission denied.";
		else if (error?.status === 401) status.textContent = "Google authentication expired.";
		else status.textContent = "Landing page analysis unavailable.";
	}
}

// --- GA4 health check ---

function clearHealthCheck() {
	healthRequestSequence += 1;
	document.getElementById("health-status").textContent = "";
	document.getElementById("health-results").innerHTML = "";
	const button = document.getElementById("btn-health-run");
	button.disabled = false;
	button.textContent = "Run Check";
}

function renderHealthFindings(findings, propertyId) {
	const container = document.getElementById("health-results");
	container.innerHTML = "";

	findings.forEach(finding => {
		const link = document.createElement("a");
		link.className = `health-finding health-finding-${finding.severity}`;
		link.href = buildHref(propertyId, finding.path, getDateRange());
		link.target = "_blank";
		link.rel = "noopener noreferrer";
		link.onclick = () => recordRecentReport({
			label: finding.title,
			propertyId,
			path: finding.path
		});

		const severity = document.createElement("span");
		severity.className = "health-severity";
		severity.textContent = finding.severity;

		const copy = document.createElement("span");
		copy.className = "health-copy";
		const title = document.createElement("span");
		title.className = "health-title";
		title.textContent = finding.title;
		const detail = document.createElement("span");
		detail.className = "health-detail";
		detail.textContent = finding.detail;
		copy.appendChild(title);
		copy.appendChild(detail);

		link.appendChild(severity);
		link.appendChild(copy);
		container.appendChild(link);
	});
}

function getIdentityToken(interactive) {
	return new Promise((resolve, reject) => {
		chrome.identity.getAuthToken({ interactive }, token => {
			if (chrome.runtime.lastError || !token) reject(chrome.runtime.lastError || new Error("Auth failed"));
			else resolve(token);
		});
	});
}

function removeIdentityToken(token) {
	return new Promise(resolve => {
		if (!chrome.identity.removeCachedAuthToken) return resolve();
		chrome.identity.removeCachedAuthToken({ token }, resolve);
	});
}

async function loadHealthReports(numericId, token) {
	const response = await fetch(`${GA4_API}${numericId}:batchRunReports`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
		body: JSON.stringify(GA4AnalyticsUtils.buildHealthCheckRequest())
	});
	const body = await response.json();
	if (!response.ok) {
		const error = new Error(body.error?.message || "Health check API error");
		error.status = response.status;
		throw error;
	}
	return body.reports || [];
}

async function runHealthCheck(propertyId) {
	const requestId = ++healthRequestSequence;
	const numericId = getNumericId(propertyId);
	const status = document.getElementById("health-status");
	const results = document.getElementById("health-results");
	const button = document.getElementById("btn-health-run");

	results.innerHTML = "";
	if (!numericId) {
		status.textContent = "Select a valid property first.";
		return;
	}
	if (typeof navigator !== "undefined" && !navigator.onLine) {
		status.textContent = "No connection. Check your network.";
		button.disabled = false;
		button.textContent = "Run Check";
		return;
	}
	if (typeof chrome === "undefined" || !chrome.identity) {
		status.textContent = "Health check requires the installed extension.";
		return;
	}

	button.disabled = true;
	button.textContent = "Running...";
	status.textContent = "Checking collection and traffic...";

	try {
		let token;
		try {
			token = await getIdentityToken(false);
		} catch {
			token = await getIdentityToken(true);
		}

		let reports;
		try {
			reports = await loadHealthReports(numericId, token);
		} catch (error) {
			if (!isAuthApiError(error)) throw error;
			await removeIdentityToken(token);
			token = await getIdentityToken(true);
			reports = await loadHealthReports(numericId, token);
		}

		if (requestId !== healthRequestSequence) return;
		const findings = GA4AnalyticsUtils.buildHealthFindings(reports);
		renderHealthFindings(findings, propertyId);
		status.textContent = `${findings.length} checks complete`;
	} catch (error) {
		if (requestId !== healthRequestSequence) return;
		if (error?.status === 429) status.textContent = "Rate limit reached. Try again in a moment.";
		else if (error?.status === 403) status.textContent = "Analytics permission denied.";
		else if (error?.status === 401) status.textContent = "Google authentication expired.";
		else status.textContent = "Health check unavailable.";
	} finally {
		if (requestId === healthRequestSequence) {
			button.disabled = false;
			button.textContent = "Run Again";
		}
	}
}

// --- Views ---

function showView(name) {
	["main-view", "add-view", "manage-view"].forEach(id => {
		document.getElementById(id).style.display = id === name ? "block" : "none";
	});
}

function setMainEmptyState(isEmpty) {
	document.querySelector(".controls-row").style.display = isEmpty ? "none" : "flex";
	document.getElementById("dashboard-grid").style.display = isEmpty ? "none" : "grid";
	document.getElementById("top-insights").style.display = isEmpty ? "none" : "block";
	document.getElementById("health-check").style.display = isEmpty ? "none" : "block";
	document.getElementById("shortcut-list").style.display = isEmpty ? "none" : "block";
	document.getElementById("recent-list").style.display = isEmpty ? "none" : "block";
	document.getElementById("report-list").style.display = isEmpty ? "none" : "block";
	document.getElementById("empty-state").style.display = isEmpty ? "block" : "none";
}

function showMain() {
	showView("main-view");
	const properties = getProperties();
	let idx = getSelectedIndex();
	if (idx >= properties.length) idx = 0;

	const select = document.getElementById("propertySelect");
	select.innerHTML = "";

	if (properties.length === 0) {
		select.appendChild(Object.assign(document.createElement("option"), { textContent: "No properties — add one" }));
		setMainEmptyState(true);
		updateLinks("");
		document.getElementById("metrics-bar").textContent = "";
		clearDashboard();
		clearHealthCheck();
		landingPagesStale = true;
		if (activeMainTab === "analysis") loadLandingPages("");
	} else {
		setMainEmptyState(false);
		properties.forEach((p, i) => {
			const opt = document.createElement("option");
			opt.value = i;
			opt.textContent = p.label;
			if (i === idx) opt.selected = true;
			select.appendChild(opt);
		});
		renderShortcuts();
		renderRecentReports();
		updateLinks(properties[idx]?.id || "");
		clearHealthCheck();
		fetchMetrics(properties[idx]?.id || "");
		if (activeMainTab === "analysis" && landingPagesStale) {
			loadLandingPages(properties[idx]?.id || "");
		}

		select.onchange = () => {
			const i = parseInt(select.value);
			saveSelectedIndex(i);
			updateLinks(properties[i]?.id || "");
			clearHealthCheck();
			landingPagesStale = true;
			trafficSourceStale = true;
			topEventsStale = true;
			clearTimeout(propertySelectTimer);
			propertySelectTimer = setTimeout(() => {
				fetchMetrics(properties[i]?.id || "");
				if (activeMainTab === "analysis") {
					loadLandingPages(properties[i]?.id || "");
					loadTrafficSources(properties[i]?.id || "");
					loadTopEvents(properties[i]?.id || "");
				}
			}, 150);
		};
	}

	renderDatePills();
}

function showAdd() {
	showView("add-view");
	document.getElementById("prop-name").value = "";
	document.getElementById("prop-id").value = "";
	document.getElementById("add-error").textContent = "";
}

function showManage() {
	showView("manage-view");
	renderManageList();
	renderShortcutManageList();
}

// --- Manage list ---

function renderManageList() {
	const properties = getProperties();
	const list = document.getElementById("manage-list");
	list.innerHTML = "";

	if (properties.length === 0) {
		const msg = document.createElement("p");
		msg.className = "empty-msg";
		msg.textContent = "No properties yet.";
		list.appendChild(msg);
		return;
	}

	properties.forEach((p, i) => {
		const row = document.createElement("div");
		row.className = "manage-row";

		const info = document.createElement("div");
		info.className = "manage-info";

		const nameEl = document.createElement("span");
		nameEl.className = "manage-label";
		nameEl.textContent = p.label;
		nameEl.title = "Click to rename";
		nameEl.onclick = () => {
			const input = document.createElement("input");
			input.className = "rename-input";
			input.value = p.label;
			info.replaceChild(input, nameEl);
			input.focus();
			input.select();
			const commit = () => {
				const val = input.value.trim();
				if (val && val !== p.label) {
					const props = getProperties();
					props[i].label = val;
					saveProperties(props);
				}
				renderManageList();
			};
			input.onblur = commit;
			input.onkeydown = e => {
				if (e.key === "Enter") { e.preventDefault(); commit(); }
				if (e.key === "Escape") renderManageList();
			};
		};

		const idEl = document.createElement("span");
		idEl.className = "manage-id";
		idEl.textContent = p.id;

		info.appendChild(nameEl);
		info.appendChild(idEl);

		const actions = document.createElement("div");
		actions.className = "manage-actions";

		const copyBtn = document.createElement("button");
		copyBtn.className = "btn-icon-sm";
		copyBtn.type = "button";
		copyBtn.setAttribute("aria-label", "Copy property ID");
		copyBtn.textContent = "📋";
		copyBtn.title = "Copy property ID";
		copyBtn.onclick = () => {
			navigator.clipboard.writeText(p.id)
				.then(() => {
					copyBtn.textContent = "✅";
					setTimeout(() => { copyBtn.textContent = "📋"; }, 1500);
				})
				.catch(() => {
					copyBtn.textContent = "✗";
					setTimeout(() => { copyBtn.textContent = "📋"; }, 1500);
				});
		};

		const deleteBtn = document.createElement("button");
		deleteBtn.className = "btn-icon-sm";
		deleteBtn.type = "button";
		deleteBtn.setAttribute("aria-label", "Delete property");
		deleteBtn.textContent = "🗑️";
		deleteBtn.title = "Delete";
		let confirming = false;
		let timer = null;
		deleteBtn.onclick = () => {
			if (!confirming) {
				confirming = true;
				deleteBtn.textContent = "Sure?";
				deleteBtn.classList.add("btn-danger");
				timer = setTimeout(() => {
					confirming = false;
					deleteBtn.textContent = "🗑️";
					deleteBtn.classList.remove("btn-danger");
				}, 2500);
			} else {
				clearTimeout(timer);
				const props = getProperties();
				props.splice(i, 1);
				saveProperties(props);
				let sel = getSelectedIndex();
				if (sel >= props.length) saveSelectedIndex(Math.max(0, props.length - 1));
				renderManageList();
			}
		};

		actions.appendChild(copyBtn);
		actions.appendChild(deleteBtn);
		row.appendChild(info);
		row.appendChild(actions);
		list.appendChild(row);
	});
}

function resetShortcutForm() {
	document.getElementById("shortcut-label").value = "";
	document.getElementById("shortcut-url").value = "";
	document.getElementById("shortcut-error").textContent = "";
}

function renderShortcutManageList() {
	const shortcuts = getShortcuts();
	const list = document.getElementById("shortcut-manage-list");
	list.innerHTML = "";

	const label = document.createElement("div");
	label.className = "section-label";
	label.textContent = "Saved Favorites";
	list.appendChild(label);

	if (shortcuts.length === 0) {
		const msg = document.createElement("p");
		msg.className = "empty-msg";
		msg.textContent = "No favorite shortcuts yet.";
		list.appendChild(msg);
		return;
	}

	shortcuts.forEach((shortcut, i) => {
		const row = document.createElement("div");
		row.className = "manage-row";

		const info = document.createElement("div");
		info.className = "manage-info";

		const nameEl = document.createElement("span");
		nameEl.className = "manage-label";
		nameEl.textContent = shortcut.label;
		nameEl.title = "Click to rename";
		nameEl.onclick = () => {
			const input = document.createElement("input");
			input.className = "rename-input";
			input.value = shortcut.label;
			info.replaceChild(input, nameEl);
			input.focus();
			input.select();
			const commit = () => {
				const val = input.value.trim();
				if (val && val !== shortcut.label) {
					const updated = getShortcuts();
					updated[i].label = val;
					saveShortcuts(updated);
				}
				renderShortcutManageList();
			};
			input.onblur = commit;
			input.onkeydown = e => {
				if (e.key === "Enter") { e.preventDefault(); commit(); }
				if (e.key === "Escape") renderShortcutManageList();
			};
		};

		const pathEl = document.createElement("span");
		pathEl.className = "manage-id";
		pathEl.textContent = `${getPropertyLabel(shortcut.propertyId)} · ${shortcut.path}`;

		info.appendChild(nameEl);
		info.appendChild(pathEl);

		const actions = document.createElement("div");
		actions.className = "manage-actions";

		const upBtn = document.createElement("button");
		upBtn.className = "btn-icon-sm";
		upBtn.type = "button";
		upBtn.setAttribute("aria-label", "Move favorite up");
		upBtn.textContent = "↑";
		upBtn.title = "Move up";
		upBtn.disabled = i === 0;
		upBtn.onclick = () => {
			const updated = getShortcuts();
			[updated[i - 1], updated[i]] = [updated[i], updated[i - 1]];
			saveShortcuts(updated);
			renderShortcutManageList();
		};

		const downBtn = document.createElement("button");
		downBtn.className = "btn-icon-sm";
		downBtn.type = "button";
		downBtn.setAttribute("aria-label", "Move favorite down");
		downBtn.textContent = "↓";
		downBtn.title = "Move down";
		downBtn.disabled = i === shortcuts.length - 1;
		downBtn.onclick = () => {
			const updated = getShortcuts();
			[updated[i], updated[i + 1]] = [updated[i + 1], updated[i]];
			saveShortcuts(updated);
			renderShortcutManageList();
		};

		const copyBtn = document.createElement("button");
		copyBtn.className = "btn-icon-sm";
		copyBtn.type = "button";
		copyBtn.setAttribute("aria-label", "Copy favorite URL");
		copyBtn.textContent = "📋";
		copyBtn.title = "Copy GA4 URL";
		copyBtn.onclick = () => {
			const url = buildHref(shortcut.propertyId, shortcut.path, getDateRange());
			navigator.clipboard.writeText(url)
				.then(() => {
					copyBtn.textContent = "✅";
					setTimeout(() => { copyBtn.textContent = "📋"; }, 1500);
				})
				.catch(() => {
					copyBtn.textContent = "✗";
					setTimeout(() => { copyBtn.textContent = "📋"; }, 1500);
				});
		};

		const deleteBtn = document.createElement("button");
		deleteBtn.className = "btn-icon-sm";
		deleteBtn.type = "button";
		deleteBtn.setAttribute("aria-label", "Delete favorite");
		deleteBtn.textContent = "🗑️";
		deleteBtn.title = "Delete favorite";
		deleteBtn.onclick = () => {
			const updated = getShortcuts();
			updated.splice(i, 1);
			saveShortcuts(updated);
			renderShortcutManageList();
		};

		actions.appendChild(upBtn);
		actions.appendChild(downBtn);
		actions.appendChild(copyBtn);
		actions.appendChild(deleteBtn);
		row.appendChild(info);
		row.appendChild(actions);
		list.appendChild(row);
	});
}

function addShortcutFromForm() {
	const error = document.getElementById("shortcut-error");
	error.textContent = "";

	let shortcut;
	try {
		shortcut = GA4ShortcutUtils.normalizeShortcut({
			label: document.getElementById("shortcut-label").value,
			url: document.getElementById("shortcut-url").value
		});
	} catch (err) {
		error.textContent = err.message;
		return;
	}

	const shortcuts = getShortcuts();
	if (GA4ShortcutUtils.hasDuplicateShortcut(shortcuts, shortcut)) {
		error.textContent = "That favorite already exists.";
		return;
	}

	shortcuts.push(shortcut);
	saveShortcuts(shortcuts);
	resetShortcutForm();
	renderShortcutManageList();
}

// --- Export / Import ---

function exportProperties() {
	const json = JSON.stringify({
		version: 2,
		properties: getProperties(),
		shortcuts: getShortcuts()
	}, null, 2);
	const btn = document.getElementById("btn-export");
	const orig = btn.textContent;
	navigator.clipboard.writeText(json)
		.then(() => {
			btn.textContent = "✅ Copied!";
			setTimeout(() => { btn.textContent = orig; }, 1500);
		})
		.catch(() => {
			const input = document.getElementById("import-input");
			input.value = json;
			document.getElementById("import-row").style.display = "block";
			btn.textContent = "↓ See below";
			setTimeout(() => { btn.textContent = orig; }, 2500);
		});
}

async function importProperties() {
	const input = document.getElementById("import-input");
	const error = document.getElementById("import-error");
	error.textContent = "";

	let parsed;
	try {
		parsed = JSON.parse(input.value.trim());
	} catch {
		error.textContent = "Invalid JSON.";
		return;
	}

	const isArrayFormat = Array.isArray(parsed);
	const isObjectFormat = !isArrayFormat && parsed !== null && typeof parsed === "object";
	const rawProperties = isArrayFormat ? parsed : (isObjectFormat ? parsed.properties : null);
	const rawShortcuts = isArrayFormat ? [] : (isObjectFormat ? (parsed.shortcuts || []) : []);

	if (!Array.isArray(rawProperties)) {
		error.textContent = 'Expected {properties, shortcuts} or [{label, id}, ...] format.';
		return;
	}

	if (!Array.isArray(rawShortcuts)) {
		error.textContent = "Shortcut data is invalid.";
		return;
	}

	let properties;
	let shortcuts;
	try {
		properties = GA4ShortcutUtils.normalizeStoredProperties(rawProperties);
		shortcuts = rawShortcuts.map(s => GA4ShortcutUtils.normalizeStoredShortcut(s));
	} catch (err) {
		error.textContent = err.message || "Import data is invalid.";
		return;
	}

	await saveProperties(properties);
	await saveShortcuts(shortcuts);
	await saveSelectedIndex(0);
	input.value = "";
	document.getElementById("import-row").style.display = "none";
	renderManageList();
	renderShortcutManageList();
}

// --- Init ---

document.addEventListener("DOMContentLoaded", async () => {
	await initStorage();
	renderReports();
	initAiDigest();
	showMain();

	document.getElementById("btn-add").onclick = showAdd;
	document.getElementById("btn-empty-add").onclick = showAdd;
	document.getElementById("btn-manage").onclick = showManage;
	document.getElementById("btn-cancel").onclick = showMain;
	document.getElementById("btn-manage-done").onclick = showMain;
	document.getElementById("btn-health-run").onclick = () => {
		const property = getProperties()[getSelectedIndex()];
		runHealthCheck(property?.id || "");
	};

	document.getElementById("btn-save").onclick = async () => {
		const name = document.getElementById("prop-name").value.trim();
		const rawId = document.getElementById("prop-id").value.trim();
		const error = document.getElementById("add-error");
		const match = rawId.match(/\/(a\d+p\d+)\//);
		const id = match ? match[1] : rawId;
		if (!name) { error.textContent = "Please enter a name."; return; }
		if (!id.match(/^a\d+p\d+$/)) {
			error.textContent = "That doesn't look right. Paste a full GA4 URL and I'll find the ID.";
			return;
		}
		const props = getProperties();
		props.push({ label: name, id });
		await saveProperties(props);
		await saveSelectedIndex(props.length - 1);
		showMain();
	};

	document.getElementById("btn-export").onclick = exportProperties;
	document.getElementById("btn-shortcut-save").onclick = addShortcutFromForm;

	document.getElementById("btn-import-toggle").onclick = () => {
		const row = document.getElementById("import-row");
		const visible = row.style.display !== "none";
		row.style.display = visible ? "none" : "block";
		document.getElementById("import-error").textContent = "";
		if (!visible) document.getElementById("import-input").value = "";
	};

	document.getElementById("btn-import-apply").onclick = importProperties;

	document.addEventListener("ga4-tab-change", event => {
		activeMainTab = event.detail?.tab || "dashboard";
		if (activeMainTab !== "analysis") return;
		const property = getProperties()[getSelectedIndex()];
		if (landingPagesStale) loadLandingPages(property?.id || "");
		if (trafficSourceStale) loadTrafficSources(property?.id || "");
		if (topEventsStale) loadTopEvents(property?.id || "");
	});

	window.addEventListener("offline", () => {
		const el = document.getElementById("metrics-bar");
		if (el) el.innerHTML = `<span class="metric-hint">No connection</span>`;
		if (activeMainTab === "analysis") {
			document.getElementById("landing-pages-status").textContent = "No connection. Check your network.";
		}
	});

	window.addEventListener("online", () => {
		const property = getProperties()[getSelectedIndex()];
		if (property) fetchMetrics(property.id);
		if (activeMainTab === "analysis") {
			loadLandingPages(property?.id || "");
			loadTrafficSources(property?.id || "");
			loadTopEvents(property?.id || "");
		}
	});
});
