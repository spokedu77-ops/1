// Apply exactly one approved migration; never runs `supabase db push`.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import pg from 'pg';

const version = '20261107120000';
const name = 'field_records_cms';
const expectedRef = 'mwgvserdyflsqyhcqecp';
const filename = `${version}_${name}.sql`;
const apply = process.argv.includes('--apply');
if (!process.argv.includes(`--confirm-project-ref=${expectedRef}`)) throw new Error('Explicit project confirmation required');
const publicHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.SPOKEDU_MASTER_DATABASE_URL;
if (!connectionString) throw new Error('Database connection is not configured');
const dbUrl = new URL(connectionString);
if (publicHost !== `${expectedRef}.supabase.co` || !(dbUrl.hostname === `db.${expectedRef}.supabase.co` || dbUrl.hostname.endsWith('.pooler.supabase.com') && decodeURIComponent(dbUrl.username).endsWith(`.${expectedRef}`))) throw new Error('Database project does not match the approved project');
const sql = readFileSync(new URL(`../supabase/migrations/${filename}`, import.meta.url), 'utf8');
// The file's outer transaction is replaced with one that includes migration bookkeeping.
const body = sql.replace(/^BEGIN;\r?$/m, '').replace(/^COMMIT;\r?$/m, '');
if (body === sql || !sql.trimEnd().endsWith('COMMIT;')) throw new Error('Unexpected migration transaction format');
console.log(JSON.stringify({ project: expectedRef, migration: filename, sha256: createHash('sha256').update(sql).digest('hex'), mode: apply ? 'apply' : 'read-only preflight' }));
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000, query_timeout: 30000 });
await client.connect();
try {
  const history = await client.query('SELECT version,name FROM supabase_migrations.schema_migrations WHERE version IN ($1,$2)', [version, `${version}_${name}`]);
  const preflight = (await client.query(`SELECT to_regclass('public.field_records')::text AS records,
    to_regclass('public.field_record_media')::text AS media,
    (SELECT public FROM storage.buckets WHERE id='field-record-media') AS bucket_public,
    (SELECT count(*)::int FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='field_record_media_private_namespace') AS policy_count`)).rows[0];
  console.log(JSON.stringify({ appliedHistory: history.rows, preflight }));
  if (!apply) { console.log('Read-only preflight complete; no database changes.'); }
  else {
    await client.query('BEGIN');
    try {
      await client.query("SET LOCAL lock_timeout='10s'");
      await client.query("SET LOCAL statement_timeout='30s'");
      await client.query("SELECT pg_advisory_xact_lock(hashtext('spokedu:field-records-migration'))");
      const repeated = await client.query('SELECT version FROM supabase_migrations.schema_migrations WHERE version IN ($1,$2)', [version, `${version}_${name}`]);
      if (repeated.rowCount) console.log('Already applied; verifying without rerunning DDL.');
      else {
        if (preflight.records || preflight.media || preflight.bucket_public !== null || preflight.policy_count) throw new Error('Existing untracked CMS objects require review before applying');
        await client.query(body);
        await client.query('INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES($1,$2,$3::text[])', [version, name, [sql]]);
        await client.query("NOTIFY pgrst, 'reload schema'");
      }
      await client.query('COMMIT');
      console.log('Approved migration committed atomically with its history entry.');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    const checks = (await client.query(`SELECT
      (SELECT count(*)::int FROM public.field_records) AS record_count,
      (SELECT count(*)::int FROM public.field_record_media) AS media_count,
      (SELECT bool_and(relrowsecurity) FROM pg_class WHERE oid IN ('public.field_records'::regclass,'public.field_record_media'::regclass)) AS rls_enabled,
      has_table_privilege('anon','public.field_records','SELECT') AS anon_records_read,
      has_table_privilege('authenticated','public.field_records','SELECT') AS authenticated_records_read,
      has_table_privilege('authenticated','public.field_record_media','SELECT') AS authenticated_media_read,
      has_table_privilege('service_role','public.field_records','INSERT') AS service_write,
      has_function_privilege('authenticated','public.mutate_field_record(uuid,bigint,text,uuid,text,jsonb,smallint,timestamptz)','EXECUTE') AS authenticated_mutate,
      has_function_privilege('service_role','public.mutate_field_record(uuid,bigint,text,uuid,text,jsonb,smallint,timestamptz)','EXECUTE') AS service_mutate,
      (SELECT public FROM storage.buckets WHERE id='field-record-media') AS bucket_public,
      (SELECT permissive FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='field_record_media_private_namespace') AS storage_policy`)).rows[0];
    console.log(JSON.stringify({ verification: checks }));
    if (!checks.rls_enabled || checks.anon_records_read || checks.authenticated_records_read || checks.authenticated_media_read || checks.authenticated_mutate || !checks.service_write || !checks.service_mutate || checks.bucket_public !== false || checks.storage_policy !== 'RESTRICTIVE') throw new Error('Post-apply security verification failed');
    console.log('Schema, private bucket, RLS and role permissions: PASS. No manuscripts were inserted or published.');
  }
} finally { await client.end(); }
