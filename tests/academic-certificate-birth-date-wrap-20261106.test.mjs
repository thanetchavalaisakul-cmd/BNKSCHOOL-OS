import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const app = readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css = readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const start = app.indexOf('function academicCertificateResultHtml(');
const end = app.indexOf('\nasync function academicCertificateBuildResultPdf(',start);
assert.ok(start>=0&&end>start,'must locate the issued ปพ.7 HTML function');

const createResultHtml = runInNewContext('('+app.slice(start,end).trim()+')',{
  state:{academicCertificateSettings:{certificate_valid_days:120}},
  academicRegThaiDateParts:value=>value==='birth'
    ? {day:'๑๒',month:'พฤศจิกายน',year:'๒๕๖๒'}
    : {day:'๔',month:'พฤศจิกายน',year:'๒๕๖๙'},
  academicRegPdfText:value=>String(value??''),
  academicRegFormalClassLabel:value=>String(value??''),
  academicRegThaiDigits:value=>String(value??''),
  escapeHtml:value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;'),
  schoolName:()=> 'โรงเรียนบ้านหนองเขียว',
  ACADEMIC_REG_GARUDA_DATA_URL:'data:image/png;base64,AA',
  academicCertificateResultSignBlock:()=>'<div class="cert-result-sign">signature</div>',
  Date
});

function certificate(studentName,citizenId){
  return createResultHtml({
    birth_date:'birth',
    finalized_at:'issue',
    student_name:studentName,
    student_code:'1234',
    citizen_id:citizenId,
    father_name:'นายทดสอบ ใจดี',
    mother_name:'นางทดสอบ ใจดี',
    class_label:'ประถมศึกษาปีที่ 1',
    academic_year:2569,
    official_document_number:'20/2569'
  },{director:{position_title:'ผู้อำนวยการโรงเรียนบ้านหนองเขียว'}},{});
}

test('short and long student records keep the complete birth date in one atomic span',()=>{
  for(const [name,id] of [
    ['ด.ช. ก','1234567890123'],
    ['เด็กชายชื่อยาวมาก นามสกุลยาวเป็นพิเศษ','12345678901234567890']
  ]){
    const html=certificate(name,id);
    assert.match(html,/<span class="cert-result-birth-date">เกิดวันที่ ๑๒ เดือน พฤศจิกายน พุทธศักราช ๒๕๖๒<\/span>/);
    assert.ok(html.indexOf('เลขประจำตัวประชาชน')<html.indexOf('cert-result-birth-date'));
    assert.match(html,/ใบรับรองการเป็นนักเรียน/);
    assert.match(html,/cert-result-bottom-grid/);
  }
});

test('birth-date styling prevents year-only line breaks without affecting other PDF forms',()=>{
  const rule=css.match(/\.academic-certificate-result-page \.cert-result-body-block \.cert-result-birth-date\s*\{([^}]+)\}/);
  assert.ok(rule,'only the issued academic certificate gets the nowrap rule');
  assert.match(rule[1],/display\s*:\s*inline-block\s*!important/i);
  assert.match(rule[1],/white-space\s*:\s*nowrap\s*!important/i);
  assert.match(css,/\.academic-certificate-result-page\s*\{[^}]*padding-top:38\.1mm!important/s);
  assert.equal((app.match(/class="cert-result-birth-date"/g)||[]).length,1);
  assert.match(app,/html2canvas\(page,\{scale:2\.4,backgroundColor:"#fff",useCORS:true,logging:false\}\)/);
});
