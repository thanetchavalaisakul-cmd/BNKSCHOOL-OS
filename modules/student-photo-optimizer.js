// BNK SCHOOL OS — cost-conscious student photo preparation.
// Only a small, reusable portrait file goes to the private student-photos bucket.
// Never upload the camera original after an optimization failure.
export const STUDENT_PHOTO_TARGET_BYTES=96*1024;
export const STUDENT_PHOTO_MAX_BYTES=224*1024;
const MAX_SOURCE_BYTES=24*1024*1024;
const ACCEPTED_TYPES=new Set(["image/jpeg","image/png","image/webp"]);

function canvasBlob(canvas,mime,quality){
  return new Promise((resolve,reject)=>{
    if(typeof canvas.toBlob!=="function")return reject(new Error("เบราว์เซอร์นี้ยังไม่รองรับการย่อรูปภาพ"));
    canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("แปลงไฟล์รูปภาพไม่สำเร็จ")),mime,quality);
  });
}

async function decodePhoto(file){
  if(typeof createImageBitmap==="function"){
    try{return await createImageBitmap(file,{imageOrientation:"from-image"});}
    catch{
      try{return await createImageBitmap(file);}catch{/* Use the image element fallback. */}
    }
  }
  if(typeof Image==="undefined"||typeof URL?.createObjectURL!=="function"){
    throw new Error("เบราว์เซอร์นี้ไม่สามารถอ่านรูปภาพได้");
  }
  return await new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const image=new Image();
    image.onload=()=>{URL.revokeObjectURL(url);resolve(image);};
    image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("ไฟล์ภาพเสียหายหรือไม่รองรับ"));};
    image.src=url;
  });
}

export async function optimizeStudentPhotoForCard(file){
  if(!file)throw new Error("กรุณาเลือกรูปนักเรียน");
  if(!ACCEPTED_TYPES.has(file.type))throw new Error("รองรับเฉพาะ JPG, PNG หรือ WebP");
  if(!Number.isFinite(file.size)||file.size<1||file.size>MAX_SOURCE_BYTES){
    throw new Error("รูปต้นฉบับต้องมีขนาดไม่เกิน 24 MB");
  }
  // A small image already costs less space than re-encoding it.
  if(file.size<=STUDENT_PHOTO_TARGET_BYTES)return file;
  let decoded;
  try{
    decoded=await decodePhoto(file);
    const sourceWidth=Number(decoded.width||decoded.naturalWidth);
    const sourceHeight=Number(decoded.height||decoded.naturalHeight);
    if(!(sourceWidth>0&&sourceHeight>0&&sourceWidth*sourceHeight<=100_000_000)){
      throw new Error("ขนาดภาพไม่ถูกต้องหรือใหญ่เกินกว่าจะประมวลผล");
    }
    const canvas=document.createElement("canvas");
    const context=canvas.getContext("2d",{alpha:false});
    if(!context)throw new Error("ไม่สามารถเตรียมพื้นที่ประมวลผลรูปภาพ");
    let best=null;
    outer:for(const maxEdge of [800,680,560,440]){
      const ratio=Math.min(1,maxEdge/Math.max(sourceWidth,sourceHeight));
      canvas.width=Math.max(1,Math.round(sourceWidth*ratio));
      canvas.height=Math.max(1,Math.round(sourceHeight*ratio));
      context.fillStyle="#fff";
      context.fillRect(0,0,canvas.width,canvas.height);
      context.imageSmoothingEnabled=true;
      context.imageSmoothingQuality="high";
      context.drawImage(decoded,0,0,canvas.width,canvas.height);
      for(const quality of [0.82,0.70,0.58,0.46]){
        let blob=await canvasBlob(canvas,"image/webp",quality);
        if(blob.type!=="image/webp"){
          blob=await canvasBlob(canvas,"image/jpeg",quality);
        }
        if(!ACCEPTED_TYPES.has(blob.type)||!blob.size)continue;
        if(!best||blob.size<best.size)best=blob;
        if(blob.size<=STUDENT_PHOTO_TARGET_BYTES)break outer;
      }
    }
    if(!best||best.size>STUDENT_PHOTO_MAX_BYTES){
      throw new Error("ไม่สามารถลดรูปให้มีขนาดเหมาะสมได้ กรุณาเลือกรูปอื่น");
    }
    if(file.size<=best.size&&file.size<=STUDENT_PHOTO_MAX_BYTES)return file;
    const ext=best.type==="image/webp"?"webp":"jpg";
    return new File([best],"student-photo-"+Date.now()+"."+ext,{type:best.type,lastModified:Date.now()});
  }finally{
    if(typeof decoded?.close==="function")decoded.close();
  }
}
