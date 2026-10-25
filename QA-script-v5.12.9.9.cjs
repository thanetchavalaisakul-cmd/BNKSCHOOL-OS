'use strict';
const fs=require('fs');
const assert=require('assert');
const vm=require('vm');
const base=__dirname;
const app=fs.readFileSync(`${base}/app.js`,'utf8');
const sql=fs.readFileSync(`${base}/supabase-v5.12.9.9-admin-data-center-safe-resets.sql`,'utf8');
const css=fs.readFileSync(`${base}/styles.css`,'utf8');
let passed=0;
function test(name,fn){fn();++passed;console.log('PASS',String(passed).padStart(2,'0'),name)}
function view(state){
 const start=app.indexOf('function dataCenterResetPanel(){');
 const end=app.indexOf('function bindDataCenterEvents(){',start);
 assert(start>=0&&end>start);
 const script=`const DATA_CENTER_RESET_SCOPES=[{value:'preschool_units',label:'หน่วยการเรียนรู้ปฐมวัย',explanation:'หน่วยกลาง'},{value:'preschool_roster',label:'บัญชีครูเพิ่มเติม',explanation:'รายชื่อครู'}];\n`+
 `function dataCenterResetScopeLabel(code){return DATA_CENTER_RESET_SCOPES.find(x=>x.value===code)?.label||code;}\n`+
 `function dataCenterNum(v){return Number(v||0).toLocaleString('th-TH');}\n`+
 app.slice(start,end)+`\ndataCenterResetPanel();`;
 return vm.runInNewContext(script,{state,escapeHtml:x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')});
}
const core={dataCenterResetScope:'preschool_units',dataCenterResetYear:'2569',dataCenterResetSemester:'1',dataCenterResetPreview:null,dataCenterResetBusy:false,dataCenterResetError:'',dataCenterBackupConfirmed:false,dataCenterBackupReference:'',dataCenterConfirmation:''};
const preview={preview_id:'f-01',academic_year:2569,semester:1,count:3,breakdown:{preschool_shared_weekly_units:1,preschool_weekly_units:2}};
test('read-only overview preserved',()=>assert(app.includes('supabase.rpc("admin_data_center_overview")')));
test('two limited reset scopes',()=>assert(app.includes('const DATA_CENTER_RESET_SCOPES=[')&&app.includes('value:"preschool_roster"')));
test('no reset button before preview',()=>assert(!view(core).includes('id="dc-reset-execute"')));
test('preview displays counts',()=>assert(view({...core,dataCenterResetPreview:preview}).includes('3 รายการ')));
test('disabled without backup',()=>assert(/id="dc-reset-execute" disabled/.test(view({...core,dataCenterResetPreview:preview}))));
test('disabled with no typed confirmation',()=>assert(/id="dc-reset-execute" disabled/.test(view({...core,dataCenterResetPreview:preview,dataCenterBackupConfirmed:true,dataCenterBackupReference:'backup-verified-001'}))));
test('enabled after all confirmations',()=>assert(/id="dc-reset-execute"[^>]*>/.test(view({...core,dataCenterResetPreview:preview,dataCenterBackupConfirmed:true,dataCenterBackupReference:'backup-verified-001',dataCenterConfirmation:'รีเซต 2569/1'}))&&!/id="dc-reset-execute" disabled/.test(view({...core,dataCenterResetPreview:preview,dataCenterBackupConfirmed:true,dataCenterBackupReference:'backup-verified-001',dataCenterConfirmation:'รีเซต 2569/1'}))));
test('empty preview disables action',()=>assert(!view({...core,dataCenterResetPreview:{empty:true,count:0,breakdown:{}}}).includes('id="dc-reset-execute"')));
test('error string escapes markup',()=>assert(view({...core,dataCenterResetError:'<script>bad</script>'}).includes('&lt;script&gt;')));
test('reset SQL checks active super admin for every RPC',()=>assert((sql.match(/private\.is_super_admin\(\)/g)||[]).length>=3));
test('only enumerated reset targets in DELETE statements',()=>{
  const del=[...sql.matchAll(/\bDELETE\s+FROM\s+public\.(\w+)/gi)].map(x=>x[1]);
  assert.deepStrictEqual(del.sort(),['preschool_shared_weekly_units','preschool_staff_roster','preschool_weekly_units'].sort());
});
test('no TRUNCATE or cascade operation',()=>assert(!/\bTRUNCATE\s|\bDROP\s+TABLE\b|\bCASCADE\s*;/.test(sql.replace(/^--.*$/gm,''))));
test('no mutation of student-related tables',()=>assert(!/(DELETE|UPDATE|INSERT|TRUNCATE)\s+(?:FROM\s+|INTO\s+)?(?:public\.)?(students|student_enrollments|school_classes|profiles|auth\.)\b/i.test(sql.replace(/^--.*$/gm,''))));
test('runtime inbound foreign-key guard',()=>assert(sql.includes('confrelid=v_oid AND contype=\'f\'')));
test('runtime trigger guard',()=>assert(sql.includes('NOT tgisinternal')));
test('preview guarded by expiration and actor',()=>assert(sql.includes('v_preview.expires_at<=now()')&&sql.includes('v_preview.actor_id IS DISTINCT FROM auth.uid()')));
test('count rechecked before delete',()=>assert(sql.includes('v_detail<>v_preview.breakdown')));
test('no direct table access grants',()=>assert(sql.includes('REVOKE ALL ON TABLE private.admin_data_reset_previews,private.admin_data_reset_history FROM PUBLIC,anon,authenticated')));
test('history audit inserted atomically',()=>assert(sql.includes('INSERT INTO private.admin_data_reset_history')));
test('confirmation phrase enforced server-side',()=>assert(sql.includes("'รีเซต '||v_preview.academic_year||'/'||v_preview.semester")));
test('UI does not claim automatic backup verification',()=>assert(view(core).includes('ไม่สามารถยืนยันว่าแถวที่เลือกเป็นข้อมูลทดลองหรือมีไฟล์สำรอง')));
test('reset UX responsive styles',()=>assert(css.includes('v5.12.9.9 — admin-only controlled data resets')));
test('RPC names match front end to SQL',()=>{
 for(const n of ['admin_data_center_reset_preview','admin_data_center_execute_reset','admin_data_center_reset_history'])assert(app.includes(n)&&sql.includes(`public.${n}(`));
});
console.log(`ALL ${passed} TESTS PASSED`);
