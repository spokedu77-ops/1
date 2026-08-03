-- Align DB parent policy with client noteBlockPolicy:
-- Notion checklist nesting = todo under todo via parent_block_id only.

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
