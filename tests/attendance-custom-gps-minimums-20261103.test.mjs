import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const bundle=readFileSync(new URL("../app.min.js",import.meta.url),"utf8");
const migration=readFileSync(new URL("../supabase/migrations/20261103_attendance_custom_gps_minimums.sql",import.meta.url),"utf8");

for(const [name,content] of [["source",app],["deployed bundle",bundle]]){
 test(name+" exposes configurable positive radius and precision thresholds",()=>{
  assert.match(content,/name="allowed_radius_m" type="number" min="1" max="5000" step="1"/);
  assert.match(content,/name="max_accuracy_m" type="number" min="1" max="2000" step="1"/);
  assert.doesNotMatch(content,/name="allowed_radius_m" type="number" min="20"/);
  assert.doesNotMatch(content,/name="max_accuracy_m" type="number" min="10"/);
  assert.match(content,/ควรทดลองกับโทรศัพท์จริงก่อนใช้งาน/);
 });
 test(name+" keeps GPS limits in school-wide settings, not per teacher",()=>{
  assert.match(content,/official_attendance_settings/);
  assert.match(content,/allowed_radius_m/);
  assert.match(content,/max_accuracy_m/);
  assert.match(content,/navigator\.geolocation\.getCurrentPosition/);
 });
}

test("database constraints allow 1m, reject zero and leave upper limits intact",()=>{
 assert.match(migration,/CHECK \(allowed_radius_m BETWEEN 1 AND 5000\)/);
 assert.match(migration,/CHECK \(max_accuracy_m BETWEEN 1 AND 2000\)/);
 assert.doesNotMatch(migration,/UPDATE public\.official_attendance_settings/i);
 assert.doesNotMatch(migration,/DROP POLICY/i);
});
