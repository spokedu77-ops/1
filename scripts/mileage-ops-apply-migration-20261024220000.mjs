import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

const VERSION = '20261024220000';
const NAME = 'mileage_adjustment_delegate_linked_reverse';

const url = readFileSync('.env.local', 'utf8')
  .split('\n')
  .find((l) => l.startsWith('SPOKEDU_MASTER_DATABASE_URL='))
  ?.slice(32)
  .trim()
  .replace(/^"|"$/g, '');

const migrationPath = join(
  process.cwd(),
  `supabase/migrations/${VERSION}_${NAME}.sql`,
);
const sql = readFileSync(migrationPath, 'utf8');

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const exists = await client.query(
  `select 1 from supabase_migrations.schema_migrations where version = $1`,
  [VERSION],
);
if (exists.rowCount > 0) {
  console.log(`SKIP: ${VERSION} already applied`);
  await client.end();
  process.exit(0);
}

await client.query('BEGIN');
try {
  await client.query(sql);
  await client.query(
    `insert into supabase_migrations.schema_migrations(version, name) values ($1, $2)`,
    [VERSION, NAME],
  );
  await client.query('COMMIT');
  console.log(`OK: migration ${VERSION} applied`);
} catch (error) {
  await client.query('ROLLBACK');
  console.error('FAIL:', error instanceof Error ? error.message : error);
  process.exit(1);
}
await client.end();
