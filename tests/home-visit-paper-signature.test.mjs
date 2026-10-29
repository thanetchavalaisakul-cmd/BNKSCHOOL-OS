import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase-home-visit-paper-signature-20261030.sql",import.meta.url),"utf8");

test("home visit offers 4 methods and explicit paper choice",()=>{
 const a=app.indexOf("function signatureMethodBlock("),b=app.indexOf("\nfunction homeVisitStep5",a);
 const form=app.slice(a,b);
 for(const method of ["paper","drawn","upload","stored"])
  assert.match(form,new RegExp('value="'+method+'"'));
 assert.doesNotMatch(form,/value="blank"/);
 assert.match(app,/window\.confirm\("ยืนยันบันทึกวิธีเซ็นบนกระดาษ/);
});
test("home visit paper selection is not a digital signature and preserves the audit timestamp",()=>{
 assert.match(sql,/ALTER COLUMN signed_at DROP NOT NULL/);
 assert.match(sql,/method='paper' AND signature_id IS NULL AND storage_path IS NULL AND signed_at IS NULL/);
 assert.match(sql,/NEW\.method_selected_by:=auth\.uid\(\)/);
 assert.match(sql,/NEW\.method_selected_at:=now\(\)/);
 assert.match(app,/signed_at:method==="paper"\?null:new Date\(\)\.toISOString\(\)/);
});
test("saved owner signature cannot be applied to students or guardians",()=>{
 assert.match(app,/!\["teacher","director"\]\.includes\(type\)/);
 assert.match(sql,/NEW\.signer_type NOT IN \('teacher','director'\)/);
 assert.match(sql,/s\.id=NEW\.signature_id AND s\.user_id=auth\.uid\(\)/);
 assert.match(app,/window\.confirm\("ยืนยันใช้ลายเซ็นจากบัญชีของคุณ/);
});
test("home visit signature replacement does not delete old record before new save",()=>{
 assert.match(app,/upsert\(payload,\{onConflict:"record_id,signer_type"\}\)/);
 assert.match(app,/sigs\.some\(x=>x\.signer_type==="director"\)\?null:await centralAutoSignatureAsset/);
});
