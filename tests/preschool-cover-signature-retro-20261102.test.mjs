import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const schema=readFileSync(new URL("../supabase/migrations/20261102_preschool_cover_signatures_central.sql",import.meta.url),"utf8");
const page=readFileSync(new URL("../index.html",import.meta.url),"utf8");
test("existing preschool acknowledgements are not re-dated and only signed members get images",()=>{
 assert.match(schema,/get_preschool_cover_signature_assets\(p_cover_id uuid\)/);
 assert.match(schema,/m\.acknowledged_at IS NOT NULL/);
 assert.match(schema,/m\.is_available AND m\.is_current_staff/);
 assert.match(schema,/profile_current/);
 assert.match(schema,/preferred_method,'saved'\)<>'paper'/);
 assert.doesNotMatch(schema,/UPDATE public\.preschool_group_cover_members SET acknowledged_at=now/);
});
test("private signature images can only be downloaded by authorized preschool document viewers",()=>{
 assert.match(schema,/private\.can_read_preschool_cover_signature_storage\(p_bucket text,p_path text\)/);
 assert.match(schema,/private\.can_read_preschool_cover_signature\(g\.id\)/);
 assert.match(schema,/CREATE POLICY bnk_preschool_acknowledged_signatures_read/);
 assert.match(schema,/REVOKE ALL ON FUNCTION private\.can_read_preschool_cover_signature_storage/);
});
test("new acknowledgements require one of four central signature methods",()=>{
 assert.match(schema,/acknowledge_preschool_group_cover_signed/);
 for(const method of ["stored","drawn","upload","paper"])assert.ok(schema.includes("'"+method+"'"),method);
 assert.match(schema,/p_signature_id AND user_id=auth\.uid\(\)/);
 assert.match(schema,/public\.acknowledge_preschool_group_cover\(p_cover_id,p_acknowledge\)/);
 assert.match(app,/signatureOptionsHtml\(signatures\.length\?"stored":"paper"\)/);
 assert.match(app,/preschoolCoverChooseSignature\(\)/);
 assert.match(app,/supabase\.rpc\("acknowledge_preschool_group_cover_signed"/);
});
test("PDF uses current saved signature only for already acknowledged teachers with explicit label",()=>{
 assert.match(app,/supabase\.rpc\("get_preschool_cover_signature_assets"/);
 assert.match(app,/signatureByTeacher/);
 assert.match(app,/class="ps-sign-image"/);
 assert.match(app,/ภาพลายเซ็นจากโปรไฟล์ ณ วันที่พิมพ์/);
 assert.match(app,/ลงนามย้อนหลัง/);
 assert.match(app,/preschoolCoverWetSignature\("ผู้อำนวยการโรงเรียน"/);
 assert.match(page,/app\.min\.js\?v=5\.12\.9\.63/);
});

