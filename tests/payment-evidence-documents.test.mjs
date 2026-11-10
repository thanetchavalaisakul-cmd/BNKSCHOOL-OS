import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  calculatePaymentEvidenceTotals,
  paymentEvidenceRosterStatusLabel,
  paymentEvidenceDocumentStatusLabel,
  paymentEvidenceCanEditDocument,
  paymentEvidenceIsDirectorRole,
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
