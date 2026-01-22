# Supabase 보안 문제 해결 가이드

## 발견된 보안 문제

### 1. RLS Policy Always True
- **문제**: `memos` 테이블의 RLS 정책이 `USING (true)`로 설정
- **위험도**: 높음
- **영향**: 모든 인증된 사용자가 모든 데이터에 접근 가능

### 2. Function Search Path Mutable
- **문제**: 함수들에 `search_path`가 설정되지 않음
- **위험도**: 중간
- **영향**: SQL 인젝션 가능성

## 해결 방법

### 옵션 1: 특정 관리자만 허용 (권장)

**장점**:
- 가장 안전
- 관리자만 메모 접근 가능

**단점**:
- 관리자 이메일을 직접 입력해야 함
- 새 관리자 추가 시 SQL 수정 필요

**실행**:
1. `sql/07_fix_security_issues.sql` 파일 열기
2. 32-39줄, 44-51줄, 58-65줄, 74-81줄에서 관리자 이메일 수정
3. Supabase SQL Editor에서 실행

```sql
-- 예시: 이메일 목록 수정
auth.jwt() ->> 'email' IN (
  'your-admin@email.com',  -- 실제 관리자 이메일로 변경
  'admin2@email.com'
)
```

### 옵션 2: 모든 인증 사용자 허용 (간단)

**장점**:
- 간단함
- 별도 설정 불필요

**단점**:
- 보안 경고는 줄어들지만 여전히 허용적
- 모든 로그인 사용자가 접근 가능

**실행**:
1. `sql/07_fix_security_issues.sql` 파일 열기
2. 하단 주석 처리된 부분(107-133줄) 주석 해제
3. 상단 정책(28-84줄) 삭제 또는 주석 처리
4. Supabase SQL Editor에서 실행

## 권장 사항

### 프로덕션 환경
- **옵션 1** 사용
- 관리자 이메일만 허용

### 개발/테스트 환경
- **옵션 2** 사용
- 편의성 우선

## 함수 보안 수정

`update_updated_at_column`와 `update_session_with_mileage` 함수에 `SET search_path = ''` 추가:

```sql
CREATE OR REPLACE FUNCTION function_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''  -- 이 줄 추가
AS $$
BEGIN
  -- 함수 로직
END;
$$;
```

## 실행 후 확인

```sql
-- 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'memos';

-- 함수 확인
SELECT proname, prosecdef, proconfig 
FROM pg_proc 
WHERE proname IN ('update_updated_at_column', 'update_session_with_mileage');
```

## 주의사항

- SQL 실행 전 **백업** 권장
- 관리자 이메일은 Supabase Auth에 등록된 이메일과 정확히 일치해야 함
- RLS 정책 변경 후 로그아웃/로그인 필요할 수 있음
