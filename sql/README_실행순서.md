# IIW Warmup SQL 실행 가이드

## 📋 실행 순서 (필수)

Supabase SQL Editor에서 아래 순서대로 실행하세요.

### 1단계: 테이블 생성
```bash
01_create_iiwarmup_tables.sql
```
- `iiwarmup_programs` 테이블 생성
- `sports_videos` 테이블 생성
- 인덱스 및 트리거 생성

### 2단계: RLS 정책 설정
```bash
02_create_iiwarmup_policies.sql
```
- Admin 권한 설정
- 사용자 읽기 권한 설정

### 3단계: 샘플 데이터 (선택사항)
```bash
03_sample_data.sql
```
- 테스트용 웜업 프로그램 4개
- 테스트용 영상 4개

## 🪣 Supabase Storage 버킷 생성

Supabase Dashboard → Storage → New Bucket

### 버킷 이름
```
iiwarmup-files
```

### 설정
- **Public bucket**: ✅ Yes (체크)
- **File size limit**: 50 MB
- **Allowed MIME types**: 
  - `text/html`
  - `application/octet-stream`

### 정책 (Policies)
Storage → iiwarmup-files → Policies → New Policy

**1. Public Read (모든 사용자 읽기)**
```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'iiwarmup-files');
```

**2. Admin Upload (Admin만 업로드)**
```sql
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
```

**3. Admin Delete (Admin만 삭제)**
```sql
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
```

## ✅ 확인 방법

SQL Editor에서 실행:

```sql
-- 테이블 생성 확인
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('iiwarmup_programs', 'sports_videos');

-- RLS 활성화 확인
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('iiwarmup_programs', 'sports_videos');

-- 정책 확인
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('iiwarmup_programs', 'sports_videos');
```

## 🚨 문제 해결

### 에러: "relation already exists"
→ 이미 생성됨. 다음 단계로 진행

### 에러: "permission denied"
→ Supabase Dashboard에서 SQL Editor 권한 확인

### 에러: "policy already exists"
→ DROP POLICY 후 재실행

## 📝 완료 체크리스트

- [ ] 01_create_iiwarmup_tables.sql 실행 완료
- [ ] 02_create_iiwarmup_policies.sql 실행 완료
- [ ] 03_sample_data.sql 실행 완료 (선택)
- [ ] Storage 버킷 `iiwarmup-files` 생성 완료
- [ ] Storage 정책 3개 생성 완료
- [ ] 확인 쿼리 실행 완료

모든 체크리스트 완료 후 개발 진행 가능합니다.
