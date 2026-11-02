from pathlib import Path
p=Path('app.js')
s=p.read_text()
def rep(a,b,label):
 global s
 count=s.count(a)
 if count!=1:raise RuntimeError(f"{label}: expected one location, got {count}")
 s=s.replace(a,b,1)

# An older imported roster omitted guardian surname, shifting all subsequent
# parental fields by one position. Correct future uploads of that specific form.
before='''disadvantaged_status:cleanExcelCell(at(34)),pending_disposal_status:cleanExcelCell(at(35))});out.push(o);'''
after='''disadvantaged_status:cleanExcelCell(at(34)),pending_disposal_status:cleanExcelCell(at(35))});
    const parentTitle=new Set(["นาย","นาง","นางสาว","เด็กหญิง"]);
    if(o.disadvantaged_status==null&&o.mother_occupation==="เด็กยากจน"
       &&parentTitle.has(o.guardian_relationship)&&parentTitle.has(o.father_occupation)){
      const old={...o};
      Object.assign(o,{
        guardian_last_name:null,
        guardian_occupation:old.guardian_last_name,
        guardian_relationship:old.guardian_occupation,
        father_prefix:old.guardian_relationship,
        father_first_name:old.father_prefix,
        father_last_name:old.father_first_name,
        father_occupation:old.father_last_name,
        mother_prefix:old.father_occupation,
        mother_first_name:old.mother_prefix,
        mother_last_name:old.mother_first_name,
        mother_occupation:old.mother_last_name,
        disadvantaged_status:old.mother_occupation
      });
    }
    out.push(o);'''
rep(before,after,"import shift repair")
# Old submitted/approved documents are immutable records, so strip only known
# exact occupation tails when displaying their saved parent/applicant name snapshots.
mark='async function academicCertificatePdfSigners()'
helper='''function academicRegistryPersonNameOnly(value){
  const name=String(value??"").replace(/\\s+/g," ").trim();
  if(!name)return "";
  return name.replace(/\\s+(?:เกษตรกรรม|เกษตรกร|รับจ้าง(?:ทั่วไป)?|ค้าขาย(?:ทั่วไป)?|ไม่ได้ประกอบอาชีพ|นักธุรกิจ-ค้าขาย|พนักงานรัฐวิสาหกิจ|พนักงาน\\/เจ้าหน้าที่ของรัฐ\\/ลูกจ้างประจำ\\/ลูกจ้างชั่วคราว|อื่น\\s*ๆ|อาชีพอิสระ)\\s*$/u,"").trim();
}
'''
rep(mark,helper+mark,"historic registry PDF helper")
# Request and certificate PDFs. Do not alter the signed request records or
# approval history themselves.
for a,b,label in [
 ('escapeHtml(r.father_name||"—")','escapeHtml(academicRegistryPersonNameOnly(r.father_name)||"—")',"father PDF"),
 ('escapeHtml(r.mother_name||"—")','escapeHtml(academicRegistryPersonNameOnly(r.mother_name)||"—")',"mother PDF"),
 ('escapeHtml(r.guardian_name||"")','escapeHtml(academicRegistryPersonNameOnly(r.guardian_name))',"guardian PDF"),
]:
 n=s.count(a)
 if n<1:raise RuntimeError(label+" missing")
 s=s.replace(a,b)
# Explicit applicant_name can also have an old suffix in submitted applications.
rep('escapeHtml(r.applicant_name||r.guardian_name||"")',
    'escapeHtml(academicRegistryPersonNameOnly(r.applicant_name||r.guardian_name))',
    "transfer applicant")
rep('escapeHtml(r.applicant_name||"")',
    'escapeHtml(academicRegistryPersonNameOnly(r.applicant_name))',
    "certificate applicant")
# Keep old guardian applicant names clean in the on-screen transfer detail too.
rep('escapeHtml(r.guardian_name)','escapeHtml(academicRegistryPersonNameOnly(r.guardian_name))',
    "transfer detail name")
# Route the same renderer into the academic registration form factory for
# old snapshots, without erasing any parent occupation field in the registry.
rep('mod.createAcademicFormsFeature({','mod.createAcademicFormsFeature({academicRegistryPersonNameOnly,',"form factory injection")
p.write_text(s)
form=Path("modules/academic-forms.js")
f=form.read_text()
old='const {ACADEMIC_CERTIFICATE_PURPOSE_LABEL,'
assert f.count(old)==1
f=f.replace(old,'const {academicRegistryPersonNameOnly,ACADEMIC_CERTIFICATE_PURPOSE_LABEL,',1)
f=f.replace('existing?.guardian_name||initialStudent?.guardian_name||""',
            'academicRegistryPersonNameOnly(existing?.guardian_name||initialStudent?.guardian_name||"")')
f=f.replace('existing?.applicant_name||initialStudent?.guardian_name||state.profile?.full_name||""',
            'academicRegistryPersonNameOnly(existing?.applicant_name||initialStudent?.guardian_name||state.profile?.full_name||"")')
form.write_text(f)
page=Path("index.html")
html=page.read_text()
assert html.count('app.min.js?v=5.12.9.62')==1
assert html.count('styles.css?v=5.12.9.26')==1
page.write_text(html.replace('app.min.js?v=5.12.9.62','app.min.js?v=5.12.9.63').replace('styles.css?v=5.12.9.26','styles.css?v=5.12.9.63'))
# Invalidate the dynamically imported form module after signature-safe patch.
s=p.read_text()
old='modules/academic-forms.js?v=5.12.9.59'
assert s.count(old)==1
p.write_text(s.replace(old,'modules/academic-forms.js?v=5.12.9.63'))
print('PARENT_IMPORT_AND_LEGACY_DOCUMENT_FIX_APPLIED')


# Last applied style override for PDF request approval cells.
style_file=Path("styles.css")
style_text=style_file.read_text()
style_override='/* BNK 2026-11-02: keep certificate-request approval text/signatures INSIDE all\n   three bordered sign-off cells. Overrides legacy fixed-height line boxes. */\n.cert-request-page .cert-approval-grid{\n  display:grid!important;\n  grid-template-columns:repeat(3,minmax(0,1fr))!important;\n  align-items:stretch!important;\n  flex:0 0 auto!important;\n  box-sizing:border-box!important;\n  min-height:47mm!important;\n  margin-top:auto!important;\n  overflow:visible!important;\n  break-inside:avoid!important;\n}\n.cert-request-page .cert-approval-box{\n  display:flex!important;\n  flex-direction:column!important;\n  justify-content:flex-start!important;\n  height:auto!important;\n  min-height:47mm!important;\n  min-width:0!important;\n  padding:2.4mm 2.3mm 2.2mm!important;\n  box-sizing:border-box!important;\n  overflow:visible!important;\n  font-size:12.5pt!important;\n  line-height:1.17!important;\n  text-align:left!important;\n  break-inside:avoid!important;\n}\n.cert-request-page .cert-approval-title{\n  flex:0 0 auto!important;\n  text-align:center!important;\n  font-size:13.5pt!important;\n  line-height:1.13!important;\n  margin:0 0 1mm!important;\n}\n.cert-request-page .cert-approval-choice{\n  flex:0 0 auto!important;\n  line-height:1.12!important;\n  margin:.35mm 0!important;\n}\n.cert-request-page .cert-reason{\n  flex:0 0 auto!important;\n  height:4.5mm!important;\n  min-height:4.5mm!important;\n  max-height:7mm!important;\n  line-height:1.12!important;\n  overflow:hidden!important;\n  font-size:12pt!important;\n  margin:0 0 .5mm!important;\n}\n.cert-request-page .cert-approval-signature{\n  display:flex!important;\n  flex-direction:column!important;\n  justify-content:flex-end!important;\n  flex:1 0 17mm!important;\n  min-height:17mm!important;\n  margin:0!important;\n  padding-top:1mm!important;\n  text-align:center!important;\n  box-sizing:border-box!important;\n}\n.cert-request-page .cert-sign-space{\n  flex:0 0 7mm!important;\n  height:7mm!important;\n}\n.cert-request-page .cert-sign-img{\n  max-width:37mm!important;\n  max-height:8mm!important;\n  margin:0 auto .6mm!important;\n  object-fit:contain!important;\n  flex:0 0 auto!important;\n}\n.cert-request-page .cert-sign-line{\n  display:flex!important;\n  flex:0 0 auto!important;\n  font-size:12pt!important;\n  line-height:1.1!important;\n  gap:1mm!important;\n  margin:0!important;\n}\n.cert-request-page .cert-sign-name,\n.cert-request-page .cert-sign-role{\n  flex:0 0 auto!important;\n  white-space:normal!important;\n  overflow-wrap:break-word!important;\n  font-size:12.5pt!important;\n  line-height:1.12!important;\n  margin:.4mm 0 0!important;\n}\n\n'
assert style_override not in style_text
style_file.write_text(style_text+"\n"+style_override)

# Keep the original regression suite aligned with the new content-cache versions.
for test_path in ("tests/certificate-preparer-schoolwide.test.mjs","tests/preschool-cover-signature-retro-20261102.test.mjs"):
    fp=Path(test_path);src=fp.read_text();needle=r'5\.12\.9\.62'
    assert src.count(needle)==1
    fp.write_text(src.replace(needle,r'5\.12\.9\.63'))
fp=Path("tests/module-boundaries.test.mjs")
src=fp.read_text()
needle="name==='academic-forms'?'5.12.9.59'"
assert src.count(needle)==1
fp.write_text(src.replace(needle,"name==='academic-forms'?'5.12.9.63'"))
