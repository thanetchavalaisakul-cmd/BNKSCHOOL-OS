import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createAcademicCertificateRegistryFeature} from "../modules/academic-certificate-registry.js";

const moduleText=readFileSync(new URL("../modules/academic-certificate-registry.js",import.meta.url),"utf8");
const appText=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase/migrations/20261105_academic_certificate_registry.sql",import.meta.url),"utf8");

test("certificate registry module is connected to academic navigation and binds after render",()=>{
  assert.match(appText,/module:academic_certificate_registry/);
  assert.match(appText,/loadAcademicCertificateRegistryFeature/);
  assert.match(appText,/academicCertificateRegistryFeature.bind/);
  assert.match(appText,/academic_certificate_registry:"CERT"/);
});

test("certificate ledger keeps original five Excel headers and blocks inline number mutations",async()=>{
  assert.match(moduleText,/เลขเกียรติบัตร","คำนำหน้า ชื่อสกุล","ชั้น","รายการ","หมายเหตุ/);
  assert.match(moduleText,/reserve_academic_certificate_template/);
  assert.match(moduleText,/get_academic_certificate_reservation_stats/);
  assert.match(moduleText,/get_academic_certificate_my_reservations/);
  assert.match(moduleText,/import_academic_certificate_template/);
  assert.match(moduleText,/cellDates:false,cellNF:true/);
  assert.match(moduleText,/แบบฟอร์ม/);
  assert.match(sql,/unique\(academic_year,serial_no\)/);
  assert.match(sql,/NUMBER_SEQUENCE_INVALID/);
  assert.match(sql,/STALE_TEMPLATE/);
  assert.match(sql,/enable row level security/);
  const fakeQuery={
    select(){return this;},eq(){return this;},order(){return this;},
    async range(){return {data:[{academic_year:2569,serial_no:1,recipient_name:"ทดสอบ",grade_level:"ป.1",activity:"กิจกรรม",note:""}],error:null};}
  };
  const feature=createAcademicCertificateRegistryFeature({
    supabase:{from:()=>fakeQuery,async rpc(name){
      if(name==="get_academic_certificate_reservation_stats")
        return {data:{reservation_enabled:true,last_recorded:1,next_available:2,unsubmitted_reservations:0},error:null};
      if(name==="get_academic_certificate_my_reservations")
        return {data:[],error:null};
      throw new Error(name);
    }},state:{academicTerms:[{academic_year:2569}]},
    escapeHtml:s=>String(s),ensureXlsx:async()=>({}),downloadBlob(){},toast(){},async renderDashboard(){}
  });
  await feature.load();
  const html=feature.view();
  assert.match(html,/1\/2569/);
  assert.match(html,/2\/2569/);
  assert.match(html,/จองเลขและดาวน์โหลด Excel/);
  assert.match(html,/id="cert-ledger-reserve-count"/);
  assert.doesNotMatch(html,/id="cert-ledger-file" disabled/);
});

test("source Excel-date corruption is intentionally recovered only for matching year and first day",()=>{
  assert.match(moduleText,/Date\.UTC\(1899,11,30\)/);
  assert.match(moduleText,/date\.getUTCDate\(\)===1/);
  assert.match(moduleText,/NUMBER_SEQUENCE_INVALID|ต้องเป็นเลข/);
});