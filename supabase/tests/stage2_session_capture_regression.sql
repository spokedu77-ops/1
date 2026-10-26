\set ON_ERROR_STOP on
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000001');
insert into public.spokedu_master_classes(id,owner_id,name) values
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','A');
insert into public.spokedu_master_students(id,owner_id,name) values
  ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','One'),
  ('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Two');
insert into public.spokedu_master_sessions(id,owner_id,class_id,class_name_snapshot,start_at,end_at,status)
values ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','A','2026-01-31 14:30+00','2026-01-31 15:30+00','completed');
insert into public.spokedu_master_session_attendance(owner_id,session_id,student_id,student_name_snapshot,status) values
  ('00000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Historical One','present'),
  ('00000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','Historical Two','absent');

select public.spokedu_master_save_session_capture_v2(
  '00000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',null,'next-1',
  '[{"student_id":"20000000-0000-0000-0000-000000000001","memo":"one-v1"},{"student_id":"20000000-0000-0000-0000-000000000002","memo":"two-v1"}]'::jsonb
);

do $$
declare v_record uuid;
begin
  select id into v_record from public.spokedu_master_class_records where session_id='30000000-0000-0000-0000-000000000001';
  if (select capture_version from public.spokedu_master_class_records where id=v_record) <> 1 then raise exception 'initial version mismatch'; end if;
  if (select count(*) from public.spokedu_master_class_record_students where record_id=v_record) <> 2 then raise exception 'initial observations missing'; end if;
end $$;

select public.spokedu_master_save_session_capture_v2(
  '00000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',1,'next-2',
  '[{"student_id":"20000000-0000-0000-0000-000000000001","memo":"one-v2"}]'::jsonb
);

do $$
declare v_record uuid;
begin
  select id into v_record from public.spokedu_master_class_records where session_id='30000000-0000-0000-0000-000000000001';
  if (select capture_version from public.spokedu_master_class_records where id=v_record) <> 2 then raise exception 'updated version mismatch'; end if;
  if (select memo from public.spokedu_master_class_record_students where record_id=v_record and student_id='20000000-0000-0000-0000-000000000002') <> 'two-v1' then raise exception 'unmentioned observation was overwritten'; end if;
  if (select student_name_snapshot from public.spokedu_master_class_record_students where record_id=v_record and student_id='20000000-0000-0000-0000-000000000001') <> 'One' then raise exception 'student snapshot changed'; end if;
  if (select attendance from public.spokedu_master_class_record_students where record_id=v_record and student_id='20000000-0000-0000-0000-000000000002') <> 'absent' then raise exception 'attendance snapshot changed'; end if;
end $$;
