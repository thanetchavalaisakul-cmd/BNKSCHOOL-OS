import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const resultSql=readFileSync(new URL("../supabase-central-notification-results-20261029.sql",import.meta.url),"utf8");
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");

test("approval outcomes reach active document submitters rather than all school users",()=>{
  assert.match(resultSql,/p\.account_status='active' AND p\.deleted_at IS NULL/);
  assert.match(resultSql,/d->>'submitted_by'/);
  assert.match(resultSql,/d->>'teacher_id'/);
  assert.match(resultSql,/shared_teacher_ids/);
  assert.match(resultSql,/p_new_status NOT IN \('approved','rejected','revision_requested','completed'\)/);
});
test("legacy leave, lesson, budget outcomes remain single-sourced",()=>{
  assert.match(resultSql,/p_system IN \('leave_management','lesson_plans','budget_disbursement'\)/);
  assert.match(resultSql,/ON CONFLICT \(recipient_id,workflow_key\) WHERE workflow_key IS NOT NULL DO NOTHING/);
});
test("bell opens both pending actions and results without auto-approving",()=>{
  assert.match(app,/central_approval_action","central_approval_result/);
  assert.match(app,/notification_kind==="result"/);
  assert.match(app,/function showNotificationModal\(category="all"\)/);
});
