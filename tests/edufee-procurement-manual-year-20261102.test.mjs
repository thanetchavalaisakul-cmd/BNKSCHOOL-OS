import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const fees=readFileSync(new URL("../education-fees.js",import.meta.url),"utf8");
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase/migrations/20261102_procurement_allow_manual_number_year.sql",import.meta.url),"utf8");

test("fee plan form submits, permits zero and validates only active cycle fields",()=>{
  assert.match(fees,/<button type="submit" class="btn btn-primary">บันทึกอัตราและรอบจัดเก็บ/);
  assert.doesNotMatch(fees,/step="0\.01" required value=/);
  assert.match(fees,/ev\.submitter\|\|form\.querySelector/);
  assert.match(fees,/cycle==="annual"\?\[0\]:\[1,2\]/);
  assert.match(fees,/Number\(value\)<0/);
  assert.match(fees,/supabase\.rpc\("edufee_save_fee_plan"/);
  assert.match(fees,/if\(error\)throw new Error/);
});
test("manual procurement document number preserves its entered year",()=>{
  assert.match(sql,/v_primary::text \|\| '\/' \|\| v_primary_year::text/);
  assert.match(sql,/v_secondary::text \|\| '\/' \|\| v_secondary_year::text/);
  assert.doesNotMatch(sql,/v_primary_year <> p_control_year/);
  assert.doesNotMatch(sql,/v_secondary_year <> p_control_year/);
  assert.match(sql,/n\.control_year=p_control_year/);
  assert.match(sql,/private\.has_procurement_module_access/);
  assert.match(app,/กรอกตามเลขคุมจริงได้ ไม่ต้องตรงกับปีงบประมาณที่เลือก/);
});
test("new release imports refreshed fee UI",()=>{
  assert.match(app,/education-fees\.js\?v=3/);
});
