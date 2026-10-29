import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase-project-safe-delete-20261029.sql",import.meta.url),"utf8");
test("project delete previews linked active/archived procurement and budget cases",()=>{
 assert.match(app,/supabase\.rpc\("school_project_delete_impact",\{p_project_id:p\.id\}\)/);
 assert.match(app,/impact\?\.active_procurement/);
 assert.match(app,/impact\?\.archived_procurement/);
 assert.match(app,/impact\?\.budget_disbursements/);
});
test("deletion is an atomic secured RPC, not a raw delete",()=>{
 const handler=app.slice(app.indexOf("async function deleteSelectedProject(){"),app.indexOf("async function deleteSelectedProjectActivity(){"));
 assert.match(handler,/client\.rpc\("delete_school_project_safely",\{p_project_id:p\.id\}\)/);
 assert.doesNotMatch(handler,/client\.from\("school_projects"\)\.delete\(/);
 assert.match(handler,/secureDeleteModal\(/);
});
test("only archived procurement may be detached; preserve financial history",()=>{
 assert.match(sql,/c\.status<>'deleted' OR c\.deleted_at IS NULL/);
 assert.match(sql,/PROJECT_HAS_BUDGET_DOCUMENTS/);
 assert.match(sql,/PROJECT_HAS_ACTIVE_PROCUREMENT/);
 assert.match(sql,/private\.deleted_project_procurement_links/);
 assert.match(sql,/UPDATE public\.procurement_document_cases c SET project_id=NULL,activity_id=NULL/);
 assert.doesNotMatch(sql,/DELETE FROM public\.procurement_document_cases/);
});
test("database delete authorization includes password re-verification for owners",()=>{
 assert.match(sql,/private\.is_super_admin\(\)/);
 assert.match(sql,/private\.has_recent_password_auth\(90\)/);
 assert.match(sql,/private\.is_active_user\(\)/);
});
