import test from "node:test";
import assert from "node:assert/strict";
import {installSemesterLessonChannelControls} from "../modules/semester-lesson-plan-channels.js";

test("unmarked legacy semester form obeys database Drive-only policy",async()=>{
  const old={document:globalThis.document,window:globalThis.window,MutationObserver:globalThis.MutationObserver};
  const hint={textContent:""};
  const year={value:"2569",addEventListener(){}};
  const term={value:"2",addEventListener(){}};
  const pdf={dataset:{attachmentMethod:"pdf"},hidden:false,disabled:false,style:{display:""}};
  const drive={dataset:{attachmentMethod:"google_drive"},hidden:false,disabled:false,style:{display:""},
    click(){modal.dataset.attachmentMethod="google_drive";}};
  const box={querySelector(){return {};},insertBefore(){}};
  const form={dataset:{},isConnected:true,
    querySelector(selector){
      if(selector.includes("academic_year"))return year;
      if(selector.includes("semester"))return term;
      if(selector===".attachment-field")return box;
      return null;
    },
    addEventListener(){},closest(){return modal;}
  };
  const modal={dataset:{attachmentMethod:"pdf"},
    querySelector(selector){
      if(selector==="#lesson-form")return form;
      if(selector===".semester-channel-form-hint")return hint;
      if(selector.includes('data-attachment-method="google_drive"'))return drive;
      return null;
    },
    querySelectorAll(selector){return selector==="[data-attachment-method]"?[pdf,drive]:[];},
    addEventListener(){}
  };
  globalThis.document={
    documentElement:{dataset:{}},head:{appendChild(){}},body:{},
    getElementById(){return null;},
    createElement(tag){return tag==="style"?{id:"",textContent:""}:hint;},
    querySelector(selector){return selector==="#lesson-form"?form:null;},
    addEventListener(){}
  };
  globalThis.window={alert(message){throw new Error(String(message));}};
  globalThis.MutationObserver=class{observe(){}};
  const state={profile:{role:"teacher"},departments:[],lessonPlanMode:"semester",lessonDetail:null,lessonPlans:[]};
  const supabase={from(table){
    assert.equal(table,"semester_lesson_plan_submission_settings");
    return {select(){return this;},eq(){return this;},
      async maybeSingle(){return{data:{submission_mode:"drive_only"},error:null};}};
  }};
  try{
    installSemesterLessonChannelControls({state,supabase});
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(form.dataset.semesterChannelBound,"1");
    assert.equal(form.dataset.semesterChannelReady,"1");
    assert.equal(form.dataset.semesterChannelMode,"drive_only");
    assert.equal(pdf.hidden,true);
    assert.equal(pdf.disabled,true);
    assert.equal(pdf.style.display,"none");
    assert.equal(drive.hidden,false);
    assert.equal(drive.disabled,false);
    assert.equal(modal.dataset.attachmentMethod,"google_drive");
    assert.match(hint.textContent,/รับเฉพาะ Google Drive/);
  }finally{
    globalThis.document=old.document;
    globalThis.window=old.window;
    globalThis.MutationObserver=old.MutationObserver;
  }
});
