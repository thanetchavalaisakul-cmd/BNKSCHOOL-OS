import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/migrations/20261105_link_leave_director_all_day_substitute.sql',import.meta.url),'utf8');
const wholeDay=app.slice(app.indexOf('async function substituteAllDayPdfPreview('),
  app.indexOf('function substituteDayPlannerHtml()',app.indexOf('async function substituteAllDayPdfPreview(')));
const byPeriod=app.slice(app.indexOf('async function legacySubstitutePdfPreview('),
  app.indexOf('function substituteWorkspaceHtml(',app.indexOf('async function legacySubstitutePdfPreview(')));

test('whole-day PDF links the leave approval before loading substitute signatures',()=>{
 assert.match(wholeDay,/supabase\.rpc\("link_leave_director_signature_to_substitute_day"/);
 assert.ok(wholeDay.indexOf('link_leave_director_signature_to_substitute_day')
  <wholeDay.indexOf('schoolDocumentSignatureImages'));
 assert.match(wholeDay,/if\(linkedDirector\.error\)return toast/);
});
test('all-day renders the original signer without second director auto-sign',()=>{
 assert.doesNotMatch(wholeDay,/centralAutoSignatureAsset\("substitute_teaching"/);
 assert.match(wholeDay,/signer_name:linkedDirector\.data\?\.signer_name/);
 assert.match(wholeDay,/if\(!linkedDirector\.data\?\.linked\)documentImages\.director=null/);
 assert.match(wholeDay,/buildSubstituteDocument\(rows,signers,schoolLogo,approvedDirector,documentImages\)/);
});
test('existing per-period PDF signing flow stays unchanged',()=>{
 assert.match(byPeriod,/centralAutoSignatureAsset\("substitute_teaching",leaveRequestId\)/);
 assert.match(byPeriod,/schoolDocumentSignatureImages\(supabase,"substitute",leaveRequestId,leaveDate,toast\)/);
});
test('only users authorized to read a substitute lesson may inherit signature',()=>{
 assert.match(sql,/private\.is_active_user\(\)/);
 assert.match(sql,/private\.can_view_substitute_lesson\(sl\.id\)/);
 assert.match(sql,/raise exception 'Not authorized to view substitute document'/);
 assert.match(sql,/revoke all on function public\.link_leave_director_signature_to_substitute_day\(uuid\) from public, anon/);
 assert.match(sql,/grant execute on function public\.link_leave_director_signature_to_substitute_day\(uuid\) to authenticated/);
});
test('no signature is shown unless leave has director approval',()=>{
 assert.match(sql,/v_leave\.status<>'approved'/);
 assert.match(sql,/v_leave\.director_reviewed_at is null/);
 assert.match(sql,/approved_without_signature/);
 assert.match(sql,/leave_not_approved/);
});
test('paper method remains blank and original leave signature takes precedence',()=>{
 assert.match(sql,/document_kind='leave' and document_id=v_leave\.id/);
 assert.match(sql,/v_method:=v_source\.method/);
 assert.match(sql,/v_signature:=v_source\.signature_id/);
 assert.match(sql,/if v_method='paper' then\s+v_signature:=null;\s+v_signed_at:=null;/);
 assert.match(app,/docImages\._paperSlots\?\.has\("director"\)/);
});
test('link is idempotent and does not sign or approve leaves',()=>{
 assert.match(sql,/on conflict\(document_kind,document_id,document_date,slot_code\)/);
 assert.match(sql,/is distinct from/);
 assert.doesNotMatch(sql,/update\s+public\.leave_requests/i);
 assert.doesNotMatch(sql,/perform\s+public\.approve/i);
});
test('historical all-day assignments are backfilled from approved leave snapshots',()=>{
 assert.match(sql,/from public\.substitute_day_assignments d\s+join public\.leave_requests l/);
 assert.match(sql,/l\.status='approved'/);
 assert.match(sql,/s\.document_kind='leave'/);
 assert.match(sql,/where d\.status<>'cancelled'/);
});
