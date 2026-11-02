import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

// Explicitly authorized single-row repair. No bulk mutation or storage deletion.
const env = Object.fromEntries((await readFile('.env.local', 'utf8')).split(/\r?\n/)
  .filter(line => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
  .map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')]; }));
const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };
async function request(table, query, options = {}) {
  const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?${new URLSearchParams(query)}`, { ...options, headers: { ...headers, ...options.headers } });
  if (!response.ok) throw new Error(`${table}: HTTP ${response.status}: ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}
const id = '8c44ff9a-6b9f-468a-ac95-20bed8d55984';
const [row] = await request('sessions', { select: '*', id: `eq.${id}` });
const equalField = (key, actual, expected) => key.endsWith('_at') && actual && expected
  ? new Date(actual).getTime() === new Date(expected).getTime()
  : JSON.stringify(actual) === JSON.stringify(expected);
async function verifyAndFinish(original, patch, auditId, authorizationSource, beforeLogs) {
  const [stored] = await request('sessions', { select: '*', id: `eq.${id}` });
  for (const [key, value] of Object.entries({ ...original, ...patch })) {
    if (!equalField(key, stored[key], value)) throw new Error(`Repair verification mismatch: ${key}`);
  }
  const afterLogs = await request('session_count_logs', { select: '*', session_id: `eq.${id}` });
  if (afterLogs.length !== 0) throw new Error('Completed count log was not removed by the status trigger.');
  await request('audit_logs', { id: `eq.${auditId}` }, { method: 'PATCH', body: JSON.stringify({ after_data: { session: stored, session_count_logs: afterLogs, outcome: 'verified', authorization_source: authorizationSource } }) });
  console.log(JSON.stringify({ repaired: true, id, auditId, status: stored.status, feedbackKeys: Object.keys(stored.feedback_fields), photos: stored.photo_url.length, files: stored.file_url.length, countLogsBefore: beforeLogs.length, countLogsAfter: afterLogs.length }));
}
if (process.argv.includes('--apply') && row?.status === 'opened') {
  const archives = await request('audit_logs', { select: '*', entity_id: `eq.${id}`, action: 'eq.feedback_repair_user_authorized_20261102', order: 'created_at.desc', limit: '1' });
  const archived = archives[0];
  if (!archived) throw new Error('No repair archive found; session untouched.');
  const saved = archived.after_data;
  const patch = saved.intended_patch ?? Object.fromEntries(['status', 'feedback_fields', 'students_text', 'photo_url', 'file_url', 'completion_status', 'updated_at'].map(key => [key, saved.session[key]]));
  await verifyAndFinish(archived.before_data.session, patch, archived.id, saved.authorization_source, archived.before_data.session_count_logs);
  process.exit(0);
}
if (!row || row.start_at !== '2026-11-02T05:00:00+00:00'
  || row.group_id !== '2b6e50fb-099c-4bc0-9635-d9636324d3ce'
  || row.updated_at !== '2026-09-08T01:15:11.369+00:00' || row.status !== 'verified') {
  throw new Error('Repair precondition changed; nothing written.');
}
const logs = await request('session_count_logs', { select: '*', session_id: `eq.${id}` });
const patch = { status: 'opened', feedback_fields: {}, students_text: null, photo_url: [], file_url: [], completion_status: {}, updated_at: new Date().toISOString() };
const auditId = randomUUID();
const archive = { id: auditId, actor_user_id: null, organization_id: row.organization_id,
  entity_type: 'sessions', entity_id: id, action: 'feedback_repair_user_authorized_20261102',
  before_data: { session: row, session_count_logs: logs },
  after_data: { intended_patch: patch, outcome: 'archived_before_conditional_update', authorization_source: 'User explicitly requested clearing today Junggu feedback and auditing future sessions on 2026-11-02.' } };
await mkdir('.tmp/feedback-audit', { recursive: true });
await writeFile(`.tmp/feedback-audit/repair-${auditId}.json`, JSON.stringify(archive, null, 2));
if (!process.argv.includes('--apply')) { console.log(JSON.stringify({ dryRun: true, id, auditId, patch, archivedLogs: logs.length })); process.exit(0); }
await request('audit_logs', {}, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(archive) });
const [savedArchive] = await request('audit_logs', { select: '*', id: `eq.${auditId}` });
if (JSON.stringify(savedArchive.before_data.session.feedback_fields) !== JSON.stringify(row.feedback_fields)
  || savedArchive.before_data.session.id !== id) throw new Error('Archive verification failed; session untouched.');
const query = { id: `eq.${id}`, select: '*' };
for (const [key, value] of Object.entries(row)) {
  query[key] = value === null ? 'is.null' : `eq.${typeof value === 'object' ? JSON.stringify(value) : value}`;
}
const updated = await request('sessions', query, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) });
if (updated.length !== 1) throw new Error('Concurrent change: repair was not applied; archived snapshot retained.');
await verifyAndFinish(row, patch, auditId, archive.after_data.authorization_source, logs);
