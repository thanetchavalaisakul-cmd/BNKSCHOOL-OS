import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";

const source=new URL("../modules/student-photo-retro-manager.js",import.meta.url);
const js=readFileSync(source,"utf8");
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");

test("legacy compression pilot loads independently and parses",()=>{
  assert.doesNotThrow(()=>execFileSync(process.execPath,["--check",new URL(source).pathname]));
  assert.match(html,/student-photo-retro-manager\.js\?v=20261104\.1/);
  assert.match(js,/role==="super_admin"/);
  assert.match(js,/const bucket="student-photos",pilotLimit=3/);
});

test("legacy photo pilot is user-confirmed and preserves originals until verification",()=>{
  assert.match(js,/window\.confirm/);
  assert.match(js,/optimizeStudentPhotoForCard\(input\)/);
  assert.match(js,/download\(newPath\)/);
  assert.match(js,/downloaded\.data\.size!==item\.output\.size/);
  assert.match(js,/rpc\("set_student_photo"/);
  assert.match(js,/checkNew\.data\?\.photo_path!==newPath/);
  assert.match(js,/remove\(\[student\.photo_path\]\)/);
  assert.ok(js.indexOf('remove([student.photo_path])')>js.indexOf('checkNew.data?.photo_path!==newPath'));
  assert.match(js,/if\(newPath&&!linked\)/);
});
