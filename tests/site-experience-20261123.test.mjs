import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../site-experience.css", import.meta.url), "utf8");
const source = readFileSync(new URL("../modules/site-experience.js", import.meta.url), "utf8");

test("Sitewide UX loads without replacing the app, Dashboard, or its original CSS", () => {
  assert.match(html, /site-experience\.css\?v=20261123\.2/);
  assert.match(html, /modules\/site-experience\.js\?v=20261123\.2/);
  assert.match(html, /dashboard-motion\.css\?v=20261123\.1/);
  assert.match(html, /app\.min\.js\?v=5\.12\.9\.819/);
  assert.doesNotMatch(css, /(?:^|\n)\s*(?:body|:root)\s*\{/);
});

test("Welcome uses the existing school crest instead of BNK letters", () => {
  assert.ok(source.includes('document.createElement("img")'));
  assert.ok(source.includes('schoolLogo.className = "bnk-welcome-school-logo"'));
  assert.ok(source.includes('schoolLogo.src = "./school-logo.png?v=20261029"'));
  assert.ok(source.includes('schoolLogo.alt = "ตราสัญลักษณ์โรงเรียนบ้านหนองเขียว"'));
  assert.ok(!source.includes('letters.textContent = "BNK"'));
  assert.ok(source.includes('brand.textContent = "BNK SCHOOL OS"'));
  assert.ok(source.includes('bnk:ux:welcome:v2'));
  assert.ok(source.includes('skip.textContent = "ข้าม"'));
  assert.ok(source.includes('prefers-reduced-motion: reduce'));
  assert.ok(css.includes(".bnk-welcome-overlay"));
  assert.ok(css.includes(".bnk-welcome-orbit"));
  assert.ok(css.includes(".bnk-welcome-school-logo"));
  assert.ok(statSync(new URL("../school-logo.png", import.meta.url)).size > 10000);
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
