# 일정(schedules) 테이블 마이그레이션 가이드

관리자 대시보드·일정 페이지에서 사용하는 `schedules` 테이블을 Supabase에 생성하는 방법입니다.

## 실행 순서 (필수)

Supabase Dashboard → **SQL Editor**에서 아래 순서대로 실행하세요.

### 1단계: 스키마 생성

**파일**: `29_schedules_schema.sql`

- `schedules` 테이블 생성 (id, title, assignee, start_date, end_date, sessions_count, note, checklist, status, created_at, updated_at)
- 인덱스 생성 (assignee, start_date, status, updated_at)
- `set_updated_at` 트리거 (없으면 함수 생성 후 트리거 연결)
- RLS 활성화 (정책은 2단계에서 적용)

**실행 방법**

1. Supabase Dashboard 로그인
2. 왼쪽 메뉴 **SQL Editor** 클릭
3. **New query** 선택
4. `sql/29_schedules_schema.sql` 파일 내용 전체 복사 후 붙여넣기
5. **Run** (또는 Ctrl+Enter) 실행
6. 결과에 `Schedules schema (29) created successfully.` 가 나오면 성공

### 2단계: RLS 정책 적용

**파일**: `30_schedules_rls.sql`

- 로그인 사용자(`auth.uid() IS NOT NULL`)만 schedules 테이블 CRUD 가능

**실행 방법**

1. SQL Editor에서 **New query** 선택
2. `sql/30_schedules_rls.sql` 파일 내용 전체 복사 후 붙여넣기
3. **Run** 실행
4. 결과에 `Schedules RLS (30) applied.` 가 나오면 성공

## 확인

- **Table Editor** → `schedules` 테이블이 보이면 스키마 적용 완료
- 관리자로 로그인한 뒤 **대시보드** → 일정 요약, **일정** 메뉴 → `/admin/schedules` 에서 CRUD 동작 확인

## 참고

- `checklist` 컬럼은 JSONB, 형식: `[{"id":"uuid","text":"항목","done":false}]`
- `status`는 `'active'` | `'done'` 만 허용
- 27_centers_schema.sql 등 기존 마이그레이션은 이미 적용된 상태에서 29, 30만 실행하면 됩니다.
