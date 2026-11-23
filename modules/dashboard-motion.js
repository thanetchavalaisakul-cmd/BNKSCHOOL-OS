/* BNK Signature Motion: optional, dashboard-only DOM enhancement.
 * No changes to dashboard data, routing, permissions, or existing app logic. */
(() => {
  "use strict";
  const app = document.getElementById("app");
  if (!app || typeof MutationObserver === "undefined") return;

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const motionAllowed = () => !reducedMotion?.matches && document.visibilityState !== "hidden";
  let currentDashboard = null;
  let scheduled = false;

  function animateNumber(element) {
    const original = element.textContent.trim();
    if (!/^(?:0|[1-9][0-9]*|[1-9][0-9]{0,2}(?:,[0-9]{3})+)$/.test(original)) return;
    const target = Number(original.replaceAll(",", ""));
    if (!Number.isSafeInteger(target) || target < 2 || target > 1_000_000) return;

    const format = original.includes(",")
      ? value => value.toLocaleString("en-US")
      : value => String(value);
    const duration = 720;
    let started = null;
    const tick = now => {
      if (!element.isConnected || !app.contains(element)) return;
      if (started === null) started = now;
      const progress = Math.min(1, Math.max(0, (now - started) / duration));
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = progress === 1 ? original : format(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function refresh() {
    scheduled = false;
    const dashboard = app.querySelector(".home-dashboard-v2");
    if (!dashboard || dashboard === currentDashboard) return;
    currentDashboard = dashboard;
    if (!motionAllowed()) return;

    dashboard.querySelectorAll(".home-summary-card, .home-module-card, .home-task")
      .forEach((card, index) => {
        // Short stagger, capped so long task lists do not delay navigation.
        card.style.setProperty("--bnk-motion-order", String(Math.min(index, 9)));
      });
    dashboard.classList.add("bnk-motion-ready");
    dashboard.querySelectorAll(".home-summary-card strong").forEach(animateNumber);
  }

  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(refresh);
  }

  const observer = new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes, ...record.removedNodes]
      .some(node => node.nodeType === 1))) {
      scheduleRefresh();
    }
  });
  observer.observe(app, { childList: true, subtree: true });
  refresh();
})();
