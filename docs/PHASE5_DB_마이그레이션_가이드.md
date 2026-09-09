# Phase 5 DB 마이그레이션 가이드

> **목적 (역사)**: `session_count_logs.teacher_id` FK를 `auth.users` → `public.users`로 바꿔, Auth 미등록 강사도 수업 로그에 기록되게 하려는 운영 변경.

이 문서는 **운영 안내**이지 스키마 SSOT가 아니다. 연대기 이력은 `supabase/migrations/**`만 해당한다.

---

## 거버넌스 (읽기 필수)

- 대상 SQL 실제 경로: [`sql/archive/legacy/36_session_count_logs_fk_to_public_users.sql`](../sql/archive/legacy/36_session_count_logs_fk_to_public_users.sql)
- 이 SQL은 **`supabase/migrations/**`에 없다.** 자동 마이그레이션 이력이 아니라 **레거시/수동 SQL**이다.
- 저장소만으로는 **현재 라이브 DB에 이미 적용됐는지 증명할 수 없다.**
- **확인 없이 재실행하지 말 것.** FK를 두 번 바꾸거나 잘못된 제약명으로 DROP하면 수업 로그 기록이 깨질 수 있다.
- 현재 FK가 `auth.users`인지 `public.users`인지는 **라이브 DB 검증 후에만** 다음 행동을 정한다.
- 이 아카이브 파일을 현재 스키마 권한(authority)으로 취급하지 말 것. 이 패스에서 대체 마이그레이션을 만들지 않는다.

중복 방지 관련 역사 SQL은 [`sql/archive/legacy/33_session_count_logs_unique_and_cleanup.sql`](../sql/archive/legacy/33_session_count_logs_unique_and_cleanup.sql)이다. 루트 `sql/33_*.sql`은 없다.

---

## 1. 의도했던 변경

| 테이블 | 변경 내용 |
|--------|-----------|
| `session_count_logs` | `teacher_id` FK: `auth.users(id)` → `public.users(id)` |

---

## 2. 라이브 확인 (재실행 전 필수)

Supabase SQL Editor에서 **읽기**로 현재 FK와 orphan을 확인한다. 아래는 검증용이며, archive SQL을 붙여 넣는 절차가 아니다.

```sql
-- session_count_logs의 teacher_id가 모두 public.users에 있는지
SELECT COUNT(*) AS orphan_count
FROM session_count_logs scl
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = scl.teacher_id);
```

```sql
-- 현재 FK가 어느 테이블을 가리키는지
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

- `foreign_table`이 이미 `users`(public)이면 **이 archive SQL을 다시 돌리지 않는다.**
- orphan이 0이 아닌데 FK만 바꾸면 실패하거나 데이터가 막힌다. 먼저 `public.users` 정합을 본다.

제약명 확인:

```sql
SELECT conname FROM pg_constraint
WHERE conrelid = 'session_count_logs'::regclass AND contype = 'f';
```

---

## 3. 수동 적용이 필요한 경우에만

라이브 검증 결과 FK가 아직 `auth.users`이고, orphan이 0이며, 운영 승인이 있을 때만 archive 파일 내용을 SQL Editor에 붙여 넣는다. 패키지 스크립트나 `supabase/migrations` 적용 절차로 넣지 않는다.

롤백 SQL(다시 `auth.users`를 가리키게 함)도 동일하게 **승인된 사고 대응**에서만 사용한다. 여기에 적힌 롤백은 복붙 기본값이 아니다.

```sql
ALTER TABLE session_count_logs DROP CONSTRAINT IF EXISTS session_count_logs_teacher_id_fkey;

ALTER TABLE session_count_logs
  ADD CONSTRAINT session_count_logs_teacher_id_fkey
  FOREIGN KEY (teacher_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;
```

---

## 4. session_count 중복 방지

`session_count` 갱신은 앱 경로(예: 수업 자동 종료)에서도 이뤄진다.
`sql/99_session_count_logs_status_trigger.sql` 트리거의 **라이브 설치 여부는 저장소로 증명되지 않는다.** 이 문서가 트리거가 켜져 있다고 단정하지 않는다.

---

*원문 작성: 2025-02 ADMIN Phase 5. 경로·거버넌스 정정: 2026-09.*
