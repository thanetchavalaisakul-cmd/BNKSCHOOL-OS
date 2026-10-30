"""Apply a narrow, guarded, idempotent numeric-sort patch to BNK OS UI."""
from pathlib import Path
p=Path("app.js")
s=p.read_text()
anchor='import { openJointActivityModal } from "./timetable-joint.js?v=1";'
added='import { compareProjectRecords, compareActivityRecords } from "./project-natural-sort.mjs";'
if added not in s:
    assert s.count(anchor)==1, "Expected app import anchor exactly once"
    s=s.replace(anchor,anchor+"\n"+added)
updates=[
 ('state.schoolProjects=p.error?[]:(p.data||[]);','state.schoolProjects=p.error?[]:(p.data||[]).sort(compareProjectRecords);'),
 ('state.projectActivities=a.error?[]:(a.data||[]);','state.projectActivities=a.error?[]:(a.data||[]).sort(compareActivityRecords);'),
 ('state.procurementProjects=projectRes.error?[]:(projectRes.data||[]);','state.procurementProjects=projectRes.error?[]:(projectRes.data||[]).sort(compareProjectRecords);'),
 ('state.procurementActivities=activityRes.error?[]:(activityRes.data||[]);','state.procurementActivities=activityRes.error?[]:(activityRes.data||[]).sort(compareActivityRecords);'),
]
for old,new in updates:
    if new in s:
        continue
    assert s.count(old)==1, "Expected exactly one load assignment: "+old
    s=s.replace(old,new)
p.write_text(s)
p=Path("index.html")
s=p.read_text()
old="app.min.js?v=5.12.9.52"
new="app.min.js?v=5.12.9.53"
if new not in s:
    assert s.count(old)==1, "Expected exact app bundle version"
    s=s.replace(old,new)
p.write_text(s)
