import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createAcademicCertificateRegistryFeature} from "../modules/academic-certificate-registry.js";

const sql=readFileSync(new URL("../supabase/migrations/20261105_certificate_reserved_ranges.sql",import.meta.url),"utf8");
const source=readFileSync(new URL("../modules/academic-certificate-registry.js",import.meta.url),"utf8");

function mockFeature({year=2569,next=115,enabled=true,withReservation=false}={}){
  const calls=[],downloaded=[],sheets=[];
  let reserved=withReservation;
  const buttons=new Map();
  const db={
    from(name){
      assert.equal(name,"academic_certificate_registry");
      return {select(){return this;},eq(_key,value){assert.equal(value,year);return this;},
        order(){return this;},async range(){return {data:[],error:null};}};
    },
    async rpc(name,args){
      calls.push({name,args});
      if(name==="get_academic_certificate_reservation_stats")return {error:null,data:{
        academic_year:year,last_recorded:next-1,next_available:next,unsubmitted_reservations:0,
        reservation_enabled:enabled,reservation_reason:enabled?"":"รอนำเข้าทะเบียนเดิม"
      }};
      if(name==="get_academic_certificate_my_reservations")return {error:null,data:reserved?[{
        token:"12345678-1234-4123-8123-123456789abc",academic_year:year,
        next_serial:next,reserved_count:50,last_serial:next+49
      }]:[]};
      if(name==="reserve_academic_certificate_template"){
        assert.deepEqual(args,{p_year:year,p_quantity:50});
        reserved=true;
        return {error:null,data:{token:"12345678-1234-4123-8123-123456789abc",
          academic_year:year,next_serial:next,last_serial:next+49,reserved_count:50}};
      }
      if(name==="import_academic_certificate_template"){
        assert.equal(args.p_rows.length,50);
        return {error:null,data:{saved:50}};
      }
      throw Error("Unexpected RPC: "+name);
    }
  };
  const XLSX={utils:{
    aoa_to_sheet(rows){sheets.push(rows);return {};},
    book_new(){return {};},book_append_sheet(){}
  },write(){return new Uint8Array([80,75]);}};
  const feature=createAcademicCertificateRegistryFeature({
    supabase:db,state:{academicTerms:[{academic_year:year}]},escapeHtml:String,
    ensureXlsx:async()=>XLSX,downloadBlob(_blob,name){downloaded.push(name);},
    toast(){},async renderDashboard(){}
  });
  return {feature,calls,downloaded,sheets,buttons};
}

test("SQL allocates exclusive ranges under per-year transaction lock",()=>{
  assert.match(sql,/pg_advisory_xact_lock\(84179,p_year\)/);
  assert.match(sql,/academic_certificate_series_counters/);
  assert.match(sql,/reservation_kind='allocated'/);
  assert.match(sql,/reserved_count between 1 and 500/);
  assert.match(sql,/next_serial=v_end\+1/);
  assert.match(sql,/HISTORICAL_IMPORT_REQUIRED/);
  assert.match(sql,/values\s*\(2569,\s*false/);
  assert.match(sql,/issued_by=auth\.uid\(\)/);
  assert.match(sql,/RESERVED_QUANTITY_MISMATCH/);
  assert.match(sql,/LEGACY_TEMPLATE_MUST_REDOWNLOAD/);
  assert.match(sql,/enable row level security/i);
  assert.match(sql,/to authenticated/);
});

test("Year 2569 is blocked pending historic import while year 2570 may start at 1",async()=>{
  const a=mockFeature({enabled:false});
  await a.feature.load();
  assert.match(a.feature.view(),/ยังไม่เปิดจองเลขคุมปี 2569/);
  assert.match(a.feature.view(),/id="cert-ledger-download" disabled/);
  const b=mockFeature({year:2570,next:1});
  await b.feature.load();
  assert.match(b.feature.view(),/1\/2570/);
  assert.match(b.feature.view(),/id="cert-ledger-download" >/);
});

test("Reservation of 50 produces 50 consecutive text numbers and a recoverable file",async()=>{
  const t=mockFeature();
  await t.feature.load();
  const oldDoc=globalThis.document;
  const handlers=new Map();
  globalThis.document={getElementById(id){
    if(id==="cert-ledger-reserve-count")return {value:"50"};
    if(id==="cert-ledger-download")return {disabled:false,isConnected:true,
      addEventListener(_type,callback){handlers.set(id,callback);}};
    return null;
  }};
  try{
    await t.feature.bind();
    await handlers.get("cert-ledger-download")();
    assert.equal(t.downloaded.length,1);
    assert.match(t.downloaded[0],/115-164/);
    assert.equal(t.sheets[0].length,51);
    assert.equal(t.sheets[0][1][0],"115/2569");
    assert.equal(t.sheets[0][50][0],"164/2569");
    assert.deepEqual(t.sheets[1].find(x=>x[0]==="จำนวนที่จอง"),["จำนวนที่จอง",50]);
    assert.match(t.feature.view(),/แบบฟอร์มที่คุณจองไว้/);
  }finally{globalThis.document=oldDoc;}
});

test("User can download an existing reservation again without allocating more numbers",async()=>{
  const t=mockFeature({withReservation:true});
  await t.feature.load();
  const oldDoc=globalThis.document;
  const handlers=new Map();
  globalThis.document={getElementById(id){
    if(id==="cert-ledger-recover-0")return {disabled:false,isConnected:true,
      addEventListener(_type,cb){handlers.set(id,cb);}};
    return null;
  }};
  try{
    await t.feature.bind();
    await handlers.get("cert-ledger-recover-0")();
    assert.equal(t.downloaded.length,1);
    assert.ok(!t.calls.some(x=>x.name==="reserve_academic_certificate_template"));
  }finally{globalThis.document=oldDoc;}
});

test("XLSX import requires metadata token, correct year and exactly reserved quantity",()=>{
  assert.match(source,/รหัสแบบฟอร์ม/);
  assert.match(source,/rows\.length!==count/);
  assert.match(source,/file\.size>15\*1024\*1024/);
  assert.match(source,/cellDates:false,cellNF:true/);
  assert.match(source,/import_academic_certificate_template/);
  assert.match(source,/get_academic_certificate_my_reservations/);
});
