-- 푸시 API(send-chat)에서 수신자별 배지 개수를 조회할 수 있도록 service_role에 실행 권한 부여.
-- send-chat 라우트는 SUPABASE_SERVICE_ROLE_KEY로 호출하므로 이 권한이 필요할 수 있음.
-- (이미 실행 가능하면 무시해도 됨.)

GRANT EXECUTE ON FUNCTION get_unread_counts(UUID) TO service_role;
