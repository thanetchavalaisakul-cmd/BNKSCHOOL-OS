import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../dashboard-motion.css", import.meta.url), "utf8");
const js = readFileSync(new URL("../modules/dashboard-motion.js", import.meta.url), "utf8");

test("Dashboard motion is loaded separately without altering the main app bundle", () => {
  assert.match(html, /dashboard-motion\.css\?v=20261123\.1/);
  assert.match(html, /modules\/dashboard-motion\.js\?v=20261123\.1/);
  assert.match(html, /app\.min\.js\?v=5\.12\.9\.819/);
  assert.match(js, /app\.querySelector\("\.home-dashboard-v2"\)/);
  assert.doesNotMatch(css, /(?:^|\n)\s*(?:html|body|:root)\s*\{/);
});

test("Dashboard motion respects reduced-motion preference and stays dashboard-scoped", () => {
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(css, /prefers-reduced-motion: no-preference/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.home-dashboard-v2\.bnk-motion-ready/);
  assert.match(css, /\.home-progress i/);
  assert.match(css, /\.home-bar-row i/);
  assert.match(css, /\.home-ring/);
  assert.doesNotMatch(js, /localStorage|sessionStorage|supabase|fetch\(/);
});

function harness({ reduced = false, value = "153" } = {}) {
  const frames = [];
  const writes = [];
  const number = {
    isConnected: true,
    textContent: value,
  };
  const dashboard = {
    classList: { add: className => writes.push(className) },
    querySelectorAll(selector) {
      if (selector === ".home-summary-card strong") return [number];
      if (selector === ".home-summary-card, .home-module-card, .home-task") return [];
      return [];
    },
  };
  const app = {
    querySelector(selector) {
      assert.equal(selector, ".home-dashboard-v2");
      return dashboard;
    },
    contains: element => element === number,
  };
  const document = {
    getElementById: id => id === "app" ? app : null,
    visibilityState: "visible",
  };
  class Observer { constructor(callback) { this.callback = callback; } observe() {} }
  vm.runInNewContext(js, {
    document,
    window: { matchMedia: () => ({ matches: reduced }) },
    MutationObserver: Observer,
    requestAnimationFrame: fn => frames.push(fn),
    Number,
  });
  return { frames, writes, number };
}

test("Visible dashboard counts up to its original value without changing stored data", () => {
  const { frames, writes, number } = harness();
  assert.deepEqual(writes, ["bnk-motion-ready"]);
  for (const time of [0, 180, 360, 540, 720]) {
    const next = frames.shift();
    assert.equal(typeof next, "function");
    next(time);
  }
  assert.equal(number.textContent, "153");
});

test("Reduced motion bypasses animations, and nonnumeric counters remain unchanged", () => {
  const reduced = harness({ reduced: true });
  assert.deepEqual(reduced.writes, []);
  assert.equal(reduced.frames.length, 0);
  const textCounter = harness({ value: "ไม่ระบุ" });
  assert.deepEqual(textCounter.writes, ["bnk-motion-ready"]);
  assert.equal(textCounter.frames.length, 0);
});
