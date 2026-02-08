# Phase 5 DB 마이그레이션 가이드

> **목적**: `session_count_logs.teacher_id` FK를 auth.users → public.users로 변경하여, Auth 미등록 강사도 수업 로그에 기록되도록 함

---

## 1. 마이그레이션 대상

| 테이블 | 변경 내용 |
|--------|-----------|
| `session_count_logs` | `teacher_id` FK: `auth.users(id)` → `public.users(id)` |

---

## 2. 사전 확인 (필수)

Supabase SQL Editor에서 아래 쿼리를 실행하세요.

```sql
-- session_count_logs의 teacher_id가 모두 public.users에 있는지 확인
-- 결과가 0이어야 마이그레이션 안전
SELECT COUNT(*) AS orphan_count
FROM session_count_logs scl
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = scl.teacher_id);
```

- **결과가 0**: 마이그레이션 진행 가능
- **결과가 1 이상**: 해당 `teacher_id`를 `public.users`에 먼저 추가한 뒤 진행

---

## 3. 실행 방법

### 3.1 Supabase 대시보드

1. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 선택
2. **SQL Editor** 메뉴 이동
3. **New query** 클릭
4. `sql/36_session_count_logs_fk_to_public_users.sql` 파일 내용 복사 후 붙여넣기
5. **Run** 실행

### 3.2 제약명이 다른 경우

FK 제약 삭제 시 `session_count_logs_teacher_id_fkey`가 없다는 오류가 나면:

```sql
-- 제약명 확인
SELECT conname FROM pg_constraint 
WHERE conrelid = 'session_count_logs'::regclass AND contype = 'f';
```

출력된 `conname`으로 아래처럼 수정 후 실행:

```sql
ALTER TABLE session_count_logs DROP CONSTRAINT [확인된_제약명];
```

이후 2번 `ADD CONSTRAINT` 구문만 실행하면 됩니다.

---

## 4. 실행 후 확인

```sql
-- FK가 public.users를 참조하는지 확인
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'session_count_logs' AND tc.constraint_type = 'FOREIGN KEY';
```

`foreign_table`이 `users`(public.users)이면 정상 적용된 것입니다.

---

## 5. 롤백 (필요 시)

마이그레이션 후 문제가 생기면 아래로 원복할 수 있습니다.

```sql
ALTER TABLE session_count_logs DROP CONSTRAINT IF EXISTS session_count_logs_teacher_id_fkey;

ALTER TABLE session_count_logs
  ADD CONSTRAINT session_count_logs_teacher_id_fkey
  FOREIGN KEY (teacher_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;
```

---

## 6. session_count 중복 방지

`session_count` 업데이트는 앱 단에서 처리됩니다.  
`sql/33_session_count_logs_unique_and_cleanup.sql`이 이미 적용되어 있다면, `session_id` UNIQUE로 로그 중복은 방지되고 있습니다.

추가 DB 변경은 필요하지 않습니다.

---

*문서 작성일: 2025-02 | ADMIN 전체 리팩토링 Phase 5*
