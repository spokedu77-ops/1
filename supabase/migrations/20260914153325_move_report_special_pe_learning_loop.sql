alter table public.mr_session_child_records
  add column if not exists primary_skill text,
  add column if not exists skill_level smallint,
  add column if not exists task_state text,
  add column if not exists process_state text,
  add column if not exists selection_recommendation text,
  add column if not exists selection_decision text;

alter table public.mr_session_child_records
  drop constraint if exists mr_scr_primary_skill_valid,
  add constraint mr_scr_primary_skill_valid
    check (primary_skill is null or (char_length(btrim(primary_skill)) between 1 and 80)),
  drop constraint if exists mr_scr_skill_level_valid,
  add constraint mr_scr_skill_level_valid
    check (skill_level is null or skill_level between 1 and 5),
  drop constraint if exists mr_scr_task_state_valid,
  add constraint mr_scr_task_state_valid
    check (task_state is null or task_state in ('unstable','forming','stable')),
  drop constraint if exists mr_scr_process_state_valid,
  add constraint mr_scr_process_state_valid
    check (process_state is null or process_state in ('unstable','forming','stable','not_observed')),
  drop constraint if exists mr_scr_selection_recommendation_valid,
  add constraint mr_scr_selection_recommendation_valid
    check (selection_recommendation is null or selection_recommendation in ('access_reset','stabilize','fade_support','generalize','advance','transfer')),
  drop constraint if exists mr_scr_selection_decision_valid,
  add constraint mr_scr_selection_decision_valid
    check (selection_decision is null or selection_decision in ('access_reset','stabilize','fade_support','generalize','advance','transfer')),
  drop constraint if exists mr_scr_absent_learning_loop_null,
  add constraint mr_scr_absent_learning_loop_null
    check (
      attendance_status <> 'absent'::mr_attendance_status
      or (
        primary_skill is null
        and skill_level is null
        and task_state is null
        and process_state is null
        and selection_recommendation is null
        and selection_decision is null
      )
    );

comment on column public.mr_session_child_records.primary_skill is 'SPECIAL PE observation window: one representative skill for this child/session.';
comment on column public.mr_session_child_records.skill_level is 'SPOKEDU task-complexity level L1-L5 for primary_skill; not a disability or developmental grade.';
comment on column public.mr_session_child_records.task_state is 'Observed task outcome state: unstable, forming, stable.';
comment on column public.mr_session_child_records.process_state is 'Observed quality-marker state: unstable, forming, stable, not_observed.';
comment on column public.mr_session_child_records.selection_recommendation is 'System-recommended next instructional direction.';
comment on column public.mr_session_child_records.selection_decision is 'Instructor-confirmed next instructional direction.';

create index if not exists idx_mr_scr_child_skill_pathway
  on public.mr_session_child_records (child_id, primary_skill, created_at desc)
  where primary_skill is not null;
