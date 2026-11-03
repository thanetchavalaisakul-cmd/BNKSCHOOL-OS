import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const dialogs = readFileSync(new URL("../modules/academic-dialogs.js", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20261103033000_academic_transfer_reapproval_signature_gate.sql", import.meta.url), "utf8");

function functionBody(startToken, endToken) {
  const start = app.indexOf(startToken);
  const end = app.indexOf(endToken, start + startToken.length);
  assert.ok(start >= 0 && end > start, "Expected PDF function source");
  return app.slice(start, end);
}

test("Official ปพ.7 PDF has ink-only signature spaces for registrar and director", () => {
  const fn = functionBody("function academicCertificateResultSignBlock(", "function academicCertificateResultHtml(");
  assert.match(fn, /cert-result-sign-space/);
  assert.doesNotMatch(fn, /image_data_url|<img/);
  assert.match(fn, /escapeHtml\(name\)/);
  assert.match(fn, /escapeHtml\(title\)/);
  const html = functionBody("function academicCertificateResultHtml(", "async function academicCertificateBuildResultPdf(");
  assert.match(html, /academicCertificateResultSignBlock\("registrar"/);
  assert.match(html, /academicCertificateResultSignBlock\("director"/);
});

test("Final certificate export uses signer data only, while request approval sheet retains electronic signature", () => {
  const result = functionBody("async function academicCertificateBuildResultPdf(", "async function academicCertificateExport(");
  assert.doesNotMatch(result, /academicCertificatePdfSignatures\(requestId\)/);
  assert.match(result, /academicCertificateSignaturesFor\(requestId\)/);
  const approval = functionBody("function academicCertificateApprovalBox(", "function academicCertificateInfoCell(");
  assert.match(approval, /image_data_url/);
});

test("Official ปพ.7 certification block is centered as a block, not centered word by word", () => {
  const ruleStart = css.lastIndexOf(".academic-certificate-result-page .cert-result-body-block{");
  assert.ok(ruleStart > 0);
  const rule = css.slice(ruleStart, css.indexOf("}", ruleStart));
  assert.match(rule, /margin:0 auto!important/);
  assert.match(rule, /transform:translateX\(-3\.5mm\)!important/);
  assert.match(rule, /padding-left:9mm!important/);
  assert.match(rule, /text-align:left!important/);
});

test("Finance rejection to approval does not demand a second original-submit signature", () => {
  assert.match(migration, /TG_TABLE_NAME='academic_transfer_requests' AND NEW.status='submitted' AND v_changed AND v_previous IS DISTINCT FROM 'rejected' THEN/);
  // Initial submission and every other document system still require their original action signatures.
  for (const code of ["academic_certificate_requests", "academic_document_service_requests", "lesson_plans", "personnel_pa_submissions"]) {
    assert.ok(migration.includes("TG_TABLE_NAME='"+code+"'"), code);
  }
  assert.match(migration, /bnk_action_signatures/);
});

test("Finance reviewer still signs each approval change via atomic four-method flow", () => {
  const start = dialogs.indexOf("async function academicTransferReviewModal(");
  const end = dialogs.indexOf("async function academicDocumentServiceReviewModal(", start);
  const modal = dialogs.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(modal, /review_academic_registration_signed/);
  assert.match(modal, /p_signature_id:savedId/);
  assert.match(modal, /p_finance_status:financeStatus/);
  assert.match(modal, /academicRegistrationSavedSignaturePicker/);
});
