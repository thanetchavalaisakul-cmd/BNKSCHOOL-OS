export function calculatePaymentEvidenceTotals(items = []) {
  const selected = items.filter((item) => item && item.selected !== false);
  return {
    studentCount: selected.length,
    totalAmount: selected.reduce((sum, item) => sum + Math.max(0, Number(item.amount) || 0), 0),
  };
}

// Official BNK documents use TH Sarabun IT๙ and Thai numerals on print.
export function paymentEvidenceThaiDigits(value) {
  return String(value ?? "").replace(/[0-9]/g, (digit) => "๐๑๒๓๔๕๖๗๘๙"[Number(digit)]);
}

// Use integer satang to avoid float-rounding errors in official financial totals.
export function paymentEvidencePrintTotalsMatch(document, items = []) {
  if (!document || !Array.isArray(items) || !items.length) return false;
  if (Number(document.student_count) !== items.length) return false;
  const actual = items.reduce((sum, item) => sum + Math.round(Number(item.amount) * 100), 0);
  const stated = Math.round(Number(document.total_amount) * 100);
  return items.every((item) => Number.isFinite(Number(item.amount)) && Number(item.amount) >= 0)
    && Number.isSafeInteger(actual) && Number.isSafeInteger(stated)
    && actual === stated;
}

// Apply one reception date only to currently selected students; individual overrides remain.
export function paymentEvidenceApplyBulkDate(rows = [], date) {
  const iso = String(date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(Date.parse(iso))) {
    throw new Error("กรุณาเลือกวันที่รับเงินที่ถูกต้อง");
  }
  return rows.map((row) => row?.selected && row.student_id
    ? { ...row, received_date: iso }
    : row);
}

export function paymentEvidenceRosterStatusLabel(status) {
  if (status === "transferred_out") return "ย้ายแล้ว";
  if (status === "transfer_pending") return "มีใบย้าย · รอดำเนินการ";
  if (status === "ghost") return "เด็กผี";
  return "ปกติ";
}

export function paymentEvidenceDocumentStatusLabel(status) {
  return ({
    draft: "ฉบับร่าง",
    submitted: "รอตรวจสอบจากการเงิน",
    returned: "ส่งกลับให้แก้ไข",
    paid: "จ่ายเงินแล้ว · รอผู้อำนวยการลงนาม",
    completed: "สมบูรณ์",
    cancelled: "ยกเลิก",
  })[status] || "ไม่ทราบสถานะ";
}

export function paymentEvidenceIsDirectorRole(role) {
  return ["director", "acting_director"].includes(role);
}

export function paymentEvidenceCanEditDocument({
  document,
  userId,
  isSuperAdmin = false,
  assignments = [],
} = {}) {
  if (!document || !["draft", "returned"].includes(document.status)) return false;
  if (isSuperAdmin) return true;
  return document.created_by === userId
    && assignments.some((item) => item.class_id === document.class_id);
}

const PAYMENT_TYPES = [
  { value: "learning_equipment", label: "ค่าอุปกรณ์การเรียน" },
  { value: "student_uniform", label: "ค่าเครื่องแบบนักเรียน" },
  { value: "basic_learning_support", label: "ค่าจัดการเรียนการสอน (ปัจจัยพื้นฐานสำหรับนักเรียนยากจน)" },
  { value: "additional_uniform", label: "ค่าเครื่องแบบนักเรียน (เพิ่มเติม)" },
];

const STATUS_OPTIONS = [
  ["all", "ทุกสถานะ"],
  ["draft", "ฉบับร่าง"],
  ["submitted", "รอตรวจสอบ"],
  ["returned", "ส่งกลับแก้ไข"],
  ["paid", "จ่ายเงินแล้ว"],
  ["completed", "สมบูรณ์"],
  ["cancelled", "ยกเลิก"],
];

const STYLE_ID = "bnk-payment-evidence-style";

export function createPaymentEvidenceFeature(ctx) {
  const {
    state,
    supabase,
    currentAcademicPeriod,
    escapeHtml,
    toast,
    renderDashboard,
    bnkSignatureBeforeAction,
    officialPdfFontFaceCss,
    ensureOfficialPdfFont,
    isSuperAdminUser,
  } = ctx;

  const esc = escapeHtml || ((value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch]));
  const local = {
    tab: "documents",
    page: "list",
    year: "",
    semester: 1,
    classFilter: "all",
    statusFilter: "all",
    search: "",
    classes: [],
    assignments: [],
    docs: [],
    detail: null,
    items: [],
    signers: [],
    audit: [],
    people: [],
    permissions: [],
    financeSearch: "",
    selectedDocId: null,
    draft: null,
    error: "",
    loading: false,
  };

  function periodDefaults() {
    const p = typeof currentAcademicPeriod === "function" ? currentAcademicPeriod() : {};
    return {
      year: String(p?.academicYear || p?.academic_year || p?.year || (new Date().getFullYear() + 543)),
      semester: Number(p?.semester || p?.term || 1),
    };
  }

  function isAdmin() {
    return Boolean(state.paymentEvidenceAccess?.is_super_admin || (typeof isSuperAdminUser === "function" && isSuperAdminUser()));
  }

  function isFinance() {
    return Boolean(isAdmin() || state.paymentEvidenceAccess?.is_finance);
  }

  function isDirector() {
    return Boolean(state.paymentEvidenceAccess?.is_director || paymentEvidenceIsDirectorRole(state.profile?.role));
  }

  function canAccess() {
    return Boolean(state.paymentEvidenceAccess?.can_access || isAdmin() || isFinance() || isDirector());
  }

  function canCreate() {
    return Boolean(isAdmin() || local.assignments.length);
  }

  function canEditDocument(doc) {
    return paymentEvidenceCanEditDocument({
      document: doc,
      userId: state.user?.id,
      isSuperAdmin: isAdmin(),
      assignments: local.assignments,
    });
  }

  function canSubmitDocument(doc) {
    return Boolean(doc
      && doc.created_by === state.user?.id
      && ["draft", "returned"].includes(doc.status)
      && (isAdmin() || local.assignments.some((item) => item.class_id === doc.class_id)));
  }

  function canPayDocument(doc) {
    return Boolean(doc && isFinance() && doc.status === "submitted");
  }

  function canReturnDocument(doc) {
    return Boolean(doc && isFinance() && doc.status === "submitted");
  }

  function canDirectorSignDocument(doc) {
    return Boolean(doc && isDirector() && doc.status === "paid");
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  }

  function formatDate(value) {
    if (!value) return "—";
    const parts = String(value).slice(0, 10).split("-");
    if (parts.length !== 3) return esc(value);
    const [year, month, day] = parts.map(Number);
    if (!year || !month || !day) return esc(value);
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year + 543}`;
  }

  function formatDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return esc(value);
    return date.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
  }

  function typeLabel(value) {
    return PAYMENT_TYPES.find((item) => item.value === value)?.label || "ไม่ระบุประเภท";
  }

  function statusClass(value) {
    return ({
      draft: "pe-status-draft",
      submitted: "pe-status-submitted",
      returned: "pe-status-returned",
      paid: "pe-status-paid",
      completed: "pe-status-completed",
      cancelled: "pe-status-cancelled",
    })[value] || "pe-status-draft";
  }

  function rosterStatusClass(value) {
    return ({
      active: "pe-roster-active",
      transferred_out: "pe-roster-transfer",
      transfer_pending: "pe-roster-pending",
      ghost: "pe-roster-ghost",
    })[value] || "pe-roster-active";
  }

  function rosterStatusNote(value) {
    if (value === "transferred_out") return "ย้ายแล้ว";
    if (value === "transfer_pending") return "มีใบย้าย";
    if (value === "ghost") return "เด็กผี";
    return "";
  }

  function studentName(row) {
    const snapshot = row?.student_snapshot || row || {};
    return snapshot.full_name
      || [snapshot.prefix, snapshot.first_name, snapshot.last_name].filter(Boolean).join(" ")
      || "ไม่พบชื่อ";
  }

  function studentCitizenId(row) {
    return (row?.student_snapshot || row || {}).citizen_id || "—";
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .pe-wrap{display:flex;flex-direction:column;gap:16px;min-width:0}
      .pe-hero{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;padding:20px;border-radius:16px;background:linear-gradient(120deg,rgba(34,128,96,.12),rgba(59,130,246,.07));border:1px solid var(--border,#d8dee8)}
      .pe-kicker{font-size:12px;letter-spacing:.04em;color:var(--muted,#64748b);font-weight:700}
      .pe-hero h2{font-size:24px;margin:4px 0 5px;color:var(--text,#172033)}
      .pe-hero p{margin:0;color:var(--muted,#64748b);font-size:14px}
      .pe-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .pe-kpi{padding:14px;border:1px solid var(--border,#d8dee8);border-radius:13px;background:var(--card,#fff);min-width:0}
      .pe-kpi span{display:block;font-size:12px;color:var(--muted,#64748b)}
      .pe-kpi strong{display:block;font-size:22px;margin-top:5px;color:var(--text,#172033)}
      .pe-card{background:var(--card,#fff);border:1px solid var(--border,#d8dee8);border-radius:14px;padding:16px;min-width:0}
      .pe-toolbar{display:flex;gap:10px;align-items:end;flex-wrap:wrap}
      .pe-field{display:flex;flex-direction:column;gap:5px;min-width:120px;flex:1}
      .pe-field label{font-size:12px;font-weight:700;color:var(--muted,#64748b)}
      .pe-field input,.pe-field select,.pe-field textarea{width:100%;min-width:0;min-height:43px;padding:9px 12px;border:1px solid var(--border,#cbd5e1);border-radius:12px;background:var(--card,#fff);color:var(--text,#172033);font:inherit;font-size:14px;box-shadow:0 1px 2px rgba(15,23,42,.035);transition:border-color .15s ease,box-shadow .15s ease}
      .pe-field input:focus,.pe-field select:focus,.pe-field textarea:focus,.pe-roster-table input:focus{outline:0;border-color:#15936b;box-shadow:0 0 0 3px rgba(22,163,106,.14)}
      .pe-field input:disabled,.pe-field select:disabled{background:var(--surface-secondary,#f1f5f9);color:var(--muted,#64748b);box-shadow:none;opacity:1}
      .pe-field select{cursor:pointer;padding-right:25px}
      .pe-field input[type=date]{color-scheme:light;cursor:pointer}
      .pe-field label{line-height:1.35}
      .pe-tabs{display:flex;gap:8px;flex-wrap:wrap}
      .pe-tab{border:1px solid var(--border,#d8dee8);background:var(--card,#fff);color:var(--text,#172033);padding:9px 13px;border-radius:10px;font-weight:700;cursor:pointer}
      .pe-tab.active{background:rgba(22,163,106,.12);border-color:#16a36a;color:#137b51}
      .pe-table-wrap{overflow:auto;width:100%}
      .pe-table{width:100%;border-collapse:collapse;min-width:760px}
      .pe-table th,.pe-table td{padding:10px 9px;border-bottom:1px solid var(--border,#e5e7eb);text-align:left;vertical-align:middle;font-size:13px}
      .pe-table th{font-size:12px;color:var(--muted,#64748b);font-weight:800;background:var(--surface-secondary,#f8fafc)}
      .pe-table tbody tr:hover{background:rgba(148,163,184,.07)}
      .pe-link{border:0;background:none;color:var(--accent,#2563eb);font-weight:700;padding:0;cursor:pointer;text-align:left}
      .pe-status,.pe-roster-badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:800;white-space:nowrap}
      .pe-status-draft{background:#eef2f7;color:#475569}
      .pe-status-submitted{background:#fff7df;color:#946200}
      .pe-status-returned{background:#fff0e8;color:#b45309}
      .pe-status-paid{background:#eaf2ff;color:#1d4ed8}
      .pe-status-completed{background:#e8f7ef;color:#137b51}
      .pe-status-cancelled{background:#f1f1f1;color:#6b7280}
      .pe-roster-active{background:#e8f7ef;color:#137b51}
      .pe-roster-transfer{background:#eaf2ff;color:#1d4ed8}
      .pe-roster-pending{background:#fff7df;color:#946200}
      .pe-roster-ghost{background:#fff0f0;color:#b42318}
      .pe-muted{color:var(--muted,#64748b)}
      .pe-empty{padding:28px 16px;text-align:center;color:var(--muted,#64748b);border:1px dashed var(--border,#cbd5e1);border-radius:12px}
      .pe-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
      .pe-btn{border:1px solid var(--border,#cbd5e1);background:var(--card,#fff);color:var(--text,#172033);border-radius:9px;padding:8px 12px;font-weight:700;cursor:pointer}
      .pe-btn.primary{background:#167a56;border-color:#167a56;color:#fff}
      .pe-btn.warning{background:#fff7df;border-color:#f3d58a;color:#946200}
      .pe-btn.danger{background:#fff0f0;border-color:#f2c4c4;color:#b42318}
      .pe-btn:disabled{opacity:.55;cursor:not-allowed}
      .pe-detail-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
      .pe-detail-head h3{margin:0 0 5px;font-size:20px}
      .pe-meta-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0}
      .pe-meta{padding:10px;border-radius:10px;background:var(--surface-secondary,#f8fafc);min-width:0}
      .pe-meta small{display:block;color:var(--muted,#64748b);font-size:11px}
      .pe-meta strong{display:block;margin-top:4px;font-size:13px;overflow-wrap:anywhere}
      .pe-callout{padding:11px 13px;border-radius:10px;background:#fff7df;color:#875c00;border:1px solid #f3d58a;margin:12px 0}
      .pe-section-title{font-weight:800;margin:16px 0 9px}
      .pe-signers{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .pe-signer{border:1px solid var(--border,#d8dee8);border-radius:11px;padding:12px;min-width:0}
      .pe-signer strong{display:block;font-size:13px}
      .pe-signer span{display:block;font-size:12px;color:var(--muted,#64748b);margin-top:4px}
      .pe-audit{display:flex;flex-direction:column;gap:8px}
      .pe-audit-row{border-left:3px solid #94a3b8;padding:5px 10px;background:var(--surface-secondary,#f8fafc);border-radius:0 8px 8px 0}
      .pe-modal-backdrop{position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,.58);display:flex;align-items:center;justify-content:center;padding:14px}
      .pe-modal{width:min(1120px,100%);max-height:94vh;overflow:auto;background:var(--card,#fff);color:var(--text,#172033);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.25);padding:18px}
      .pe-modal h3{margin:0;font-size:20px}
      .pe-modal-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px}
      .pe-mode-row{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
      .pe-mode{border:1px solid var(--border,#cbd5e1);background:var(--card,#fff);padding:9px 12px;border-radius:9px;cursor:pointer;font-weight:700}
      .pe-mode.active{background:rgba(22,163,106,.12);border-color:#16a36a;color:#137b51}
      .pe-draft-summary{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 12px;border-radius:10px;background:var(--surface-secondary,#f8fafc);margin:10px 0;font-weight:700}
      .pe-roster-scroll{max-height:48vh;overflow:auto;border:1px solid var(--border,#d8dee8);border-radius:10px}
      .pe-roster-table{width:100%;border-collapse:collapse;min-width:850px}
      .pe-roster-table th,.pe-roster-table td{padding:7px 8px;border-bottom:1px solid var(--border,#e5e7eb);font-size:12px;text-align:left;vertical-align:middle}
      .pe-roster-table th{position:sticky;top:0;background:var(--surface-secondary,#f8fafc);z-index:1}
      .pe-roster-table input:not([type=checkbox]){height:39px;min-height:39px;padding:7px 9px;border:1px solid var(--border,#cbd5e1);border-radius:10px;background:var(--card,#fff);color:var(--text,#172033);font:inherit;font-size:12px;transition:border-color .15s ease,box-shadow .15s ease}
      .pe-roster-table input:not([type=checkbox]):disabled{background:var(--surface-secondary,#f1f5f9);opacity:.65}
      .pe-roster-table input[type=checkbox]{accent-color:#168458;width:17px;height:17px;cursor:pointer}
      .pe-roster-table input[type=number]{width:105px}
      .pe-roster-table input[type=date]{width:145px}
      .pe-roster-table input[type=text]{min-width:120px;width:100%}
      .pe-student-main{font-weight:700}
      .pe-modal-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px}
      .pe-small{font-size:11px}
      @media(max-width:760px){
        .pe-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
        .pe-meta-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        .pe-signers{grid-template-columns:1fr}
        .pe-hero h2{font-size:20px}
        .pe-modal{padding:12px}
      }
    `;
    document.head.appendChild(style);
  }

  function statusBadge(status) {
    return `<span class="pe-status ${statusClass(status)}">${esc(paymentEvidenceDocumentStatusLabel(status))}</span>`;
  }

  function rosterBadge(status) {
    return `<span class="pe-roster-badge ${rosterStatusClass(status)}">${esc(paymentEvidenceRosterStatusLabel(status))}</span>`;
  }

  function classLabel(row) {
    return row?.class_label_snapshot
      || [row?.level_name, row?.room_name].filter(Boolean).join("/")
      || "ไม่ระบุห้อง";
  }

  function filteredDocs() {
    const query = local.search.trim().toLowerCase();
    return local.docs.filter((doc) => {
      if (local.classFilter !== "all" && doc.class_id !== local.classFilter) return false;
      if (local.statusFilter !== "all" && doc.status !== local.statusFilter) return false;
      if (!query) return true;
      return [
        classLabel(doc),
        doc.created_by_name,
        typeLabel(doc.document_type),
        doc.return_note,
      ].some((value) => String(value || "").toLowerCase().includes(query));
    });
  }

  function statsHtml() {
    const counts = {
      draft: local.docs.filter((d) => d.status === "draft").length,
      submitted: local.docs.filter((d) => d.status === "submitted").length,
      paid: local.docs.filter((d) => d.status === "paid").length,
      completed: local.docs.filter((d) => d.status === "completed").length,
    };
    return `
      <div class="pe-kpis">
        <div class="pe-kpi"><span>ฉบับร่าง</span><strong>${counts.draft}</strong></div>
        <div class="pe-kpi"><span>รอตรวจสอบ</span><strong>${counts.submitted}</strong></div>
        <div class="pe-kpi"><span>จ่ายเงินแล้ว</span><strong>${counts.paid}</strong></div>
        <div class="pe-kpi"><span>สมบูรณ์</span><strong>${counts.completed}</strong></div>
      </div>`;
  }

  function listRowsHtml() {
    const docs = filteredDocs();
    if (!docs.length) {
      return '<div class="pe-empty">ยังไม่มีเอกสารในเงื่อนไขที่เลือก</div>';
    }
    return `
      <div class="pe-table-wrap">
        <table class="pe-table">
          <thead><tr>
            <th>วันที่สร้าง</th><th>ห้องเรียน</th><th>ประเภทเงิน</th><th>จำนวนนักเรียน</th>
            <th>รวมเงิน</th><th>ผู้จัดทำ</th><th>สถานะ</th><th></th>
          </tr></thead>
          <tbody>
            ${docs.map((doc) => `
              <tr>
                <td>${esc(formatDateTime(doc.created_at))}</td>
                <td><strong>${esc(classLabel(doc))}</strong><div class="pe-muted pe-small">ภาคเรียนที่ ${esc(doc.semester)} / ${esc(doc.academic_year)}</div></td>
                <td>${esc(typeLabel(doc.document_type))}</td>
                <td>${Number(doc.student_count) || 0} คน</td>
                <td><strong>${formatMoney(doc.total_amount)}</strong> บาท</td>
                <td>${esc(doc.created_by_name || "—")}</td>
                <td>${statusBadge(doc.status)}</td>
                <td><button class="pe-link" data-pe-open="${esc(doc.id)}">เปิดเอกสาร</button></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }

  function listViewHtml() {
    const classOptions = local.classes.map((item) => `
      <option value="${esc(item.id)}" ${local.classFilter === item.id ? "selected" : ""}>
        ${esc(item.level_name)}/${esc(item.room_name)}
      </option>`).join("");
    const statusOptions = STATUS_OPTIONS.map(([value, label]) => `
      <option value="${value}" ${local.statusFilter === value ? "selected" : ""}>${label}</option>`).join("");
    return `
      <section class="pe-card">
        <div class="pe-toolbar">
          <div class="pe-field" style="max-width:130px"><label>ปีการศึกษา</label><input id="pe-year" type="number" min="2500" max="2700" value="${esc(local.year)}"></div>
          <div class="pe-field" style="max-width:150px"><label>ภาคเรียน</label><select id="pe-semester"><option value="1" ${local.semester === 1 ? "selected" : ""}>ภาคเรียนที่ 1</option><option value="2" ${local.semester === 2 ? "selected" : ""}>ภาคเรียนที่ 2</option></select></div>
          <div class="pe-field"><label>ห้องเรียน</label><select id="pe-class-filter"><option value="all">ทุกห้องเรียน</option>${classOptions}</select></div>
          <div class="pe-field"><label>สถานะเอกสาร</label><select id="pe-status-filter">${statusOptions}</select></div>
          <div class="pe-field" style="min-width:180px"><label>ค้นหา</label><input id="pe-search" type="search" value="${esc(local.search)}" placeholder="ค้นหาห้องเรียน / ผู้จัดทำ / ประเภทเงิน"></div>
          <div class="pe-actions"><button class="pe-btn" data-pe-action="refresh">รีเฟรช</button></div>
        </div>
      </section>
      <section class="pe-card">
        <div class="pe-detail-head"><div><strong>รายการหลักฐานการจ่ายเงิน</strong><div class="pe-muted pe-small">แสดงเอกสารตามปีการศึกษาและภาคเรียนที่เลือก</div></div><span class="pe-muted pe-small">${filteredDocs().length} รายการ</span></div>
        <div id="pe-doc-list" style="margin-top:12px">${listRowsHtml()}</div>
      </section>`;
  }

  function signerLabel(slot) {
    return ({ teacher: "ครูประจำชั้น · ตรวจสอบแล้วถูกต้อง", finance: "เจ้าหน้าที่การเงิน · ผู้จ่ายเงิน", director: "ผู้อำนวยการโรงเรียน" })[slot] || slot;
  }

  function detailViewHtml() {
    const doc = local.detail;
    if (!doc) return '<div class="pe-empty">กำลังโหลดเอกสาร...</div>';
    const items = [...local.items].sort((a, b) => (Number(a.row_order) || 0) - (Number(b.row_order) || 0));
    const signerBySlot = Object.fromEntries(local.signers.map((s) => [s.slot_code, s]));
    const rows = items.map((item, index) => {
      const snapshot = item.student_snapshot || {};
      const status = snapshot.roster_status || "active";
      const note = item.note || rosterStatusNote(status);
      return `<tr>
        <td>${index + 1}</td>
        <td><strong>${esc(studentName(item))}</strong><div class="pe-muted pe-small">${esc(snapshot.student_code || "")}</div></td>
        <td>${esc(paymentEvidenceThaiDigits(studentCitizenId(item)))}</td>
        <td style="text-align:right">${paymentEvidenceThaiDigits(formatMoney(item.amount))}</td>
        <td>${esc(paymentEvidenceThaiDigits(formatDate(item.received_date)))}</td>
        <td>${note ? esc(note) : "—"}</td>
      </tr>`;
    }).join("");
    const actions = [];
    if (canEditDocument(doc)) actions.push('<button class="pe-btn" data-pe-action="edit">แก้ไขข้อมูล</button>');
    if (canSubmitDocument(doc)) actions.push('<button class="pe-btn primary" data-pe-action="submit">ยืนยันรายชื่อและส่งการเงิน</button>');
    if (canReturnDocument(doc)) actions.push('<button class="pe-btn warning" data-pe-action="return">ส่งกลับให้ครูแก้ไข</button>');
    if (canPayDocument(doc)) actions.push('<button class="pe-btn primary" data-pe-action="pay">ลงนามยืนยันการจ่ายเงิน</button>');
    if (canDirectorSignDocument(doc)) actions.push('<button class="pe-btn primary" data-pe-action="director-sign">ผู้อำนวยการลงนามปิดเอกสาร</button>');
    actions.push('<button class="pe-btn" data-pe-action="print">พิมพ์ / บันทึก PDF</button>');

    return `
      <section class="pe-card">
        <div class="pe-detail-head">
          <div>
            <div class="pe-muted pe-small">หลักฐานการจ่ายเงิน · ${esc(doc.academic_year)} / ภาคเรียนที่ ${esc(doc.semester)}</div>
            <h3>${esc(classLabel(doc))} · ${esc(typeLabel(doc.document_type))}</h3>
            ${statusBadge(doc.status)}
          </div>
          <div class="pe-actions"><button class="pe-btn" data-pe-action="back">กลับรายการ</button></div>
        </div>
        ${doc.return_note ? `<div class="pe-callout"><strong>เหตุผลที่ส่งกลับ:</strong> ${esc(doc.return_note)}</div>` : ""}
        <div class="pe-meta-grid">
          <div class="pe-meta"><small>จำนวนนักเรียน</small><strong>${Number(doc.student_count) || items.length} คน</strong></div>
          <div class="pe-meta"><small>รวมเงินทั้งสิ้น</small><strong>${formatMoney(doc.total_amount)} บาท</strong></div>
          <div class="pe-meta"><small>ผู้จัดทำ</small><strong>${esc(doc.created_by_name || "—")}</strong></div>
          <div class="pe-meta"><small>วันที่สร้าง</small><strong>${esc(formatDateTime(doc.created_at))}</strong></div>
        </div>
        <div class="pe-section-title">รายชื่อนักเรียนและหลักฐานการจ่าย</div>
        <div class="pe-table-wrap">
          <table class="pe-table">
            <thead><tr><th>ที่</th><th>ชื่อ – สกุล</th><th>เลขประจำตัวประชาชน</th><th>จำนวนเงิน</th><th>วันที่รับเงิน</th><th>หมายเหตุ</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6" class="pe-muted">ไม่มีรายชื่อนักเรียน</td></tr>'}</tbody>
          </table>
        </div>
        <div class="pe-section-title">การลงนาม</div>
        <div class="pe-signers">
          ${["finance", "teacher", "director"].map((slot) => {
            const signer = signerBySlot[slot];
            return `<div class="pe-signer"><strong>${esc(signerLabel(slot))}</strong>
              <span>${signer ? esc(signer.signer_name) : "ยังไม่ได้ลงนาม"}</span>
              <span>${signer ? `วิธีลงนาม: ${esc(signer.method === "paper" ? "ลงนามบนกระดาษ" : signer.method === "drawn" ? "วาดลายเซ็น" : signer.method === "upload" ? "อัปโหลดลายเซ็น" : "ลายเซ็นที่บันทึกไว้")} · ${esc(formatDateTime(signer.signed_at))}` : "—"}</span>
            </div>`;
          }).join("")}
        </div>
        <div class="pe-section-title">ประวัติการดำเนินงาน</div>
        <div class="pe-audit">
          ${local.audit.length ? local.audit.map((item) => `
            <div class="pe-audit-row">
              <strong>${esc(item.actor_name || "ผู้ใช้งาน")}</strong> · ${esc(auditActionLabel(item.action))}
              <div class="pe-muted pe-small">${esc(formatDateTime(item.created_at))}${item.to_status ? ` · ${esc(paymentEvidenceDocumentStatusLabel(item.to_status))}` : ""}</div>
            </div>`).join("") : '<div class="pe-muted pe-small">ยังไม่มีประวัติการดำเนินงานเพิ่มเติม</div>'}
        </div>
        <div class="pe-actions" style="margin-top:18px">${actions.join("")}</div>
      </section>`;
  }

  function auditActionLabel(action) {
    return ({
      created: "สร้างเอกสาร",
      updated: "แก้ไขข้อมูลเอกสาร",
      status_changed: "เปลี่ยนสถานะเอกสาร",
      items_saved: "บันทึกรายชื่อนักเรียนและยอดเงิน",
    })[action] || action || "ดำเนินการ";
  }

  function financeViewHtml() {
    const query = local.financeSearch.trim().toLowerCase();
    const activeIds = new Set(local.permissions.filter((p) => p.is_active).map((p) => p.user_id));
    const people = local.people.filter((person) => {
      if (!query) return true;
      return [person.full_name, person.position_title, person.role].some((value) => String(value || "").toLowerCase().includes(query));
    });
    return `
      <section class="pe-card">
        <div class="pe-detail-head"><div><strong>กำหนดสิทธิ์เจ้าหน้าที่การเงิน</strong><div class="pe-muted pe-small">เพิ่มได้ไม่จำกัดจำนวน · ผู้ที่ได้รับสิทธิ์จะเห็นและจัดการเอกสารทุกห้องเรียน</div></div><span class="pe-status pe-status-completed">ผู้ดูแลระบบ</span></div>
        <div class="pe-toolbar" style="margin:14px 0"><div class="pe-field" style="max-width:420px"><label>ค้นหาบุคลากร</label><input id="pe-finance-search" type="search" value="${esc(local.financeSearch)}" placeholder="ค้นหาชื่อ ตำแหน่ง หรือบทบาท"></div></div>
        <div class="pe-table-wrap"><table class="pe-table">
          <thead><tr><th>ชื่อบุคลากร</th><th>ตำแหน่ง</th><th>บทบาท</th><th>สิทธิ์การเงิน</th><th></th></tr></thead>
          <tbody>
            ${people.map((person) => {
              const active = activeIds.has(person.user_id);
              return `<tr>
                <td><strong>${esc(person.full_name || "ไม่ระบุชื่อ")}</strong></td>
                <td>${esc(person.position_title || "—")}</td>
                <td>${esc(person.role || "—")}</td>
                <td>${active ? '<span class="pe-status pe-status-completed">เปิดใช้งาน</span>' : '<span class="pe-status pe-status-draft">ยังไม่มีสิทธิ์</span>'}</td>
                <td><button class="pe-btn ${active ? "danger" : "primary"}" data-pe-finance-toggle="${esc(person.user_id)}" data-active="${active ? "true" : "false"}">${active ? "ถอนสิทธิ์" : "ให้สิทธิ์"}</button></td>
              </tr>`;
            }).join("") || '<tr><td colspan="5" class="pe-muted">ไม่พบบุคลากร</td></tr>'}
          </tbody>
        </table></div>
      </section>`;
  }

  function pageHtml() {
    if (!canAccess()) {
      return '<section class="pe-card"><h3>ไม่มีสิทธิ์เข้าใช้งาน</h3><p class="pe-muted">ระบบนี้เปิดให้ครูประจำชั้น เจ้าหน้าที่การเงิน และผู้อำนวยการเท่านั้น</p></section>';
    }
    const tabs = `
      <div class="pe-tabs">
        <button class="pe-tab ${local.tab === "documents" ? "active" : ""}" data-pe-tab="documents">เอกสารหลักฐานการจ่ายเงิน</button>
        ${isAdmin() ? `<button class="pe-tab ${local.tab === "finance" ? "active" : ""}" data-pe-tab="finance">จัดการเจ้าหน้าที่การเงิน</button>` : ""}
      </div>`;
    const hero = `
      <section class="pe-hero">
        <div><div class="pe-kicker">แผนงานและงบประมาณ · ระบบย่อย</div><h2>ระบบหลักฐานการจ่ายเงิน</h2><p>จัดทำ ตรวจสอบ ลงนาม และพิมพ์หลักฐานตามแบบฟอร์มของโรงเรียน</p></div>
        <div class="pe-actions">
          ${local.tab === "documents" && canCreate() && local.page === "list" ? '<button class="pe-btn primary" data-pe-action="create">+ สร้างหลักฐานการจ่ายเงิน</button>' : ""}
        </div>
      </section>`;
    if (local.page === "detail") {
      return `<div class="pe-wrap" data-payment-evidence-root>${hero}${tabs}${detailViewHtml()}</div>`;
    }
    if (local.tab === "finance" && isAdmin()) {
      return `<div class="pe-wrap" data-payment-evidence-root>${hero}${tabs}${financeViewHtml()}</div>`;
    }
    return `<div class="pe-wrap" data-payment-evidence-root>${hero}${tabs}${statsHtml()}${listViewHtml()}</div>`;
  }

  async function loadRoster(classId, year, semester) {
    const { data, error } = await supabase.rpc("payment_evidence_roster", {
      p_academic_year: String(year),
      p_semester: Number(semester),
      p_class_id: classId,
    });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }

  async function loadDetail(documentId) {
    const [docRes, itemRes, signerRes, auditRes] = await Promise.all([
      supabase.from("payment_evidence_documents").select("*").eq("id", documentId).maybeSingle(),
      supabase.from("payment_evidence_items").select("*").eq("document_id", documentId).order("row_order", { ascending: true }),
      supabase.from("payment_evidence_signers").select("*").eq("document_id", documentId),
      supabase.from("payment_evidence_audit").select("*").eq("document_id", documentId).order("created_at", { ascending: false }),
    ]);
    const firstError = docRes.error || itemRes.error || signerRes.error || auditRes.error;
    if (firstError) throw firstError;
    if (!docRes.data) throw new Error("ไม่พบเอกสารหรือไม่มีสิทธิ์เข้าถึง");
    local.detail = docRes.data;
    local.items = itemRes.data || [];
    local.signers = signerRes.data || [];
    local.audit = auditRes.data || [];
  }

  async function load() {
    if (!local.year) {
      const defaults = periodDefaults();
      local.year = defaults.year;
      local.semester = defaults.semester;
    }
    local.error = "";
    local.loading = true;
    if (!canAccess()) {
      local.loading = false;
      return;
    }

    try {
      const [classRes, assignmentRes, docRes] = await Promise.all([
        supabase.from("school_classes")
          .select("id,academic_year,semester,stage_code,level_name,room_name,sort_order,is_active")
          .eq("academic_year", local.year)
          .eq("semester", local.semester)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase.from("homeroom_teachers").select("class_id").eq("teacher_id", state.user.id),
        supabase.from("payment_evidence_documents")
          .select("*")
          .eq("academic_year", local.year)
          .eq("semester", local.semester)
          .order("created_at", { ascending: false }),
      ]);
      const queryError = classRes.error || assignmentRes.error || docRes.error;
      if (queryError) throw queryError;

      local.assignments = assignmentRes.data || [];
      const assignedIds = new Set(local.assignments.map((row) => row.class_id));
      local.classes = (classRes.data || []).filter((row) => isFinance() || isDirector() || isAdmin() || assignedIds.has(row.id));
      local.docs = docRes.data || [];

      if (isAdmin()) {
        const [peopleRes, permissionRes] = await Promise.all([
          supabase.from("personnel_public_directory")
            .select("user_id,full_name,role,position_title")
            .order("full_name", { ascending: true }),
          supabase.from("payment_evidence_permissions")
            .select("user_id,is_active,created_at,updated_at"),
        ]);
        if (peopleRes.error || permissionRes.error) throw (peopleRes.error || permissionRes.error);
        local.people = peopleRes.data || [];
        local.permissions = permissionRes.data || [];
      }

      if (local.page === "detail" && local.selectedDocId) {
        await loadDetail(local.selectedDocId);
      } else {
        local.detail = null;
        local.items = [];
        local.signers = [];
        local.audit = [];
      }
    } catch (error) {
      local.error = error?.message || String(error);
    } finally {
      local.loading = false;
    }
  }

  function editorRowsHtml() {
    const rows = local.draft?.rows || [];
    if (!rows.length) return '<tr><td colspan="7" class="pe-muted">ไม่พบรายชื่อนักเรียนในห้องนี้</td></tr>';
    return rows.map((row, index) => {
      const status = row.roster_status || "active";
      const disabled = !row.student_id;
      return `<tr>
        <td><input type="checkbox" data-pe-select-student="${esc(row.student_id || "")}" ${row.selected ? "checked" : ""} ${disabled ? "disabled" : ""}></td>
        <td><div class="pe-student-main">${esc(row.full_name || studentName(row))}</div><div class="pe-muted pe-small">${esc(row.student_code || row.student_snapshot?.student_code || "")}</div></td>
        <td>${esc(row.citizen_id || row.student_snapshot?.citizen_id || "—")}</td>
        <td>${rosterBadge(status)}</td>
        <td><input type="number" min="0" step="0.01" data-pe-row-amount="${esc(row.student_id || "")}" value="${esc(row.amount ?? 0)}" ${disabled ? "disabled" : ""}></td>
        <td><input type="date" data-pe-row-date="${esc(row.student_id || "")}" value="${esc(row.received_date || "")}" ${disabled ? "disabled" : ""}></td>
        <td><input type="text" maxlength="500" data-pe-row-note="${esc(row.student_id || "")}" value="${esc(row.note || "")}" placeholder="${esc(rosterStatusNote(status))}" ${disabled ? "disabled" : ""}></td>
      </tr>`;
    }).join("");
  }

  function draftSummaryHtml() {
    const totals = calculatePaymentEvidenceTotals(local.draft?.rows || []);
    return `<div id="pe-draft-summary" class="pe-draft-summary"><span>เลือก ${totals.studentCount} คน</span><span>รวมจำนวนเงิน ${formatMoney(totals.totalAmount)} บาท</span></div>`;
  }

  function updateDraftSummary() {
    const node = document.getElementById("pe-draft-summary");
    if (!node || !local.draft) return;
    const totals = calculatePaymentEvidenceTotals(local.draft.rows);
    node.innerHTML = `<span>เลือก ${totals.studentCount} คน</span><span>รวมจำนวนเงิน ${formatMoney(totals.totalAmount)} บาท</span>`;
  }

  function editorModalHtml() {
    const draft = local.draft;
    const classOptions = local.classes.map((item) => `
      <option value="${esc(item.id)}" ${draft.classId === item.id ? "selected" : ""}>
        ${esc(item.level_name)}/${esc(item.room_name)}
      </option>`).join("");
    const typeOptions = PAYMENT_TYPES.map((item) => `
      <option value="${item.value}" ${draft.documentType === item.value ? "selected" : ""}>${esc(item.label)}</option>`).join("");
    return `
      <div class="pe-modal-backdrop" id="pe-editor-backdrop">
        <div class="pe-modal" role="dialog" aria-modal="true" aria-label="สร้างหลักฐานการจ่ายเงิน">
          <div class="pe-modal-head"><div><h3>${draft.documentId ? "แก้ไขหลักฐานการจ่ายเงิน" : "สร้างหลักฐานการจ่ายเงิน"}</h3><div class="pe-muted pe-small">ข้อมูลรายชื่อดึงจากบัญชีรายชื่อนักเรียนโดยตรง</div></div><button class="pe-btn" id="pe-editor-close">ปิด</button></div>
          <div class="pe-toolbar">
            <div class="pe-field" style="max-width:125px"><label>ปีการศึกษา</label><input value="${esc(draft.year)}" disabled></div>
            <div class="pe-field" style="max-width:140px"><label>ภาคเรียน</label><input value="${esc(draft.semester)}" disabled></div>
            <div class="pe-field"><label>ห้องเรียน</label><select id="pe-editor-class" ${draft.documentId ? "disabled" : ""}>${classOptions}</select></div>
            <div class="pe-field" style="min-width:260px"><label>ประเภทเงิน</label><select id="pe-editor-type">${typeOptions}</select></div>
          </div>
          <div class="pe-mode-row">
            <button class="pe-mode ${draft.selectionMode === "all" ? "active" : ""}" data-pe-mode="all">ชุดที่ 1 · เลือกทั้งหมดรวมเด็กผี</button>
            <button class="pe-mode ${draft.selectionMode === "selected" ? "active" : ""}" data-pe-mode="selected">ชุดที่ 2 · เลือกเฉพาะราย</button>
          </div>
          <div class="pe-toolbar">
            <div class="pe-field" style="max-width:185px"><label>จำนวนเงินสำหรับผู้ที่เลือก</label><input id="pe-bulk-amount" type="number" min="0" step="0.01" placeholder="เช่น 100"></div>
             <div class="pe-field" style="max-width:200px"><label>วันที่รับเงินสำหรับผู้ที่เลือก</label><input id="pe-bulk-date" type="date" aria-label="วันที่รับเงินสำหรับนักเรียนที่เลือก"></div>
            <div class="pe-actions"><button class="pe-btn" id="pe-apply-bulk">ใส่จำนวนเงินที่เลือก</button><button class="pe-btn" id="pe-apply-bulk-date">ใช้วันที่กับผู้ที่เลือก</button><button class="pe-btn" id="pe-select-all">เลือกทั้งหมด</button><button class="pe-btn" id="pe-clear-selection">ยกเลิกทั้งหมด</button></div>
          </div>
          ${draftSummaryHtml()}
          <div class="pe-roster-scroll">
            <table class="pe-roster-table">
              <thead><tr><th>เลือก</th><th>ชื่อ – สกุล</th><th>เลขบัตรประชาชน 13 หลัก</th><th>สถานะ</th><th>จำนวนเงิน</th><th>วันที่รับเงิน</th><th>หมายเหตุ</th></tr></thead>
              <tbody id="pe-editor-rows">${editorRowsHtml()}</tbody>
            </table>
          </div>
          <div class="pe-modal-foot"><span class="pe-muted pe-small">เลือกวันที่ครั้งเดียวแล้วกดใช้กับผู้ที่เลือกได้ · ยังแก้ไขวันที่รายคนได้ · ชุดที่ 1 รวมรายชื่อเด็กผี</span><div class="pe-actions"><button class="pe-btn" id="pe-editor-cancel">ยกเลิก</button><button class="pe-btn primary" id="pe-editor-save">บันทึกฉบับร่าง</button></div></div>
        </div>
      </div>`;
  }

  async function openEditor(doc = null, requestedClassId = null) {
    try {
      let draftClassId = requestedClassId || doc?.class_id || local.classes[0]?.id || "";
      if (!draftClassId) {
        toast("ยังไม่มีห้องเรียนที่รับผิดชอบ", "ไม่พบห้องเรียนที่สามารถจัดทำเอกสารได้ในภาคเรียนนี้", "warning");
        return;
      }
      const year = String(doc?.academic_year || local.year);
      const semester = Number(doc?.semester || local.semester);
      const roster = await loadRoster(draftClassId, year, semester);
      const oldItems = doc ? local.items : [];
      const oldByStudent = new Map(oldItems.filter((item) => item.student_id).map((item) => [item.student_id, item]));
      const mode = doc?.selection_mode || "all";
      const rows = roster.map((student, index) => {
        const old = oldByStudent.get(student.student_id);
        const snapshot = old?.student_snapshot || {};
        const status = snapshot.roster_status || student.roster_status || "active";
        return {
          ...student,
          full_name: snapshot.full_name || [snapshot.prefix || student.prefix, snapshot.first_name || student.first_name, snapshot.last_name || student.last_name].filter(Boolean).join(" "),
          student_code: snapshot.student_code || student.student_code,
          citizen_id: snapshot.citizen_id || student.citizen_id,
          roster_status: status,
          selected: old ? true : mode === "all",
          amount: old ? old.amount : 0,
          received_date: old?.received_date || "",
          note: old?.note || rosterStatusNote(status),
          row_order: old?.row_order || index + 1,
          student_snapshot: snapshot,
        };
      });
      const currentIds = new Set(rows.map((row) => row.student_id));
      for (const old of oldItems) {
        if (old.student_id && currentIds.has(old.student_id)) continue;
        const snapshot = old.student_snapshot || {};
        rows.push({
          student_id: old.student_id || null,
          full_name: studentName(old),
          student_code: snapshot.student_code || "",
          citizen_id: snapshot.citizen_id || "",
          roster_status: snapshot.roster_status || "ghost",
          selected: true,
          amount: old.amount,
          received_date: old.received_date || "",
          note: old.note || rosterStatusNote(snapshot.roster_status),
          row_order: old.row_order || rows.length + 1,
          student_snapshot: snapshot,
          isHistorical: true,
        });
      }
      local.draft = {
        documentId: doc?.id || null,
        year,
        semester,
        classId: draftClassId,
        documentType: doc?.document_type || "learning_equipment",
        selectionMode: mode,
        rows,
      };
      document.body.insertAdjacentHTML("beforeend", editorModalHtml());
      bindEditor();
    } catch (error) {
      toast("เปิดรายชื่อนักเรียนไม่สำเร็จ", error?.message || String(error), "error");
    }
  }

  function closeEditor() {
    document.getElementById("pe-editor-backdrop")?.remove();
    local.draft = null;
  }

  function bindEditor() {
    const modal = document.getElementById("pe-editor-backdrop");
    if (!modal || !local.draft) return;
    const updateRow = (id, key, value) => {
      const row = local.draft.rows.find((item) => String(item.student_id || "") === String(id));
      if (!row) return;
      row[key] = value;
      updateDraftSummary();
    };
    modal.querySelector("#pe-editor-close")?.addEventListener("click", closeEditor);
    modal.querySelector("#pe-editor-cancel")?.addEventListener("click", closeEditor);
    modal.querySelector("#pe-editor-class")?.addEventListener("change", async (event) => {
      const classId = event.target.value;
      const draft = local.draft;
      closeEditor();
      await openEditor(null, classId);
      if (local.draft) {
        local.draft.year = draft.year;
        local.draft.semester = draft.semester;
      }
    });
    modal.querySelector("#pe-editor-type")?.addEventListener("change", (event) => {
      local.draft.documentType = event.target.value;
    });
    modal.querySelectorAll("[data-pe-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.peMode;
        local.draft.selectionMode = mode;
        if (mode === "all") {
          local.draft.rows.forEach((row) => { row.selected = true; });
        } else if (!local.draft.documentId) {
          local.draft.rows.forEach((row) => { row.selected = false; });
        }
        modal.querySelectorAll("[data-pe-mode]").forEach((item) => item.classList.toggle("active", item.dataset.peMode === mode));
        modal.querySelectorAll("[data-pe-select-student]").forEach((input) => {
          const row = local.draft.rows.find((item) => String(item.student_id || "") === input.dataset.peSelectStudent);
          if (row && !input.disabled) input.checked = Boolean(row.selected);
        });
        updateDraftSummary();
      });
    });
    modal.querySelector("#pe-select-all")?.addEventListener("click", () => {
      local.draft.rows.forEach((row) => { row.selected = true; });
      modal.querySelectorAll("[data-pe-select-student]").forEach((input) => { if (!input.disabled) input.checked = true; });
      updateDraftSummary();
    });
    modal.querySelector("#pe-clear-selection")?.addEventListener("click", () => {
      local.draft.rows.forEach((row) => { if (row.student_id) row.selected = false; });
      modal.querySelectorAll("[data-pe-select-student]").forEach((input) => { if (!input.disabled) input.checked = false; });
      local.draft.selectionMode = "selected";
      modal.querySelectorAll("[data-pe-mode]").forEach((item) => item.classList.toggle("active", item.dataset.peMode === "selected"));
      updateDraftSummary();
    });
    modal.querySelector("#pe-apply-bulk")?.addEventListener("click", () => {
      const amount = Number(modal.querySelector("#pe-bulk-amount")?.value);
      if (!Number.isFinite(amount) || amount < 0) {
        toast("จำนวนเงินไม่ถูกต้อง", "กรุณากรอกจำนวนเงินตั้งแต่ 0 บาทขึ้นไป", "warning");
        return;
      }
      local.draft.rows.forEach((row) => { if (row.selected && row.student_id) row.amount = amount; });
      modal.querySelectorAll("[data-pe-row-amount]").forEach((input) => {
        const row = local.draft.rows.find((item) => String(item.student_id || "") === input.dataset.peRowAmount);
        if (row) input.value = String(row.amount);
      });
      updateDraftSummary();
    });
    modal.querySelector("#pe-editor-rows")?.addEventListener("change", (event) => {
      const target = event.target;
      if (target.matches("[data-pe-select-student]")) {
        updateRow(target.dataset.peSelectStudent, "selected", target.checked);
        if (!target.checked) {
          local.draft.selectionMode = "selected";
          modal.querySelectorAll("[data-pe-mode]").forEach((item) => item.classList.toggle("active", item.dataset.peMode === "selected"));
        }
      } else if (target.matches("[data-pe-row-amount]")) {
        updateRow(target.dataset.peRowAmount, "amount", Number(target.value) || 0);
      } else if (target.matches("[data-pe-row-date]")) {
        updateRow(target.dataset.peRowDate, "received_date", target.value);
      } else if (target.matches("[data-pe-row-note]")) {
        updateRow(target.dataset.peRowNote, "note", target.value);
      }
    });
    modal.querySelector("#pe-editor-save")?.addEventListener("click", saveDraft);
  }

  async function saveDraft() {
    if (!local.draft) return;
    const draft = local.draft;
    const selected = draft.rows.filter((row) => row.selected && row.student_id);
    if (!selected.length) {
      toast("ยังไม่ได้เลือกนักเรียน", "กรุณาเลือกนักเรียนอย่างน้อย 1 คน", "warning");
      return;
    }
    if (draft.selectionMode === "all" && draft.rows.some((row) => row.student_id && !row.selected)) {
      toast("รายชื่อยังไม่ครบ", "ชุดที่ 1 ต้องเลือกนักเรียนทั้งหมดรวมรายชื่อเด็กผี", "warning");
      return;
    }
    const items = selected.map((row, index) => ({
      student_id: row.student_id,
      amount: Number(row.amount) || 0,
      received_date: row.received_date || null,
      note: row.note || null,
      row_order: row.row_order || index + 1,
    }));
    try {
      const button = document.getElementById("pe-editor-save");
      if (button) { button.disabled = true; button.textContent = "กำลังบันทึก..."; }
      const { data, error } = await supabase.rpc("payment_evidence_save_document", {
        p_document_id: draft.documentId,
        p_academic_year: String(draft.year),
        p_semester: Number(draft.semester),
        p_class_id: draft.classId,
        p_document_type: draft.documentType,
        p_selection_mode: draft.selectionMode,
        p_items: items,
      });
      if (error) throw error;
      const documentId = typeof data === "string" ? data : data?.document_id || data?.id;
      if (!documentId) throw new Error("ระบบบันทึกแล้วแต่ไม่ได้รับรหัสเอกสาร");
      closeEditor();
      local.selectedDocId = documentId;
      local.page = "detail";
      toast("บันทึกเอกสารแล้ว", "จัดเก็บหลักฐานการจ่ายเงินเป็นฉบับร่างเรียบร้อย", "success");
      await renderDashboard();
    } catch (error) {
      const button = document.getElementById("pe-editor-save");
      if (button) { button.disabled = false; button.textContent = "บันทึกฉบับร่าง"; }
      toast("บันทึกเอกสารไม่สำเร็จ", error?.message || String(error), "error");
    }
  }

  async function signDocument(slot) {
    const doc = local.detail;
    if (!doc || typeof bnkSignatureBeforeAction !== "function") {
      toast("ระบบลายเซ็นยังไม่พร้อม", "ไม่พบตัวเลือกการลงนามกลางของ BNK SCHOOL OS", "error");
      return;
    }
    const title = ({
      teacher: "ยืนยันรายชื่อนักเรียนและตรวจสอบความถูกต้อง",
      finance: "ยืนยันการจ่ายเงินโดยเจ้าหน้าที่การเงิน",
      director: "ลงนามผู้อำนวยการเพื่อปิดเอกสาร",
    })[slot];
    try {
      await bnkSignatureBeforeAction(title, async (choice) => {
        const { error } = await supabase.rpc("payment_evidence_sign_document", {
          p_document_id: doc.id,
          p_slot_code: slot,
          p_method: choice?.method,
          p_signature_id: choice?.signatureId || null,
        });
        if (error) throw error;
        toast("ลงนามเรียบร้อย", "ระบบบันทึกผู้ลงนามและเปลี่ยนสถานะเอกสารแล้ว", "success");
        local.page = "detail";
        await renderDashboard();
      });
    } catch (error) {
      toast("ลงนามไม่สำเร็จ", error?.message || String(error), "error");
    }
  }

  function openReturnModal() {
    const doc = local.detail;
    if (!doc) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="pe-modal-backdrop" id="pe-return-backdrop">
        <div class="pe-modal" style="max-width:520px">
          <div class="pe-modal-head"><h3>ส่งเอกสารกลับให้ครูแก้ไข</h3><button class="pe-btn" id="pe-return-close">ปิด</button></div>
          <p class="pe-muted">ระบุข้อผิดพลาดหรือข้อมูลที่ต้องแก้ไข เพื่อให้ครูประจำชั้นดำเนินการต่อ</p>
          <div class="pe-field"><label>เหตุผลที่ส่งกลับ</label><textarea id="pe-return-note" rows="4" maxlength="1000" placeholder="ระบุรายการที่ต้องแก้ไข..."></textarea></div>
          <div class="pe-modal-foot"><span></span><div class="pe-actions"><button class="pe-btn" id="pe-return-cancel">ยกเลิก</button><button class="pe-btn warning" id="pe-return-confirm">ส่งกลับให้แก้ไข</button></div></div>
        </div>
      </div>`);
    const modal = document.getElementById("pe-return-backdrop");
    modal.querySelector("#pe-return-close")?.addEventListener("click", () => modal.remove());
    modal.querySelector("#pe-return-cancel")?.addEventListener("click", () => modal.remove());
    modal.querySelector("#pe-return-confirm")?.addEventListener("click", async () => {
      const note = modal.querySelector("#pe-return-note")?.value?.trim() || "";
      if (note.length < 3) {
        toast("กรุณาระบุเหตุผล", "เหตุผลต้องมีอย่างน้อย 3 ตัวอักษร", "warning");
        return;
      }
      try {
        const { error } = await supabase.rpc("payment_evidence_return_document", {
          p_document_id: doc.id,
          p_note: note,
        });
        if (error) throw error;
        modal.remove();
        toast("ส่งเอกสารกลับแล้ว", "ครูประจำชั้นสามารถแก้ไขและส่งใหม่ได้", "success");
        await renderDashboard();
      } catch (error) {
        toast("ส่งกลับไม่สำเร็จ", error?.message || String(error), "error");
      }
    });
  }

  async function blobToDataUrl(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  }

  async function loadSignerImage(signer) {
    if (!signer?.bucket_id || !signer?.storage_path || signer.method === "paper") return "";
    try {
      const { data, error } = await supabase.storage.from(signer.bucket_id).download(signer.storage_path);
      if (error || !data) return "";
      return await blobToDataUrl(data);
    } catch {
      return "";
    }
  }

  function pdfPageHtml(doc, pageItems, pageIndex, pageCount, signerImages, isLastPage) {
    const type = doc.document_type;
    const stage = doc.stage_code_snapshot;
    const level = String(doc.level_name_snapshot || "").match(/\d+/)?.[0] || "........";
    const kind = stage === "early_childhood" ? "kindergarten" : stage === "stage3" ? "secondary" : "primary";
    const checked = (value) => value ? "☑" : "☐";
    const rows = pageItems.map((item, index) => {
      const snapshot = item.student_snapshot || {};
      const globalNumber = index + 1;
      const note = item.note || rosterStatusNote(snapshot.roster_status);
      return `<tr>
        <td>${paymentEvidenceThaiDigits(globalNumber)}</td>
        <td class="pe-pdf-name">${esc(studentName(item))}</td>
        <td>${esc(studentCitizenId(item))}</td>
        <td class="pe-pdf-money">${formatMoney(item.amount)}</td>
        <td>${esc(formatDate(item.received_date))}</td>
        <td></td>
        <td class="pe-pdf-note">${esc(note || "")}</td>
      </tr>`;
    });
    const imageHtml = (slot, left) => signerImages[slot]
      ? `<img class="pe-pdf-signature" style="left:${left}" src="${signerImages[slot]}" alt="">`
      : "";
    const finance = local.signers.find((s) => s.slot_code === "finance");
    const teacher = local.signers.find((s) => s.slot_code === "teacher");
    const director = local.signers.find((s) => s.slot_code === "director");
    const totalAmount = paymentEvidenceThaiDigits(formatMoney(doc.total_amount));
    const pageLabel = ""; // Let the browser paginate the table at actual A4 boundaries.
    return `
      <section class="pe-pdf-page-sheet">
        ${pageLabel}
        <div class="pe-pdf-title">แบบหลักฐานการจ่ายเงิน</div>
        <div class="pe-pdf-period">ภาคเรียนที่ ${paymentEvidenceThaiDigits(esc(doc.semester))} ปีการศึกษา ${paymentEvidenceThaiDigits(esc(doc.academic_year))}</div>
        <div class="pe-pdf-types">
          <div>${checked(type === "learning_equipment")} ค่าอุปกรณ์การเรียน</div>
          <div>${checked(type === "student_uniform")} ค่าเครื่องแบบนักเรียน</div>
          <div>${checked(type === "basic_learning_support")} ค่าจัดการเรียนการสอน (ปัจจัยพื้นฐานสำหรับนักเรียนยากจน)</div>
          <div>${checked(type === "additional_uniform")} ค่าเครื่องแบบนักเรียน (เพิ่มเติม)</div>
        </div>
        <div class="pe-pdf-stars">***********************************************************************************************</div>
        <div class="pe-pdf-level">
          <strong>ระดับชั้น</strong>
          <span>${checked(kind === "kindergarten")} อนุบาลปีที่ ${kind === "kindergarten" ? esc(level) : "........"}</span>
          <span>${checked(kind === "primary")} ประถมศึกษาปีที่ ${kind === "primary" ? esc(level) : "........"}</span>
          <span>${checked(kind === "secondary")} มัธยมศึกษาปีที่ ${kind === "secondary" ? esc(level) : "........"}</span>
          <span>☐ ปวช. ที่จัดโดยสถานประกอบการ ปีที่......</span>
        </div>
        <div class="pe-pdf-declaration">
          นักเรียนจำนวนทั้งสิ้น <strong>${paymentEvidenceThaiDigits(pageItems.length)}</strong> คน ได้รับเงินจากโรงเรียนบ้านหนองเขียว สังกัดสำนักงานเขตพื้นที่การศึกษาประถมศึกษาเชียงใหม่ เขต 3
          ข้าพเจ้าขอรับรองว่าจะนำเงินที่ได้รับไปดำเนินการตามวัตถุประสงค์ของทางราชการ หากไม่ดำเนินการดังกล่าวข้าพเจ้ายินยอมชดใช้เงินคืนให้กับโรงเรียนต่อไป
        </div>
        <table class="pe-pdf-table">
          <colgroup><col style="width:9.2mm"><col style="width:48.6mm"><col style="width:35.1mm"><col style="width:18.5mm"><col style="width:21.8mm"><col style="width:29mm"><col style="width:19mm"></colgroup>
          <thead><tr>
            <th>ที่</th><th>ชื่อ – สกุล</th><th>หมายเลขบัตร<br>ประชาชน ๑๓ หลัก</th><th>จำนวน<br>เงิน</th><th>วันที่รับเงิน</th><th>ลายมือชื่อ<br>ผู้ปกครอง/<br>นักเรียน</th><th>หมายเหตุ</th>
          </tr></thead>
          <tbody>${rows.join("")}</tbody>
        </table>
        <div class="pe-pdf-total"><span>รวมเงินทั้งสิ้น</span><strong>${totalAmount}</strong></div>
        ${isLastPage ? `
          <div class="pe-pdf-signatures">
            <div class="pe-pdf-signature-block pe-pdf-finance">
              ${imageHtml("finance", "27mm")}
              <div>ลงชื่อ........................................ผู้จ่ายเงิน</div>
              <div>(${esc(finance?.signer_name || "........................................")})</div>
              <div>เจ้าหน้าที่การเงิน</div>
            </div>
            <div class="pe-pdf-signature-block pe-pdf-teacher">
              ${imageHtml("teacher", "27mm")}
              <div>ครูประจำชั้น........................................</div>
              <div>(${esc(teacher?.signer_name || "........................................")})</div>
              <div>ตรวจสอบแล้วถูกต้อง</div>
            </div>
          </div>
          <div class="pe-pdf-director">
            ${imageHtml("director", "34mm")}
            <div>ลงชื่อ........................................</div>
            <div>(${esc(director?.signer_name || "........................................")})</div>
            <div>ผู้อำนวยการโรงเรียนบ้านหนองเขียว</div>
          </div>` : ""}
      </section>`;
  }

  async function printDocument() {
    const doc = local.detail;
    if (!doc) return;
    const items = [...local.items].sort((a, b) => (Number(a.row_order) || 0) - (Number(b.row_order) || 0));
    if (!items.length) {
      toast("ไม่มีรายชื่อนักเรียน", "เอกสารนี้ยังไม่มีรายการนักเรียนสำหรับพิมพ์", "warning");
      return;
    }
    if (!paymentEvidencePrintTotalsMatch(doc, items)) {
      toast("ยอดเงินหรือรายชื่อไม่ตรงกับเอกสาร", "กรุณาอัปเดตข้อมูลและตรวจสอบยอดรวมก่อนส่งออก PDF", "error");
      return;
    }
    const win = window.open("", "_blank");
    if (!win) {
      toast("เปิดหน้าพิมพ์ไม่ได้", "กรุณาอนุญาตป๊อปอัปสำหรับเว็บไซต์ BNK SCHOOL OS", "warning");
      return;
    }
    const signerImages = {};
    await Promise.all(local.signers.map(async (signer) => {
      signerImages[signer.slot_code] = await loadSignerImage(signer);
    }));
    // A single flowing table: repeated THEAD, no per-page duplicate totals or signers.
    const pages = [pdfPageHtml(doc, items, 0, 1, signerImages, true)];
    const fontCss = typeof officialPdfFontFaceCss === "function" ? officialPdfFontFaceCss() : "";
    win.document.open();
    win.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>หลักฐานการจ่ายเงิน</title><style>
      ${fontCss}
      /* A4: no fixed row quotas, natural page breaks, repeated column titles. */
      @page{size:A4 portrait;margin:14mm 15mm 15mm}
      *{box-sizing:border-box}
      html,body{margin:0;padding:0;background:#fff;color:#111;font-family:"TH SarabunIT๙",serif}
      .pe-pdf-page-sheet{position:static;display:block;width:100%;height:auto;min-height:0;overflow:visible;margin:0 auto;padding:0;background:#fff;break-after:auto;page-break-after:auto}
      .pe-pdf-title{text-align:center;font-size:18pt;font-weight:700;line-height:1.12;margin:0}
      .pe-pdf-period{text-align:center;font-size:14pt;line-height:1.1;margin:1mm 0 0}
      .pe-pdf-types{display:grid;grid-template-columns:1fr 1fr;column-gap:3mm;row-gap:.8mm;font-size:12.5pt;line-height:1.05;margin:3mm 0 1.5mm}
      .pe-pdf-types div:nth-child(3){font-size:12pt}
      .pe-pdf-stars{text-align:center;font-size:10pt;white-space:nowrap;overflow:hidden;line-height:1}
      .pe-pdf-level{display:grid;grid-template-columns:23mm 1fr 1fr;row-gap:1mm;align-items:center;font-size:12pt;line-height:1.12;margin:2.5mm 0}
      .pe-pdf-level strong{grid-row:1 / span 2}
      .pe-pdf-declaration{font-size:12.5pt;line-height:1.18;text-align:justify;margin:3mm 0 4mm}
      .pe-pdf-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:12pt;line-height:1.07;margin:0}
      .pe-pdf-table thead{display:table-header-group}
      .pe-pdf-table tbody{display:table-row-group}
      .pe-pdf-table tr{break-inside:avoid;page-break-inside:avoid}
      .pe-pdf-table th,.pe-pdf-table td{border:.45pt solid #111;padding:.65mm .6mm;vertical-align:middle;overflow-wrap:anywhere}
      .pe-pdf-table th{height:12mm;text-align:center;font-weight:700;line-height:1.05}
      .pe-pdf-table td{height:6.5mm;text-align:center}
      .pe-pdf-table .pe-pdf-name{text-align:left}
      .pe-pdf-table .pe-pdf-money{text-align:right;white-space:nowrap}
      .pe-pdf-table .pe-pdf-note{text-align:left;font-size:10.5pt}
      .pe-pdf-total,.pe-pdf-signatures,.pe-pdf-director{position:static}
      .pe-pdf-total{display:flex;justify-content:flex-end;align-items:center;gap:3mm;margin-top:3.5mm;min-height:8mm;font-size:13pt;font-weight:700}
      .pe-pdf-total strong{display:inline-block;min-width:32mm;text-align:center;border-bottom:.45pt solid #111;padding:0 2mm}
      .pe-pdf-signatures{display:grid;grid-template-columns:1fr 1fr;gap:10mm;margin-top:5mm;font-size:12.5pt;text-align:center}
      .pe-pdf-signature-block,.pe-pdf-director{position:relative;padding-top:9mm;line-height:1.2;min-height:21mm}
      .pe-pdf-signature{position:absolute;left:50%!important;top:0;transform:translateX(-50%);width:27mm;height:10mm;object-fit:contain;pointer-events:none}
      .pe-pdf-director{width:90mm;margin:3mm auto 0;text-align:center;font-size:12.5pt}
      .pe-pdf-page{display:none}
      /* Keep the final financial sum and all three signature slots together. */
      .pe-pdf-total{break-after:avoid;page-break-after:avoid}
      .pe-pdf-signatures{break-before:avoid;page-break-before:avoid;break-after:avoid}
      .pe-pdf-director{break-before:avoid;page-break-before:avoid}
      @media screen{html,body{background:#e5e7eb}.pe-pdf-page-sheet{width:210mm;padding:14mm 15mm 15mm;min-height:297mm;box-shadow:0 2px 14px #0002;margin:12px auto}}
      @media print{html,body{background:#fff}.pe-pdf-page-sheet{width:100%;padding:0;margin:0;min-height:0;box-shadow:none}thead{display:table-header-group}}
    </style></head><body>${pages.join("")}</body></html>`);
    win.document.close();
    try {
      if (typeof ensureOfficialPdfFont === "function") await ensureOfficialPdfFont("14pt", win.document);
      if (win.document.fonts?.ready) await win.document.fonts.ready;
    } catch(error) {
      win.close();
      toast("โหลดฟอนต์เอกสารไม่ได้", error?.message || "ไม่สามารถใช้ฟอนต์ TH Sarabun IT๙ ได้", "error");
      return;
    }
    win.focus();
    win.print();
  }

  async function toggleFinancePermission(userId, active) {
    try {
      if (active) {
        const { error } = await supabase.from("payment_evidence_permissions")
          .update({ is_active: false, updated_by: state.user.id })
          .eq("user_id", userId);
        if (error) throw error;
        toast("ถอนสิทธิ์แล้ว", "บัญชีนี้จะไม่สามารถจัดการเอกสารทุกห้องได้อีก", "success");
      } else {
        const existing = local.permissions.find((item) => item.user_id === userId);
        if (existing) {
          const { error } = await supabase.from("payment_evidence_permissions")
            .update({ is_active: true, updated_by: state.user.id })
            .eq("user_id", userId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("payment_evidence_permissions")
            .insert({ user_id: userId, is_active: true, created_by: state.user.id, updated_by: state.user.id });
          if (error) throw error;
        }
        toast("ให้สิทธิ์แล้ว", "บัญชีนี้สามารถดูและจัดการเอกสารทุกห้องเรียนได้", "success");
      }
      await renderDashboard();
    } catch (error) {
      toast("เปลี่ยนสิทธิ์ไม่สำเร็จ", error?.message || String(error), "error");
    }
  }

  function bind() {
    const root = document.querySelector("[data-payment-evidence-root]");
    if (!root) return;

    root.querySelectorAll("[data-pe-tab]").forEach((button) => {
      button.addEventListener("click", async () => {
        local.tab = button.dataset.peTab;
        local.page = "list";
        local.selectedDocId = null;
        await renderDashboard();
      });
    });

    root.querySelector('[data-pe-action="create"]')?.addEventListener("click", () => openEditor());
    root.querySelector('[data-pe-action="refresh"]')?.addEventListener("click", async () => {
      await renderDashboard();
      toast("อัปเดตข้อมูลแล้ว", "", "success");
    });
    root.querySelectorAll("[data-pe-open]").forEach((button) => {
      button.addEventListener("click", async () => {
        local.selectedDocId = button.dataset.peOpen;
        local.page = "detail";
        await renderDashboard();
      });
    });

    root.querySelector("#pe-year")?.addEventListener("change", async (event) => {
      local.year = String(event.target.value || periodDefaults().year);
      local.page = "list";
      local.selectedDocId = null;
      await renderDashboard();
    });
    root.querySelector("#pe-semester")?.addEventListener("change", async (event) => {
      local.semester = Number(event.target.value);
      local.page = "list";
      local.selectedDocId = null;
      await renderDashboard();
    });
    const refreshList = () => {
      const list = root.querySelector("#pe-doc-list");
      if (list) list.innerHTML = listRowsHtml();
      const count = root.querySelector(".pe-detail-head .pe-muted");
      if (count) count.textContent = `${filteredDocs().length} รายการ`;
    };
    root.querySelector("#pe-class-filter")?.addEventListener("change", (event) => {
      local.classFilter = event.target.value;
      refreshList();
    });
    root.querySelector("#pe-status-filter")?.addEventListener("change", (event) => {
      local.statusFilter = event.target.value;
      refreshList();
    });
    root.querySelector("#pe-search")?.addEventListener("input", (event) => {
      local.search = event.target.value;
      refreshList();
    });
    // Delegate finance-list events on the stable root. Replacing the filtered
    // table must not remove the input handler after the first typed character.
    root.addEventListener("input", (event) => {
      if (event.target?.id !== "pe-finance-search") return;
      local.financeSearch = event.target.value;
      const cursor = event.target.selectionStart;
      const tab = root.querySelector(".pe-card:last-child");
      if (tab) tab.outerHTML = financeViewHtml();
      const newSearch = root.querySelector("#pe-finance-search");
      if (newSearch) {
        newSearch.focus();
        if (cursor !== null) newSearch.setSelectionRange(cursor, cursor);
      }
    });
    root.addEventListener("click", (event) => {
      const button = event.target.closest?.("[data-pe-finance-toggle]");
      if (!button || !root.contains(button)) return;
      toggleFinancePermission(button.dataset.peFinanceToggle, button.dataset.active === "true");
    });

    root.querySelector('[data-pe-action="back"]')?.addEventListener("click", async () => {
      local.page = "list";
      local.selectedDocId = null;
      await renderDashboard();
    });
    root.querySelector('[data-pe-action="edit"]')?.addEventListener("click", () => openEditor(local.detail));
    root.querySelector('[data-pe-action="print"]')?.addEventListener("click", printDocument);
    root.querySelector('[data-pe-action="submit"]')?.addEventListener("click", () => signDocument("teacher"));
    root.querySelector('[data-pe-action="pay"]')?.addEventListener("click", () => signDocument("finance"));
    root.querySelector('[data-pe-action="director-sign"]')?.addEventListener("click", () => signDocument("director"));
    root.querySelector('[data-pe-action="return"]')?.addEventListener("click", openReturnModal);
  }

  function view() {
    ensureStyles();
    if (local.error) {
      return `<div class="pe-wrap" data-payment-evidence-root><section class="pe-card"><h3>โหลดระบบหลักฐานการจ่ายเงินไม่สำเร็จ</h3><p class="pe-muted">${esc(local.error)}</p><button class="pe-btn primary" data-pe-action="refresh">ลองอีกครั้ง</button></section></div>`;
    }
    if (local.loading) {
      return '<div class="pe-wrap" data-payment-evidence-root><section class="pe-card">กำลังโหลดข้อมูลหลักฐานการจ่ายเงิน...</section></div>';
    }
    return pageHtml();
  }

  return { load, view, bind };
}
