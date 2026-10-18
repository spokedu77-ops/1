import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const bucketMigration = new URL('../../supabase/migrations/20261018100000_create_private_center_criminal_check_bucket.sql', import.meta.url);
const accessMigration = new URL('../../supabase/migrations/20261018101000_harden_center_management_access.sql', import.meta.url);
const secureRollback = new URL('../../supabase/rollback/phase1_center_access_secure_rollback.sql', import.meta.url);
const compatibilityRollback = new URL('../../supabase/rollback/phase1_center_access_legacy_compatibility.sql', import.meta.url);
const migrationTool = new URL('../migrate-center-criminal-check-files.mjs', import.meta.url);

test('bucket migration is idempotent and fails closed instead of overwriting settings', async () => {
  const sql = await readFile(bucketMigration, 'utf8');
  assert.match(sql, /on conflict \(id\) do nothing/i);
  assert.match(sql, /is distinct from false/i);
  assert.match(sql, /raise exception/i);
  assert.doesNotMatch(sql, /on conflict[\s\S]*do update/i);
  assert.doesNotMatch(sql, /(?:insert\s+into|update|delete\s+from)\s+storage\.objects/i);
});

test('access migration blocks regular users while preserving admin-only legacy compatibility', async () => {
  const sql = await readFile(accessMigration, 'utf8');
  assert.match(sql, /revoke all on table public\.centers from public, anon, authenticated/i);
  assert.match(sql, /grant select, insert, update, delete on table public\.centers to authenticated/i);
  assert.match(sql, /create policy centers_authenticated_admin_all[\s\S]*to authenticated/i);
  assert.match(sql, /u\.role in \('admin', 'master'\)/i);
  assert.match(sql, /u\.is_admin is true/i);
  assert.doesNotMatch(sql, /create policy authenticated_all_centers/i);
  assert.match(sql, /grant select, insert, update, delete on table public\.centers to service_role/i);
  assert.doesNotMatch(sql, /grant all on table/i);
});

test('default rollback never restores broad authenticated access', async () => {
  const sql = await readFile(secureRollback, 'utf8');
  assert.doesNotMatch(sql, /authenticated_all_centers[\s\S]*create policy/i);
  assert.doesNotMatch(sql, /grant .*authenticated/i);
});

test('legacy bridge is admin-only and never recreates authenticated_all_centers', async () => {
  const sql = await readFile(compatibilityRollback, 'utf8');
  assert.match(sql, /to authenticated[\s\S]*u\.role in \('admin', 'master'\)/i);
  assert.match(sql, /u\.is_admin is true/i);
  assert.doesNotMatch(sql, /create policy authenticated_all_centers/i);
});

test('file migration serializes the JSONB snapshot used for CAS', async () => {
  const source = await readFile(migrationTool, 'utf8');
  assert.match(source, /\.eq\('criminal_check_files', JSON\.stringify\(current\)\)/);
  assert.doesNotMatch(source, /\.eq\('criminal_check_files', current\)/);
});
