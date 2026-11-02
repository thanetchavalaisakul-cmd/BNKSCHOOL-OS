#!/usr/bin/env python3
"""Narrow certificate preparer UI fix; other modules and permissions unchanged."""
from pathlib import Path

def replace_once(text, old, new, label):
    if text.count(old) != 1:
        raise RuntimeError(f"{label}: expected exactly one match, got {text.count(old)}")
    return text.replace(old, new, 1)

app=Path("app.js")
src=app.read_text()
src=replace_once(src,
    "function academicCertificateCanConfigureUi(){",
    """// The assigned certificate preparer may issue certificates for every school class.
function academicCertificateCanPrepareUi(){
  const settings=state.academicCertificateSettings||{};
  return !!state.user?.id&&settings.preparer_user_id===state.user.id;
}
function academicCertificateCanConfigureUi(){""",
    "preparer role UI")
src=replace_once(src,
    "mod.createAcademicFormsFeature({ACADEMIC_CERTIFICATE_PURPOSE_LABEL,academicCertificateCanFinalizeUi,academicCertificateCanManageUi,",
    "mod.createAcademicFormsFeature({ACADEMIC_CERTIFICATE_PURPOSE_LABEL,academicCertificateCanFinalizeUi,academicCertificateCanManageUi,academicCertificateCanPrepareUi,",
    "academic form DI")
src=replace_once(src,
    "modules/academic-forms.js?v=5.12.9.58",
    "modules/academic-forms.js?v=5.12.9.59",
    "lazy academic module cache")
app.write_text(src)

module=Path("modules/academic-forms.js")
text=module.read_text()
text=replace_once(text,
    "const {ACADEMIC_CERTIFICATE_PURPOSE_LABEL,academicCertificateCanFinalizeUi,academicCertificateCanManageUi,",
    "const {ACADEMIC_CERTIFICATE_PURPOSE_LABEL,academicCertificateCanFinalizeUi,academicCertificateCanManageUi,academicCertificateCanPrepareUi,",
    "academic form factory contract")
text=replace_once(text,
    "const students=state.academicCertificateStudents||[],manager=academicCertificateCanFinalizeUi()||academicCertificateCanManageUi();",
    "const students=state.academicCertificateStudents||[],manager=academicCertificateCanFinalizeUi()||academicCertificateCanManageUi()||academicCertificateCanPrepareUi();",
    "assigned preparer classroom dropdown")
module.write_text(text)

testfile=Path("tests/module-boundaries.test.mjs")
text=testfile.read_text()
text=replace_once(text,
    """assert.ok(app.includes('import("./modules/'+name+'.js?v=5.12.9.58")'),name);""",
    """assert.ok(app.includes('import("./modules/'+name+'.js?v='+(name==='academic-forms'?'5.12.9.59':'5.12.9.58')+'")'),name);""",
    "lazy module version regression")
testfile.write_text(text)

index=Path("index.html")
text=index.read_text()
text=replace_once(text,
    "app.min.js?v=5.12.9.58",
    "app.min.js?v=5.12.9.59",
    "index cache version")
index.write_text(text)
print("Certificate preparer frontend patch applied and cache versions updated")
