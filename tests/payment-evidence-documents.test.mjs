import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const loader = readFileSync(new URL("../modules/payment-evidence-documents.js", import.meta.url), "utf8");
const compressed = readFileSync(new URL("../modules/payment-evidence-documents.source.gz.b64", import.meta.url), "utf8").trim();
const source = gunzipSync(Buffer.from(compressed, "base64")).toString("utf8");

test("payment evidence module is wired to its dashboard route and lazy loader", () => {
  assert.match(app, /loadPaymentEvidenceFeature/);
  assert.match(app, /module:payment_evidence_documents/);
  assert.match(app, /paymentEvidenceFeature\.load\(\)/);
  assert.match(loader, /DecompressionStream\("gzip"\)/);
  assert.match(loader, /export function createPaymentEvidenceFeature\(ctx\)/);
});

test("payment evidence feature uses secured database workflows", () => {
  for (const rpc of [
    "payment_evidence_roster",
    "payment_evidence_save_document",
    "payment_evidence_sign_document",
    "payment_evidence_return_document",
    "payment_evidence_delete_document",
    "payment_evidence_set_print_finance"
  ]) assert.ok(source.includes(rpc), rpc);
  assert.ok(source.includes("payment_evidence_permissions"));
  assert.ok(source.includes("payment_evidence_print_signer_names"));
});

test("compressed payment evidence source parses as an ECMAScript module", () => {
  execFileSync(process.execPath, ["--check", "--input-type=module"], { input: source, stdio: "pipe" });
});
