from pathlib import Path
p=Path("app.js");s=p.read_text()
old="""        guardian_last_name:null,
        guardian_occupation:old.guardian_last_name,"""
new="""        guardian_prefix:null,
        guardian_first_name:old.guardian_prefix,
        guardian_last_name:old.guardian_first_name,
        guardian_occupation:old.guardian_last_name,"""
assert s.count(old)==1
p.write_text(s.replace(old,new,1))
p=Path("index.html");s=p.read_text();assert s.count("app.min.js?v=5.12.9.63")==1;p.write_text(s.replace("app.min.js?v=5.12.9.63","app.min.js?v=5.12.9.64"))
for filename in ["tests/certificate-preparer-schoolwide.test.mjs","tests/preschool-cover-signature-retro-20261102.test.mjs","tests/academic-parent-fields-pdf-20261102.test.mjs"]:
 p=Path(filename);s=p.read_text();old=(r"app\.min\.js\?v=5\.12\.9\.63" if filename.endswith("academic-parent-fields-pdf-20261102.test.mjs") else r"5\.12\.9\.63");new=(r"app\.min\.js\?v=5\.12\.9\.64" if filename.endswith("academic-parent-fields-pdf-20261102.test.mjs") else r"5\.12\.9\.64");assert s.count(old)==1,(filename,s.count(old));p.write_text(s.replace(old,new))
p=Path("tests/academic-parent-fields-pdf-20261102.test.mjs");s=p.read_text()
# Instead of fragile anchor, add new assertions before the existing final import mapping check.
old=" assert.match(app,/disadvantaged_status:old\.mother_occupation/);"
assert s.count(old)==1
s=s.replace(old," assert.match(app,/guardian_first_name:old\.guardian_prefix/);\n assert.match(app,/guardian_last_name:old\.guardian_first_name/);\n"+old)
p.write_text(s)
print("GUARDIAN_IMPORT_ALIGNMENT_PATCH=OK")

