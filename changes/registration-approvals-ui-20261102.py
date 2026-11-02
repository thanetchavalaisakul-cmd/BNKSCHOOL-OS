from pathlib import Path
p=Path('app.js');s=p.read_text();D=chr(36);T=chr(96)
changes=[
("const requests=(state.academicTransferRequests||[]).filter(r=>Number(r.academic_year)===year&&Number(r.semester)===sem);",
"const requests=(state.academicTransferRequests||[]).filter(r=>(Number(r.academic_year)===year&&Number(r.semester)===sem)||(r.status==='submitted'&&['finance','registrar','assessment','director'].some(slot=>academicTransferCanReviewSlotUi(slot))));"),
("const requests=(state.academicCertificateRequests||[]).filter(r=>Number(r.academic_year)===year&&Number(r.semester)===sem);",
"const requests=(state.academicCertificateRequests||[]).filter(r=>(Number(r.academic_year)===year&&Number(r.semester)===sem)||(r.status==='submitted'&&['preparer','registrar','director'].some(slot=>academicCertificateCanReviewSlotUi(slot))));"),
("const rows=(state.academicDocumentServiceRequests||[]).filter(r=>!r.academic_year||(String(r.academic_year)===String(year)&&Number(r.semester||sem)===sem));",
"const rows=(state.academicDocumentServiceRequests||[]).filter(r=>!r.academic_year||(String(r.academic_year)===String(year)&&Number(r.semester||sem)===sem)||(r.status==='submitted'&&['assessment','registrar','director'].some(slot=>academicDocumentServiceCanReviewSlotUi(slot))));"),
('const sig=academicCertificateSignatureFor(r.id,slot),can=r.status!=="draft"&&academicCertificateCanReviewSlotUi(slot,r);',
'const sig=academicCertificateSignatureFor(r.id,slot),can=r.status!=="draft"&&academicCertificateCanReviewSlotUi(slot,r);\n  const isMySlot=academicCertificateCanReviewSlotUi(slot);\n  const waiting=r.status==="draft"?"ยังไม่ยื่นคำร้อง":isMySlot&&!can&&r.status==="submitted"?"รอการตรวจอนุมัติขั้นก่อนหน้า":"";'),
('const sig=academicDocumentServiceSignatureFor(r.id,slot),decision=r['+T+D+'{slot}_decision'+T+']||"pending",reason=r['+T+D+'{slot}_reason'+T+']||"",can=academicDocumentServiceCanReviewSlotUi(slot,r)&&r.status!=="draft";',
 'const sig=academicDocumentServiceSignatureFor(r.id,slot),decision=r['+T+D+'{slot}_decision'+T+']||"pending",reason=r['+T+D+'{slot}_reason'+T+']||"",can=academicDocumentServiceCanReviewSlotUi(slot,r)&&r.status!=="draft";\n  const isMySlot=academicDocumentServiceCanReviewSlotUi(slot);\n  const waiting=r.status==="draft"?"ยังไม่ยื่นคำร้อง":isMySlot&&!can&&r.status==="submitted"?"รอการตรวจอนุมัติขั้นก่อนหน้า":"";'),
('const sig=academicTransferSignatureFor(r.id,slot),canReview=r.status!=="draft"&&academicTransferCanReviewSlotUi(slot,r);',
 'const sig=academicTransferSignatureFor(r.id,slot),canReview=r.status!=="draft"&&academicTransferCanReviewSlotUi(slot,r);\n    const isMySlot=academicTransferCanReviewSlotUi(slot);\n    const waiting=r.status==="draft"?"ยังไม่ยื่นคำร้อง":isMySlot&&!canReview&&r.status==="submitted"?"รอการตรวจอนุมัติขั้นก่อนหน้า":"";')
]
for old,new in changes:
 if s.count(old)!=1:raise RuntimeError('Code drift '+old[:60]+' count '+str(s.count(old)))
 s=s.replace(old,new,1)
for attr in ('data-certificate-review-slot','data-document-service-slot','data-review-slot'):
 old=attr+'="'+D+'{slot}">ตรวจและลงนาม</button>'+T+':""}</article>'+T+';'
 new=attr+'="'+D+'{slot}">ตรวจและลงนาม</button>'+T+':waiting?'+T+'<small class="helper">'+D+'{waiting}</small>'+T+':""}</article>'+T+';'
 if s.count(old)!=1:raise RuntimeError('Card drift '+attr+' count '+str(s.count(old)))
 s=s.replace(old,new,1)
p.write_text(s)
p=Path('index.html');h=p.read_text()
assert h.count('app.min.js?v=5.12.9.59')==1
p.write_text(h.replace('app.min.js?v=5.12.9.59','app.min.js?v=5.12.9.60'))
p=Path('tests/certificate-preparer-schoolwide.test.mjs');h=p.read_text()
a=r'app\.min\.js\?v=5\.12\.9\.59';b=r'app\.min\.js\?v=5\.12\.9\.60'
assert h.count(a)==1
p.write_text(h.replace(a,b))
print('Registration reviewer UI rebuilt')
