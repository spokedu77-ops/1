-- Anonymized ops-scale shape: 48 catalog, 666 inventory, 2 teacher_inventory, 4 M1 + 19 U1 rows.
-- No OPENING / ledger postings.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('a0000001-0001-4001-8001-000000000001', 'admin@test.local'),
  ('a0000002-0002-4002-8002-000000000002', 'teacher-a@test.local'),
  ('a0000003-0003-4003-8003-000000000003', 'teacher-b@test.local'),
  ('a0000004-0004-4004-8004-000000000004', 'teacher-c@test.local'),
  ('00000001-0001-4001-8001-000000000001', 'orphan-1@test.local'),
  ('00000002-0002-4002-8002-000000000002', 'orphan-2@test.local'),
  ('00000003-0003-4003-8003-000000000003', 'orphan-3@test.local'),
  ('00000004-0004-4004-8004-000000000004', 'orphan-4@test.local')
on conflict (id) do nothing;

insert into public.users (id, name, role, is_active) values
  ('a0000001-0001-4001-8001-000000000001', '테스트관리자', 'admin', true),
  ('a0000002-0002-4002-8002-000000000002', '테스트강사A', 'teacher', true),
  ('a0000003-0003-4003-8003-000000000003', '테스트강사B', 'teacher', true),
  ('a0000004-0004-4004-8004-000000000004', '테스트강사C', 'teacher', true)
on conflict (id) do nothing;

insert into public.catalog (name, category)
select '품목-' || lpad(i::text, 2, '0'), '테스트'
from generate_series(1, 48) as i;

update public.catalog set name = '밸런스 교구' where id = 2;

insert into public.teacher_inventory (user_id, name, category, count) values
  ('a0000001-0001-4001-8001-000000000001', '스텝래더', '기타', 10),
  ('a0000001-0001-4001-8001-000000000001', '테니스공', '기타', 10);

-- U1 (19) — user_id not in public.users
insert into public.inventory (user_id, name, quantity)
select '00000001-0001-4001-8001-000000000001', '고아품목-' || g, 1
from generate_series(1, 14) g;

insert into public.inventory (user_id, name, quantity)
select '00000003-0003-4003-8003-000000000003', '고아품목-o3-' || g, 1
from generate_series(1, 3) g;

insert into public.inventory (user_id, name, quantity) values
  ('00000002-0002-4002-8002-000000000002', '고아품목-o2', 10),
  ('00000004-0004-4004-8004-000000000004', '고아품목-o4', 10);

-- Regular rows (643) — catalog name rotation
insert into public.inventory (user_id, name, quantity, category)
select
  case (g % 3)
    when 0 then 'a0000002-0002-4002-8002-000000000002'::uuid
    when 1 then 'a0000003-0003-4003-8003-000000000003'::uuid
    else 'a0000004-0004-4004-8004-000000000004'::uuid
  end,
  c.name,
  1 + (g % 5),
  '테스트'
from generate_series(1, 643) as g
join public.catalog c on c.id = 1 + ((g - 1) % 48);

-- M1 (4) — trailing-space name, zero catalog match (shape §7.1; valid teacher users)
insert into public.inventory (user_id, name, quantity) values
  ('a0000002-0002-4002-8002-000000000002', '밸런스핏 ', 1),
  ('a0000003-0003-4003-8003-000000000003', '밸런스핏 ', 1),
  ('a0000004-0004-4004-8004-000000000004', '밸런스핏 ', 1),
  ('a0000002-0002-4002-8002-000000000002', '밸런스핏 ', 2);

select setval(pg_get_serial_sequence('public.inventory', 'id'), (select coalesce(max(id), 1) from public.inventory));
