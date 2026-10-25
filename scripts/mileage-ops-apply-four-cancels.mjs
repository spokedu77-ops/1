import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
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

const countBefore = (
  await client.query(`select count(*)::int as c from session_count_logs`)
).rows[0].c;

const outcomes = [];
for (const logId of CORRECT_IDS) {
  const { rows } = await client.query(
    `select ml.id, ml.teacher_id, u.name, u.points, ml.amount, ml.reason
     from mileage_logs ml join users u on u.id = ml.teacher_id where ml.id = $1`,
    [logId],
  );
  if (rows.length === 0) {
    outcomes.push({ logId, ok: false, error: 'LOG_NOT_FOUND' });
    continue;
  }
  const log = rows[0];
  const requestKey = randomUUID().replace(/-/g, '') + 'ops';
  try {
    const { rows: rpc } = await client.query(
      `select public.admin_cancel_mileage_log($1::uuid, $2::uuid, $3::bigint, $4::text, $5::text) as result`,
      [log.teacher_id, log.id, log.amount, log.reason, requestKey],
    );
    const { rows: after } = await client.query(`select points from users where id = $1`, [log.teacher_id]);
    outcomes.push({
      logId,
      name: log.name,
      ok: true,
      pointsBefore: log.points,
      amount: log.amount,
      pointsAfter: after[0].points,
      rpc: rpc[0].result,
    });
  } catch (error) {
    outcomes.push({
      logId,
      name: log.name,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
    break;
  }
}

const yoonKeep = await client.query(`select id from mileage_logs where id = $1`, [YOON_KEEP]);
const audits = await client.query(
  `select original_log_id, teacher_id, amount, cancel_scope, cancelled_at
   from private.mileage_log_cancel_audits where original_log_id = any($1::uuid[]) order by cancelled_at`,
  [CORRECT_IDS],
);
const countAfter = (
  await client.query(`select count(*)::int as c from session_count_logs`)
).rows[0].c;

const post = {
  capturedAt: new Date().toISOString(),
  outcomes,
  yoonKeepStillExists: (yoonKeep.rowCount ?? 0) > 0,
  audits: audits.rows,
  sessionCountLogsBefore: countBefore,
  sessionCountLogsAfter: countAfter,
};
writeFileSync('scripts/mileage-ops-snapshot-post.json', JSON.stringify(post, null, 2), 'utf8');
console.log(JSON.stringify(post, null, 2));

const failed = outcomes.some((o) => !o.ok);
await client.end();
process.exit(failed ? 1 : 0);
