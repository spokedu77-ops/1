-- Exact inverse of apply.sql; requires the five inserted rows to remain unchanged.
BEGIN;
DELETE FROM public.session_count_logs WHERE id IN (
  'a2000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000002',
  'a2000000-0000-4000-8000-000000000003','a2000000-0000-4000-8000-000000000004',
  'a2000000-0000-4000-8000-000000000005'
);
INSERT INTO public.session_count_logs(id,teacher_id,session_id,session_title,count_change,reason,created_at) VALUES
('3e77b6da-e1c0-43d2-b0d7-abb5815a9be0','f5357023-59d5-4b60-b8ee-5352a9515a42','29ad07b3-177b-42a2-ba8b-ade6a01561ac','성북구청 여름특강',1,'트리거: sessions.status sync','2026-08-11T06:37:18.145Z'),
('7e8f33b7-5107-416a-a16c-7df02ced1730','7443bf87-420f-417d-8051-6b0eece5542b','40ecf7b1-6b2a-4aac-a7cb-242357a72050','덕수초 찾동체',1,'트리거: sessions.status sync','2026-09-17T03:18:08.140Z'),
('019ff15d-7b58-45d7-b1ea-99770df5d681','7540fa19-c724-4a95-927f-57312b3b38f1','6cda704e-dfdb-45aa-bc1d-bcfbcb0cb591','강솔초B반-강동구청',1,'트리거: sessions.status sync','2026-07-23T07:20:22.196Z'),
('bea835a9-8022-4951-96a9-4781deaf7b21','e266e653-9275-4fad-b2a9-f098d91bc63e','ba06555b-73f6-46df-9d75-30804e4b4c30','반포 10남 놀이체육',1,'트리거: sessions.status sync','2026-07-06T12:31:09.854Z'),
('4686da58-39c6-4434-8d7f-fd2ca754992f','243e2d6f-7c77-453c-a89a-a22713d527e1','e099b7fb-28fb-45ee-bcb9-b050371a9de4','중구장애인복지관',1,'트리거: sessions.status sync','2026-08-10T02:30:23.981Z'),
('e91a940f-991c-4f85-81de-2f925f505a05','6b1752e7-1ad7-471b-9350-1623cef9d5a2','e639ca43-64b8-437b-9b6f-a6db986a49e7','개포 6세 그룹 수업',1,'트리거: sessions.status sync','2026-08-21T01:45:46.843Z');
COMMIT;
