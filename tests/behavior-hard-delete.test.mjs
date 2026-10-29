import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const behavior = readFileSync(new URL('../behavior.js', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20261029035306_behavior_hard_delete_event_20261029.sql', import.meta.url), 'utf8');

test('behavior module remains valid ESM JavaScript', () => {
  const result = spawnSync(process.execPath, ['--check', '--input-type=module'], {
    input: behavior, encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr);
});

test('permanent delete is limited to super admins and requires explicit confirmation', () => {
  assert.match(behavior, /bs\.canAdmin\?'<button[^']+data-bdelete/);
  assert.match(behavior, /prompt\('เพื่อยืนยันการลบถาวร/);
  assert.match(behavior, /rpc\("behavior_hard_delete_event",\{p_event_id:id\}\)/);
  assert.match(migration, /not public\.behavior_is_super_admin\(\)/);
  assert.match(migration, /revoke all on function public\.behavior_hard_delete_event\(uuid\) from public, anon/);
});

test('storage files are removed before database records; void flow remains intact', () => {
  const storagePos = behavior.indexOf('.storage.from("behavior-evidence").remove(');
  const rpcPos = behavior.indexOf('.rpc("behavior_hard_delete_event"');
  assert.ok(storagePos > 0 && rpcPos > storagePos);
  assert.match(behavior, /\["void","ยกเลิกรายการ \(ไม่นับคะแนน\)"\]/);
  assert.match(migration, /delete from public\.behavior_case_audit/);
  assert.match(migration, /delete from public\.behavior_events/);
  assert.match(migration, /join storage\.objects/);
});
