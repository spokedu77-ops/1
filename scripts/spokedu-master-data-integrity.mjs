#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvFile(join(ROOT, '.env.local'));
loadEnvFile(join(ROOT, '.env'));

const DATABASE_URL =
  process.env.SPOKEDU_MASTER_DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL;

const REQUIRED_TABLES = [
  'spokedu_master_students',
  'spokedu_master_class_records',
  'spokedu_master_class_record_students',
  'spokedu_master_explanations',
  'spokedu_master_subscriptions',
  'spokedu_master_payment_orders',
  'spokedu_master_payment_webhook_events',
  'spokedu_master_profiles',
  'spokedu_master_program_meta',
];

function fail(message) {
  console.error(`[spokedu-master:data-integrity] ${message}`);
  process.exit(1);
}

function maskDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.username = parsed.username ? '***' : '';
    parsed.password = parsed.password ? '***' : '';
    return parsed.toString();
  } catch {
    return '<unparseable database url>';
  }
}

function isPsqlAvailable() {
  const result = spawnSync('psql', ['--version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return result.status === 0;
}

function printQueryRows(rows) {
  if (!rows?.length) return;
  const columns = Object.keys(rows[0]);
  console.log(columns.join(' | '));
  for (const row of rows) {
    console.log(columns.map((column) => String(row[column] ?? '')).join(' | '));
  }
}

async function runSqlWithPg(sql) {
  const { Client } = await import('pg');
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  try {
    const statements = sql
      .replace(/^set default_transaction_read_only = on;\s*/i, '')
      .replace(/^begin read only;\s*/i, '')
      .replace(/\ncommit;\s*$/i, '')
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);

    await client.query('set default_transaction_read_only = on');
    await client.query('begin read only');
    for (const statement of statements) {
      const result = await client.query(statement);
      printQueryRows(result.rows);
    }
    await client.query('commit');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`read-only integrity SQL failed: ${message}`);
  } finally {
    await client.end();
  }
}

function runSqlWithPsql(sql) {
  const directory = mkdtempSync(join(tmpdir(), 'spm-integrity-'));
  const filePath = join(directory, 'check.sql');
  writeFileSync(filePath, sql, 'utf8');

  try {
    const result = spawnSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-f', filePath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (result.stdout.trim()) console.log(result.stdout.trim());
    if (result.status !== 0) {
      if (result.stderr.trim()) console.error(result.stderr.trim());
      fail('read-only integrity SQL failed.');
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function runSql(sql) {
  if (isPsqlAvailable()) {
    runSqlWithPsql(sql);
    return;
  }
  console.log('[spokedu-master:data-integrity] psql not found; using node pg client.');
  await runSqlWithPg(sql);
}

if (!DATABASE_URL) {
  fail('set SPOKEDU_MASTER_DATABASE_URL, SUPABASE_DB_URL, or DATABASE_URL for the target read-only database.');
}

console.log('[spokedu-master:data-integrity] target:', maskDatabaseUrl(DATABASE_URL));
console.log('[spokedu-master:data-integrity] running read-only checks only.');

const tableValues = REQUIRED_TABLES.map((table) => `('${table}')`).join(',');

await runSql(`
set default_transaction_read_only = on;
begin read only;

with required(table_name) as (
  values ${tableValues}
),
missing_tables as (
  select table_name
  from required
  where to_regclass('public.' || table_name) is null
)
select
  case when count(*) = 0 then 'ok' else 'fail' end as status,
  'required_tables_exist' as check_name,
  coalesce(string_agg(table_name, ', ' order by table_name), '') as details
from missing_tables;

with required(table_name, column_name) as (
  values
    ('spokedu_master_students', 'id'),
    ('spokedu_master_students', 'owner_id'),
    ('spokedu_master_students', 'legacy_id'),
    ('spokedu_master_students', 'name'),
    ('spokedu_master_students', 'meta'),
    ('spokedu_master_class_records', 'id'),
    ('spokedu_master_class_records', 'owner_id'),
    ('spokedu_master_class_records', 'legacy_id'),
    ('spokedu_master_class_records', 'record_type'),
    ('spokedu_master_class_record_students', 'id'),
    ('spokedu_master_class_record_students', 'owner_id'),
    ('spokedu_master_class_record_students', 'record_id'),
    ('spokedu_master_class_record_students', 'student_id'),
    ('spokedu_master_class_record_students', 'student_legacy_id'),
    ('spokedu_master_explanations', 'id'),
    ('spokedu_master_explanations', 'owner_id'),
    ('spokedu_master_explanations', 'audience'),
    ('spokedu_master_explanations', 'explanation_text'),
    ('spokedu_master_subscriptions', 'id'),
    ('spokedu_master_subscriptions', 'user_id'),
    ('spokedu_master_subscriptions', 'period_end'),
    ('spokedu_master_payment_orders', 'order_id'),
    ('spokedu_master_payment_orders', 'user_id'),
    ('spokedu_master_payment_orders', 'payment_key'),
    ('spokedu_master_payment_webhook_events', 'event_key'),
    ('spokedu_master_payment_webhook_events', 'event_type'),
    ('spokedu_master_profiles', 'user_id'),
    ('spokedu_master_profiles', 'onboarding_done'),
    ('spokedu_master_program_meta', 'curriculum_id')
),
missing_columns as (
  select required.table_name || '.' || required.column_name as column_ref
  from required
  left join information_schema.columns columns
    on columns.table_schema = 'public'
   and columns.table_name = required.table_name
   and columns.column_name = required.column_name
  where columns.column_name is null
)
select
  case when count(*) = 0 then 'ok' else 'fail' end as status,
  'required_columns_exist' as check_name,
  coalesce(string_agg(column_ref, ', ' order by column_ref), '') as details
from missing_columns;

with required(table_name) as (
  values ${tableValues}
),
rls_missing as (
  select required.table_name
  from required
  join pg_class rel on rel.oid = to_regclass('public.' || required.table_name)
  where rel.relrowsecurity is not true
)
select
  case when count(*) = 0 then 'ok' else 'fail' end as status,
  'rls_enabled' as check_name,
  coalesce(string_agg(table_name, ', ' order by table_name), '') as details
from rls_missing;

with required(table_name) as (
  values ${tableValues}
),
policy_counts as (
  select required.table_name, count(policy.policyname) as policy_count
  from required
  left join pg_policies policy
    on policy.schemaname = 'public'
   and policy.tablename = required.table_name
  group by required.table_name
),
missing_policies as (
  select table_name
  from policy_counts
  where policy_count = 0
)
select
  case when count(*) = 0 then 'ok' else 'warn' end as status,
  'rls_policies_exist' as check_name,
  coalesce(string_agg(table_name, ', ' order by table_name), '') as details
from missing_policies;

select
  case when count(*) = 0 then 'ok' else 'fail' end as status,
  'class_record_students_without_record' as check_name,
  count(*)::text as details
from public.spokedu_master_class_record_students child
left join public.spokedu_master_class_records record on record.id = child.record_id
where record.id is null;

select
  case when count(*) = 0 then 'ok' else 'fail' end as status,
  'class_record_student_owner_mismatch' as check_name,
  count(*)::text as details
from public.spokedu_master_class_record_students child
join public.spokedu_master_class_records record on record.id = child.record_id
where child.owner_id <> record.owner_id;

select
  case when count(*) = 0 then 'ok' else 'fail' end as status,
  'linked_student_owner_mismatch' as check_name,
  count(*)::text as details
from public.spokedu_master_class_record_students child
join public.spokedu_master_students student on student.id = child.student_id
where child.student_id is not null
  and child.owner_id <> student.owner_id;

select
  case when count(*) = 0 then 'ok' else 'fail' end as status,
  'student_owner_id_null' as check_name,
  count(*)::text as details
from public.spokedu_master_students
where owner_id is null;

select
  case when count(*) = 0 then 'ok' else 'fail' end as status,
  'record_owner_id_null' as check_name,
  count(*)::text as details
from public.spokedu_master_class_records
where owner_id is null;

select
  case when count(*) = 0 then 'ok' else 'fail' end as status,
  'explanation_owner_id_null' as check_name,
  count(*)::text as details
from public.spokedu_master_explanations
where owner_id is null;

select
  case when count(*) = 0 then 'ok' else 'fail' end as status,
  'duplicate_subscription_user_id' as check_name,
  count(*)::text as details
from (
  select user_id
  from public.spokedu_master_subscriptions
  group by user_id
  having count(*) > 1
) duplicated;

select
  case when count(*) = 0 then 'ok' else 'fail' end as status,
  'duplicate_payment_order_id' as check_name,
  count(*)::text as details
from (
  select order_id
  from public.spokedu_master_payment_orders
  group by order_id
  having count(*) > 1
) duplicated;

select
  case when count(*) = 0 then 'ok' else 'fail' end as status,
  'duplicate_webhook_event_key' as check_name,
  count(*)::text as details
from (
  select event_key
  from public.spokedu_master_payment_webhook_events
  group by event_key
  having count(*) > 1
) duplicated;

select
  case when count(*) = 0 then 'ok' else 'fail' end as status,
  'payment_order_subscription_owner_mismatch' as check_name,
  count(*)::text as details
from public.spokedu_master_payment_orders payment_order
join public.spokedu_master_subscriptions subscription
  on subscription.toss_order_id = payment_order.order_id
where subscription.user_id <> payment_order.user_id;

with failure_counts(check_name, failure_count) as (
  select 'required_tables_exist', count(*)
  from (
    values ${tableValues}
  ) as required(table_name)
  where to_regclass('public.' || table_name) is null
  union all
  select 'required_columns_exist', count(*)
  from (
    values
      ('spokedu_master_students', 'id'),
      ('spokedu_master_students', 'owner_id'),
      ('spokedu_master_students', 'legacy_id'),
      ('spokedu_master_students', 'name'),
      ('spokedu_master_students', 'meta'),
      ('spokedu_master_class_records', 'id'),
      ('spokedu_master_class_records', 'owner_id'),
      ('spokedu_master_class_records', 'legacy_id'),
      ('spokedu_master_class_records', 'record_type'),
      ('spokedu_master_class_record_students', 'id'),
      ('spokedu_master_class_record_students', 'owner_id'),
      ('spokedu_master_class_record_students', 'record_id'),
      ('spokedu_master_class_record_students', 'student_id'),
      ('spokedu_master_class_record_students', 'student_legacy_id'),
      ('spokedu_master_explanations', 'id'),
      ('spokedu_master_explanations', 'owner_id'),
      ('spokedu_master_explanations', 'audience'),
      ('spokedu_master_explanations', 'explanation_text'),
      ('spokedu_master_subscriptions', 'id'),
      ('spokedu_master_subscriptions', 'user_id'),
      ('spokedu_master_subscriptions', 'period_end'),
      ('spokedu_master_payment_orders', 'order_id'),
      ('spokedu_master_payment_orders', 'user_id'),
      ('spokedu_master_payment_orders', 'payment_key'),
      ('spokedu_master_payment_webhook_events', 'event_key'),
      ('spokedu_master_payment_webhook_events', 'event_type'),
      ('spokedu_master_program_meta', 'curriculum_id')
  ) as required(table_name, column_name)
  left join information_schema.columns columns
    on columns.table_schema = 'public'
   and columns.table_name = required.table_name
   and columns.column_name = required.column_name
  where columns.column_name is null
  union all
  select 'rls_enabled', count(*)
  from (
    values ${tableValues}
  ) as required(table_name)
  join pg_class rel on rel.oid = to_regclass('public.' || required.table_name)
  where rel.relrowsecurity is not true
  union all
  select 'class_record_students_without_record', count(*)
  from public.spokedu_master_class_record_students child
  left join public.spokedu_master_class_records record on record.id = child.record_id
  where record.id is null
  union all
  select 'class_record_student_owner_mismatch', count(*)
  from public.spokedu_master_class_record_students child
  join public.spokedu_master_class_records record on record.id = child.record_id
  where child.owner_id <> record.owner_id
  union all
  select 'linked_student_owner_mismatch', count(*)
  from public.spokedu_master_class_record_students child
  join public.spokedu_master_students student on student.id = child.student_id
  where child.student_id is not null
    and child.owner_id <> student.owner_id
  union all
  select 'student_owner_id_null', count(*)
  from public.spokedu_master_students
  where owner_id is null
  union all
  select 'record_owner_id_null', count(*)
  from public.spokedu_master_class_records
  where owner_id is null
  union all
  select 'explanation_owner_id_null', count(*)
  from public.spokedu_master_explanations
  where owner_id is null
  union all
  select 'duplicate_subscription_user_id', count(*)
  from (
    select user_id
    from public.spokedu_master_subscriptions
    group by user_id
    having count(*) > 1
  ) duplicated
  union all
  select 'duplicate_payment_order_id', count(*)
  from (
    select order_id
    from public.spokedu_master_payment_orders
    group by order_id
    having count(*) > 1
  ) duplicated
  union all
  select 'duplicate_webhook_event_key', count(*)
  from (
    select event_key
    from public.spokedu_master_payment_webhook_events
    group by event_key
    having count(*) > 1
  ) duplicated
  union all
  select 'payment_order_subscription_owner_mismatch', count(*)
  from public.spokedu_master_payment_orders payment_order
  join public.spokedu_master_subscriptions subscription
    on subscription.toss_order_id = payment_order.order_id
  where subscription.user_id <> payment_order.user_id
)
select 1 / case when exists (
  select 1 from failure_counts where failure_count > 0
) then 0 else 1 end as integrity_assertion;

commit;
`);
