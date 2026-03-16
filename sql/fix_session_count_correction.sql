-- ==========================================
-- session_count 이중 카운팅 보정
-- 앱 도입 이후 수업 완료 시 session_count와 session_count_logs 둘 다 증가했던
-- 버그 수정 후, 이미 잘못 누적된 users.session_count를 보정합니다.
-- ==========================================
-- 실행 전: 아래 "사전 확인" SELECT로 변경 결과를 미리 확인한 뒤 적용하세요.
-- ==========================================

-- [사전 확인] 보정 후 session_count 예상값 (레거시만 남기고 logCount만큼 차감)
-- SELECT
--   u.id,
--   u.name,
--   u.session_count AS current_session_count,
--   (SELECT COUNT(*) FROM session_count_logs scl WHERE scl.teacher_id = u.id) AS log_count,
--   GREATEST(0, u.session_count - (SELECT COUNT(*) FROM session_count_logs scl WHERE scl.teacher_id = u.id)) AS new_session_count
-- FROM users u
-- WHERE EXISTS (SELECT 1 FROM session_count_logs scl WHERE scl.teacher_id = u.id)
-- ORDER BY u.name;

-- 보정 실행: session_count에서 해당 강사의 session_count_logs 건수만큼 차감
UPDATE users u
SET session_count = GREATEST(0, u.session_count - (
  SELECT COUNT(*)::integer FROM session_count_logs scl
  WHERE scl.teacher_id = u.id
))
WHERE EXISTS (
  SELECT 1 FROM session_count_logs scl WHERE scl.teacher_id = u.id
);

-- 완료. 이후 UI에서는 session_count(레거시) + logCount(session_count_logs 건수)로 표시됩니다.
