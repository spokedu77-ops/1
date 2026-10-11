-- APPROVED FOR STAGING ONLY: stanouvgklynytjtlnif.
-- Synthetic non-customer content. ID 900001 is reserved across all three sources.

begin;

do $$
begin
  if exists (select 1 from public.curriculum where id = 900001)
    or exists (select 1 from public.spokedu_pro_programs where source_center_curriculum_id = 900001)
    or exists (select 1 from public.spokedu_master_program_meta where curriculum_id = 900001) then
    raise exception 'QA fixture id 900001 already exists';
  end if;
end $$;

insert into public.curriculum (
  id, month, week, title, url, type, created_at, display_order, is_sub
) values (
  900001, 1, 1, 'QA 협동 이동 게임', null, 'QA', now(), 1, false
);

insert into public.spokedu_pro_programs (
  title, video_url, is_published, function_type, main_theme, group_size,
  equipment, activity_method, activity_tip, center_curriculum_is_sub,
  source_center_curriculum_id
) values (
  'QA 협동 이동 게임', null, true, '협응력', '협동형', '소그룹',
  '콘 4개', E'1. 시작 지점에 선다.\n2. 신호에 맞춰 함께 이동한다.',
  'QA 환경에서만 사용하는 합성 콘텐츠', false, 900001
);

insert into public.spokedu_master_program_meta (
  curriculum_id, sm_tags, sm_theme, sm_grade, sm_space,
  sm_is_pro, sm_is_new, sm_is_hot, sm_display_order,
  sm_objective, sm_development_focus, sm_coach_script, sm_parent_note,
  sm_related_spomove_ids, sm_briefing_notes
) values (
  900001, array['인원:소그룹'], '협동형', 'ALL', 'ALL',
  false, false, false, 1,
  '신호에 맞춰 함께 이동한다.', '협응력', '안전을 확인하고 시작합니다.',
  '협동하며 이동하는 연습입니다.', array[]::text[], '안전: 이동 간격을 유지합니다.'
);

commit;
