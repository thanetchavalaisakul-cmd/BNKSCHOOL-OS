// Shows a safe, opt-in refresh prompt instead of discarding unsaved teacher forms.
const release=document.querySelector('meta[name="bnk-release"]')?.content||"";
let lastChecked=0,checking=false,noticeShown=false;
async function checkSchoolOSRelease(){
  if(!release||checking||noticeShown||document.visibilityState==="hidden"||
     Date.now()-lastChecked<90000)return;
  checking=true;lastChecked=Date.now();
  try{
    const url=new URL("../index.html",import.meta.url);
    url.searchParams.set("_version_check",String(Date.now()));
    const response=await fetch(url,{cache:"no-store"});
    if(!response.ok)return;
    const html=await response.text();
    const latest=html.match(/<meta\s+name=["']bnk-release["']\s+content=["']([^"']+)/i)?.[1];
    if(!latest||latest===release)return;
    noticeShown=true;
    const banner=document.createElement("div");
    banner.setAttribute("role","status");
    banner.setAttribute("aria-live","polite");
    banner.style.cssText="position:fixed;z-index:999999;left:12px;right:12px;bottom:12px;max-width:560px;margin:auto;background:#17335d;color:#fff;box-shadow:0 12px 35px #0004;border-radius:13px;padding:14px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;font:15px/1.5 sans-serif";
    banner.innerHTML='<span style="flex:1 1 200px">BNK SCHOOL OS มีเวอร์ชันใหม่ กรุณาบันทึกงานที่กำลังกรอกก่อนอัปเดต</span>';
    const reload=document.createElement("button");
    reload.type="button";reload.textContent="อัปเดตหน้าเว็บ";
    reload.style.cssText="border:0;border-radius:9px;padding:9px 13px;background:white;color:#17335d;font-weight:bold;cursor:pointer";
    reload.addEventListener("click",()=>window.location.reload());
    banner.appendChild(reload);
    document.body.appendChild(banner);
  }catch(error){console.debug("BNK release check unavailable:",error?.message||error);}
  finally{checking=false;}
}
window.addEventListener("focus",()=>void checkSchoolOSRelease());
window.addEventListener("pageshow",()=>void checkSchoolOSRelease());
document.addEventListener("visibilitychange",()=>void checkSchoolOSRelease());
const releaseCheckTimer=setInterval(()=>void checkSchoolOSRelease(),120000);
releaseCheckTimer.unref?.();
