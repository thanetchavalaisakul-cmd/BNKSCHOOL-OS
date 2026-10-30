from pathlib import Path
app=Path('app.js')
s=app.read_text()
pairs=[
("escapeHtml(c.teacher_name)+(c.available?' · ว่างทั้งวัน':' · '+(c.conflict_reason||\"ไม่ว่าง\"))",
 "escapeHtml(c.teacher_name)+(c.conflict_reason?' · '+escapeHtml(c.conflict_reason):' · เลือกได้')"),
("— เลือกครูที่ไม่มีภาระชนทั้งวัน —","— เลือกครูผู้รับผิดชอบทั้งวัน —"),
("ระบบตรวจคาบสอนประจำ คำขอลา และงานสอนแทนอื่นก่อนบันทึก ไม่จำกัดช่วงชั้นและไม่เพิ่มวิชาปลอม",
 "เลือกครูที่ยังใช้งานอยู่ได้แม้มีคาบสอน คำขอลา หรืองานอื่นซ้อนกัน โรงเรียนจัดภาระหน้าที่ภายในเอง โดยไม่แก้ตารางสอนหลัก"),
("ต้องเลือกครูที่ว่างตลอดทั้งวัน","เลือกครูผู้รับผิดชอบทั้งวันหนึ่งคน"),
("if(!selected?.available)return toast(\"ครูไม่ว่างทั้งวัน\",selected?.conflict_reason||\"กรุณาตรวจสอบตารางสอน\",\"error\");",
 "if(!selected?.available)return toast(\"ไม่สามารถเลือกครูผู้ลา\",selected?.conflict_reason||\"กรุณาเลือกครูคนอื่น\",\"error\");"),
]
for old,new in pairs:
 if s.count(old)!=1: raise RuntimeError('Expected one occurrence: '+old[:80]+' found '+str(s.count(old)))
 s=s.replace(old,new,1)
app.write_text(s)
print("UI_UNLOCK_PATCH_OK")
