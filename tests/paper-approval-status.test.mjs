import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {assertSignatureMethod,verifySignatureAction,canEmbedConfirmedSignature} from "../signature-standard.js";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const schoolSignatures=readFileSync(new URL("../document-signatures.js",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase-budget-paper-approval-20261030.sql",import.meta.url),"utf8");

test("paper is a valid authenticated document decision, with physical signature still pending",()=>{
 assert.equal(assertSignatureMethod("paper").online,false);
 assert.equal(verifySignatureAction({
  actorId:"u1",assignedUserId:"u1",method:"paper",documentId:"d1",signatureDocumentId:"d1",confirmedAt:"2026-10-30"
 }).onlineApproved,false);
 assert.equal(canEmbedConfirmedSignature({
  method:"paper",signedAt:"2026-10-30",confirmedAt:"2026-10-30",documentId:"d1",approvedDocumentId:"d1"
 }),false);
});

test("budget paper approval is explicitly confirmed, with personal identity and time in the database",()=>{
 assert.match(sql,/v_signer\.user_id IS DISTINCT FROM auth\.uid\(\)/);
 assert.match(sql,/v_signer\.method='paper'/);
 assert.match(sql,/v_signer\.signed_at IS NOT NULL/);
 assert.match(sql,/UPDATE public\.budget_disbursement_signers SET approved_at=now\(\)/);
 assert.match(app,/id="budget-confirm-paper"/);
 assert.match(app,/await confirmSigner\("paper"\)/);
 assert.match(app,/ensureInspected\(\)/);
 assert.match(app,/รับรองแล้ว · รอลงนามบนกระดาษ/);
 assert.match(app,/รับรองแล้ว · ลงนามอิเล็กทรอนิกส์/);
});

test("paper approved decisions retain printable blank signatures and never auto-embed director signature",()=>{
 assert.match(app,/s\.storage_path&&s\.approved_at&&s\.method!=="paper"/);
 assert.match(app,/s\.slot==="director"&&s\.approved_at&&s\.method!=="paper"/);
 assert.match(app,/sigMap\[s\.slot\]=\{name:s\.signer_name/);
 assert.doesNotMatch(app,/requireOnlineApproval:decision==="approve"/);
 assert.match(sql,/IF NOT EXISTS \(SELECT 1 FROM storage\.objects/);
 assert.match(sql,/p_inspection_confirmed IS DISTINCT FROM TRUE/);
});

test("paper completion notification is distinct from having physical signatures",()=>{
 assert.match(sql,/ผู้ที่เลือกกระดาษยังต้องลงลายเซ็นจริงในเอกสาร/);
 assert.match(app,/ดำเนินการรับรองแล้ว/);
 assert.match(app,/เลือกกระดาษแล้ว · ยังไม่รับรอง/);
});

test("explicit paper selection suppresses legacy or auto-executive PDF fallback in leave and substitute",()=>{
 assert.match(schoolSignatures,/Object\.defineProperty\(images,"_paperSlots"/);
 assert.match(app,/docImages\._paperSlots\?\.has\("director"\)\?null:assets\.directorSignature/);
 assert.match(app,/docImages\._paperSlots\?\.has\("director"\)\?null:directorSignature\?\.image/);
});
