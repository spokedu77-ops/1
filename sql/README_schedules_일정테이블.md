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

### 3단계: 시간·요일 컬럼 (일정 UI용)

**파일**: `34_schedules_time_fields.sql`

- `start_time`, `end_time`, `day_of_week` 컬럼 추가 (일정 드로어·테이블에서 사용)
- **실행 방법**: SQL Editor에서 파일 내용 복사 후 **Run**. 결과에 `Schedules time fields (34) applied.` 확인.

### 4단계: 상태 3단계 + 센터 연동 (필수)

**파일**: `37_schedules_status_and_center.sql`

- `status`에 `'scheduled'`(진행 예정) 추가 → `scheduled` | `active` | `done`
- **`center_id` 컬럼 추가** → 일정–센터 연결용

**이 단계를 적용하지 않으면** 앱에서 다음 오류가 납니다.

- `Could not find the 'center_id' column of 'schedules' in the schema cache`

**실행 방법**

1. SQL Editor에서 **New query** 선택
2. `sql/37_schedules_status_and_center.sql` 파일 내용 전체 복사 후 붙여넣기
3. **Run** 실행
4. 결과에 `Schedules status + center_id (37) applied.` 가 나오면 성공

**사전 요구**: `centers` 테이블이 있어야 합니다. 없으면 먼저 `27_centers_schema.sql` 실행.

### 5단계: 특정 일자만 (단회/2회기) 지원

**파일**: `38_schedules_session_dates.sql`

- `session_dates` 컬럼 추가 (DATE[]) — 4.11, 11.14처럼 특정 일자만 수업할 때 사용
- **실행 방법**: SQL Editor에서 파일 내용 복사 후 **Run**. 결과에 `Schedules session_dates (38) applied.` 확인.

## 확인

- **Table Editor** → `schedules` 테이블에 `center_id`, `start_time`, `end_time`, `day_of_week`, `session_dates` 컬럼이 보이면 적용 완료
- 관리자로 로그인한 뒤 **대시보드** → 일정 요약, **일정 및 센터관리** 메뉴 → `/admin/schedules` 에서 CRUD·센터 연결 동작 확인

## 참고

- `checklist` 컬럼은 JSONB, 형식: `[{"id":"uuid","text":"항목","done":false}]`
- `status`는 4단계 적용 후 `'scheduled'` | `'active'` | `'done'` 허용
- 27_centers_schema.sql 등 기존 마이그레이션은 이미 적용된 상태에서 **29 → 30 → 34 → 37 → 38** 순서로 실행하면 됩니다.
