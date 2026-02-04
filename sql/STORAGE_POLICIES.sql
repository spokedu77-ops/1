-- ==========================================
-- Supabase Storage 정책 설정
-- Storage 버킷 생성 후 이 파일을 실행하세요
-- ==========================================

-- 전제조건: 'iiwarmup-files' 버킷이 이미 생성되어 있어야 함
-- Dashboard > Storage > New Bucket > 'iiwarmup-files' (Public 체크)

-- ==========================================
-- is_admin() 함수 생성 (없는 경우)
-- 대소문자 구분 없이 'admin', 'master' role 체크
-- ==========================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND (UPPER(users.role) = 'ADMIN' OR users.role = 'master')
  );
END;
$$;

-- 1. Public Read
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'iiwarmup-files');

-- 2. Admin Upload (is_admin() 함수 사용)
DROP POLICY IF EXISTS "Admin upload access" ON storage.objects;
CREATE POLICY "Admin upload access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'iiwarmup-files'
  AND is_admin()
);

-- 3. Admin Delete (is_admin() 함수 사용)
DROP POLICY IF EXISTS "Admin delete access" ON storage.objects;
CREATE POLICY "Admin delete access"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'iiwarmup-files'
  AND is_admin()
);

-- 4. Admin Update (파일 덮어쓰기용)
DROP POLICY IF EXISTS "Admin update access" ON storage.objects;
CREATE POLICY "Admin update access"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'iiwarmup-files'
  AND is_admin()
)
WITH CHECK (
  bucket_id = 'iiwarmup-files'
  AND is_admin()
);

-- 완료!
