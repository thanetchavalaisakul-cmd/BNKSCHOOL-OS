import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../site-experience.css", import.meta.url), "utf8");
const source = readFileSync(new URL("../modules/site-experience.js", import.meta.url), "utf8");

test("Sitewide UX loads without replacing the app, Dashboard, or its original CSS", () => {
  assert.match(html, /site-experience\.css\?v=20261123\.1/);
  assert.match(html, /modules\/site-experience\.js\?v=20261123\.1/);
  assert.match(html, /dashboard-motion\.css\?v=20261123\.1/);
  assert.match(html, /app\.min\.js\?v=5\.12\.9\.819/);
  assert.doesNotMatch(css, /(?:^|\n)\s*(?:body|:root)\s*\{/);
});

test("Welcome uses BNK and BNK SCHOOL OS, once per session, with skip and reduced-motion controls", () => {
  assert.match(source, /letters\.textContent = "BNK"/);
  assert.match(source, /brand\.textContent = "BNK SCHOOL OS"/);
  assert.match(source, /skip\.textContent = "ข้าม"/);
  assert.match(source, /sessionStorage\.setItem/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.bnk-welcome-overlay/);
  assert.match(css, /\.bnk-welcome-orbit/);
});

test("Navigation buttons use the existing permission-scoped view controls", () => {
  assert.match(source, /app\.querySelectorAll\("\[data-view\]"\)/);
  assert.match(source, /if \(!button\) return false; \/\/ Never bypass visibility\/role permissions/);
  assert.match(source, /button\.click\(\)/);
  assert.match(source, /history\.pushState/);
  assert.match(source, /history\.replaceState/);
  assert.match(source, /window\.addEventListener\("popstate"/);
  assert.match(source, /function goBack\(\)/);
  assert.match(source, /sessionStorage\.getItem/);
});

test("Navigation, loading and buttons retain accessible fallback and user input safety", () => {
  assert.match(source, /function dirtyModalPresent\(\)/);
  assert.match(source, /event\.stopImmediatePropagation\(\)/);
  assert.match(source, /aria-label", "เส้นทางนำทาง"/);
  assert.match(css, /\.bnk-module-loading \.bnk-loading-spinner/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(source, /supabase\.|fetch\(|localStorage/);
});
