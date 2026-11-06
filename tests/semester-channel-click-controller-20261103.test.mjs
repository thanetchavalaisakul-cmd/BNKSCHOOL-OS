import test from "node:test";
import assert from "node:assert/strict";
import {installSemesterLessonChannelControls} from "../modules/semester-lesson-plan-channels.js";

test("semester-plan settings button controller opens the modal and saves the chosen mode",async()=>{
  const old={document:globalThis.document,window:globalThis.window,MutationObserver:globalThis.MutationObserver};
  const events=[],nodes={};
  const radios=["drive_only","pdf_only","both"].map(value=>({value,checked:false,disabled:false}));
  const el=selector=>nodes[selector]??={
    value:selector==="#semester-channel-year"?"2569":selector==="#semester-channel-term"?"2":"",
    disabled:false,hidden:false,handlers:{},
    addEventListener(type,fn){this.handlers[type]=fn;},
    remove(){this.removed=true;}
  };
  const modal={
    isConnected:false,handlers:{},
    querySelector(selector){
      const v=selector.match(/^\[name="semester-channel-mode"\]\[value="(.*)"\]$/);
      if(v)return radios.find(item=>item.value===v[1]);
      if(selector==='[name="semester-channel-mode"]:checked')return radios.find(item=>item.checked);
      return el(selector);
    },
    querySelectorAll(selector){return selector.includes("semester-channel-mode")?radios:[];},
    addEventListener(type,fn){this.handlers[type]=fn;},
    remove(){this.isConnected=false;}
  };
  globalThis.document={
    documentElement:{dataset:{}},
    head:{appendChild(){}},
    body:{appendChild(value){assert.equal(value,modal);modal.isConnected=true;events.push("modal-created");}},
    getElementById(){return null;},
    createElement(tag){return tag==="style"?{id:"",textContent:""}:modal;},
    querySelector(){return null;},
    addEventListener(){}
  };
  globalThis.window={alert(message){events.push(String(message));}};
  globalThis.MutationObserver=class{observe(){}};
  try{
    const state={
      profile:{role:"super_admin"},departments:[],lessonPlanMode:"semester",
      academicTerms:[{academic_year:"2569",semester:2,is_current:true}],lessonPlans:[],
      user:{id:"11111111-1111-4111-8111-111111111111"}
    };
    let saved=null;
    const supabase={from(table){return{
      select(){return this;},eq(){return this;},
      async maybeSingle(){return{data:table==="academic_terms"?{academic_year:"2569",semester:2,is_current:true}:{submission_mode:"both"},error:null};},
      async upsert(data){saved={table,data};return{error:null};}
    };}};
    const controller=installSemesterLessonChannelControls({state,supabase});
    assert.equal(typeof controller.openSettings,"function");
    assert.equal(installSemesterLessonChannelControls({state,supabase}),controller);
    controller.openSettings();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(modal.isConnected,true);
    assert.equal(radios.find(r=>r.value==="drive_only").checked,true);
    for(const r of radios)r.checked=r.value==="drive_only";
    await el("#semester-channel-save").handlers.click();
    assert.equal(saved.table,"semester_lesson_plan_submission_settings");
    assert.equal(saved.data.academic_year,"2569");
    assert.equal(saved.data.semester,2);
    assert.equal(saved.data.submission_mode,"drive_only");
    assert.equal(modal.isConnected,false);
    assert.ok(events.some(x=>x.includes("บันทึกสำเร็จ")));
  }finally{
    globalThis.document=old.document;
    globalThis.window=old.window;
    globalThis.MutationObserver=old.MutationObserver;
  }
});
