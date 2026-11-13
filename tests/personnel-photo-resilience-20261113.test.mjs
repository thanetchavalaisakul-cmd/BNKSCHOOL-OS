import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const optimized = readFileSync(new URL("../app.min.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const from = source.indexOf("async function loadPersonnelWorkspace");
const to = source.indexOf("function personnelRecordFor", from);
const loader = source.slice(from, to);

test("personnel photos use bounded, deduplicated batch signing", () => {
  assert.ok(from >= 0 && to > from);
  assert.match(loader, /createSignedUrls\(batch,\s*600\)/);
  assert.doesNotMatch(loader, /\.createSignedUrl\(/);
  assert.match(loader, /new Map\(\)/);
  assert.match(loader, /Promise\.allSettled\(photoJobs\)/);
  assert.match(loader, /Promise\.race\(/);
  assert.match(loader, /setTimeout\(resolve,\s*5000\)/);
});

test("optimized production entry and cache version contain personnel hotfix", () => {
  assert.match(optimized, /createSignedUrls\(batch,600\)/);
  assert.match(optimized, /Promise\.allSettled\(bnkPhotoJobs\)/);
  assert.match(html, /app\.min\.js\?v=5\.12\.9\.816/);
});
