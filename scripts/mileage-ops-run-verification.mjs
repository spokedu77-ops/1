import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

const url = readFileSync('.env.local', 'utf8')
  .split('\n')
  .find((l) => l.startsWith('SPOKEDU_MASTER_DATABASE_URL='))
  ?.slice(32)
  .trim()
  .replace(/^"|"$/g, '');

function loadSql(name) {
  const raw = readFileSync(join(process.cwd(), 'sql', name), 'utf8');
  return raw
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const results = [];
for (const file of ['73_mileage_deploy_readiness.sql', '70_mileage_holiday_integration_verification.sql']) {
  for (const stmt of loadSql(file)) {
    try {
      const res = await client.query(stmt);
      results.push({ file, ok: true, rows: res.rows, rowCount: res.rowCount });
    } catch (error) {
      results.push({
        file,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        stmt: stmt.slice(0, 120),
      });
    }
  }
}

const posture = await client.query(`
  select
    private.kr_public_holiday_posture(timestamptz '2026-10-02T15:00:00+00') as oct3,
    private.phase2_mileage_total('수업 연기', timestamptz '2026-10-02T15:00:00+00') as postpone_oct3,
    private.phase2_mileage_total('수업 연기 요청', timestamptz '2026-10-02T15:00:00+00') as request_oct3
`);
results.push({ check: 'holiday_zero_credit', ok: true, rows: posture.rows });

console.log(JSON.stringify(results, null, 2));
await client.end();
