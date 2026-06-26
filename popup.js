const GA4_API = "https://analyticsdata.googleapis.com/v1beta/properties/";

const REPORTS = [
  {
    section: "Quick Access",
    items: [
      { icon: "🟢", title: "Realtime", desc: "Who's on your site right now", path: "/realtime/overview?params=_u..nav%3Dmaui&collectionId=business-objectives" },
      { icon: "🏠", title: "Home", desc: "Your overview dashboard", path: "/reports/intelligenthome?params=_u..nav%3Dmaui&collectionId=business-objectives" },
      { icon: "📋", title: "Reports Snapshot", desc: "Quick summary of everything", path: "/reports/reportinghub?params=_u..nav%3Dmaui&collectionId=business-objectives" }
    ]
  },
  {
    section: "Audience",
    items: [
      { icon: "👥", title: "WHO visited", desc: "Countries, cities, languages", path: "/reports/dashboard?params=_u..nav%3Dmaui&collectionId=user&ruid=user-demographics-overview,user,demographics&r=user-demographics-overview" },
      { icon: "🗺️", title: "HOW they found you", desc: "Google, direct, social, referral", path: "/reports/dashboard?params=_u..nav%3Dmaui%26_r.3..selmet%3D%5B%22conversions%22%5D&collectionId=business-objectives&ruid=business-objectives-generate-leads-overview,business-objectives,generate-leads&r=business-objectives-generate-leads-overview" },
      { icon: "📄", title: "WHAT they looked at", desc: "Pages and screens visited", path: "/reports/explorer?params=_u..nav%3Dmaui&collectionId=business-objectives&ruid=all-pages-and-screens,business-objectives,examine-user-behavior&r=all-pages-and-screens" },
      { icon: "⏱️", title: "Engagement", desc: "Session duration, bounce rate", path: "/reports/dashboard?params=_u..nav%3Dmaui&collectionId=lifecycle&ruid=life-cycle-engagement-overview,lifecycle,engagement&r=life-cycle-engagement-overview" }
    ]
  }
];

const DATE_RANGES = [
  { label: "7d",  value: "last7days"  },
  { label: "28d", value: "last28days" },
  { label: "90d", value: "last90days" }
];

let metricsRequestSequence = 0;

// --- Storage ---

function getProperties()    { return JSON.parse(localStorage.getItem("ga4_properties") || "[]"); }
function saveProperties(p)  { localStorage.setItem("ga4_properties", JSON.stringify(p)); }
function getSelectedIndex() { return parseInt(localStorage.getItem("ga4_selected") || "0"); }
function saveSelectedIndex(i) { localStorage.setItem("ga4_selected", String(i)); }
function getDateRange()     { return localStorage.getItem("ga4_date_range") || "last28days"; }
function saveDateRange(r)   { localStorage.setItem("ga4_date_range", r); }
function getShortcuts()     { return JSON.parse(localStorage.getItem("ga4_shortcuts") || "[]"); }
function saveShortcuts(s)   { localStorage.setItem("ga4_shortcuts", JSON.stringify(s)); }
function getRecentReports() { return JSON.parse(localStorage.getItem("ga4_recent_reports") || "[]"); }
function saveRecentReports(r) { localStorage.setItem("ga4_recent_reports", JSON.stringify(r)); }

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
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.onclick = () => {
        const props = getProperties();
        const property = props[getSelectedIndex()];
        if (!property) return;
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
    btn.textContent = label;
    btn.onclick = () => {
      saveDateRange(value);
      const props = getProperties();
      updateLinks(props[getSelectedIndex()]?.id || "");
      renderShortcuts();
      renderRecentReports();
      fetchMetrics(props[getSelectedIndex()]?.id || "");
      renderDatePills();
    };
    container.appendChild(btn);
  });
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
  if (!propertyId) { el.textContent = ""; return; }

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

    el.innerHTML = `<button class="metric-connect" id="btn-connect">Connect Google →</button>`;
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
  } catch (err) {
    if (!isCurrentMetricsRequest(requestId)) return;

    if (isAuthApiError(err)) {
      await removeCachedToken(token);

      try {
        const interactiveToken = await getToken(true);
        if (!isCurrentMetricsRequest(requestId)) return;
        await loadMetrics(el, numericId, interactiveToken, getDateRange(), requestId);
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
  if (err?.status === 401) return "Auth expired. Connect Google again.";
  if (err?.status === 403) return "Analytics permission denied.";
  if (err?.source === "realtime") return "Realtime metrics unavailable.";
  if (err?.source === "report") return "Report metrics unavailable.";
  return "Metrics unavailable.";
}

function clearDashboard() {
  document.getElementById("dashboard-grid").innerHTML = "";
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
    grid.appendChild(card);
  });
}

async function loadMetrics(el, numericId, token, dateRange, requestId) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const apiDateRange = GA4ShortcutUtils.getApiDateRange(dateRange);

  const [reportRes, realtimeRes] = await Promise.all([
    fetch(`${GA4_API}${numericId}:runReport`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        dateRanges: [apiDateRange],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "screenPageViews" },
          { name: "eventCount" }
        ]
      })
    }),
    fetch(`${GA4_API}${numericId}:runRealtimeReport`, {
      method: "POST",
      headers,
      body: JSON.stringify({ metrics: [{ name: "activeUsers" }] })
    })
  ]);

  const report   = await reportRes.json();
  const realtime = await realtimeRes.json();

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

  renderDashboard(GA4ShortcutUtils.buildDashboardMetrics(report, realtime));
  el.innerHTML = `<span class="metric-hint">Updated just now</span>`;
}

// --- Views ---

function showView(name) {
  ["main-view", "add-view", "manage-view"].forEach(id => {
    document.getElementById(id).style.display = id === name ? "block" : "none";
  });
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
    updateLinks("");
    renderShortcuts();
    renderRecentReports();
    document.getElementById("metrics-bar").textContent = "";
    clearDashboard();
  } else {
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
    fetchMetrics(properties[idx]?.id || "");

    select.onchange = () => {
      const i = parseInt(select.value);
      saveSelectedIndex(i);
      updateLinks(properties[i]?.id || "");
      fetchMetrics(properties[i]?.id || "");
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
        if (e.key === "Enter")  { e.preventDefault(); commit(); }
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
    copyBtn.textContent = "📋";
    copyBtn.title = "Copy property ID";
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(p.id).then(() => {
        copyBtn.textContent = "✅";
        setTimeout(() => { copyBtn.textContent = "📋"; }, 1500);
      });
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-icon-sm";
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
        if (e.key === "Enter")  { e.preventDefault(); commit(); }
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
    copyBtn.textContent = "📋";
    copyBtn.title = "Copy GA4 URL";
    copyBtn.onclick = () => {
      const url = buildHref(shortcut.propertyId, shortcut.path, getDateRange());
      navigator.clipboard.writeText(url).then(() => {
        copyBtn.textContent = "✅";
        setTimeout(() => { copyBtn.textContent = "📋"; }, 1500);
      });
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-icon-sm";
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
  navigator.clipboard.writeText(json).then(() => {
    const btn = document.getElementById("btn-export");
    const orig = btn.textContent;
    btn.textContent = "✅ Copied!";
    setTimeout(() => { btn.textContent = orig; }, 1500);
  });
}

function importProperties() {
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

  const rawProperties = Array.isArray(parsed) ? parsed : parsed.properties;
  const rawShortcuts = Array.isArray(parsed) ? [] : (parsed.shortcuts || []);

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
  } catch {
    error.textContent = "Import data is invalid.";
    return;
  }

  saveProperties(properties);
  saveShortcuts(shortcuts);
  saveSelectedIndex(0);
  input.value = "";
  document.getElementById("import-row").style.display = "none";
  renderManageList();
  renderShortcutManageList();
}

// --- Init ---

document.addEventListener("DOMContentLoaded", () => {
  if (getProperties().length === 0) {
    saveProperties([{ label: "peterbenoit.com (Personal)", id: "a356198589p490540007" }]);
    saveSelectedIndex(0);
  }

  renderReports();
  showMain();

  document.getElementById("btn-add").onclick      = showAdd;
  document.getElementById("btn-manage").onclick   = showManage;
  document.getElementById("btn-cancel").onclick   = showMain;
  document.getElementById("btn-manage-done").onclick = showMain;

  document.getElementById("btn-save").onclick = () => {
    const name  = document.getElementById("prop-name").value.trim();
    const rawId = document.getElementById("prop-id").value.trim();
    const error = document.getElementById("add-error");
    const match = rawId.match(/\/(a\d+p\d+)\//);
    const id    = match ? match[1] : rawId;
    if (!name) { error.textContent = "Please enter a name."; return; }
    if (!id.match(/^a\d+p\d+$/)) {
      error.textContent = "That doesn't look right. Paste a full GA4 URL and I'll find the ID.";
      return;
    }
    const props = getProperties();
    props.push({ label: name, id });
    saveProperties(props);
    saveSelectedIndex(props.length - 1);
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
});
