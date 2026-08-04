-- Security advisor: Function Search Path Mutable
-- public.note_block_parent_allowed 에 search_path 고정.

create or replace function public.note_block_parent_allowed(
  p_child_type text,
  p_parent_type text default null
)
returns boolean
language sql
immutable
set search_path = public
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
    -- checklist nest (client canPlaceBlockTypeInParent)
    when p_parent_type = 'todo' then p_child_type = 'todo'
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

revoke all on function public.note_block_parent_allowed(text, text) from public;
grant execute on function public.note_block_parent_allowed(text, text) to service_role;
