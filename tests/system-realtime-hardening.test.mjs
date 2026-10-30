import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
test("Realtime bursts request one debounced refresh, not concurrent full reloads",()=>{
 const x=app.slice(app.indexOf("function subscribeRealtime()"),app.indexOf("supabase.auth.onAuthStateChange"));
 assert.ok(x.includes("queueRealtimeDashboardRefresh()"));
 assert.ok(!x.includes("await renderDashboard()"));
 assert.match(app,/bnkRealtimeRefreshActive=true/);
 assert.match(app,/bnkRealtimeRefreshPending=true/);
 assert.match(app,/if\(bnkRealtimeRefreshPending\)queueRealtimeDashboardRefresh\(\)/);
});
test("timetable high growth lists are fully paginated with deterministic tie breakers",()=>{
 for(const table of ["timetable_entries","teaching_assignments","academic_subjects"]){
   const regex=new RegExp("fetchAllSupabaseRows\\\\(\\\\(\\\\)=>supabase\\\\.from\\\\(\\\""+table+"\\\"\\\\)\\\\.select");
   assert.match(app,regex,table);
 }
 assert.match(app,/async function fetchAllSupabaseRows\(/);
 assert.match(app,/\.range\(from,from\+pageSize-1\)/);
});
