// Shared leave and substitute document signature support.
export const SCHOOL_SIGNATURE_DAY = '1900-01-01';

const toImageDataUrl = blob => new Promise((resolve,reject)=>{
  const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);
});
export async function schoolDocumentSignatureImages(client,kind,docId,date=null){
  const images={};
  const {data,error}=await client.from("school_document_signatures")
    .select("slot_code,signature_id,method").eq("document_kind",kind)
    .eq("document_id",docId).eq("document_date",date||SCHOOL_SIGNATURE_DAY);
  if(error){console.warn("document signatures",error);return images;}
  await Promise.all((data||[]).filter(s=>s.signature_id&&s.method!=="paper").map(async s=>{
    const {data:signature}=await client.from("signatures")
      .select("bucket_id,storage_path").eq("id",s.signature_id).maybeSingle();
    if(!signature?.storage_path)return;
    const dl=await client.storage.from(signature.bucket_id||"signatures").download(signature.storage_path);
    if(!dl.error&&dl.data) images[s.slot_code]=await toImageDataUrl(dl.data);
  }));
  return images;
}

async function preparePersonalSignature(client,userId,method,blob){
  if(!blob)throw Error("ยังไม่มีลายเซ็น");
  let mime,ext;
  if(method==="drawn"){mime="image/png";ext="png";}
  else{
    mime=blob.type;
    if(!["image/png","image/jpeg","image/webp"].includes(mime))throw Error("รองรับไฟล์ PNG, JPG, WebP");
    ext=mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg";
  }
  if(blob.size>5*1024*1024)throw Error("ลายเซ็นต้องไม่เกิน 5 MB");
  const path=userId+"/"+crypto.randomUUID()+"."+ext;
  const up=await client.storage.from("signatures").upload(path,blob,{contentType:mime,upsert:false});
  if(up.error)throw up.error;
  const ins=await client.from("signatures").insert({
    user_id:userId,label:"ลายเซ็นเอกสาร",bucket_id:"signatures",
    storage_path:path,source:method,is_default:false
  }).select("id").single();
  if(ins.error){
    await client.storage.from("signatures").remove([path]);throw ins.error;
  }
  return {id:ins.data.id,path};
}
async function rollbackPersonalSignature(client,created){
  if(!created)return;
  await client.from("signatures").delete().eq("id",created.id);
  await client.storage.from("signatures").remove([created.path]);
}
