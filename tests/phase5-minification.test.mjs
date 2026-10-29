import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import test from "node:test";
const src=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const compiled=readFileSync(new URL("../app.min.js",import.meta.url),"utf8");
const index=readFileSync(new URL("../index.html",import.meta.url),"utf8");
test("production entry is the generated minified module",()=>{
 assert.match(index,/src="\.\/app\.min\.js\?v=5\.12\.9\.28"/);
 assert.doesNotMatch(index,/src="\.\/app\.js\?/);
 assert.match(compiled,/^import/);
 assert.doesNotMatch(compiled,/sourceMappingURL=/);
});
test("minified output preserves dynamic PDF/Excel imports and same-origin Garuda",()=>{
 assert.match(src,/async function ensureXlsx/);
 assert.match(compiled,/html2canvas@1\.4\.1/);
 assert.match(compiled,/jspdf@2\.5\.2/);
 assert.match(compiled,/xlsx@0\.18\.5/);
 assert.match(compiled,/procurement-excel-master-text\.js\?v=5\.12\.6/);
 assert.match(compiled,/garuda-official\.png/);
});
test("compiled script reduces transfer size while retaining lazy modules",()=>{
 const a=statSync(new URL("../app.js",import.meta.url)).size;
 const b=statSync(new URL("../app.min.js",import.meta.url)).size;
 assert.ok(b<a*0.95, `Expected compiled JS smaller: ${a} vs ${b}`);
 assert.ok(b>100000, "Bundled output unexpectedly empty");
});
