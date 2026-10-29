import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase-academic-stored-signature-20261030.sql",import.meta.url),"utf8");
const maps=[
 ["post_lesson","postLessonSaveDirectSignature","academic_post_lesson_signatures"],
 ["lesson_plan_usage","lessonUsageSaveSignature","academic_lesson_plan_usage_signatures"],
 ["learning_media","learningMediaSaveSignature","academic_learning_media_signatures"],
 ["classroom_research","classroomResearchSaveSignature","academic_classroom_research_signatures"],
 ["learner_activities","learnerActivitySaveSignature","academic_learner_activity_signatures"],
 ["club_activity","clubActivitySaveSignature","academic_club_activity_signatures"]
];
test("six academic reporting systems route saved signatures through central verified owner RPC",()=>{
 for(const [code,fn,table] of maps){
  const a=app.indexOf("function "+fn+"(");
  assert.ok(a>=0,fn);
  const block=app.slice(a,a+1500);
  assert.match(block,/method==="stored"/);
  assert.match(block,/set_academic_report_saved_signature/);
  assert.ok(block.includes('p_system_code:"'+code+'"'),code);
  assert.match(sql,new RegExp('public\\.'+table));
  assert.match(sql,new RegExp("WHEN '"+code+"' THEN"));
 }
});
test("six academic report forms offer fourth saved signature method and preserve paper",()=>{
 assert.ok((app.match(/"stored","ลายเซ็นที่บันทึกไว้"/g)||[]).length>=11);
 assert.match(app,/data-post-sign-method="stored"/);
 assert.match(app,/if\(method==="stored"\)/);
 assert.match(sql,/method IN\('paper','drawn','upload','stored'\)/);
});
test("saved signature validates actual actor and allows document viewers to see only referenced image",()=>{
 assert.match(sql,/s.id=p_signature_id AND s.user_id=auth.uid\(\)/);
 assert.match(sql,/o.bucket_id=v_master.bucket_id AND o.name=v_master.storage_path/);
 assert.match(sql,/private.is_active_user\(\)/);
 assert.match(sql,/academic_submission_saved_signature_view/);
 for(const [code,_,table] of maps){
  assert.match(sql,new RegExp('private\\.can_view_'+(code==="learner_activities"?"learner_activity":code)+'_report'));
 }
});
test("six signatures preserve legacy role validations, workflow approval transitions and audit image identity",()=>{
 assert.match(sql,/PERFORM public\.set_post_lesson_signature/);
 assert.match(sql,/PERFORM public\.set_lesson_plan_usage_signature/);
 assert.match(sql,/PERFORM public\.set_learning_media_signature/);
 assert.match(sql,/PERFORM public\.set_classroom_research_signature/);
 assert.match(sql,/PERFORM public\.set_learner_activity_signature/);
 assert.match(sql,/PERFORM public\.set_club_activity_signature/);
 assert.match(sql,/UPDATE public\.approval_document_slots/);
 assert.match(sql,/master_signature_id=\$3/);
});
