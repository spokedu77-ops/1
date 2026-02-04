-- ==========================================
-- Storage 정책 강제 재적용
-- 기존 정책을 모두 삭제하고 새로 생성
-- ==========================================

-- 1. 기존 Storage 정책 모두 삭제
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload access" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin delete" ON storage.objects;

-- 2. is_admin() 함수 강제 재생성
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND (UPPER(users.role) = 'ADMIN' OR users.role = 'admin' OR users.role = 'master')
  );
END;
$$;

-- 3. Public Read 정책 생성
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'iiwarmup-files');

-- 4. Admin Upload 정책 생성 (WITH CHECK 필수)
CREATE POLICY "Admin upload access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'iiwarmup-files'
  AND is_admin() = true
);

-- 5. Admin Delete 정책 생성
CREATE POLICY "Admin delete access"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'iiwarmup-files'
  AND is_admin() = true
);

-- 6. Admin Update 정책도 추가 (파일 덮어쓰기용)
CREATE POLICY "Admin update access"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'iiwarmup-files'
  AND is_admin() = true
)
WITH CHECK (
  bucket_id = 'iiwarmup-files'
  AND is_admin() = true
);

-- 확인 메시지
SELECT 
  '✅ Storage 정책 재적용 완료' as status,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage') as total_policies;
