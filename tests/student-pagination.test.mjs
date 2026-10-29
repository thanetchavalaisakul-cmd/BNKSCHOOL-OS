import test from "node:test";
import assert from "node:assert/strict";
import {paginateRows} from "../student-pagination.js";
test("default page renders at most 50 of 625 records",()=>{
 const data=Array.from({length:625},(_,i)=>({id:i}));
 const first=paginateRows(data,1);
 assert.equal(first.rows.length,50);
 assert.equal(first.totalPages,13);
 assert.equal(first.rows[0].id,0);
 const last=paginateRows(data,13);
 assert.equal(last.rows.length,25);
 assert.equal(last.rows[0].id,600);
});
test("page navigation remains within actual rows",()=>{
 const x=Array.from({length:3},(_,i)=>i);
 assert.deepEqual(paginateRows(x,99).rows,x);
 assert.equal(paginateRows(x,-4).page,1);
 assert.equal(paginateRows([],10).totalPages,1);
 assert.equal(paginateRows([],10).rows.length,0);
});
test("pagination does not mutate the complete roster for exports",()=>{
 const data=Array.from({length:101},(_,i)=>i);
 const slice=paginateRows(data,2);
 assert.equal(slice.rows[0],50);
 assert.equal(data.length,101);
});
