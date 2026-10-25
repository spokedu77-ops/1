import { readFileSync, writeFileSync } from 'node:fs';
import { Client } from 'pg';

const url = readFileSync('.env.local', 'utf8')
  .split('\n')
  .find((l) => l.startsWith('SPOKEDU_MASTER_DATABASE_URL='))
  ?.slice(32)
  .trim()
  .replace(/^"|"$/g, '');

const CORRECT_IDS = [
  '584f0e25-1677-497d-b600-5b140075b762',
  '3835feb5-f5f8-49cc-817d-345517969dd3',
  'b8461249-7c89-4180-9e30-fbfc06bc0252',
  'a84785bd-c62c-4633-b70d-0fdb6025d23b',
];
const YOON_KEEP = '54768963-4242-4429-bd01-9e036cb3990c';

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const migrations = await client.query(`
  select version, name from supabase_migrations.schema_migrations
  where version like '20261023%' order by version`);
const targets = await client.query(
  `select ml.id, ml.teacher_id, u.name, u.points, ml.amount, ml.reason, ml.session_id, ml.session_title
   from mileage_logs ml join users u on u.id = ml.teacher_id
   where ml.id = any($1::uuid[]) order by u.name`,
  [CORRECT_IDS],
);
const yoonKeep = await client.query(
  `select ml.id, u.points, ml.amount, ml.reason, ml.session_id from mileage_logs ml
   join users u on u.id = ml.teacher_id where ml.id = $1`,
  [YOON_KEEP],
);
const countLogs = await client.query(`select count(*)::int as c from session_count_logs`);

const snapshot = {
  capturedAt: new Date().toISOString(),
  migrations20261023: migrations.rows,
  correctionTargets: targets.rows,
  yoonKeepRow: yoonKeep.rows[0] ?? null,
  sessionCountLogsTotal: countLogs.rows[0].c,
};
const out = 'scripts/mileage-ops-snapshot-pre.json';
writeFileSync(out, JSON.stringify(snapshot, null, 2), 'utf8');
console.log(JSON.stringify(snapshot, null, 2));
await client.end();
