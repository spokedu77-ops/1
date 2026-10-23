-- Canonical Admin Note v2 persistence.
-- The application reaches this table only through requireAdmin() API routes
-- backed by service_role. Browser roles are intentionally denied.

create table if not exists public.spokedu_note_v2_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content jsonb not null default '[{"type":"paragraph","content":[]}]'::jsonb,
  content_version bigint not null default 0,
  parent_id uuid null references public.spokedu_note_v2_documents(id) on delete restrict,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  created_by uuid not null,
  updated_by uuid not null,
  constraint spokedu_note_v2_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint spokedu_note_v2_content_array check (jsonb_typeof(content) = 'array'),
  constraint spokedu_note_v2_content_version_nonnegative check (content_version >= 0),
  constraint spokedu_note_v2_not_self_parent check (parent_id is null or parent_id <> id)
);

create index if not exists idx_spokedu_note_v2_tree
  on public.spokedu_note_v2_documents(parent_id, position, created_at, id);

create index if not exists idx_spokedu_note_v2_live_updated
  on public.spokedu_note_v2_documents(updated_at desc)
  where deleted_at is null;

alter table public.spokedu_note_v2_documents enable row level security;

drop policy if exists spokedu_note_v2_documents_deny_all
  on public.spokedu_note_v2_documents;
create policy spokedu_note_v2_documents_deny_all
  on public.spokedu_note_v2_documents
  for all to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.spokedu_note_v2_documents from public, anon, authenticated;
grant all on table public.spokedu_note_v2_documents to service_role;

create or replace function public.spokedu_note_v2_reorder_sibling_v1(
  p_document_id uuid,
  p_direction text,
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_row public.spokedu_note_v2_documents%rowtype;
  sibling_row public.spokedu_note_v2_documents%rowtype;
  current_position integer;
begin
  if p_direction not in ('up', 'down') then
    raise exception using errcode = '22023', message = 'INVALID_DIRECTION';
  end if;

  -- Serialize reorders within the selected sibling set.
  perform 1
    from public.spokedu_note_v2_documents d
   where d.deleted_at is null
     and d.parent_id is not distinct from (
       select source.parent_id
         from public.spokedu_note_v2_documents source
        where source.id = p_document_id
     )
   for update;

  select * into current_row
    from public.spokedu_note_v2_documents
   where id = p_document_id and deleted_at is null;
  if not found then
    raise exception using errcode = 'P0002', message = 'DOCUMENT_NOT_FOUND';
  end if;

  if p_direction = 'up' then
    select * into sibling_row
      from public.spokedu_note_v2_documents
     where deleted_at is null
       and parent_id is not distinct from current_row.parent_id
       and (position, created_at, id) < (current_row.position, current_row.created_at, current_row.id)
     order by position desc, created_at desc, id desc
     limit 1;
  else
    select * into sibling_row
      from public.spokedu_note_v2_documents
     where deleted_at is null
       and parent_id is not distinct from current_row.parent_id
       and (position, created_at, id) > (current_row.position, current_row.created_at, current_row.id)
     order by position asc, created_at asc, id asc
     limit 1;
  end if;

  if not found then
    return jsonb_build_object('moved', false);
  end if;

  current_position := current_row.position;
  update public.spokedu_note_v2_documents
     set position = sibling_row.position, updated_at = now(), updated_by = p_actor_id
   where id = current_row.id;
  update public.spokedu_note_v2_documents
     set position = current_position, updated_at = now(), updated_by = p_actor_id
   where id = sibling_row.id;

  return jsonb_build_object('moved', true, 'swapped_with', sibling_row.id);
end;
$$;
revoke all on function public.spokedu_note_v2_reorder_sibling_v1(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.spokedu_note_v2_reorder_sibling_v1(uuid, text, uuid)
  to service_role;
