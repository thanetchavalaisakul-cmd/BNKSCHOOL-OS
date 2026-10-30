
from pathlib import Path
import re
names=[
'tests/leave-substitute-signature-before-action.test.mjs',
'tests/navigation-performance.test.mjs',
'tests/performance-regression.test.mjs',
'tests/phase2-performance.test.mjs',
'tests/phase3-performance.test.mjs',
'tests/substitute-day-signature-atomic.test.mjs',
'tests/substitute-day-unrestricted.test.mjs'
]
pattern=r'readFileSync\(new URL\("\.\./app\.js",\s*import\.meta\.url\),\s*"utf8"\)'
for name in names:
 p=Path(name);s=p.read_text()
 m=re.search(pattern,s)
 assert m,name
 s=s[:m.end()]+'+"\\n"+readFileSync(new URL("../modules/dashboard-events.js",import.meta.url),"utf8")'+s[m.end():]
 p.write_text(s)
p=Path('tests/registration-signature-atomic.test.mjs');s=p.read_text()
m=re.search(pattern,s)
assert m
s=s[:m.end()]+'+"\\n"+readFileSync(new URL("../modules/academic-dialogs.js",import.meta.url),"utf8")'+s[m.end():]
a=s.index('const parts=Object.fromEntries(');b=s.index('\n\ntest(',a)
replacement='''const academicDialogSource=readFileSync(new URL("../modules/academic-dialogs.js",import.meta.url),"utf8");
const parts=Object.fromEntries(["academicDocumentServiceReviewModal","academicCertificateReviewModal","academicTransferReviewModal"].map(name=>{
 const a=academicDialogSource.indexOf("async function "+name+"(");
 assert.ok(a>=0,"missing modal "+name);
 const rest=academicDialogSource.slice(a);
 const match=/\\nasync function [A-Za-z_$]/.exec(rest.slice(10));
 const end=match?10+match.index:rest.length;
 return [name,rest.slice(0,end)];
}));'''
s=s[:a]+replacement+s[b:];p.write_text(s)
p=Path('tests/signature-nine-workflows-v48.test.mjs');s=p.read_text()
m=re.search(pattern,s);assert m
s=s[:m.end()]+'+"\\n"+readFileSync(new URL("../modules/personnel-dialogs.js",import.meta.url),"utf8")'+s[m.end():]
p.write_text(s)
print("Updated 9 original integration tests to look up implementation in moved modules.")

