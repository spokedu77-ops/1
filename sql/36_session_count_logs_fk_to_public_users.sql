-- ==========================================
-- Phase 5: session_count_logs FK 변경
-- teacher_id: auth.users(id) → public.users(id)
-- 
-- 효과: Auth 미등록 강사(public.users에만 있는 강사)도 수업 로그 기록 가능
-- 참조: docs/admin_classes_오류분석_및_수업로그.md 2.5절
-- ==========================================
-- Supabase SQL Editor에서 실행하세요.
-- 실행 전: 아래 "사전 확인" 쿼리로 데이터 정합성 확인 권장
-- ==========================================

-- [사전 확인] session_count_logs의 teacher_id가 모두 public.users에 있는지 확인
-- 결과가 0이어야 마이그레이션 안전. 0이 아니면 해당 teacher_id를 public.users에 먼저 추가해야 함.
/*
SELECT COUNT(*) AS orphan_count
FROM session_count_logs scl
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = scl.teacher_id);
*/

-- 1. 기존 FK 제약 제거 (제약명은 프로젝트에 따라 다를 수 있음)
ALTER TABLE session_count_logs
  DROP CONSTRAINT IF EXISTS session_count_logs_teacher_id_fkey;

-- 제약명이 다르면 아래 쿼리로 확인 후 수동 DROP
-- SELECT conname FROM pg_constraint WHERE conrelid = 'session_count_logs'::regclass AND contype = 'f';

-- 2. public.users(id)를 참조하는 새 FK 추가
ALTER TABLE session_count_logs
  ADD CONSTRAINT session_count_logs_teacher_id_fkey
  FOREIGN KEY (teacher_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

-- 완료. 이제 public.users에 있는 모든 강사의 수업 로그가 정상 기록됩니다.
