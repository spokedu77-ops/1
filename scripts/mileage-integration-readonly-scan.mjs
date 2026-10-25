import { Client } from 'pg';
import { readFileSync } from 'node:fs';

function loadDatabaseUrl() {
  try {
    const env = readFileSync('.env.local', 'utf8');
    const line = env.split('\n').find((l) => l.startsWith('SPOKEDU_MASTER_DATABASE_URL='));
    if (line) return line.slice('SPOKEDU_MASTER_DATABASE_URL='.length).trim().replace(/^"|"$/g, '');
  } catch {
    /* ignore */
  }
  return process.env.SPOKEDU_MASTER_DATABASE_URL ?? process.env.DATABASE_URL ?? '';
}

const url = loadDatabaseUrl();
if (!url) {
  console.error('Missing SPOKEDU_MASTER_DATABASE_URL');
  process.exit(1);
}

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const orphan = await client.query(`
  SELECT ml.id, u.name, ml.amount, ml.reason, ml.session_title,
         ml.session_started_at, ml.created_at
  FROM mileage_logs ml
  JOIN users u ON u.id = ml.teacher_id
  WHERE ml.reason ~ '^\\[수업연동'
    AND ml.session_id IS NULL
  ORDER BY ml.created_at
`);
console.log('ORPHAN_LINKED_COUNT', orphan.rowCount);
for (const row of orphan.rows) console.log(JSON.stringify(row));

const holidayViol = await client.query(`
  SELECT u.name, ml.id, ml.amount, ml.reason,
         (COALESCE(ml.session_started_at, ml.created_at) AT TIME ZONE 'Asia/Seoul')::date AS seoul_date
  FROM mileage_logs ml
  JOIN users u ON u.id = ml.teacher_id
  WHERE ml.reason ~ '^\\[수업연동'
    AND ml.amount = 2500
    AND ml.reason LIKE '%수업 연기%'
    AND (COALESCE(ml.session_started_at, ml.created_at) AT TIME ZONE 'Asia/Seoul')::date IN (
      DATE '2026-10-03', DATE '2026-10-05', DATE '2026-10-09'
    )
  ORDER BY seoul_date, u.name
`);
console.log('HOLIDAY_2500_VIOLATIONS', holidayViol.rowCount);
for (const row of holidayViol.rows) console.log(JSON.stringify(row));

const yoon = await client.query(`
  SELECT ml.id, u.name, ml.amount, ml.reason, ml.session_id, ml.session_started_at
  FROM mileage_logs ml
  JOIN users u ON u.id = ml.teacher_id
  WHERE u.name LIKE '%윤도현%'
    AND ml.amount = 2500
    AND (ml.session_started_at AT TIME ZONE 'Asia/Seoul')::date = DATE '2026-10-24'
`);
console.log('YOON_OCT24', yoon.rowCount);
for (const row of yoon.rows) {
  const keep = row.session_id != null;
  console.log(JSON.stringify({ ...row, classification: keep ? 'KEEP_LINKED' : 'CORRECT_ORPHAN' }));
}

let postureOk = false;
try {
  const posture = await client.query(`
    SELECT private.kr_public_holiday_posture(timestamptz '2026-10-02T15:00:00+00') AS oct3
  `);
  console.log('POSTURE_OCT3', posture.rows[0]?.oct3);
  postureOk = true;
} catch (error) {
  console.log('POSTURE_FN_NOT_DEPLOYED', error instanceof Error ? error.message : String(error));
}

await client.end();
if (!postureOk) {
  console.log('NOTE: 배포 후 sql/70_mileage_holiday_integration_verification.sql 로 함수 검증 필요');
}
