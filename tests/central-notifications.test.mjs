import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase-central-approval-notifications-20261029.sql",import.meta.url),"utf8");

test("central notifications register an action trigger for every approval-registry workflow",()=>{
  const routes=[
    "leave_management","lesson_plans","academic_certificate","academic_document_service",
    "academic_transfer","budget_disbursement","classroom_research","club_activity",
    "home_visit","learner_activities","learning_media","lesson_plan_usage",
    "post_lesson","substitute_teaching","timetable_management"
  ];
  for(const code of routes)assert.ok(sql.includes("private.central_document_notify_trigger('"+code+"')"),code);
  assert.match(sql,/AFTER INSERT OR UPDATE OF decision ON public\.approval_document_slots/);
});

test("reviewer recipient routing respects existing approval rights",()=>{
  assert.match(sql,/e\.executive_kind IN \('director','acting_director'\)/);
  assert.match(sql,/r\.executive_kinds \? e\.executive_kind/);
  assert.match(sql,/p\.account_status='active' AND p\.deleted_at IS NULL/);
  assert.match(sql,/g\.subject_group_id/);
  assert.match(sql,/private\.approval_slot_available/);
  assert.match(sql,/private\.central_notification_actionable/);
  assert.doesNotMatch(sql,/executive_kind IN \('director','deputy_director'/);
});

test("one pending-task notice per recipient and workflow, automatically closed on completion",()=>{
  assert.match(sql,/UNIQUE INDEX IF NOT EXISTS notifications_recipient_workflow_key_ux/);
  assert.match(sql,/ON CONFLICT \(recipient_id,workflow_key\) WHERE workflow_key IS NOT NULL DO NOTHING/);
  assert.match(sql,/dismissed_at=coalesce\(n\.dismissed_at,now\(\)\)/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.refresh_my_approval_notifications\(\) FROM PUBLIC,anon/);
});

test("bell links to the appropriate existing module and read does not approve",()=>{
  assert.match(app,/function openCentralApprovalNotification\(notificationId, modal=null\)/);
  assert.match(app,/data-notification-central/);
  assert.match(app,/centralApprovalSyncUser/);
  assert.match(app,/rpc\("refresh_my_approval_notifications"\)/);
  assert.match(app,/state\.academicSubmissionSection=system/);
  const start=app.indexOf("async function openCentralApprovalNotification(");
  const end=app.indexOf("\nfunction usersView()",start);
  assert.ok(start>=0&&end>start);
  const handler=app.slice(start,end);
  assert.match(handler,/read_at:new Date\(\)\.toISOString\(\)/);
  assert.doesNotMatch(handler,/mark_approval_slot|director_review|\\.rpc\("set_approval/);
});
