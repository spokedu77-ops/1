-- ==========================================
-- Supabase Storage 정책 설정
-- Storage 버킷 생성 후 이 파일을 실행하세요
-- ==========================================

-- 전제조건: 'iiwarmup-files' 버킷이 이미 생성되어 있어야 함
-- Dashboard > Storage > New Bucket > 'iiwarmup-files' (Public 체크)

-- 1. Public Read
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'iiwarmup-files');

-- 2. Admin Upload
DROP POLICY IF EXISTS "Admin upload access" ON storage.objects;
CREATE POLICY "Admin upload access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'iiwarmup-files'
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'ADMIN'
  )
);

-- 3. Admin Delete  
DROP POLICY IF EXISTS "Admin delete access" ON storage.objects;
CREATE POLICY "Admin delete access"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'iiwarmup-files'
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'ADMIN'
  )
);

-- 완료!
