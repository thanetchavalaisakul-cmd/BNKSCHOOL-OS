"""Patch BNK School OS existing leave UI for official duty, preserving normal leave."""
from pathlib import Path
import re

path = Path("app.js")
s = path.read_text(encoding="utf-8")

def replace_once(old, new, label):
    global s
    found = s.count(old)
    if found != 1:
        raise RuntimeError(f"{label}: expected exactly one anchor, found {found}")
    s = s.replace(old, new, 1)

def replace_in_fn(name, old, new, label):
    global s
    match = re.search(r"(?m)^(?:async\s+)?function\s+" + re.escape(name) + r"\s*\(", s)
    if not match:
        raise RuntimeError(f"{name}: function not found")
    next_fn = re.search(r"(?m)^(?:async\s+)?function\s+\w+\s*\(", s[match.end():])
    end = match.end() + next_fn.start() if next_fn else len(s)
    part = s[match.start():end]
    found = part.count(old)
    if found != 1:
        raise RuntimeError(f"{name}: {label}, expected once found {found}")
    part = part.replace(old, new, 1)
    s = s[:match.start()] + part + s[end:]

replace_once("function leaveTypeByCode(code) {",
"""function isOfficialDutyRequest(request) {
  return request?.leave_type_code === "official_duty";
}

function leaveTypeByCode(code) {""", "official-duty helper")

replace_in_fn("leaveTypeStatsForUser",
    "  return state.leaveTypes.map(type => {",
    '  return state.leaveTypes.filter(type => type.code !== "official_duty").map(type => {',
    "leave report columns exclude official duty")
for fn in ("schoolLeaveSummaryRows", "leavePeriodOverviewStats"):
    replace_in_fn(fn,
      "const approved = leavePeriodRequests({ approvedOnly: true });",
      "const approved = leavePeriodRequests({ approvedOnly: true }).filter(r => !isOfficialDutyRequest(r));",
      "school leave summary exclude official duty")
replace_in_fn("leaveIndividualReportSectionHtml",
    'const approved = requests.filter(r=>r.status==="approved");',
    'const approved = requests.filter(r=>r.status==="approved" && !isOfficialDutyRequest(r));',
    "person leave totals exclude official duty")
replace_in_fn("buildSchoolLeaveReportHtml",
    "const activeTypes=state.leaveTypes;",
    'const activeTypes=state.leaveTypes.filter(t => t.code !== "official_duty");',
    "school PDF excludes official duty category")

replace_in_fn("leaveOwnDashboardHtml",
    '    r.status === "approved"\n',
    '    r.status === "approved"\n    && !isOfficialDutyRequest(r)\n',
    "approved leave metric")
replace_in_fn("leaveOwnDashboardHtml",
    '  ).length;\n  return `<section class="leave-hero">',
    '  ).length;\n  const officialApproved = requests.filter(r => isOfficialDutyRequest(r) && r.status === "approved" && Number(r.academic_year) === Number(period.academicYear) && Number(r.semester) === Number(period.semester)).length;\n  return `<section class="leave-hero">',
    "official duty approved metric")
replace_in_fn("leaveOwnDashboardHtml",
    'วันลาของฉัน</h2><p>ยื่นคำขอ ติดตามสถานะ และดูประวัติวันลาของคุณ',
    'วันลา / ไปราชการของฉัน</h2><p>บันทึกการลาและการไปราชการ ติดตามสถานะ และจัดสอนแทนจากตารางสอนเดิม',
    "own leave heading")
replace_in_fn("leaveOwnDashboardHtml",
    '＋ ยื่นคำขอลา</button>',
    '＋ บันทึกลา / ไปราชการ</button>',
    "new request button")
replace_in_fn("leaveOwnDashboardHtml",
    'อนุมัติภาคเรียนนี้</div><div class="metric-value">${approved}</div></article>',
    'อนุมัติการลาภาคเรียนนี้</div><div class="metric-value">${approved}</div></article>\n    <article class="metric-card"><div class="metric-label">ไปราชการที่อนุมัติ</div><div class="metric-value">${officialApproved}</div></article>',
    "separate own dashboard official duty metric")
replace_in_fn("leaveOwnDashboardHtml",
    '<h3>ประวัติวันลา</h3>',
    '<h3>ประวัติการลา / ไปราชการ</h3>',
    "shared request history")

replace_in_fn("leaveHistoryTable",
    'ยังไม่มีรายการวันลา',
    'ยังไม่มีรายการลา / ไปราชการ',
    "empty request list")
replace_in_fn("leaveHistoryTable",
    '        <td><strong>${Number(r.leave_days)} วัน</strong></td>',
    '        <td><strong>${Number(r.leave_days)} วัน</strong>${isOfficialDutyRequest(r)?`<br><span class="table-muted">ไปราชการ · ไม่หักวันลา</span>`:""}</td>',
    "label official duration")

replace_in_fn("leaveDetailHtml",
    '<small>จำนวนวันลา</small>',
    '<small>${isOfficialDutyRequest(request)?"ระยะเวลาไปราชการ · ไม่หักวันลา":"จำนวนวันลา"}</small>',
    "detail duration")
replace_in_fn("leaveDetailHtml",
    'planField("วันที่เริ่มลา",',
    'planField(isOfficialDutyRequest(request)?"วันที่เริ่มไปราชการ":"วันที่เริ่มลา",',
    "detail first day")
replace_in_fn("leaveDetailHtml",
    'planField("ช่วงเวลาการลา",',
    'planField(isOfficialDutyRequest(request)?"ช่วงเวลาปฏิบัติราชการ":"ช่วงเวลาการลา",',
    "detail session")
replace_in_fn("leaveDetailHtml",
    '<h4>เหตุผลการลา</h4>',
    '<h4>${isOfficialDutyRequest(request)?"ภารกิจ/การอบรมที่ได้รับมอบหมาย":"เหตุผลการลา"}</h4>',
    "detail reason")
replace_in_fn("leaveDetailHtml",
    'planField("สถานที่/ที่อยู่ระหว่างลา",',
    'planField(isOfficialDutyRequest(request)?"สถานที่ไปราชการ":"สถานที่/ที่อยู่ระหว่างลา",',
    "detail location")
replace_in_fn("leaveDetailHtml",
    '<section class="leave-quota-mini">',
    '${isOfficialDutyRequest(request)?`<div class="drive-permission-warning leave-policy-note"><strong>ไปราชการ (ไม่ใช่วันลา)</strong><span>ไม่หักโควตาวันลา · เมื่อส่งคำขอและมีคาบสอน ระบบจะเชื่อมรายการไปยังการจัดสอนแทนเดิม</span></div>`:""}\n    <section class="leave-quota-mini">',
    "explicit non-quota notice")

replace_in_fn("leaveRequestModal",
    'แก้ไขคำขอลา" : "ยื่นคำขอลา',
    'แก้ไขรายการลา/ไปราชการ" : "บันทึกลา/ไปราชการ',
    "modal title")
replace_in_fn("leaveRequestModal",
    '<label>ประเภทการลา</label>',
    '<label>ประเภทการลา / ไปราชการ</label>',
    "type selector label")
replace_in_fn("leaveRequestModal",
    'เลือกประเภทการลา</option>',
    'เลือกประเภทการลา / ไปราชการ</option>',
    "selector placeholder")
replace_in_fn("leaveRequestModal",
    '${t.counts_against_quota ? " · นับโควตา" : ""}',
    '${t.code==="official_duty" ? " · ไม่หักวันลา" : (t.counts_against_quota ? " · นับโควตา" : "")}',
    "selector official marker")
replace_in_fn("leaveRequestModal",
    '      <div class="field"><label>เหตุผล / รายละเอียดการลา</label>',
    '      <div class="drive-permission-warning leave-policy-note" id="leave-official-duty-note" style="display:none"><strong>ไปราชการ · ไม่หักโควตาวันลา</strong><span>ใช้สำหรับงานที่โรงเรียนมอบหมาย เช่น อบรม ประชุม หรือภารกิจนอกสถานศึกษา ระบุภารกิจ/เลขคำสั่งและสถานที่ เมื่อส่งคำขอ รายการคาบที่ได้รับผลกระทบจะเชื่อมไปยังระบบสอนแทนเดิม</span></div>\n      <div class="field"><label id="leave-reason-label">เหตุผล / รายละเอียดการลา</label>',
    "official-duty note and reason label")
replace_in_fn("leaveRequestModal",
    '<label>สถานที่/ที่อยู่ระหว่างลา <span class="helper">(ถ้ามี)</span></label>',
    '<label id="leave-location-label">สถานที่/ที่อยู่ระหว่างลา (ถ้ามี)</label>',
    "official location label")
replace_in_fn("leaveRequestModal",
    'const previewLabel=hasSpecial',
    'const official=modal.querySelector("#leave-type-code").value==="official_duty";\n    const previewLabel=official?"ระยะเวลาปฏิบัติราชการ · ไม่หักโควตาวันลา":hasSpecial',
    "official-duty duration preview")
replace_in_fn("leaveRequestModal",
    '    modal.querySelector("#leave-other-field").classList.toggle("leave-field-muted",!other);',
    """    modal.querySelector("#leave-other-field").classList.toggle("leave-field-muted",!other);
    const official=modal.querySelector("#leave-type-code").value==="official_duty";
    modal.querySelector("#leave-official-duty-note").style.display=official?"block":"none";
    modal.querySelector("#leave-reason-label").textContent=official?"ภารกิจ / การอบรม / เลขคำสั่งที่ได้รับมอบหมาย":"เหตุผล / รายละเอียดการลา";
    modal.querySelector("#leave-location-label").textContent=official?"สถานที่ไปราชการ (ถ้ามี)":"สถานที่/ที่อยู่ระหว่างลา (ถ้ามี)";
    modal.querySelector("#leave-day-schedule-title").textContent=official?"กำหนดช่วงเวลาไปราชการแยกเป็นรายวัน":"กำหนดช่วงเวลาการลาแยกเป็นรายวัน";""",
    "refresh official fields")

replace_in_fn("buildLeaveA4Html",
    '<div class="leave-print-title">แบบคำขอ${escapeHtml(leaveTypeName(request.leave_type_code,request.other_leave_text))}</div>',
    '<div class="leave-print-title">${isOfficialDutyRequest(request)?"แบบบันทึกการไปราชการ":"แบบคำขอ"+escapeHtml(leaveTypeName(request.leave_type_code,request.other_leave_text))}</div>',
    "official-duty A4 title")
replace_in_fn("buildLeaveA4Html",
    '<div><span>ชื่อผู้ลา</span>',
    '<div><span>${isOfficialDutyRequest(request)?"ผู้ไปราชการ":"ชื่อผู้ลา"}</span>',
    "document applicant label")
replace_in_fn("buildLeaveA4Html",
    '<div><span>ช่วงเวลาการลา</span>',
    '<div><span>${isOfficialDutyRequest(request)?"ช่วงเวลาไปราชการ":"ช่วงเวลาการลา"}</span>',
    "document session label")
replace_in_fn("buildLeaveA4Html",
    '<div><span>จำนวนวันลา</span>',
    '<div><span>${isOfficialDutyRequest(request)?"ระยะเวลาไปราชการ (ไม่หักวันลา)":"จำนวนวันลา"}</span>',
    "document duration label")
replace_in_fn("buildLeaveA4Html",
    '<h2>เหตุผลการลา</h2>',
    '<h2>${isOfficialDutyRequest(request)?"ภารกิจที่ได้รับมอบหมาย":"เหตุผลการลา"}</h2>',
    "document reason label")
replace_in_fn("buildLeaveA4Html",
    '<h2>สถานที่/ช่องทางติดต่อระหว่างลา</h2>',
    '<h2>${isOfficialDutyRequest(request)?"สถานที่ไปราชการ / ช่องทางติดต่อ":"สถานที่/ช่องทางติดต่อระหว่างลา"}</h2>',
    "document location")
replace_in_fn("buildLeaveA4Html",
    '    <section class="leave-print-section leave-print-stats-wrap">',
    '    ${isOfficialDutyRequest(request)?`<div class="leave-print-quota">รายการนี้เป็นการไปราชการตามภารกิจที่ได้รับมอบหมาย ไม่ใช่การลา และไม่หักโควตาวันลา</div>`:""}\n    <section class="leave-print-section leave-print-stats-wrap">',
    "official-duty PDF quota notice")
replace_in_fn("buildLeaveA4Html",
    'leaveSignatureLine("ผู้ลา",request.requester_name',
    'leaveSignatureLine(isOfficialDutyRequest(request)?"ผู้ไปราชการ":"ผู้ลา",request.requester_name',
    "official-duty applicant signature")

# Keep the regular workflow and all published-timetable substitute syncing intact.
path.write_text(s, encoding="utf-8")
index=Path("index.html")
html=index.read_text(encoding="utf-8")
old='app.min.js?v=5.12.9.818'
assert html.count(old)==1, "unexpected app bundle cache version"
index.write_text(html.replace(old,'app.min.js?v=5.12.9.819'),encoding="utf-8")
print("Official duty integrated into existing leave UI, statistics, and A4 documents.")
