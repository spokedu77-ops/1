-- Admin Note invariant guard at the database/RPC boundary.
--
-- App/API layers already normalize block trees, but the transaction RPC is the
-- final shared write path used by sync replay and maintenance scripts. Keep it
-- deterministic even when a caller sends stale parent/order payloads.

create or replace function public.note_block_parent_allowed(
  p_child_type text,
  p_parent_type text default null
)
returns boolean
language sql
immutable
as $$
  select case
    when p_parent_type is null then p_child_type in (
      'text', 'heading', 'heading2', 'heading3', 'todo', 'toggle', 'page',
      'bulletList', 'numberedList', 'divider', 'callout', 'quote', 'code',
      'image', 'video', 'table', 'columnList'
    )
    when p_parent_type = 'page' then p_child_type in (
      'text', 'heading', 'heading2', 'heading3', 'todo', 'toggle', 'page',
      'bulletList', 'numberedList', 'divider', 'callout', 'quote', 'code',
      'image', 'video', 'table', 'columnList'
    )
    when p_parent_type = 'toggle' then p_child_type in (
      'text', 'heading', 'heading2', 'heading3', 'todo', 'bulletList',
      'numberedList', 'divider', 'callout', 'quote', 'code', 'image',
      'video', 'table'
    )
    when p_parent_type in ('bulletList', 'numberedList') then p_child_type in ('bulletList', 'numberedList')
    when p_parent_type = 'columnList' then p_child_type = 'column'
    when p_parent_type = 'column' then p_child_type in (
      'text', 'heading', 'heading2', 'heading3', 'todo', 'toggle', 'page',
      'bulletList', 'numberedList', 'divider', 'callout', 'quote', 'code',
      'image', 'video', 'table', 'columnList'
    )
    else false
  end
$$;

create or replace function public.note_normalize_document_blocks(
  p_document_id uuid,
  p_actor_id uuid default null,
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_count integer := 0;
  step_count integer := 0;
begin
  -- Drop missing/cross-document/forbidden parents to root. This mirrors the app
  -- sanitizer's conservative repair: preserve content, repair only structure.
  update public.note_blocks child
  set parent_block_id = null,
      updated_at = p_now,
      updated_by = p_actor_id,
      version = version + 1
  where child.document_id = p_document_id
    and child.deleted_at is null
    and child.parent_block_id is not null
    and not exists (
      select 1
      from public.note_blocks parent
      where parent.id = child.parent_block_id
        and parent.document_id = child.document_id
        and parent.deleted_at is null
        and public.note_block_parent_allowed(child.type, parent.type)
    );
  get diagnostics step_count = row_count;
  changed_count := changed_count + step_count;

  -- Break direct and recursive cycles by promoting the child being inspected.
  with recursive ancestry as (
    select
      child.id as child_id,
      child.parent_block_id as ancestor_id,
      array[child.id]::uuid[] as path
    from public.note_blocks child
    where child.document_id = p_document_id
      and child.deleted_at is null
      and child.parent_block_id is not null

    union all

    select
      ancestry.child_id,
      parent.parent_block_id,
      ancestry.path || parent.id
    from ancestry
    join public.note_blocks parent on parent.id = ancestry.ancestor_id
    where parent.deleted_at is null
      and parent.document_id = p_document_id
      and parent.parent_block_id is not null
      and not parent.id = any(ancestry.path)
  ),
  cyclic as (
    select distinct child_id
    from ancestry
    where ancestor_id = child_id
  )
  update public.note_blocks child
  set parent_block_id = null,
      updated_at = p_now,
      updated_by = p_actor_id,
      version = version + 1
  from cyclic
  where child.id = cyclic.child_id
    and child.deleted_at is null;
  get diagnostics step_count = row_count;
  changed_count := changed_count + step_count;

  -- Normalize sibling order to 0..n-1 per parent. Null parents are grouped by
  -- a sentinel so root order is also stable.
  with ranked as (
    select
      id,
      row_number() over (
        partition by coalesce(parent_block_id, '00000000-0000-0000-0000-000000000000'::uuid)
        order by order_index asc, updated_at asc, id asc
      ) - 1 as next_order
    from public.note_blocks
    where document_id = p_document_id
      and deleted_at is null
  )
  update public.note_blocks target
  set order_index = ranked.next_order,
      updated_at = p_now,
      updated_by = p_actor_id,
      version = version + 1
  from ranked
  where target.id = ranked.id
    and target.order_index is distinct from ranked.next_order;
  get diagnostics step_count = row_count;
  changed_count := changed_count + step_count;

  return changed_count;
end;
$$;

create or replace function public.note_apply_block_transaction(
  p_updates jsonb default '[]'::jsonb,
  p_delete_ids uuid[] default '{}'::uuid[],
  p_actor_id uuid default null,
  p_creates jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  current_row public.note_blocks%rowtype;
  updated_rows jsonb := '[]'::jsonb;
  created_rows jsonb := '[]'::jsonb;
  deleted_rows jsonb := '[]'::jsonb;
  deleted_json jsonb;
  affected_document_ids uuid[] := '{}'::uuid[];
  deleted_document_ids uuid[] := '{}'::uuid[];
  normalized_count integer := 0;
  doc_id uuid;
  now_value timestamptz := now();
begin
  if jsonb_typeof(p_updates) <> 'array' or jsonb_typeof(p_creates) <> 'array' then
    raise exception 'updates and creates must be arrays';
  end if;

  for item in select value from jsonb_array_elements(p_updates)
  loop
    select * into current_row
    from public.note_blocks
    where id = (item->>'id')::uuid and deleted_at is null
    for update;
    if not found then raise exception 'block not found: %', item->>'id'; end if;
    affected_document_ids := array_append(affected_document_ids, current_row.document_id);
    if item ? 'document_id' then
      affected_document_ids := array_append(affected_document_ids, (item->>'document_id')::uuid);
    end if;
    if item ? 'expected_version'
       and current_row.version <> (item->>'expected_version')::integer then
      return jsonb_build_object(
        'status', 'conflict',
        'conflicts', jsonb_build_array(to_jsonb(current_row))
      );
    end if;
  end loop;

  for item in select value from jsonb_array_elements(p_updates)
  loop
    update public.note_blocks
    set type = case when item ? 'type' then item->>'type' else type end,
        content = case when item ? 'content' then item->'content' else content end,
        order_index = case when item ? 'order_index' then (item->>'order_index')::integer else order_index end,
        parent_block_id = case when item ? 'parent_block_id'
          then nullif(item->>'parent_block_id', '')::uuid else parent_block_id end,
        document_id = case when item ? 'document_id'
          then (item->>'document_id')::uuid else document_id end,
        version = version + 1,
        updated_at = now_value,
        updated_by = p_actor_id
    where id = (item->>'id')::uuid
      and deleted_at is null
    returning * into current_row;
    affected_document_ids := array_append(affected_document_ids, current_row.document_id);
    updated_rows := updated_rows || jsonb_build_array(to_jsonb(current_row));
  end loop;

  if coalesce(array_length(p_delete_ids, 1), 0) > 0 then
    perform 1 from public.note_blocks where id = any(p_delete_ids) for update;
    with recursive delete_tree as (
      select id
      from public.note_blocks
      where id = any(p_delete_ids)
        and deleted_at is null

      union

      select child.id
      from public.note_blocks child
      join delete_tree parent on child.parent_block_id = parent.id
      where child.deleted_at is null
    ),
    deleted as (
      update public.note_blocks target
      set deleted_at = now_value,
          deleted_by = p_actor_id,
          updated_at = now_value,
          updated_by = p_actor_id,
          version = version + 1
      from delete_tree
      where target.id = delete_tree.id
        and target.deleted_at is null
      returning target.*
    )
    select coalesce(jsonb_agg(to_jsonb(deleted)), '[]'::jsonb),
           coalesce(array_agg(distinct deleted.document_id), '{}'::uuid[])
    into deleted_json, deleted_document_ids
    from deleted;
    affected_document_ids := affected_document_ids || deleted_document_ids;
    deleted_rows := deleted_rows || deleted_json;
  end if;

  for item in select value from jsonb_array_elements(p_creates)
  loop
    insert into public.note_blocks (
      id, document_id, parent_block_id, type, order_index, content,
      created_at, updated_at, deleted_at, deleted_by, created_by, updated_by
    ) values (
      coalesce(nullif(item->>'id', '')::uuid, gen_random_uuid()),
      (item->>'document_id')::uuid,
      nullif(item->>'parent_block_id', '')::uuid,
      coalesce(item->>'type', 'text'),
      coalesce((item->>'order_index')::integer, 0),
      coalesce(item->'content', '{}'::jsonb),
      now_value, now_value, null, null, p_actor_id, p_actor_id
    )
    returning * into current_row;
    affected_document_ids := array_append(affected_document_ids, current_row.document_id);
    created_rows := created_rows || jsonb_build_array(to_jsonb(current_row));
  end loop;

  for doc_id in select distinct unnest(affected_document_ids)
  loop
    normalized_count := normalized_count + public.note_normalize_document_blocks(doc_id, p_actor_id, now_value);
  end loop;

  return jsonb_build_object(
    'status', 'ok',
    'blocks', updated_rows,
    'deleted_blocks', deleted_rows,
    'created_blocks', created_rows,
    'normalized_count', normalized_count
  );
end;
$$;

revoke all on function public.note_block_parent_allowed(text, text) from public;
revoke all on function public.note_normalize_document_blocks(uuid, uuid, timestamptz) from public;
revoke all on function public.note_apply_block_transaction(jsonb, uuid[], uuid, jsonb) from public;
grant execute on function public.note_block_parent_allowed(text, text) to service_role;
grant execute on function public.note_normalize_document_blocks(uuid, uuid, timestamptz) to service_role;
grant execute on function public.note_apply_block_transaction(jsonb, uuid[], uuid, jsonb) to service_role;
