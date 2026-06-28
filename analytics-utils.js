(function (root) {
  "use strict";

  const RANGE_DAYS = {
    last7days: 7,
    last28days: 28,
    last90days: 90
  };

  function getApiDateRange(range) {
    const days = RANGE_DAYS[range] || RANGE_DAYS.last28days;
    return { startDate: `${days}daysAgo`, endDate: "today" };
  }

  function formatApiDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function shiftDate(date, days) {
    const shifted = new Date(date);
    shifted.setDate(shifted.getDate() + days);
    return shifted;
  }

  function getComparisonDateRanges(range, now = new Date()) {
    const days = RANGE_DAYS[range] || RANGE_DAYS.last28days;
    const currentEnd = new Date(now);
    const currentStart = shiftDate(currentEnd, -(days - 1));
    const previousEnd = shiftDate(currentStart, -1);
    const previousStart = shiftDate(previousEnd, -(days - 1));
    return [
      { startDate: formatApiDate(currentStart), endDate: formatApiDate(currentEnd) },
      { startDate: formatApiDate(previousStart), endDate: formatApiDate(previousEnd) }
    ];
  }

  function calculateMetricDelta(currentValue, previousValue) {
    const current = Number(currentValue);
    if (!Number.isFinite(current)) {
      const previous = Number(previousValue);
      return {
        current: null,
        previous: Number.isFinite(previous) ? previous : null,
        absolute: null,
        percent: null,
        state: "unavailable"
      };
    }
    if (previousValue === null || previousValue === undefined || previousValue === "") {
      return { current, previous: null, absolute: null, percent: null, state: "unavailable" };
    }
    const previous = Number(previousValue);
    if (!Number.isFinite(previous)) {
      return { current, previous: null, absolute: null, percent: null, state: "unavailable" };
    }
    const absolute = current - previous;
    if (previous === 0) {
      return {
        current,
        previous,
        absolute,
        percent: null,
        state: current === 0 ? "unchanged" : "new"
      };
    }
    return {
      current,
      previous,
      absolute,
      percent: Number(((absolute / previous) * 100).toFixed(1)),
      state: absolute === 0 ? "unchanged" : "changed"
    };
  }

  function buildOverviewRequest(dateRange, explicitRange) {
    return {
      dateRanges: [explicitRange || getApiDateRange(dateRange)],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "screenPageViews" },
        { name: "eventCount" }
      ]
    };
  }

  function buildRealtimeRequest() {
    return { metrics: [{ name: "activeUsers" }] };
  }

  function formatMetricValue(value) {
    return Number(value || 0).toLocaleString();
  }

  function getMetric(report, index) {
    return report?.rows?.[0]?.metricValues?.[index]?.value || "0";
  }

  const TOP_INSIGHT_CONFIGS = {
    pages: {
      label: "Pages",
      dimension: "pageTitle",
      secondaryDimension: "pagePath",
      metric: "screenPageViews",
      metricLabel: "Views",
      path: "/reports/explorer?params=_u..nav%3Dmaui&collectionId=business-objectives&ruid=all-pages-and-screens,business-objectives,examine-user-behavior&r=all-pages-and-screens"
    },
    sources: {
      label: "Sources",
      dimension: "sessionSourceMedium",
      metric: "sessions",
      metricLabel: "Sessions",
      path: "/reports/dashboard?params=_u..nav%3Dmaui%26_r.3..selmet%3D%5B%22conversions%22%5D&collectionId=business-objectives&ruid=business-objectives-generate-leads-overview,business-objectives,generate-leads&r=business-objectives-generate-leads-overview"
    },
    campaigns: {
      label: "Campaigns",
      dimension: "sessionCampaignName",
      metric: "sessions",
      metricLabel: "Sessions",
      path: "/reports/acquisition-traffic-acquisition?params=_u..nav%3Dmaui"
    },
    events: {
      label: "Events",
      dimension: "eventName",
      metric: "eventCount",
      metricLabel: "Events",
      path: "/reports/events?params=_u..nav%3Dmaui"
    }
  };

  function getTopInsightConfig(type) {
    return TOP_INSIGHT_CONFIGS[type] || TOP_INSIGHT_CONFIGS.pages;
  }

  function buildTopInsightRequest(type, dateRange) {
    const config = getTopInsightConfig(type);
    const dimensions = [{ name: config.dimension }];
    if (config.secondaryDimension) dimensions.push({ name: config.secondaryDimension });
    return {
      dateRanges: [getApiDateRange(dateRange)],
      dimensions,
      metrics: [{ name: config.metric }],
      orderBys: [{ metric: { metricName: config.metric }, desc: true }],
      limit: 5
    };
  }

  function buildTopInsightRows(report, config) {
    return (report?.rows || []).map(row => {
      const dimensions = row.dimensionValues || [];
      const primary = String(dimensions[0]?.value || "").trim();
      const secondary = String(dimensions[1]?.value || "").trim();
      return {
        label: primary || secondary || "(not set)",
        meta: primary && secondary && primary !== secondary ? secondary : "",
        value: formatMetricValue(row.metricValues?.[0]?.value || "0"),
        metricLabel: config.metricLabel
      };
    });
  }

  function buildLandingPagesRequest(dateRange) {
    return {
      dateRanges: [getApiDateRange(dateRange)],
      dimensions: [{ name: "landingPagePlusQueryString" }],
      metrics: [
        { name: "sessions" },
        { name: "engagementRate" },
        { name: "bounceRate" }
      ],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 10
    };
  }

  function formatSafeCount(value) {
    const number = Number(value);
    return (Number.isFinite(number) ? number : 0).toLocaleString();
  }

  function formatRate(value) {
    const number = Number(value);
    return `${((Number.isFinite(number) ? number : 0) * 100).toFixed(1)}%`;
  }

  function buildLandingPageRows(report) {
    return (report?.rows || []).map(row => ({
      path: String(row.dimensionValues?.[0]?.value || "").trim() || "(not set)",
      sessions: formatSafeCount(row.metricValues?.[0]?.value),
      engagementRate: formatRate(row.metricValues?.[1]?.value),
      bounceRate: formatRate(row.metricValues?.[2]?.value)
    }));
  }

  function buildHealthCheckRequest() {
    const sessions = [{ name: "sessions" }];
    return {
      requests: [
        {
          dateRanges: [{ startDate: "today", endDate: "today" }],
          metrics: [...sessions, { name: "eventCount" }, { name: "keyEvents" }]
        },
        {
          dateRanges: [{ startDate: "7daysAgo", endDate: "yesterday" }],
          metrics: sessions
        },
        {
          dateRanges: [{ startDate: "14daysAgo", endDate: "8daysAgo" }],
          metrics: sessions
        }
      ]
    };
  }

  function getMetricNumber(report, index = 0) {
    const value = Number(report?.rows?.[0]?.metricValues?.[index]?.value || 0);
    return Number.isFinite(value) ? value : 0;
  }

  function buildHealthFindings(reports) {
    const today = reports?.[0];
    const recent = getMetricNumber(reports?.[1]);
    const previous = getMetricNumber(reports?.[2]);
    const sessionsToday = getMetricNumber(today, 0);
    const eventsToday = getMetricNumber(today, 1);
    const keyEventsToday = getMetricNumber(today, 2);
    const findings = [];

    if (sessionsToday === 0) {
      const dailyAverage = Math.round(recent / 7);
      findings.push({
        id: "collection",
        severity: recent >= 35 ? "critical" : "warning",
        title: "No sessions recorded today",
        detail: recent >= 35
          ? `This property averaged ${formatMetricValue(dailyAverage)} per day over the previous week.`
          : "The property has no session activity today and only a limited recent baseline.",
        path: "/reports/realtime/overview?params=_u..nav%3Dmaui&collectionId=business-objectives"
      });
    } else {
      findings.push({
        id: "collection",
        severity: "info",
        title: "Session collection is active",
        detail: `${formatMetricValue(sessionsToday)} sessions recorded today.`,
        path: "/reports/realtime/overview?params=_u..nav%3Dmaui&collectionId=business-objectives"
      });
    }

    const trafficPath = "/reports/acquisition-traffic-acquisition?params=_u..nav%3Dmaui";
    if (previous === 0 && recent === 0) {
      findings.push({
        id: "traffic-trend",
        severity: "warning",
        title: "No recent traffic baseline",
        detail: "No sessions were recorded in either complete seven-day period.",
        path: trafficPath
      });
    } else if (previous === 0) {
      findings.push({
        id: "traffic-trend",
        severity: "info",
        title: "Recent traffic is collecting",
        detail: `${formatMetricValue(recent)} sessions recorded in the latest complete week.`,
        path: trafficPath
      });
    } else {
      const change = Math.round(((recent - previous) / previous) * 100);
      const down = change <= -50;
      findings.push({
        id: "traffic-trend",
        severity: down ? "warning" : "info",
        title: down ? "Traffic dropped sharply" : "Traffic trend is stable",
        detail: down
          ? `Sessions are down ${Math.abs(change)}% versus the prior complete week.`
          : `Sessions changed ${change >= 0 ? "+" : ""}${change}% versus the prior complete week.`,
        path: trafficPath
      });
    }

    findings.push({
      id: "events",
      severity: eventsToday === 0 ? "warning" : "info",
      title: eventsToday === 0 ? "No events recorded today" : "Event collection is active",
      detail: eventsToday === 0
        ? "GA4 has not recorded event activity for this property today."
        : `${formatMetricValue(eventsToday)} events recorded today.`,
      path: "/reports/events?params=_u..nav%3Dmaui"
    });

    findings.push({
      id: "key-events",
      severity: keyEventsToday === 0 ? "warning" : "info",
      title: keyEventsToday === 0 ? "No key event activity today" : "Key events are active",
      detail: keyEventsToday === 0
        ? "No key events have been recorded today; this does not prove none are configured."
        : `${formatMetricValue(keyEventsToday)} key events recorded today.`,
      path: "/reports/events?params=_u..nav%3Dmaui"
    });

    const severityRank = { critical: 0, warning: 1, info: 2 };
    return findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  }

  function buildDashboardMetrics(report, realtime, previousReport) {
    const METRIC_DEFS = [
      { label: "Sessions", index: 0 },
      { label: "Users",    index: 1 },
      { label: "Views",    index: 2 },
      { label: "Events",   index: 3 }
    ];

    const metrics = METRIC_DEFS.map(({ label, index }) => {
      const current = getMetric(report, index);
      const delta = previousReport
        ? calculateMetricDelta(current, getMetric(previousReport, index))
        : null;
      return { label, value: formatMetricValue(current), delta };
    });

    metrics.push({ label: "Live", value: formatMetricValue(getMetric(realtime, 0)), delta: null });
    return metrics;
  }

  const api = {
    getApiDateRange,
    getComparisonDateRanges,
    calculateMetricDelta,
    buildOverviewRequest,
    buildRealtimeRequest,
    buildDashboardMetrics,
    getTopInsightConfig,
    buildTopInsightRequest,
    buildTopInsightRows,
    buildLandingPagesRequest,
    buildLandingPageRows,
    buildHealthCheckRequest,
    buildHealthFindings
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.GA4AnalyticsUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
