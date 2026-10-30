// Natural ordering for Thai project/activity IDs, e.g. วช.3.9 before วช.3.15.
// Presentation only: no stored codes, budgets, or academic years are modified.
const collator = new Intl.Collator("th", { numeric: true, sensitivity: "base" });
export function compareProjectCodes(a,b) {
  return collator.compare(String(a ?? ""),String(b ?? ""));
}
export function compareProjectRecords(a,b) {
  return Number(b.academic_year || 0)-Number(a.academic_year || 0)
    || compareProjectCodes(a.project_no,b.project_no);
}
export function compareActivityRecords(a,b) {
  return compareProjectCodes(a.activity_no,b.activity_no);
}
