create or replace function public.note_create_subpage_transaction(
  p_title text,
  p_slug text,
  p_parent_document_id uuid,
  p_parent_block_id uuid default null,
  p_order_index integer default 0,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  created_document public.note_documents%rowtype;
  page_block public.note_blocks%rowtype;
  initial_block public.note_blocks%rowtype;
  now_value timestamptz := now();
begin
  update public.note_blocks
  set order_index = order_index + 1,
      version = version + 1,
      updated_at = now_value,
      updated_by = p_actor_id
  where document_id = p_parent_document_id
    and parent_block_id is not distinct from p_parent_block_id
    and deleted_at is null
    and order_index >= p_order_index;

  insert into public.note_documents (
    title, slug, parent_id, is_archived, is_favorite, is_pinned,
    created_at, updated_at, created_by, updated_by
  ) values (
    p_title, p_slug, p_parent_document_id, false, false, false,
    now_value, now_value, p_actor_id, p_actor_id
  ) returning * into created_document;

  insert into public.note_blocks (
    document_id, parent_block_id, type, order_index, content,
    created_at, updated_at, created_by, updated_by
  ) values (
    p_parent_document_id, p_parent_block_id, 'page', p_order_index,
    jsonb_build_object('page_document_id', created_document.id, 'title', created_document.title),
    now_value, now_value, p_actor_id, p_actor_id
  ) returning * into page_block;

  insert into public.note_blocks (
    document_id, parent_block_id, type, order_index, content,
    created_at, updated_at, created_by, updated_by
  ) values (
    created_document.id, null, 'text', 0, jsonb_build_object('text', ''),
    now_value, now_value, p_actor_id, p_actor_id
  ) returning * into initial_block;

  return jsonb_build_object(
    'document', to_jsonb(created_document),
    'page_block', to_jsonb(page_block),
    'initial_block', to_jsonb(initial_block)
  );
end;
$$;

create or replace function public.note_reparent_document_transaction(
  p_document_id uuid,
  p_new_parent_id uuid default null,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  moving_document public.note_documents%rowtype;
  page_block public.note_blocks%rowtype;
  next_order integer := 0;
  now_value timestamptz := now();
begin
  select * into moving_document
  from public.note_documents
  where id = p_document_id and deleted_at is null
  for update;
  if not found then raise exception 'document not found'; end if;

  update public.note_blocks
  set deleted_at = now_value, deleted_by = p_actor_id,
      updated_at = now_value, updated_by = p_actor_id
  where type = 'page'
    and deleted_at is null
    and content->>'page_document_id' = p_document_id::text;

  update public.note_documents
  set parent_id = p_new_parent_id, updated_at = now_value, updated_by = p_actor_id
  where id = p_document_id
  returning * into moving_document;

  if p_new_parent_id is not null then
    select coalesce(max(order_index) + 1, 0) into next_order
    from public.note_blocks
    where document_id = p_new_parent_id
      and parent_block_id is null
      and deleted_at is null;

    insert into public.note_blocks (
      document_id, parent_block_id, type, order_index, content,
      created_at, updated_at, created_by, updated_by
    ) values (
      p_new_parent_id, null, 'page', next_order,
      jsonb_build_object('page_document_id', moving_document.id, 'title', moving_document.title),
      now_value, now_value, p_actor_id, p_actor_id
    ) returning * into page_block;
  end if;

  return jsonb_build_object(
    'document', to_jsonb(moving_document),
    'page_block', case when p_new_parent_id is null then null else to_jsonb(page_block) end
  );
end;
$$;

revoke all on function public.note_create_subpage_transaction(text, text, uuid, uuid, integer, uuid) from public;
grant execute on function public.note_create_subpage_transaction(text, text, uuid, uuid, integer, uuid) to service_role;
revoke all on function public.note_reparent_document_transaction(uuid, uuid, uuid) from public;
grant execute on function public.note_reparent_document_transaction(uuid, uuid, uuid) to service_role;
