-- =====================================================
-- ⚡ 긴급 수정 - 즉시 실행!
-- =====================================================
-- 이 스크립트로 페이지가 즉시 복구됩니다

-- ===== 1. RLS 임시 비활성화 (모든 데이터 접근 가능) =====
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_count_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE memos DISABLE ROW LEVEL SECURITY;
ALTER TABLE todos DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants DISABLE ROW LEVEL SECURITY;

SELECT '✅ 긴급 조치 완료 - 이제 페이지 새로고침하세요!' as status;
SELECT '⚠️  RLS가 비활성화되어 있습니다 (보안 약화)' as warning;
SELECT '📋 다음 단계: 안전한 정책 재설정 필요' as next_step;
