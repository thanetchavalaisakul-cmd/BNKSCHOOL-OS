import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  calculatePaymentEvidenceTotals,
  paymentEvidenceRosterStatusLabel,
  paymentEvidenceDocumentStatusLabel,
  paymentEvidenceCanEditDocument,
  paymentEvidenceCanDeleteDocument,
  paymentEvidenceIsDirectorRole,
  paymentEvidenceThaiDigits,
  paymentEvidencePdfLevelRoom,
  paymentEvidencePrintTotalsMatch,
  paymentEvidenceApplyBulkDate,
} from "../modules/payment-evidence-documents.js";

test("payment evidence totals include selected students only", () => {
  const result = calculatePaymentEvidenceTotals([
    { selected: true, amount: 120 },
    { selected: true, amount: "35.50" },
    { selected: false, amount: 999 },
    { selected: true, amount: 0 },
  ]);
  assert.equal(result.studentCount, 3);
  assert.equal(result.totalAmount, 155.5);
});

test("payment evidence totals handle empty and invalid amounts safely", () => {
  assert.deepEqual(calculatePaymentEvidenceTotals([]), { studentCount: 0, totalAmount: 0 });
  assert.deepEqual(calculatePaymentEvidenceTotals([
    { selected: true, amount: "not-a-number" },
    { selected: false, amount: 25 },
  ]), { studentCount: 1, totalAmount: 0 });
});

test("roster status labels distinguish moved, pending, ghost and active students", () => {
  assert.equal(paymentEvidenceRosterStatusLabel("transferred_out"), "ย้ายแล้ว");
  assert.equal(paymentEvidenceRosterStatusLabel("transfer_pending"), "มีใบย้าย · รอดำเนินการ");
  assert.equal(paymentEvidenceRosterStatusLabel("ghost"), "เด็กผี");
  assert.equal(paymentEvidenceRosterStatusLabel("active"), "ปกติ");
});

test("document status labels cover the full workflow", () => {
  assert.equal(paymentEvidenceDocumentStatusLabel("draft"), "ฉบับร่าง");
  assert.equal(paymentEvidenceDocumentStatusLabel("submitted"), "รอตรวจสอบจากการเงิน");
  assert.equal(paymentEvidenceDocumentStatusLabel("returned"), "ส่งกลับให้แก้ไข");
  assert.equal(paymentEvidenceDocumentStatusLabel("paid"), "จ่ายเงินแล้ว · รอผู้อำนวยการลงนาม");
  assert.equal(paymentEvidenceDocumentStatusLabel("completed"), "สมบูรณ์");
  assert.equal(paymentEvidenceDocumentStatusLabel("cancelled"), "ยกเลิก");
});


test("only the document creator homeroom teacher or super admin can edit drafts and returned documents", () => {
  const document = { id: "doc-1", class_id: "class-1", created_by: "teacher-1", status: "draft" };
  const teacherAssignments = [{ class_id: "class-1" }];

  assert.equal(paymentEvidenceCanEditDocument({
    document, userId: "teacher-1", assignments: teacherAssignments,
  }), true);
  assert.equal(paymentEvidenceCanEditDocument({
    document, userId: "teacher-2", assignments: teacherAssignments,
  }), false);
  assert.equal(paymentEvidenceCanEditDocument({
    document, userId: "finance-1", assignments: [],
  }), false);
  assert.equal(paymentEvidenceCanEditDocument({
    document, userId: "admin-1", isSuperAdmin: true,
  }), true);

  for (const status of ["submitted", "paid", "completed", "cancelled"]) {
    assert.equal(paymentEvidenceCanEditDocument({
      document: { ...document, status },
      userId: "admin-1",
      isSuperAdmin: true,
    }), false);
  }
});

test("director and acting director roles can complete paid documents", () => {
  assert.equal(paymentEvidenceIsDirectorRole("director"), true);
  assert.equal(paymentEvidenceIsDirectorRole("acting_director"), true);
  assert.equal(paymentEvidenceIsDirectorRole("teacher"), false);
});

test("database migration enforces RLS and server-side edit boundaries", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20261110_payment_evidence_documents.sql", import.meta.url),
    "utf8",
  );

  for (const table of [
    "payment_evidence_permissions",
    "payment_evidence_documents",
    "payment_evidence_items",
    "payment_evidence_signers",
    "payment_evidence_audit",
  ]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }

  const editFunction = migration.match(
    /create or replace function private\.can_edit_payment_evidence_document\(p_document_id uuid\)[\s\S]*?\$\$;/i,
  )?.[0];
  assert.ok(editFunction, "edit authorization function exists");
  assert.match(editFunction, /d\.status in \('draft', 'returned'\)/i);
  assert.doesNotMatch(editFunction, /is_payment_evidence_finance/i);

  for (const functionName of [
    "set_payment_evidence_updated_at",
    "audit_payment_evidence_document",
    "guard_payment_evidence_status_transition",
  ]) {
    assert.match(
      migration,
      new RegExp(`revoke all on function private\\.${functionName}\\(\\) from public, anon;`, "i"),
    );
  }
});


test("payment evidence migration keeps SQL function dollar quotes balanced", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20261110_payment_evidence_documents.sql", import.meta.url),
    "utf8",
  );
  const opens = [...migration.matchAll(/^\s*as \$\$\s*$/gm)].length;
  const closes = [...migration.matchAll(/^\s*\$\$;\s*$/gm)].length;
  assert.equal(opens, closes);
  assert.ok(opens >= 12);
  assert.doesNotMatch(migration, /^\s*as \$\s*$/m);
  assert.doesNotMatch(migration, /^\s*\$;\s*$/m);
});

test("payment evidence print renders official Thai numerals", () => {
  assert.equal(paymentEvidenceThaiDigits("4200.50 / 2569 / 1234567890123"), "๔๒๐๐.๕๐ / ๒๕๖๙ / ๑๒๓๔๕๖๗๘๙๐๑๒๓");
});

test("payment evidence refuses to print mismatched financial totals or student counts", () => {
  const items = [{ amount: 2000 }, { amount: "2200.00" }];
  assert.equal(paymentEvidencePrintTotalsMatch({ student_count: 2, total_amount: 4200 }, items), true);
  assert.equal(paymentEvidencePrintTotalsMatch({ student_count: 2, total_amount: 4199 }, items), false);
  assert.equal(paymentEvidencePrintTotalsMatch({ student_count: 1, total_amount: 4200 }, items), false);
  assert.equal(paymentEvidencePrintTotalsMatch({ student_count: 2, total_amount: 4200 }, [{ amount: -1 }, { amount: 4201 }]), false);
});

test("one receipt date applies only to selected students without changing individual exceptions", () => {
  const rows = [
    { student_id: "a", selected: true, received_date: "" },
    { student_id: "b", selected: false, received_date: "2026-11-01" },
    { student_id: "c", selected: true, received_date: "2026-11-02" },
  ];
  const updated = paymentEvidenceApplyBulkDate(rows, "2026-11-10");
  assert.deepEqual(updated.map((r) => r.received_date), ["2026-11-10", "2026-11-01", "2026-11-10"]);
  assert.equal(rows[0].received_date, "");
  assert.throws(() => paymentEvidenceApplyBulkDate(rows, ""), /วันที่รับเงิน/);
});

test("payment PDF is one naturally paginated A4 table with one final sum and repeating table headers", async () => {
  const source = await readFile(new URL("../modules/payment-evidence-documents.js", import.meta.url), "utf8");
  const start = source.indexOf("function pdfPageHtml(");
  const end = source.indexOf("async function toggleFinancePermission(", start);
  const printSource = source.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(printSource, /const pages = \[pdfPageHtml\(doc, items, 0, 1, signerImages, true\)\]/);
  assert.doesNotMatch(printSource, /items\.slice\(pageIndex\s*\*\s*8/);
  assert.doesNotMatch(printSource, /while\s*\(rows\.length\s*<\s*8\)/);
  assert.match(printSource, /\.pe-pdf-table thead\{display:table-header-group\}/);
  assert.match(printSource, /\.pe-pdf-table tr\{break-inside:avoid/);
  assert.match(printSource, /@page\{size:A4 portrait;margin:14mm 15mm 15mm\}/);
  assert.match(printSource, /class="pe-pdf-final"/);
  assert.match(printSource, /font-family:"TH SarabunIT๙"/);
  assert.match(printSource, /paymentEvidenceThaiDigits\(formatMoney\(item.amount\)\)/);
  assert.equal((printSource.match(/class="pe-pdf-total"/g) || []).length, 1);
});

test("payment forms have rounded controls and a selected-student receipt date action", async () => {
  const source = await readFile(new URL("../modules/payment-evidence-documents.js", import.meta.url), "utf8");
  assert.match(source, /\.pe-field input,\.pe-field select,\.pe-field textarea\{[^}]*border-radius:12px/);
  assert.match(source, /\.pe-roster-table input:not\(\[type=checkbox\]\)\{[^}]*border-radius:10px/);
  assert.match(source, /id="pe-bulk-date" type="date"/);
  assert.match(source, /#pe-apply-bulk-date/);
  assert.match(source, /paymentEvidenceApplyBulkDate\(local\.draft\.rows, date\)/);
});

test("official finance PDF prints classroom and room together in Thai digits", () => {
  const classes = [{ id: "class-1", level_name: "ป.3", room_name: "2" }];
  assert.equal(paymentEvidencePdfLevelRoom({
    class_id: "class-1",
    stage_code_snapshot: "stage1",
    class_label_snapshot: "ป.3/2",
    level_name_snapshot: "ป.3",
  }, classes), "๓/๒");
  assert.equal(paymentEvidencePdfLevelRoom({
    class_label_snapshot: "อ.2/3",
    level_name_snapshot: "อ.2",
  }), "๒/๓");
  assert.equal(paymentEvidencePdfLevelRoom({
    class_label_snapshot: "ม.1/1",
    level_name_snapshot: "ม.1",
  }), "๑/๑");
});

test("official PDF preserves historical room snapshot and handles class fallback", () => {
  const classes = [{ id: "old-class", level_name: "ป.3", room_name: "6" }];
  assert.equal(paymentEvidencePdfLevelRoom({
    class_id: "old-class", class_label_snapshot: "ป.3/2", level_name_snapshot: "ป.3",
  }, classes), "๓/๒");
  assert.equal(paymentEvidencePdfLevelRoom({
    class_id: "old-class", level_name_snapshot: "ป.3",
  }, classes), "๓/๖");
  assert.equal(paymentEvidencePdfLevelRoom({
    class_id: "missing", class_label_snapshot: "ป.4/1", level_name_snapshot: "ป.4",
  }, []), "๔/๑");
});

test("official PDF shows class and room for kindergarten, primary, secondary while retaining signatures", async () => {
  const source = await readFile(new URL("../modules/payment-evidence-documents.js", import.meta.url), "utf8");
  const gradeRow = source.slice(source.indexOf('<div class="pe-pdf-level">'),source.indexOf('<div class="pe-pdf-declaration">'));
  assert.match(gradeRow, /อนุบาลปีที่ \$\{kind === "kindergarten" \? esc\(levelRoom\)/);
  assert.match(gradeRow, /ประถมศึกษาปีที่ \$\{kind === "primary" \? esc\(levelRoom\)/);
  assert.match(gradeRow, /มัธยมศึกษาปีที่ \$\{kind === "secondary" \? esc\(levelRoom\)/);
  assert.match(source, /bnkSignatureBeforeAction/);
  assert.match(source, /class="pe-pdf-signatures"/);
});

test("payment evidence deletion permissions: teacher only own; finance and super admin all", () => {
  const document = { id: "doc-a", status: "completed", created_by: "teacher-a", class_id: "class-a" };
  assert.equal(paymentEvidenceCanDeleteDocument({ document, userId: "teacher-a" }), true);
  assert.equal(paymentEvidenceCanDeleteDocument({ document, userId: "teacher-b" }), false);
  assert.equal(paymentEvidenceCanDeleteDocument({ document, userId: "finance", isFinance: true }), true);
  assert.equal(paymentEvidenceCanDeleteDocument({ document, userId: "admin", isSuperAdmin: true }), true);
  assert.equal(paymentEvidenceCanDeleteDocument({ document: null, userId: "admin", isSuperAdmin: true }), false);
  assert.equal(paymentEvidenceCanDeleteDocument({ document, userId: null, isSuperAdmin: true }), false);
});

test("secure payment evidence deletion uses the global password verification dialog", async () => {
  const source = await readFile(new URL("../modules/payment-evidence-documents.js", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /createPaymentEvidenceFeature\(\{[^}]*secureDeleteModal/);
  assert.match(source, /secureDeleteModal\(\{/);
  assert.match(source, /data-pe-delete/);
  assert.match(source, /data-pe-action="delete"/);
  assert.match(source, /verifiedClient\.rpc\("payment_evidence_delete_document"/);
  assert.match(source, /afterDelete:\s*async \(\) =>/);
  assert.match(source, /root\.addEventListener\("click", async \(event\)/);
});

test("payment evidence permanent removal runs as a server-side authorized transaction", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20261110_payment_evidence_secure_delete.sql", import.meta.url), "utf8");
  assert.match(migration, /create or replace function public\.payment_evidence_delete_document\(p_document_id uuid\)/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /private\.is_super_admin\(\)/i);
  assert.match(migration, /v_document\.created_by = auth\.uid\(\)/i);
  assert.match(migration, /private\.is_payment_evidence_finance\(\)/i);
  assert.match(migration, /private\.has_recent_password_auth\(90\)/i);
  assert.match(migration, /insert into public\.deletion_audit_log/i);
  assert.match(migration, /delete from public\.bnk_action_signatures/i);
  assert.match(migration, /a\.system_code = 'payment_evidence'/i);
  assert.match(migration, /delete from public\.payment_evidence_documents/i);
  assert.match(migration, /revoke all on function public\.payment_evidence_delete_document\(uuid\) from public, anon/i);
  assert.match(migration, /grant execute on function public\.payment_evidence_delete_document\(uuid\) to authenticated/i);
  assert.doesNotMatch(migration, /delete from storage\.objects/i);
  assert.doesNotMatch(migration, /delete from public\.signatures/i);
});

test("deleting a payment document clears its own cascade records but preserves shared signature assets", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20261110_payment_evidence_documents.sql", import.meta.url), "utf8");
  for (const table of ["payment_evidence_items", "payment_evidence_signers", "payment_evidence_audit"]) {
    const section = migration.slice(migration.indexOf("create table if not exists public." + table));
    assert.match(section.slice(0, 500), /document_id uuid not null references public\.payment_evidence_documents\(id\) on delete cascade/i);
  }
});

test("finance print signers are separate from finance access and admin-only", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/20261110_payment_evidence_wet_signers.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /create table if not exists public\.payment_evidence_print_settings/i);
  assert.match(sql, /alter table public\.payment_evidence_print_settings enable row level security/i);
  assert.match(sql, /create or replace function public\.payment_evidence_set_print_finance\(p_user_id uuid\)/i);
  assert.match(sql, /not private\.is_super_admin\(\)/i);
  assert.match(sql, /private\.is_active_user\(\)/i);
  assert.match(sql, /create or replace function public\.payment_evidence_print_signer_names\(p_document_id uuid\)/i);
  assert.match(sql, /private\.can_view_payment_evidence_document\(p_document_id\)/i);
  assert.match(sql, /revoke all on public\.payment_evidence_print_settings from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.payment_evidence_set_print_finance\(uuid\) to authenticated/i);
  assert.doesNotMatch(sql, /insert into public\.payment_evidence_permissions/i);
  assert.doesNotMatch(sql, /update public\.payment_evidence_permissions/i);
});

test("print names follow actual class teachers, shared director and selected payer", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/20261110_payment_evidence_wet_signers.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /from public\.homeroom_teachers h/i);
  assert.match(sql, /where h\.class_id = v_document\.class_id/i);
  assert.match(sql, /h\.teacher_id = v_document\.created_by/i);
  assert.match(sql, /from public\.academic_certificate_settings c where c\.id = 1/i);
  assert.match(sql, /from public\.academic_registration_settings r where r\.id = 1/i);
  assert.match(sql, /from public\.payment_evidence_print_settings s/i);
  assert.match(sql, /'finance', coalesce\(v_finance, ''\)/);
  assert.match(sql, /'teacher', coalesce\(v_teacher, ''\)/);
  assert.match(sql, /'director', coalesce\(v_director, ''\)/);
});

test("wet-signed financial PDF never embeds online central signature images", async () => {
  const source = await readFile(new URL("../modules/payment-evidence-documents.js", import.meta.url), "utf8");
  const pdf = source.slice(source.indexOf("function pdfPageHtml("),source.indexOf("async function toggleFinancePermission("));
  assert.match(pdf, /local\.printSignerNames\.finance/);
  assert.match(pdf, /local\.printSignerNames\.teacher/);
  assert.match(pdf, /local\.printSignerNames\.director/);
  assert.match(pdf, /const signerImages = \{\}/);
  assert.doesNotMatch(pdf, /imageHtml\("finance"/);
  assert.doesNotMatch(pdf, /imageHtml\("teacher"/);
  assert.doesNotMatch(pdf, /imageHtml\("director"/);
  assert.doesNotMatch(pdf, /loadSignerImage\(signer\)/);
  assert.match(pdf, /class="pe-pdf-signatures"/);
  assert.match(pdf, /ลงชื่อ\.*ผู้จ่ายเงิน/);
  assert.match(pdf, /ครูประจำชั้น\.*\./);
});

test("admin settings provides a persisted printed payer without giving finance workflow permissions", async () => {
  const source = await readFile(new URL("../modules/payment-evidence-documents.js", import.meta.url), "utf8");
  assert.match(source, /id="pe-print-finance-user"/);
  assert.match(source, /id="pe-print-finance-save"/);
  assert.match(source, /supabase\.rpc\("payment_evidence_set_print_finance"/);
  assert.match(source, /supabase\.rpc\("payment_evidence_print_signer_names"/);
  assert.match(source, /\.from\("payment_evidence_print_settings"\)/);
  assert.match(source, /root\.querySelector\("#pe-print-finance-save"\)/);
});

test("finance PDF type and grade checkboxes use the same left and right vertical grid guides", async () => {
  const source = await readFile(new URL("../modules/payment-evidence-documents.js", import.meta.url), "utf8");
  const css = source.slice(
    source.indexOf("/* Keep both 2-column checkbox groups"),
    source.indexOf("      .pe-pdf-declaration{"),
  );
  assert.ok(css.startsWith("/* Keep both 2-column checkbox groups"), "missing grid alignment styles");
  assert.match(css, /\.pe-pdf-types,\.pe-pdf-level\{display:grid;grid-template-columns:23mm minmax\(0,1fr\) minmax\(0,1fr\);column-gap:0\}/);
  for (const [selector, col, row] of [
    ["div:nth-child(1)", 2, 1], ["div:nth-child(2)", 3, 1],
    ["div:nth-child(3)", 2, 2], ["div:nth-child(4)", 3, 2],
  ]) {
    const pattern = new RegExp("\\.pe-pdf-types " + selector.replace(/[()]/g, "\\$&") + "\\{grid-column:" + col + ";grid-row:" + row);
    assert.match(css, pattern);
  }
  for (const [number, col, row] of [[1, 2, 1], [2, 3, 1], [3, 2, 2], [4, 3, 2]]) {
    assert.ok(css.includes(\`.pe-pdf-level span:nth-of-type(\${number}){grid-column:\${col};grid-row:\${row}}\`));
  }
  assert.match(css, /\.pe-pdf-types > div\{min-width:0;overflow-wrap:anywhere\}/);
  assert.match(css, /\.pe-pdf-types div:nth-child\(3\)\{grid-column:2;grid-row:2;font-size:12pt;padding-right:3mm\}/);
});

test("finance PDF level heading remains at original left x but first kindergarten row y", async () => {
  const source = await readFile(new URL("../modules/payment-evidence-documents.js", import.meta.url), "utf8");
  const css = source.slice(source.indexOf("/* Keep both 2-column checkbox groups"), source.indexOf("      .pe-pdf-declaration{"));
  assert.match(css, /\.pe-pdf-level strong\{grid-column:1;grid-row:1;align-self:start\}/);
  assert.match(css, /\.pe-pdf-level\{row-gap:1mm;align-items:start;/);
  assert.doesNotMatch(css, /grid-row:1\s*\/\s*span 2/);
  const html = source.slice(source.indexOf('<div class="pe-pdf-level">'), source.indexOf('<div class="pe-pdf-declaration">'));
  assert.match(html, /<strong>ระดับชั้น<\/strong>/);
  assert.match(html, /อนุบาลปีที่/);
  assert.match(source, /\.pe-pdf-title\{text-align:center;font-size:18pt;/);
  assert.match(source, /class="pe-pdf-signatures"/);
});
