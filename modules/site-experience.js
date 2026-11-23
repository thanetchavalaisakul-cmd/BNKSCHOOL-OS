/* BNK School OS: lightweight opt-in visual enhancements + safe in-app navigation.
   Existing app controllers, access control, themes and layouts remain authoritative. */
(() => {
  "use strict";
  const app = document.getElementById("app");
  if (!app || typeof MutationObserver === "undefined") return;

  const ROUTE_KEY = "bnk:ux:route:v1";
  const WELCOME_KEY = "bnk:ux:welcome:v1";
  const historyMarker = "bnkSchoolUxView";
  const safeRead = key => { try { return sessionStorage.getItem(key); } catch { return null; } };
  const safeWrite = (key, value) => { try { sessionStorage.setItem(key, value); } catch {} };
  const safeDelete = key => { try { sessionStorage.removeItem(key); } catch {} };
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  let initialized = false;
  let route = "dashboard";
  let suppressClick = false;
  let pendingFrame = false;
  let welcomeElement = null;
  let welcomeTimeout = null;
  let hasShownWelcome = false;

  function findView(view) {
    if (!view || !/^(?:dashboard|approval_center|data_center|module:[a-z0-9_]+)$/.test(view)) return null;
    return Array.from(app.querySelectorAll("[data-view]"))
      .find(el => el.dataset.view === view && !el.disabled && !el.closest("[hidden]")) || null;
  }

  function activeRenderedRoute() {
    const active = app.querySelector(".sidebar [data-view].active");
    if (active && findView(active.dataset.view)) return active.dataset.view;
    if (app.querySelector(".home-dashboard-v2")) return "dashboard";
    return null;
  }

  function recordHistory(view, replace = false) {
    const existing = history.state && typeof history.state === "object" ? history.state : {};
    const depth = replace ? (Number(existing.bnkUxDepth) || 0) : (Number(existing.bnkUxDepth) || 0) + 1;
    try {
      const next = { ...existing, [historyMarker]: view, bnkUxDepth: depth };
      if (replace) history.replaceState(next, "");
      else history.pushState(next, "");
    } catch {
      // Navigation still works if a privacy setting blocks History API state.
    }
    safeWrite(ROUTE_KEY, view);
    route = view;
  }

  function dirtyModalPresent() {
    const modal = app.querySelector(".modal:not(.hidden), [role=dialog]:not(.hidden)");
    if (!modal) return false;
    return Array.from(modal.querySelectorAll("input,textarea,select")).some(input => {
      if (input.disabled || input.type === "hidden" || input.type === "file") return false;
      if (input.type === "checkbox" || input.type === "radio") return input.checked !== input.defaultChecked;
      if (input.tagName === "SELECT") return Array.from(input.options).some(o => o.selected !== o.defaultSelected);
      return input.value !== input.defaultValue;
    });
  }

  function leaveAllowed() {
    return !dirtyModalPresent() || window.confirm("มีข้อมูลในแบบฟอร์มที่อาจยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?");
  }

  function activate(view, silent = false) {
    const button = findView(view);
    if (!button) return false; // Never bypass visibility/role permissions.
    suppressClick = true;
    try { button.click(); } finally { suppressClick = false; }
    if (silent) { route = view; safeWrite(ROUTE_KEY, view); }
    return true;
  }

  function viewLabel(view) {
    const item = findView(view);
    const label = item?.querySelector(".nav-label")?.textContent
      || item?.textContent || view.replace("module:", "");
    return label.trim().replace(/\s+/g, " ").slice(0, 85);
  }

  function goBack() {
    if (!leaveAllowed()) return;
    if (history.state?.[historyMarker] && Number(history.state.bnkUxDepth) > 0) {
      history.back();
      return;
    }
    if (findView("dashboard")) activate("dashboard");
    else if (findView("module:leave_management")) activate("module:leave_management");
  }

  function makeToolbar(content) {
    const bar = document.createElement("nav");
    bar.className = "bnk-ux-toolbar";
    bar.setAttribute("aria-label", "เส้นทางนำทาง");
    bar.dataset.bnkUxToolbar = "true";
    const back = document.createElement("button");
    back.type = "button";
    back.dataset.bnkUxBack = "true";
    back.textContent = "← ย้อนกลับ";
    back.addEventListener("click", goBack);
    bar.appendChild(back);

    const homeView = findView("dashboard");
    if (homeView) {
      const home = document.createElement("button");
      home.type = "button";
      home.textContent = "⌂ Dashboard";
      home.addEventListener("click", () => {
        if (leaveAllowed()) activate("dashboard");
      });
      bar.appendChild(home);
    }

    const crumb = document.createElement("span");
    crumb.className = "bnk-ux-crumb";
    crumb.textContent = viewLabel(route);
    bar.appendChild(crumb);
    content.prepend(bar);
  }

  function removeWelcome() {
    if (welcomeTimeout !== null) clearTimeout(welcomeTimeout);
    welcomeTimeout = null;
    welcomeElement?.remove();
    welcomeElement = null;
  }

  function showWelcome() {
    if (hasShownWelcome || safeRead(WELCOME_KEY) === "seen") return;
    hasShownWelcome = true;
    safeWrite(WELCOME_KEY, "seen");
    if (reducedMotion?.matches || document.visibilityState === "hidden") return;

    const backdrop = document.createElement("div");
    backdrop.className = "bnk-welcome-overlay";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-label", "ยินดีต้อนรับสู่ BNK SCHOOL OS");
    const box = document.createElement("div");
    box.className = "bnk-welcome-box";
    const orbit = document.createElement("div");
    orbit.className = "bnk-welcome-orbit";
    orbit.setAttribute("aria-hidden", "true");
    const letters = document.createElement("span");
    letters.className = "bnk-welcome-monogram";
    letters.textContent = "BNK";
    orbit.appendChild(letters);
    const brand = document.createElement("div");
    brand.className = "bnk-welcome-brand";
    brand.textContent = "BNK SCHOOL OS";
    const copy = document.createElement("div");
    copy.className = "bnk-welcome-copy";
    copy.textContent = "ยินดีต้อนรับสู่ระบบบริหารจัดการโรงเรียน";
    const skip = document.createElement("button");
    skip.type = "button";
    skip.className = "bnk-welcome-skip";
    skip.textContent = "ข้าม";
    skip.addEventListener("click", removeWelcome);
    box.append(orbit, brand, copy, skip);
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    welcomeElement = backdrop;
    welcomeTimeout = setTimeout(removeWelcome, 2100);
  }

  function sync() {
    pendingFrame = false;
    const shell = app.querySelector(".dashboard");
    if (!shell) {
      if (initialized && app.querySelector(".auth-card")) {
        initialized = false;
        route = "dashboard";
        safeDelete(ROUTE_KEY);
        safeDelete(WELCOME_KEY);
        hasShownWelcome = false;
        removeWelcome();
      }
      return;
    }

    if (!initialized) {
      initialized = true;
      const rendered = activeRenderedRoute() || "dashboard";
      const remembered = history.state?.[historyMarker] || safeRead(ROUTE_KEY);
      route = rendered;
      if (remembered !== rendered && findView(remembered)) {
        recordHistory(remembered, true);
        // Hand off to existing bound view handlers once initial rendering is complete.
        requestAnimationFrame(() => activate(remembered, true));
      } else {
        recordHistory(rendered, true);
      }
      showWelcome();
    }

    const content = app.querySelector(".dashboard .content");
    if (!content) return;
    const actuallyRendered = activeRenderedRoute();
    if (actuallyRendered && actuallyRendered !== route && !content.querySelector(".bnk-module-loading")) {
      // Keep module links triggered by other existing internal controllers in sync.
      recordHistory(actuallyRendered, false);
    }
    if (route === "dashboard" || content.querySelector(".home-dashboard-v2")) {
      content.querySelector("[data-bnk-ux-toolbar]")?.remove();
      return;
    }
    if (!content.querySelector("[data-bnk-ux-toolbar]")) makeToolbar(content);
    else {
      const crumb = content.querySelector(".bnk-ux-crumb");
      if (crumb) crumb.textContent = viewLabel(route);
    }
  }

  function schedule() {
    if (pendingFrame) return;
    pendingFrame = true;
    requestAnimationFrame(sync);
  }

  document.addEventListener("click", event => {
    const signout = event.target.closest?.("#signout-btn,#pending-signout");
    if (signout) {
      safeDelete(ROUTE_KEY);
      safeDelete(WELCOME_KEY);
      route = "dashboard";
      initialized = false;
      hasShownWelcome = false;
      removeWelcome();
      return;
    }
    if (suppressClick || !app.contains(event.target)) return;
    const link = event.target.closest?.("[data-view]");
    if (!link) return;
    const view = link.dataset.view;
    if (!findView(view) || view === route) return;
    if (!leaveAllowed()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    recordHistory(view);
  }, true);

  window.addEventListener("popstate", event => {
    const view = event.state?.[historyMarker] || "dashboard";
    if (!leaveAllowed()) {
      recordHistory(route);
      return;
    }
    if (!activate(view, true) && view !== "dashboard" && findView("dashboard")) {
      activate("dashboard", true);
    }
    schedule();
  });

  const observer = new MutationObserver(records => {
    if (records.some(record => Array.from(record.addedNodes).concat(Array.from(record.removedNodes))
      .some(node => node.nodeType === 1 && !node.matches?.("[data-bnk-ux-toolbar]")))) schedule();
  });
  observer.observe(app, { childList: true, subtree: true });
  schedule();
})();
