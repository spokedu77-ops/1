-- All assertions run in a subtransaction and every test write is rolled back.
do $$
declare
  v_id uuid := '5a2c6b91-b6e8-4517-84d2-ee4aab0ebffb';
  v_competitor uuid := gen_random_uuid();
  v_row public.sessions%rowtype;
  v_n int;
begin
  begin
    select * into strict v_row from public.sessions where id=v_id for update;
    if v_row.status<>'finished' then raise exception 'AUDIT_BASELINE_CHANGED'; end if;
    update public.sessions set status='cancelled' where id=v_id;
    select count(*) into v_n from private.session_teacher_schedule_slots where session_id=v_id;
    if v_n<>0 then raise exception 'CANCEL_SLOTS_NOT_RELEASED'; end if;
    select count(*) into v_n from public.session_count_logs where session_id=v_id;
    if v_n<>0 then raise exception 'CANCEL_COUNTS_NOT_RELEASED'; end if;
    insert into public.sessions(id,title,session_type,start_at,end_at,status,group_id,created_by,price,memo)
    values(v_competitor,'ROLLBACK ONLY conflict probe',v_row.session_type,v_row.start_at,v_row.end_at,'opened',gen_random_uuid(),v_row.created_by,0,'EXTRA_TEACHERS:[]');
    begin
      update public.sessions set status='opened' where id=v_id;
      raise exception 'RESTORE_CONFLICT_NOT_REJECTED';
    exception when exclusion_violation then null; end;
    delete from public.sessions where id=v_competitor;
    update public.sessions set status='opened' where id=v_id;
    select count(*) into v_n from private.session_teacher_schedule_slots where session_id=v_id;
    if v_n<>3 then raise exception 'RESTORE_SLOTS_NOT_REBUILT'; end if;
    update public.sessions set status='finished' where id=v_id;
    select count(*) into v_n from public.session_count_logs where session_id=v_id;
    if v_n<>3 then raise exception 'FINISH_COUNTS_NOT_REBUILT'; end if;
    update public.sessions set status='verified' where id=v_id;
    select count(*) into v_n from public.session_count_logs where session_id=v_id;
    if v_n<>3 then raise exception 'VERIFIED_DUPLICATE_COUNTS'; end if;
    update public.sessions set status='postponed' where id=v_id;
    select count(*) into v_n from private.session_teacher_schedule_slots where session_id=v_id;
    if v_n<>0 then raise exception 'POSTPONE_SLOTS_NOT_RELEASED'; end if;
    select count(*) into v_n from public.session_count_logs where session_id=v_id;
    if v_n<>0 then raise exception 'POSTPONE_COUNTS_NOT_RELEASED'; end if;
    update public.sessions set status='opened' where id=v_id;
    update public.sessions set status='finished' where id=v_id;
    update public.sessions set memo='EXTRA_TEACHERS:[]' where id=v_id;
    select count(*) into v_n from public.session_count_logs where session_id=v_id;
    if v_n<>1 then raise exception 'REMOVED_ASSISTANT_COUNTS_REMAIN'; end if;
    select count(*) into v_n from private.session_teacher_schedule_slots where session_id=v_id;
    if v_n<>1 then raise exception 'REMOVED_ASSISTANT_SLOTS_REMAIN'; end if;
    update public.sessions set memo=v_row.memo where id=v_id;
    select count(*) into v_n from public.session_count_logs where session_id=v_id;
    if v_n<>3 then raise exception 'ASSISTANT_RESTORE_COUNTS_MISSING'; end if;
    raise exception using errcode='ZX001', message='AUDIT_SUCCESS_ROLLBACK';
  exception when sqlstate 'ZX001' then null; end;
end $$;
select 'lifecycle assertions passed; all test edits rolled back' as tested, s.status,
(select count(*) from public.session_count_logs where session_id=s.id) as count_logs,
(select count(*) from private.session_teacher_schedule_slots where session_id=s.id) as slots
from public.sessions s where s.id='5a2c6b91-b6e8-4517-84d2-ee4aab0ebffb';
