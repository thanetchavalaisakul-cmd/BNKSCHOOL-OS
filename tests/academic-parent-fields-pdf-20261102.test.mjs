import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const forms=readFileSync(new URL("../modules/academic-forms.js",import.meta.url),"utf8");
const migration=readFileSync(new URL("../supabase/migrations/20261102_parent_name_occupation_column_repair.sql",import.meta.url),"utf8");

test("legacy parent names show only name and surname, not occupation",()=>{
 const head="function academicRegistryPersonNameOnly(value)";
 const a=app.indexOf(head),b=app.indexOf("async function academicCertificatePdfSigners(",a);
 assert.ok(a>0&&b>a);
 const clean=new Function(app.slice(a,b)+"return academicRegistryPersonNameOnly;")();
 for(const [raw,expected] of [
  ["นาย สมชาย ใจดี เกษตรกรรม","นาย สมชาย ใจดี"],
  ["นาง สุภา แก้วดี รับจ้าง","นาง สุภา แก้วดี"],
  ["นาง พรทิพย์ ดีงาม พนักงานรัฐวิสาหกิจ","นาง พรทิพย์ ดีงาม"],
  ["นาย เก่ง เกษตรธานี","นาย เก่ง เกษตรธานี"],
  ["นาง อรวรรณ ค้าขายทั่วไป","นาง อรวรรณ"],
  ["คุณ ทดสอบ อื่น ๆ","คุณ ทดสอบ"],
  ["",""]
 ])assert.equal(clean(raw),expected);
});
test("parent data import detects displaced columns, preserving occupations separately",()=>{
 assert.match(app,/o\.mother_occupation==="เด็กยากจน"/);
 assert.match(app,/parentTitle\.has\(o\.guardian_relationship\)/);
 assert.match(app,/father_last_name:old\.father_first_name/);
 assert.match(app,/father_occupation:old\.father_last_name/);
 assert.match(app,/mother_last_name:old\.mother_first_name/);
 assert.match(app,/mother_occupation:old\.mother_last_name/);
 assert.match(app,/guardian_first_name:old\.guardian_prefix/);
 assert.match(app,/guardian_last_name:old\.guardian_first_name/);
 assert.match(app,/disadvantaged_status:old\.mother_occupation/);
 assert.match(forms,/academicRegistryPersonNameOnly\(existing\?\.guardian_name/);
});
test("private backup preserves original registry data before 609 exact row corrections",()=>{
 assert.match(migration,/CREATE TABLE IF NOT EXISTS private\.student_parent_columns_backup_20261102 AS/);
 assert.match(migration,/REVOKE ALL ON private\.student_parent_columns_backup_20261102 FROM PUBLIC,anon,authenticated/);
 assert.match(migration,/expected_count<>609/);
 assert.match(migration,/father_occupation=b\.father_last_name/);
 assert.match(migration,/mother_occupation=b\.mother_last_name/);
 assert.match(migration,/disadvantaged_status=b\.mother_occupation/);
 assert.doesNotMatch(migration,/UPDATE public\.academic_transfer_requests/);
});
test("old approved request snapshots remain intact, only rendered with normalized parent name",()=>{
 for(const name of ["r.father_name","r.mother_name","r.guardian_name","r.applicant_name"]){
  assert.ok(app.includes("academicRegistryPersonNameOnly("+name),name);
 }
 assert.match(app,/academicCertificateInfoCell\("บิดาชื่อ",escapeHtml\(academicRegistryPersonNameOnly/);
 assert.match(app,/academicCertificateInfoCell\("มารดาชื่อ",escapeHtml\(academicRegistryPersonNameOnly/);
});
test("certificate request PDF has three vertically contained signature panels",()=>{
 assert.match(css,/BNK 2026-11-02: keep certificate-request approval text/);
 assert.match(css,/\.cert-request-page \.cert-approval-grid\{/);
 assert.match(css,/\.cert-request-page \.cert-approval-box\{[^}]*display:flex!important/s);
 assert.match(css,/\.cert-request-page \.cert-approval-signature\{[^}]*margin:0!important/s);
 assert.match(css,/\.cert-request-page \.cert-sign-name,/);
 assert.match(html,/styles\.css\?v=5\.12\.9\.63/);
 assert.match(html,/app\.min\.js\?v=5\.12\.9\.64/);
});

