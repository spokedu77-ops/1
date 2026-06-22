-- SPOKEDU MASTER program meta schema inspection.
--
-- Run this in the Supabase SQL Editor for the target project.
-- This is a read-only catalog inspection script.
-- It does not read user data rows from public.spokedu_master_program_meta.
-- Save the results as CSV or text and use them as evidence before writing a
-- baseline migration for the existing table.

select
  'TABLE' as section,
  table_schema as schema_name,
  table_name,
  table_type
from information_schema.tables
where table_schema = 'public'
  and table_name = 'spokedu_master_program_meta'
order by table_schema, table_name;

select
  'COLUMNS' as section,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  is_identity,
  identity_generation,
  is_generated,
  generation_expression
from information_schema.columns
where table_schema = 'public'
  and table_name = 'spokedu_master_program_meta'
order by ordinal_position;

select
  'CONSTRAINTS' as section,
  constraints.constraint_name,
  constraints.constraint_type,
  key_columns.column_name,
  key_columns.ordinal_position
from information_schema.table_constraints constraints
left join information_schema.key_column_usage key_columns
  on key_columns.constraint_schema = constraints.constraint_schema
 and key_columns.constraint_name = constraints.constraint_name
 and key_columns.table_schema = constraints.table_schema
 and key_columns.table_name = constraints.table_name
where constraints.table_schema = 'public'
  and constraints.table_name = 'spokedu_master_program_meta'
  and constraints.constraint_type in ('PRIMARY KEY', 'UNIQUE')
order by
  constraints.constraint_type,
  constraints.constraint_name,
  key_columns.ordinal_position;

select
  'FOREIGN_KEYS' as section,
  foreign_keys.conname as constraint_name,
  source_columns.attname as source_column,
  referenced_namespace.nspname as referenced_schema,
  referenced_table.relname as referenced_table,
  referenced_columns.attname as referenced_column,
  case foreign_keys.confupdtype
    when 'a' then 'NO ACTION'
    when 'r' then 'RESTRICT'
    when 'c' then 'CASCADE'
    when 'n' then 'SET NULL'
    when 'd' then 'SET DEFAULT'
    else foreign_keys.confupdtype::text
  end as referenced_change_rule,
  case foreign_keys.confdeltype
    when 'a' then 'NO ACTION'
    when 'r' then 'RESTRICT'
    when 'c' then 'CASCADE'
    when 'n' then 'SET NULL'
    when 'd' then 'SET DEFAULT'
    else foreign_keys.confdeltype::text
  end as referenced_remove_rule,
  source_key.ordinality as column_order
from pg_constraint foreign_keys
join pg_class source_table
  on source_table.oid = foreign_keys.conrelid
join pg_namespace source_namespace
  on source_namespace.oid = source_table.relnamespace
join unnest(foreign_keys.conkey) with ordinality as source_key(attnum, ordinality)
  on true
join unnest(foreign_keys.confkey) with ordinality as referenced_key(attnum, ordinality)
  on referenced_key.ordinality = source_key.ordinality
join pg_attribute source_columns
  on source_columns.attrelid = foreign_keys.conrelid
 and source_columns.attnum = source_key.attnum
join pg_class referenced_table
  on referenced_table.oid = foreign_keys.confrelid
join pg_namespace referenced_namespace
  on referenced_namespace.oid = referenced_table.relnamespace
join pg_attribute referenced_columns
  on referenced_columns.attrelid = foreign_keys.confrelid
 and referenced_columns.attnum = referenced_key.attnum
where source_namespace.nspname = 'public'
  and source_table.relname = 'spokedu_master_program_meta'
  and foreign_keys.contype = 'f'
order by foreign_keys.conname, source_key.ordinality;

select
  'INDEXES' as section,
  indexname as index_name,
  (
    select indexed_class.relkind = 'i'
           and indexed_index.indisunique
    from pg_class indexed_class
    join pg_index indexed_index
      on indexed_index.indexrelid = indexed_class.oid
    join pg_namespace indexed_namespace
      on indexed_namespace.oid = indexed_class.relnamespace
    where indexed_namespace.nspname = schemaname
      and indexed_class.relname = indexname
  ) as is_unique,
  indexdef as index_definition
from pg_indexes
where schemaname = 'public'
  and tablename = 'spokedu_master_program_meta'
order by indexname;

select
  'RLS' as section,
  namespace.nspname as schema_name,
  relation.relname as table_name,
  relation.relrowsecurity as row_level_security_enabled,
  relation.relforcerowsecurity as force_row_level_security
from pg_class relation
join pg_namespace namespace
  on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and relation.relname = 'spokedu_master_program_meta';

select
  'POLICIES' as section,
  policyname as policy_name,
  cmd as command,
  array_to_string(roles, ', ') as roles,
  permissive,
  qual as using_expression,
  with_check as with_check_expression
from pg_policies
where schemaname = 'public'
  and tablename = 'spokedu_master_program_meta'
order by policyname;

select
  'TRIGGERS' as section,
  triggers.tgname as trigger_name,
  case
    when (triggers.tgtype & 2) = 2 then 'BEFORE'
    when (triggers.tgtype & 64) = 64 then 'INSTEAD OF'
    else 'AFTER'
  end as timing,
  ((triggers.tgtype & 4) = 4) as fires_on_row_add,
  ((triggers.tgtype & 8) = 8) as fires_on_row_remove,
  ((triggers.tgtype & 16) = 16) as fires_on_row_change,
  ((triggers.tgtype & 32) = 32) as fires_on_table_empty,
  trigger_namespace.nspname || '.' || trigger_function.proname as trigger_function,
  pg_get_triggerdef(triggers.oid, true) as trigger_definition
from pg_trigger triggers
join pg_class relation
  on relation.oid = triggers.tgrelid
join pg_namespace relation_namespace
  on relation_namespace.oid = relation.relnamespace
join pg_proc trigger_function
  on trigger_function.oid = triggers.tgfoid
join pg_namespace trigger_namespace
  on trigger_namespace.oid = trigger_function.pronamespace
where relation_namespace.nspname = 'public'
  and relation.relname = 'spokedu_master_program_meta'
  and not triggers.tgisinternal
order by triggers.tgname;

select
  'PRIVILEGES' as section,
  grantee,
  privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and table_name = 'spokedu_master_program_meta'
order by grantee, privilege_type;
