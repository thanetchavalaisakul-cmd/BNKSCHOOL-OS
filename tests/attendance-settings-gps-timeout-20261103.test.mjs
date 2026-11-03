import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const original=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const bundled=readFileSync(new URL("../app.min.js",import.meta.url),"utf8");
const page=readFileSync(new URL("../index.html",import.meta.url),"utf8");

function harness(source,minified){
 const modalName=minified?"n":"m";
 const begin=modalName+'.querySelector("#attendance-use-current-location").onclick=';
 const end=minified?',n.querySelector("#attendance-settings-save").onclick=':
  ';\n  m.querySelector("#attendance-settings-save").onclick=';
 const start=source.lastIndexOf(begin);
 assert.ok(start>=0,"admin GPS settings click handler present");
 const finish=source.indexOf(end,start+begin.length);
 assert.ok(finish>start,"admin GPS settings handler delimited");
 const code=source.slice(start+begin.length,finish);
 const button={disabled:false,textContent:"📍 ใช้ตำแหน่งปัจจุบัน",dataset:{}};
 const helper={textContent:"พิกัดจากเครื่อง · ความแม่นยำประมาณ ±26 เมตร"};
 const latitude={value:"19.7155463"},longitude={value:"98.9510708"},maxAccuracy={value:"150"};
 const inputs={
  "#attendance-location-helper":helper,
  '[name="school_latitude"]':latitude,
  '[name="school_longitude"]':longitude,
  '[name="max_accuracy_m"]':maxAccuracy
 };
 const modal={isConnected:true,querySelector:s=>inputs[s]};
 const timers=[],notices=[],calls=[];
 const loading=(btn,isLoading,label)=>{
  if(isLoading){btn.dataset.oldText=btn.textContent;btn.disabled=true;btn.textContent=label;}
  else{btn.disabled=false;btn.textContent=btn.dataset.oldText||btn.textContent;}
 };
 const context={
  m:modal,n:modal,
  navigator:{geolocation:{getCurrentPosition(success,error,options){calls.push({success,error,options});}}},
  window:{isSecureContext:true},
  toast:(...args)=>notices.push(args),g:(...args)=>notices.push(args),
  buttonLoading:loading,w:loading,
  setTimeout(fn,delay){const t={fn,delay,cancelled:false};timers.push(t);return t;},
  clearTimeout(t){t.cancelled=true;},
  Math,Number
 };
 const handler=runInNewContext("("+code+")",context);
 return {handler,button,helper,latitude,longitude,maxAccuracy,modal,timers,notices,calls,context};
}

for(const [title,source,minified] of [["source",original,false],["deployed bundle",bundled,true]]){
 test(title+": fast valid location, no automatic settings save",()=>{
  const f=harness(source,minified);
  f.handler({currentTarget:f.button});
  assert.equal(f.button.disabled,true);
  assert.equal(f.calls.length,1);
  assert.equal(f.calls[0].options.timeout,9000);
  assert.equal(f.calls[0].options.maximumAge,60000);
  assert.equal(f.timers[0].delay,12000);
  f.calls[0].success({coords:{latitude:19.72567891,longitude:98.94567891,accuracy:26}});
  assert.equal(f.latitude.value,"19.7256789");
  assert.equal(f.longitude.value,"98.9456789");
  assert.equal(f.button.disabled,false);
  assert.equal(f.timers[0].cancelled,true);
  assert.match(f.helper.textContent,/ตรวจสอบแล้วกดบันทึก/);
  assert.equal(f.notices.length,0);
 });
 test(title+": location never replies - watchdog releases UI and late callback is ignored",()=>{
  const f=harness(source,minified);
  f.handler({currentTarget:f.button});
  assert.equal(f.button.disabled,true);
  f.timers[0].fn();
  assert.equal(f.button.disabled,false);
  assert.equal(f.latitude.value,"19.7155463");
  assert.equal(f.longitude.value,"98.9510708");
  assert.match(f.helper.textContent,/พิกัดที่กรอกไว้ยังคงเดิม/);
  assert.match(f.notices[0][1],/GPS ใช้เวลานานเกินไป/);
  f.calls[0].success({coords:{latitude:0,longitude:0,accuracy:5}});
  assert.equal(f.latitude.value,"19.7155463");
  assert.equal(f.longitude.value,"98.9510708");
 });
 test(title+": denied permission leaves entered coordinates intact",()=>{
  const f=harness(source,minified);
  f.handler({currentTarget:f.button});
  f.calls[0].error({code:1});
  assert.equal(f.button.disabled,false);
  assert.equal(f.latitude.value,"19.7155463");
  assert.match(f.notices[0][1],/อนุญาต/);
 });
 test(title+": inaccurate location is rejected, and next attempt is possible",()=>{
  const f=harness(source,minified);
  f.handler({currentTarget:f.button});
  f.calls[0].success({coords:{latitude:19.5,longitude:98.5,accuracy:300}});
  assert.equal(f.latitude.value,"19.7155463");
  assert.match(f.notices[0][1],/เกินเกณฑ์/);
  assert.equal(f.button.disabled,false);
  f.handler({currentTarget:f.button});
  assert.equal(f.calls.length,2);
 });
 test(title+": unsupported, insecure, or synchronous errors never leave loading active",()=>{
  const unsupported=harness(source,minified);
  unsupported.context.navigator.geolocation=null;
  unsupported.handler({currentTarget:unsupported.button});
  assert.equal(unsupported.button.disabled,false);
  const insecure=harness(source,minified);
  insecure.context.window.isSecureContext=false;
  insecure.handler({currentTarget:insecure.button});
  assert.equal(insecure.button.disabled,false);
  const bad=harness(source,minified);
  bad.context.navigator.geolocation.getCurrentPosition=()=>{throw new Error("blocked");};
  bad.handler({currentTarget:bad.button});
  assert.equal(bad.button.disabled,false);
  assert.match(bad.helper.textContent,/พิกัดที่กรอกไว้ยังคงเดิม/);
 });
}

test("production page uses a new cache key for the repaired bundle",()=>{
 assert.match(page,/app\.min\.js\?v=5\.12\.9\.75/);
});
test("actual employee check-in positioning remains under its original GPS policy",()=>{
 assert.match(original,/function officialAttendanceGetPrecisePosition\(\)/);
 assert.match(original,/enableHighAccuracy:true,timeout:20000,maximumAge:0/);
});
