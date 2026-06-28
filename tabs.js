document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;

      document.querySelectorAll(".tab").forEach(b => {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });

      document.querySelectorAll(".tab-panel").forEach(p => {
        p.classList.toggle("active", p.id === "tab-" + target);
      });

      document.dispatchEvent(new CustomEvent("ga4-tab-change", { detail: { tab: target } }));

      if (target === "favorites" && typeof renderShortcuts === "function") {
        renderShortcuts();
        renderRecentReports();
      }

      if (target === "reports" && typeof renderReports === "function") {
        renderReports();
      }
    });
  });
});
