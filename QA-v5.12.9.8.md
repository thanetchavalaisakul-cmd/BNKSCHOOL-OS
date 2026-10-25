# QA — v5.12.9.8 ศูนย์จัดการข้อมูลระบบ

- JS syntax (`node --check app.js`): PASS
- Automated assertions (`node QA-script-v5.12.9.8.cjs`): 20/20 PASS
- Admin-only menu and SQL auth checks
- DB read-only / no DELETE, TRUNCATE, UPDATE, INSERT in inspected SQL
- Student protected modules not queried and no student table in SQL count manifest
- UI shows grouped count, dependencies and honest backup status
- ZIP CRC and file-preservation comparison required when packaging

หมายเหตุ: เป็นการทดสอบโค้ดและผลจำลอง ยังไม่ได้รัน SQL บน Supabase หรือทดสอบบัญชีผู้ใช้จริง
