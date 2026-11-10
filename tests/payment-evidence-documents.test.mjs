import test from "node:test";
import assert from "node:assert/strict";

import {
  calculatePaymentEvidenceTotals,
  paymentEvidenceRosterStatusLabel,
  paymentEvidenceDocumentStatusLabel,
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
