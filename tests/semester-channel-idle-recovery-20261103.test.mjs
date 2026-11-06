import test from "node:test";
import assert from "node:assert/strict";
import {installSemesterLessonChannelControls} from "../modules/semester-lesson-plan-channels.js";

test("an idle semester tab can open settings again without the legacy loading handler",async()=>{
  const original={document:globalThis.document,window:globalThis.window,MutationObserver:globalThis.MutationObserver};
  const handlers={},windowHandlers={};
  const button={disabled:true,textContent:"กำลังเปิดการตั้งค่า..."};
  const radios=["drive_only","pdf_only","both"].map(value=>({value,checked:false,disabled:false}));
  const fields=new Map();
  const node=id=>{
    if(!fields.has(id))fields.set(id,{
      value:id==="#semester-channel-year"?"2569":id==="#semester-channel-term"?"2":"",
      disabled:false,hidden:false,
      addEventListener(){},remove(){}
    });
    return fields.get(id);
  };
  let opened=0;
  const modal={
    isConnected:false,querySelector(sel){
      const option=sel.match(/^\[name="semester-channel-mode"\]\[value="(.+)"\]$/);
      if(option)return radios.find(r=>r.value===option[1]);
      return node(sel);
    },
    querySelectorAll(sel){return sel.includes("semester-channel-mode")?radios:[];},
    addEventListener(){},remove(){this.isConnected=false;}
  };
  globalThis.document={
    visibilityState:"visible",documentElement:{dataset:{}},head:{appendChild(){}},
    body:{appendChild(el){assert.equal(el,modal);opened++;modal.isConnected=true;}},
    getElementById(id){return id==="semester-channel-settings-button"?button:null;},
    querySelector(sel){return sel===".semester-channel-modal"&&modal.isConnected?modal:null;},
    createElement(tag){return tag==="style"?{id:"",textContent:""}:modal;},
    addEventListener(type,cb){handlers[type]??=cb;}
  };
  globalThis.window={alert(){},addEventListener(type,cb){windowHandlers[type]=cb;}};
  globalThis.MutationObserver=class{observe(){}};
  const state={profile:{role:"super_admin"},departments:[],lessonPlanMode:"semester",
    academicTerms:[{academic_year:"2569",semester:2,is_current:true}],lessonPlans:[]};
  const supabase={from(table){return{
    select(){return this;},eq(){return this;},
    async maybeSingle(){return{data:table==="academic_terms"?{academic_year:"2569",semester:2,is_current:true}:{submission_mode:"drive_only"},error:null};}
  };}};
  try{
    installSemesterLessonChannelControls({state,supabase});
    let stopped=false,prevented=false;
    handlers.click({
      target:{closest(sel){assert.equal(sel,"#semester-channel-settings-button");return button;}},
      preventDefault(){prevented=true;},
      stopImmediatePropagation(){stopped=true;}
    });
    await Promise.resolve();
    assert.equal(prevented,true);
    assert.equal(stopped,true);
    assert.equal(button.disabled,false);
    assert.equal(button.textContent,"⚙ กำหนดวิธีส่งแผน");
    assert.equal(opened,1);
    windowHandlers.focus();
    assert.equal(button.textContent,"⚙ กำหนดวิธีส่งแผน");
    handlers.click({
      target:{closest(){return button;}},
      preventDefault(){},stopImmediatePropagation(){}
    });
    assert.equal(opened,1,"do not duplicate the settings modal");
    await new Promise(resolve=>setImmediate(resolve));
  }finally{
    globalThis.document=original.document;
    globalThis.window=original.window;
    globalThis.MutationObserver=original.MutationObserver;
  }
});
