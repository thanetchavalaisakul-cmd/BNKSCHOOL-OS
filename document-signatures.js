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
