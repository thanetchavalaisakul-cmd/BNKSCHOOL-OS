import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("production bundle boot remains syntactically valid before loading optional settings",()=>{
  const app=readFileSync(new URL("../app.min.js",import.meta.url),"utf8");
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  assert.doesNotMatch(app,/,let bnkSemesterSettingsOpening/);
  assert.match(app,/กำลังเปิดการตั้งค่า/);
  assert.match(html,/app\.min\.js\?v=5\.12\.9\.788/);
});
