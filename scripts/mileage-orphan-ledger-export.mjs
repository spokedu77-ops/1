/** Read-only: 고아 11건 + 윤도현 유지 로그 + 정정 4건 포인트 스냅샷 */
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

const env = readFileSync('.env.local', 'utf8');
const url = env.split('\n').find((l) => l.startsWith('SPOKEDU_MASTER_DATABASE_URL='))?.slice(32).trim().replace(/^"|"$/g, '');
const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const orphan = await client.query(`
  SELECT ml.id, u.id AS teacher_id, u.name, u.points, ml.amount, ml.reason, ml.session_title, ml.session_started_at
  FROM mileage_logs ml
  JOIN users u ON u.id = ml.teacher_id
  WHERE ml.reason ~ '^\\[수업연동'
    AND ml.session_id IS NULL
  ORDER BY ml.created_at
`);

const yoonKeep = await client.query(`
  SELECT ml.id, u.id AS teacher_id, u.name, u.points, ml.amount, ml.reason, ml.session_id, ml.session_title
  FROM mileage_logs ml
  JOIN users u ON u.id = ml.teacher_id
  WHERE ml.id = '54768963-4242-4429-bd01-9e036cb3990c'
`);

console.log(JSON.stringify({ orphanCount: orphan.rowCount, orphans: orphan.rows, yoonKeep: yoonKeep.rows }, null, 2));
await client.end();
