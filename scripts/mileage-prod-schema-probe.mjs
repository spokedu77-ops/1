import { readFileSync } from 'node:fs';
import { Client } from 'pg';

function loadDatabaseUrl() {
  const env = readFileSync('.env.local', 'utf8');
  const line = env.split('\n').find((l) => l.startsWith('SPOKEDU_MASTER_DATABASE_URL='));
  return line?.slice('SPOKEDU_MASTER_DATABASE_URL='.length).trim().replace(/^"|"$/g, '') ?? '';
}

const client = new Client({ connectionString: loadDatabaseUrl(), ssl: { rejectUnauthorized: false } });
await client.connect();

const migrations = await client.query(`
  select version, name from supabase_migrations.schema_migrations
  where version like '20261023%'
  order by version
`);
console.log('MIGRATIONS_20261023', JSON.stringify(migrations.rows, null, 2));

const fns = await client.query(`
  select p.proname, pg_get_function_identity_arguments(p.oid) as args
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('admin_cancel_mileage_log', 'admin_apply_session_linked_mileage')
  order by 1
`);
console.log('PUBLIC_FNS', JSON.stringify(fns.rows, null, 2));

const tables = await client.query(`
  select table_schema, table_name
  from information_schema.tables
  where table_name in ('kr_public_holidays', 'kr_public_holiday_coverage', 'mileage_log_cancel_audits')
  order by 1, 2
`);
console.log('TABLES', JSON.stringify(tables.rows, null, 2));

await client.end();
