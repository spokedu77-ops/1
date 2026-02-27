-- =====================================================
-- group_id 없는 세션에 group_id 일괄 부여 (연기 기능 복구)
-- =====================================================
-- 원인: group_id가 NULL인 세션은 연기(handlePostponeCascade) 시 "그룹 정보가 없습니다" 오류 발생
-- 해결: 같은 title + created_by 조합을 하나의 그룹으로 묶어 group_id 부여
--
-- 실행 방법: Supabase SQL Editor에서 1단계 확인 후 2단계 실행
-- =====================================================

-- ========== 1단계: 영향받는 세션 확인 ==========
-- group_id가 NULL인 세션이 있는지 확인 후, 2단계 실행
SELECT id, title, created_by, start_at, group_id
FROM sessions
WHERE group_id IS NULL
ORDER BY title, created_by, start_at;

-- ========== 2단계: 같은 제목+강사 기준으로 group_id 일괄 부여 ==========
-- 위 확인 후 문제없으면 아래 블록 실행
DO $$
DECLARE
  rec RECORD;
  new_id UUID;
BEGIN
  FOR rec IN
    SELECT DISTINCT title, created_by
    FROM sessions
    WHERE group_id IS NULL
  LOOP
    new_id := gen_random_uuid();
    UPDATE sessions
    SET group_id = new_id
    WHERE group_id IS NULL
      AND title = rec.title
      AND created_by = rec.created_by;
  END LOOP;
END $$;

-- ========== 결과 확인 ==========
SELECT COUNT(*) AS fixed_sessions_with_group_id
FROM sessions
WHERE group_id IS NOT NULL;
