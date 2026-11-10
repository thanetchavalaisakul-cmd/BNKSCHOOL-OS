let sourcePromise;
async function loadSource() {
  if (!sourcePromise) {
    sourcePromise = (async () => {
      if (typeof DecompressionStream !== "function") throw new Error("เบราว์เซอร์นี้ไม่รองรับการโหลดโมดูล กรุณาอัปเดต Chrome");
      const response = await fetch(new URL("./payment-evidence-documents.source.gz.b64", import.meta.url), { cache: "no-store" });
      if (!response.ok) throw new Error("ไม่สามารถโหลดไฟล์ระบบหลักฐานการจ่ายเงินได้");
      const encoded = (await response.text()).trim();
      const binary = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
      const stream = new Blob([binary]).stream().pipeThrough(new DecompressionStream("gzip"));
      const source = await new Response(stream).text();
      const blobUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
      try { return await import(blobUrl); } finally { URL.revokeObjectURL(blobUrl); }
    })().catch(error => { sourcePromise = null; throw error; });
  }
  return sourcePromise;
}
export function createPaymentEvidenceFeature(ctx) {
  const { state, supabase } = ctx;
  return loadSource().then(mod => mod.createPaymentEvidenceFeature({ ...ctx, state, supabase }));
}
