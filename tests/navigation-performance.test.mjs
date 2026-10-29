import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const styles=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
test("navigation shows a visible loading panel before asynchronous fetches",()=>{
 assert.match(app,/if\(isNewView\)showModuleLoadingScreen\(\)/);
 assert.match(app,/surface\.setAttribute\("aria-busy","true"\)/);
 assert.match(styles,/\.bnk-module-loading/);
});
test("timetable reentry cache is short, scoped to the same logged-in user",()=>{
 assert.match(app,/TIMETABLE_REENTRY_CACHE_MS=60000/);
 assert.match(app,/state\.timetableLastLoadedUserId===state\.user\?\.id/);
 assert.match(app,/id="timetable-refresh-workspace"/);
});
test("timetable constraints are not fetched when simply opening the planner",()=>{
 assert.match(app,/\["conditions","generate"\]\.includes\(state\.timetableView\)\) await timetableConstraintFeature\.load\(\)/);
});
test("preschool queries are run in the same batch as timetable queries",()=>{
 assert.match(app,/jointTeachersRes, preschoolRes, preschoolRosterRes\] = await Promise\.all\(\[/);
});
