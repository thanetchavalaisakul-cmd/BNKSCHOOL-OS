import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createEducationFeeLegacy} from "../education-fee-legacy.js";
const fee=readFileSync(new URL("../education-fees.js",import.meta.url),"utf8");
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const pdf=readFileSync(new URL("../education-fee-print.js",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase/migrations/20261102_edufee_google_historical_import.sql",import.meta.url),"utf8");
const reconcile=readFileSync(new URL("../supabase/migrations/20261102_edufee_import_reconciliation_and_void.sql",import.meta.url),"utf8");

test("2018 legacy grades and academic year 2568 are available independently from 2569 term2",()=>{
 assert.equal(typeof createEducationFeeLegacy,"function");
 assert.match(fee,/\[F\.year,"2568","2569"/);
 assert.match(fee,/F\.year==="2568"\)return legacy\.view\(\)/);
 assert.match(sql,/edufee_no_2569_sem2_import/);
 assert.match(sql,/expected_term2=0 and source_paid_term2=0/);
});
test("imported source payments do not pretend to be dated receipts",()=>{
 assert.match(sql,/source_paid_term1 numeric/);
 assert.match(sql,/paid_on date not null/);
 assert.match(pdf,/importedFromSheet/);
 assert.match(pdf,/ไม่ใช่ใบเสร็จรับเงินย้อนหลัง/);
 assert.match(reconcile,/prevent double collection/i);
 assert.match(reconcile,/v_paid:=v_paid\+/);
});
test("manager receipt workflow has exact idempotency, remaining balance and void",()=>{
 assert.match(sql,/public\.edufee_is_manager\(\)/);
 assert.match(sql,/p_request/);
 assert.match(sql,/Payment exceeds imported outstanding balance/);
 assert.match(reconcile,/edufee_void_import_receipt/);
 assert.match(reconcile,/voided_at=clock_timestamp/);
});
test("frontend includes imported credits, historical PDF and CSV and updated module versions",()=>{
 assert.match(app,/education-fees\.js\?v=5/);
 assert.match(fee,/education-fee-legacy\.js\?v=2/);
 assert.match(fee,/legacy\.importedPaid\(sid,cat,sem\)/);
 assert.match(fee,/await legacy\.load\(\)/);
 assert.match(fee,/legacy\.bind\(\)/);
 const legacy=readFileSync(new URL("../education-fee-legacy.js",import.meta.url),"utf8");
 assert.match(legacy,/edufee_record_import_receipt/);
 assert.match(legacy,/edufee_void_import_receipt/);
 assert.match(legacy,/importedFromSheet:true/);
});
