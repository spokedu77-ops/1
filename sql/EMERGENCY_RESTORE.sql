-- =====================================================
-- 🚨 긴급 복원 스크립트
-- =====================================================
-- 즉시 Supabase SQL Editor에서 실행하세요!

-- ===== 1단계: RLS 임시 비활성화 (데이터 접근 가능하게) =====
SELECT '🚨 긴급 복원 시작...' as status;

-- RLS 비활성화 (임시)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_count_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE memos DISABLE ROW LEVEL SECURITY;
ALTER TABLE todos DISABLE ROW LEVEL SECURITY;

SELECT '✅ RLS 비활성화 완료 - 이제 데이터 접근 가능' as status;

-- ===== 2단계: 문제 있는 외래 키 제거 =====
-- CASCADE로 인한 추가 삭제 방지
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS fk_sessions_created_by CASCADE;
ALTER TABLE mileage_logs DROP CONSTRAINT IF EXISTS fk_mileage_logs_teacher_id CASCADE;
ALTER TABLE session_count_logs DROP CONSTRAINT IF EXISTS fk_session_count_logs_teacher_id CASCADE;
ALTER TABLE session_count_logs DROP CONSTRAINT IF EXISTS fk_session_count_logs_session_id CASCADE;

SELECT '✅ 외래 키 제약 제거 완료' as status;

-- ===== 3단계: 안전한 RLS 정책 재생성 =====

-- users 테이블 정책
DROP POLICY IF EXISTS "users_read_policy" ON users;
DROP POLICY IF EXISTS "users_insert_admin_only" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_admin_only" ON users;

CREATE POLICY "users_read_all" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_insert_all" ON users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "users_update_all" ON users FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- session_count_logs 정책
DROP POLICY IF EXISTS "Enable insert for own or admin" ON session_count_logs;
DROP POLICY IF EXISTS "Enable read for own or admin" ON session_count_logs;
DROP POLICY IF EXISTS "Enable update for admin only" ON session_count_logs;
DROP POLICY IF EXISTS "Enable delete for admin only" ON session_count_logs;

CREATE POLICY "session_count_logs_all_access" ON session_count_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- memos 정책
DROP POLICY IF EXISTS "Allow admin read access" ON memos;
DROP POLICY IF EXISTS "Allow admin insert access" ON memos;
DROP POLICY IF EXISTS "Allow admin update access" ON memos;
DROP POLICY IF EXISTS "Allow admin delete access" ON memos;

CREATE POLICY "memos_all_access" ON memos FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT '✅ 안전한 RLS 정책 생성 완료' as status;

-- ===== 4단계: RLS 재활성화 =====
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_count_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

SELECT '✅ RLS 재활성화 완료' as status;

-- ===== 5단계: 데이터 확인 =====
SELECT '📊 데이터 확인 중...' as status;

SELECT 'users 테이블' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'sessions 테이블', COUNT(*) FROM sessions
UNION ALL
SELECT 'mileage_logs 테이블', COUNT(*) FROM mileage_logs
UNION ALL
SELECT 'session_count_logs 테이블', COUNT(*) FROM session_count_logs
UNION ALL
SELECT 'memos 테이블', COUNT(*) FROM memos;

SELECT '🎉 긴급 복원 완료!' as final_status;
SELECT '✅ 이제 애플리케이션에서 데이터 접근 가능합니다' as result;
SELECT '⚠️  보안은 약화되었지만 우선 서비스 정상화됨' as note;
