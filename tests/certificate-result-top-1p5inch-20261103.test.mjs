import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("official ปพ.7 begins its header after a precise 1.5-inch A4 top blank", () => {
  const marker = "BNK 2026-11-03: ปพ.7 official certificate starts below a full 1.5-inch";
  const last = css.lastIndexOf(marker);
  assert.ok(last > 0, "official certificate spacing rule must be present");
  const rule = css.slice(last);
  assert.match(rule, /\.academic-certificate-result-page\s*\{\s*padding-top:\s*38\.1mm!important;\s*\}/);
  assert.doesNotMatch(rule, /\.cert-request-page|\.academic-transfer-official-document/);
  assert.match(css, /\.cert-result-docno\{[\s\S]*?top:9mm;/);
  assert.match(css, /\.cert-result-code\{[\s\S]*?top:9mm!important;/);
  assert.match(css, /\.cert-result-garuda\{display:block;/);
});

test("official certificate top spacing is served with a refreshed stylesheet URL", () => {
  assert.match(html, /styles\.css\?v=5\.12\.9\.66\.1/);
});
