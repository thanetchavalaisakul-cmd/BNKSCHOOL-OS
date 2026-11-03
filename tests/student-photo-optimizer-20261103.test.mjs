import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {optimizeStudentPhotoForCard,STUDENT_PHOTO_TARGET_BYTES,STUDENT_PHOTO_MAX_BYTES} from "../modules/student-photo-optimizer.js";

test("small, already suitable student image remains unchanged",async()=>{
  const file=new File([new Uint8Array(32*1024)],"tiny.png",{type:"image/png"});
  assert.equal(await optimizeStudentPhotoForCard(file),file);
});

test("unsupported and oversized camera files are rejected before upload",async()=>{
  await assert.rejects(optimizeStudentPhotoForCard(new File(["pdf"],"a.pdf",{type:"application/pdf"})),/JPG, PNG/);
  await assert.rejects(optimizeStudentPhotoForCard(new File([new Uint8Array(24*1024*1024+1)],"huge.jpg",{type:"image/jpeg"})),/24 MB/);
});

test("large student portrait is encoded locally as a reusable compact WebP",async()=>{
  const old={createImageBitmap:globalThis.createImageBitmap,document:globalThis.document};
  let closed=false,drawnWidth=0,drawnHeight=0;
  globalThis.createImageBitmap=async()=>({width:2000,height:3000,close(){closed=true;}});
  globalThis.document={createElement(tag){
    assert.equal(tag,"canvas");
    const canvas={width:0,height:0};
    canvas.getContext=()=>({fillRect(){},drawImage(_img,_x,_y,w,h){drawnWidth=w;drawnHeight=h;}});
    canvas.toBlob=(cb,type)=>cb(new Blob([new Uint8Array(55*1024)],{type}));
    return canvas;
  }};
  try{
    const input=new File([new Uint8Array(2*1024*1024)],"camera.jpg",{type:"image/jpeg"});
    const output=await optimizeStudentPhotoForCard(input);
    assert.equal(output.type,"image/webp");
    assert.ok(output.size<=STUDENT_PHOTO_TARGET_BYTES);
    assert.ok(output.size<=STUDENT_PHOTO_MAX_BYTES);
    assert.ok(output.size<input.size);
    assert.ok(drawnWidth<=800&&drawnHeight<=800);
    assert.equal(closed,true);
  }finally{
    globalThis.createImageBitmap=old.createImageBitmap;
    globalThis.document=old.document;
  }
});

test("conversion failures reject rather than silently uploading original photos",async()=>{
  const old={createImageBitmap:globalThis.createImageBitmap,document:globalThis.document};
  globalThis.createImageBitmap=async()=>({width:1600,height:2400,close(){}});
  globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},drawImage(){}}),toBlob(cb){cb(null);}})};
  try{
    const input=new File([new Uint8Array(250*1024)],"camera.jpg",{type:"image/jpeg"});
    await assert.rejects(optimizeStudentPhotoForCard(input),/แปลงไฟล์รูปภาพไม่สำเร็จ/);
  }finally{
    globalThis.createImageBitmap=old.createImageBitmap;
    globalThis.document=old.document;
  }
});

test("both existing upload routes use the prepared image and preserve card downloads",()=>{
  const src=readFileSync(new URL("../app.js",import.meta.url),"utf8");
  const min=readFileSync(new URL("../app.min.js",import.meta.url),"utf8");
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  assert.match(src,/import \{optimizeStudentPhotoForCard\} from "\.\/modules\/student-photo-optimizer\.js\?v=20261103\.1"/);
  assert.equal((src.match(/await optimizeStudentPhotoForCard\(original\)/g)||[]).length,2);
  assert.match(min,/student-photo-optimizer\.js\?v=20261103\.1/);
  assert.equal((min.match(/เตรียมรูปนักเรียนไม่สำเร็จ/g)||[]).length,2);
  assert.match(src,/studentPhotoDataUrl\(student\)/);
  assert.match(src,/supabase\.rpc\(["']set_student_photo["']/);
  assert.match(src,/if\(s\.photo_path&&s\.photo_path!==path\)/);
  assert.match(html,/app\.min\.js\?v=5\.12\.9\.788/);
});
