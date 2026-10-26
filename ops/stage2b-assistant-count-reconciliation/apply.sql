-- Stage 2B candidate package, frozen from the 2026-10-27 production read-only snapshot.
-- DO NOT RUN WITHOUT A SEPARATE DATA-CORRECTION APPROVAL.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

LOCK TABLE public.session_count_logs IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE v_bad integer;
BEGIN
  SELECT count(*) INTO v_bad FROM (VALUES
    ('128f94c6-7683-4dff-b775-34f68939b631'::uuid,'05b4db47-9bdd-477b-a7e2-137d6500f0ce'::uuid),
    ('ac736a27-50ff-49ab-94e2-2c39ca5940e0'::uuid,'ccf79ae8-3fed-4053-bb28-8e27453903ea'::uuid),
    ('b501b607-d3ca-4971-9ba6-773d22ad8da3'::uuid,'b8ca6d26-df51-43c6-bad0-563a4073da21'::uuid),
    ('c8e5baca-d38a-4bf6-9899-6b032a0e1470'::uuid,'f9f16237-8a01-4436-907e-94dbb5034518'::uuid),
    ('e639ca43-64b8-437b-9b6f-a6db986a49e7'::uuid,'d4e01a90-dc75-40b3-ad46-cbd7c96cfa5d'::uuid)
  ) expected(session_id,teacher_id)
  WHERE EXISTS (SELECT 1 FROM public.session_count_logs l WHERE l.session_id=expected.session_id AND l.teacher_id=expected.teacher_id);
  IF v_bad <> 0 THEN RAISE EXCEPTION 'STAGE2B_SNAPSHOT_DRIFT_INSERT'; END IF;

  SELECT count(*) INTO v_bad FROM (VALUES
    ('3e77b6da-e1c0-43d2-b0d7-abb5815a9be0'::uuid),('7e8f33b7-5107-416a-a16c-7df02ced1730'::uuid),
    ('019ff15d-7b58-45d7-b1ea-99770df5d681'::uuid),('bea835a9-8022-4951-96a9-4781deaf7b21'::uuid),
    ('4686da58-39c6-4434-8d7f-fd2ca754992f'::uuid),('e91a940f-991c-4f85-81de-2f925f505a05'::uuid)
  ) expected(id)
  WHERE NOT EXISTS (SELECT 1 FROM public.session_count_logs l WHERE l.id=expected.id AND l.reason='트리거: sessions.status sync');
  IF v_bad <> 0 THEN RAISE EXCEPTION 'STAGE2B_SNAPSHOT_DRIFT_DELETE'; END IF;
END $$;

INSERT INTO public.session_count_logs(id,teacher_id,session_id,session_title,count_change,reason) VALUES
('a2000000-0000-4000-8000-000000000001','05b4db47-9bdd-477b-a7e2-137d6500f0ce','128f94c6-7683-4dff-b775-34f68939b631','5/8 청담 9&11 남여 학체',1,'트리거: sessions.status sync'),
('a2000000-0000-4000-8000-000000000002','ccf79ae8-3fed-4053-bb28-8e27453903ea','ac736a27-50ff-49ab-94e2-2c39ca5940e0','5/6 거점 2호 늘봄',1,'트리거: sessions.status sync'),
('a2000000-0000-4000-8000-000000000003','b8ca6d26-df51-43c6-bad0-563a4073da21','b501b607-d3ca-4971-9ba6-773d22ad8da3','11/12 거점 7호 (멀티스포츠)',1,'트리거: sessions.status sync'),
('a2000000-0000-4000-8000-000000000004','f9f16237-8a01-4436-907e-94dbb5034518','c8e5baca-d38a-4bf6-9899-6b032a0e1470','6/7 서초 14남 농구',1,'트리거: sessions.status sync'),
('a2000000-0000-4000-8000-000000000005','d4e01a90-dc75-40b3-ad46-cbd7c96cfa5d','e639ca43-64b8-437b-9b6f-a6db986a49e7','개포 6세 그룹 수업',1,'트리거: sessions.status sync');

DELETE FROM public.session_count_logs WHERE id IN (
  '3e77b6da-e1c0-43d2-b0d7-abb5815a9be0','7e8f33b7-5107-416a-a16c-7df02ced1730',
  '019ff15d-7b58-45d7-b1ea-99770df5d681','bea835a9-8022-4951-96a9-4781deaf7b21',
  '4686da58-39c6-4434-8d7f-fd2ca754992f','e91a940f-991c-4f85-81de-2f925f505a05'
);
COMMIT;
