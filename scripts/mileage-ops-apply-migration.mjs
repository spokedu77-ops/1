import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

const url = readFileSync('.env.local', 'utf8')
  .split('\n')
  .find((l) => l.startsWith('SPOKEDU_MASTER_DATABASE_URL='))
  ?.slice(32)
  .trim()
  .replace(/^"|"$/g, '');

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20261023150000_mileage_holiday_and_admin_cancel.sql',
);
const sql = readFileSync(migrationPath, 'utf8');

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const exists = await client.query(
  `select 1 from supabase_migrations.schema_migrations where version = '20261023150000'`,
);
if (exists.rowCount > 0) {
  console.log('SKIP: 20261023150000 already applied');
  await client.end();
  process.exit(0);
}

await client.query('BEGIN');
try {
  await client.query(sql);
  await client.query(
    `insert into supabase_migrations.schema_migrations(version, name) values ('20261023150000', 'mileage_holiday_and_admin_cancel')`,
  );
  await client.query('COMMIT');
  console.log('OK: migration 20261023150000 applied');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('FAIL:', error instanceof Error ? error.message : error);
  process.exit(1);
}
await client.end();
