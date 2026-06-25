create or replace function public.note_apply_block_transaction(
  p_updates jsonb default '[]'::jsonb,
  p_delete_ids uuid[] default '{}'::uuid[],
  p_actor_id uuid default null
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
  now_value timestamptz := now();
begin
  if jsonb_typeof(p_updates) <> 'array' then
    raise exception 'updates must be an array';
  end if;

  -- Validate every optimistic-lock precondition before mutating any row.
  for item in select value from jsonb_array_elements(p_updates)
  loop
    select * into current_row
    from public.note_blocks
    where id = (item->>'id')::uuid
      and deleted_at is null
    for update;

    if not found then
      raise exception 'block not found: %', item->>'id';
    end if;

    if item ? 'expected_version'
       and current_row.version <> (item->>'expected_version')::integer then
      return jsonb_build_object(
        'status', 'conflict',
        'conflicts', jsonb_build_array(to_jsonb(current_row))
      );
    end if;
  end loop;

  if coalesce(array_length(p_delete_ids, 1), 0) > 0 then
    perform 1
    from public.note_blocks
    where id = any(p_delete_ids)
    for update;

    update public.note_blocks
    set deleted_at = now_value,
        deleted_by = p_actor_id,
        updated_at = now_value,
        updated_by = p_actor_id
    where id = any(p_delete_ids)
      and deleted_at is null;
  end if;

  for item in select value from jsonb_array_elements(p_updates)
  loop
    update public.note_blocks
    set type = case when item ? 'type' then item->>'type' else type end,
        content = case when item ? 'content' then item->'content' else content end,
        order_index = case when item ? 'order_index' then (item->>'order_index')::integer else order_index end,
        parent_block_id = case
          when item ? 'parent_block_id'
            then nullif(item->>'parent_block_id', '')::uuid
          else parent_block_id
        end,
        document_id = case when item ? 'document_id' then (item->>'document_id')::uuid else document_id end,
        version = version + 1,
        updated_at = now_value,
        updated_by = p_actor_id
    where id = (item->>'id')::uuid
    returning * into current_row;

    updated_rows := updated_rows || jsonb_build_array(to_jsonb(current_row));
  end loop;

  return jsonb_build_object('status', 'ok', 'blocks', updated_rows);
end;
$$;

revoke all on function public.note_apply_block_transaction(jsonb, uuid[], uuid) from public;
grant execute on function public.note_apply_block_transaction(jsonb, uuid[], uuid) to service_role;
