const BASE = "https://analytics.google.com/analytics/web/#/";
const GA4_API = "https://analyticsdata.googleapis.com/v1beta/properties/";

const REPORTS = [
  {
    section: "Quick Access",
    items: [
      { icon: "🟢", title: "Realtime", desc: "Who's on your site right now", path: "/reports/realtime?params=_u..nav%3Dmaui" },
      { icon: "🏠", title: "Home", desc: "Your overview dashboard", path: "/reports/intelligenthome?params=_u..nav%3Dmaui&collectionId=business-objectives" },
      { icon: "📋", title: "Reports Snapshot", desc: "Quick summary of everything", path: "/reports/reportinghub?params=_u..nav%3Dmaui&collectionId=business-objectives" }
    ]
  },
  {
    section: "Audience",
    items: [
      { icon: "👥", title: "WHO visited", desc: "Countries, cities, languages", path: "/reports/dashboard?params=_u..nav%3Dmaui&collectionId=user&ruid=user-demographics-overview,user,demographics&r=user-demographics-overview" },
      { icon: "🗺️", title: "HOW they found you", desc: "Google, direct, social, referral", path: "/reports/dashboard?params=_u..nav%3Dmaui%26_r.3..selmet%3D%5B%22conversions%22%5D&collectionId=business-objectives&ruid=business-objectives-generate-leads-overview,business-objectives,generate-leads&r=business-objectives-generate-leads-overview" },
      { icon: "📄", title: "WHAT they looked at", desc: "Pages and screens visited", path: "/reports/explorer?params=_u..nav%3Dmaui&collectionId=business-objectives&ruid=all-pages-and-screens,business-objectives,raise-brand-awareness&r=all-pages-and-screens" },
      { icon: "⏱️", title: "Engagement", desc: "Session duration, bounce rate", path: "/reports/dashboard?params=_u..nav%3Dmaui&collectionId=lifecycle&ruid=life-cycle-engagement-overview,lifecycle,engagement&r=life-cycle-engagement-overview" }
    ]
  }
];

const DATE_RANGES = [
  { label: "7d",  value: "last7days"  },
  { label: "28d", value: "last28days" },
  { label: "90d", value: "last90days" }
];

// --- Storage ---

function getProperties()    { return JSON.parse(localStorage.getItem("ga4_properties") || "[]"); }
function saveProperties(p)  { localStorage.setItem("ga4_properties", JSON.stringify(p)); }
function getSelectedIndex() { return parseInt(localStorage.getItem("ga4_selected") || "0"); }
function saveSelectedIndex(i) { localStorage.setItem("ga4_selected", String(i)); }
function getDateRange()     { return localStorage.getItem("ga4_date_range") || "last28days"; }
function saveDateRange(r)   { localStorage.setItem("ga4_date_range", r); }

// --- Links ---

function dateRangeToParams(range) {
  const days = { last7days: 6, last28days: 27, last90days: 89 };
  const n = days[range];
  if (n === undefined) return null;
  const fmt = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - n);
  return `&_u.date00=${fmt(start)}&_u.date01=${fmt(end)}`;
}

function buildHref(propertyId, path, dateRange) {
  if (!propertyId) return "#";
  const url = BASE + propertyId + path;
  if (!dateRange) return url;
  const params = dateRangeToParams(dateRange);
  if (!params) return url;
  return url.replace(/(params=[^&]*)/, `$1${encodeURIComponent(params)}`);
}

function updateLinks(propertyId) {
  const range = getDateRange();
  document.querySelectorAll(".ga4-link").forEach(a => {
    a.href = buildHref(propertyId, a.dataset.path, range);
  });
}

// --- Render reports ---

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
  const el = document.getElementById("metrics-bar");
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

  try {
    const token = await getToken(false);
    await loadMetrics(el, numericId, token);
  } catch {
    el.innerHTML = `<button class="metric-connect" id="btn-connect">Connect Google →</button>`;
    document.getElementById("btn-connect")?.addEventListener("click", async () => {
      try {
        const token = await getToken(true);
        await loadMetrics(el, numericId, token);
      } catch (err) {
        el.innerHTML = `<span class="metric-hint">Auth failed</span>`;
      }
    });
  }
}

async function loadMetrics(el, numericId, token) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const [reportRes, realtimeRes] = await Promise.all([
    fetch(`${GA4_API}${numericId}:runReport`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        dateRanges: [{ startDate: "today", endDate: "today" }],
        metrics: [{ name: "sessions" }]
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

  if (!reportRes.ok) throw new Error(report.error?.message || "API error");

  const sessions = Number(report.rows?.[0]?.metricValues?.[0]?.value ?? 0).toLocaleString();
  const live     = realtime.rows?.[0]?.metricValues?.[0]?.value ?? "0";

  el.innerHTML = `
    <span class="metric-item">Today: <strong>${sessions}</strong></span>
    <span class="metric-sep">·</span>
    <span class="metric-item">Live: <strong>${live}</strong></span>`;
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
    document.getElementById("metrics-bar").textContent = "";
  } else {
    properties.forEach((p, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = p.label;
      if (i === idx) opt.selected = true;
      select.appendChild(opt);
    });
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

// --- Export / Import ---

function exportProperties() {
  const json = JSON.stringify(getProperties(), null, 2);
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

  if (!Array.isArray(parsed) || !parsed.every(p => p.label && p.id)) {
    error.textContent = 'Expected [{label, id}, ...] format.';
    return;
  }

  saveProperties(parsed);
  saveSelectedIndex(0);
  input.value = "";
  document.getElementById("import-row").style.display = "none";
  renderManageList();
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

  document.getElementById("btn-import-toggle").onclick = () => {
    const row = document.getElementById("import-row");
    const visible = row.style.display !== "none";
    row.style.display = visible ? "none" : "block";
    document.getElementById("import-error").textContent = "";
    if (!visible) document.getElementById("import-input").value = "";
  };

  document.getElementById("btn-import-apply").onclick = importProperties;
});
