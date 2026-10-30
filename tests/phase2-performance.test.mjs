import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const code=readFileSync(new URL("../app.js",import.meta.url),"utf8")+"\n"+readFileSync(new URL("../modules/dashboard-events.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");

test("registry changes re-use user-bound data and retain explicit refresh",()=>{
 assert.match(code,/state\.studentRegistryBaseLoadedUserId===state\.user\?\.id/);
 assert.match(code,/state\.studentRegistrySkipBaseOnce=true;state\.studentRegistryView=btn\.dataset\.studentView/);
 assert.match(code,/const shouldFetchRegistryBase=!state\.studentRegistrySkipBaseOnce/);
 assert.match(code,/id=\"student-registry-refresh\"/);
});
test("registry import and promotion heavy queries only run in their subviews",()=>{
 assert.match(code,/canManageStudentMasterUi\(\) && state\.studentRegistryView==='import_export'/);
 assert.match(code,/canUseStudentPromotionUi\(\) && state\.studentRegistryView==='promotion'/);
});
test("registration home launches no student-option RPC and each tab has isolated requests",()=>{
 assert.match(code,/const transfer=section==='transfer',certificate=section==='certificate',documents=section==='document_service'/);
 assert.match(code,/transfer\?supabase\.rpc\("get_transfer_request_student_options"/);
 assert.match(code,/certificate\?supabase\.rpc\("get_certificate_request_student_options"/);
 assert.match(code,/documents\?supabase\.rpc\("get_academic_document_service_student_options"/);
});
test("timetable reentry cached for one minute, with explicit fresh reload",()=>{
 assert.match(code,/TIMETABLE_REENTRY_CACHE_MS=60000/);
 assert.match(code,/id="timetable-refresh-workspace"/);
 assert.match(html,/app\.min\.js\?v=5\.12\.9\.\d+/);
});
