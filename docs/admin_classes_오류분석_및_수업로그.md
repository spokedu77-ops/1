# 수업 관리 페이지 오류 대비 분석 + 수업 로그(김민창 외 미기록) 원인

## 1. 수업 관리 페이지에서 생길 수 있는 오류·에러 대비

### 1.1 데이터/렌더링

| 구간 | 위험 요인 | 대비 현황 |
|------|-----------|-----------|
| **eventContent** | 이벤트별 `extendedProps`/start/end null·이상 데이터 | ✅ 방어 코드 적용됨 (try-catch, 기본값, Invalid Date 처리). 한 이벤트 실패 시 해당 건만 폴백 렌더. |
| **handleEventClick** | `info.event.start`/`end` 없음 | ⚠️ `if (!startObj \|\| !endObj) return` 으로 모달 자체는 안 열림. 사용자에게 "수업을 선택할 수 없습니다" 등 안내 없음. |
| **useClassManagement** | sessions 조회 시 `s.users` null (created_by에 해당 users 없음) | `teacherId: s.users?.id \|\| ''` 로 빈 문자열 가능. 이후 연기/수동완료 시 teacherId가 ''이면 로그·카운트 미반영. |

### 1.2 수정/삭제/연기

| 구간 | 위험 요인 | 대비 현황 |
|------|-----------|-----------|
| **handleUpdate** | `editFields.date` / `start`/`end` 파싱 실패 | `split('-').map(Number)` → NaN 가능. `new Date(y, m-1, d, hh, mm)` Invalid Date 시 DB에 잘못된 start_at/end_at 들어갈 수 있음. |
| **handleUpdate** | `editFields.teachers[0]` 없음 | `mainT?.id` 체크로 강사 없으면 alert 후 return. ✅ |
| **updateStatus('deleted')** | 삭제 실패 시 모달만 닫힘 | catch에서 alert 표시. ✅ |
| **updateStatus('finished')** | `teacherId`가 빈 문자열이거나 auth.users에 없는 UUID | 로그 INSERT가 FK(23503)로 실패. 23505(유니크)만 처리하고 23503은 무시 → **해당 강사만 로그 미기록** (아래 2절과 동일 이슈). |
| **handlePostponeCascade / handleUndoPostpone** | `group_id` 없음 | alert('그룹 정보가 없습니다.') 후 return. ✅ (복제 시 group_id 부여하는 수정으로 신규 복제본은 해결됨) |
| **handleShrinkGroup** | group_id·roundIndex 없음 | alert 후 return. ✅ |

### 1.3 복제

| 구간 | 위험 요인 | 대비 현황 |
|------|-----------|-----------|
| **handleCloneGroup** | `baseSession.start`/`end` Invalid Date | `getTime()` NaN → duration NaN → 복제된 end_at 이상할 수 있음. |
| **handleCloneGroup** | 수동 모드에서 `cloneDates` 빈 값/잘못된 날짜 | `new Date(dateStr)` Invalid Date 가능. |

### 1.4 자동 완료(autoFinishSessions)

| 구간 | 위험 요인 | 대비 현황 |
|------|-----------|-----------|
| **세션 조회** | `created_by` null인 세션 다수 | `teacherCounts[s.created_by]` 에 undefined 키 쌓임. users.update 시 undefined로 조회·업데이트 시도 가능. |
| **로그 일괄 INSERT** | teacher_id가 auth.users에 없으면 FK(23503) | 한 건씩 INSERT로 fallback하지만, 실패한 건은 조용히 스킵 → **해당 강사는 로그만 안 찍힘** (2절과 동일). |
| **session_count 업데이트** | 같은 teacherId에 대해 동시에 여러 번 업데이트 | 여러 탭/중복 실행 시 race 가능. 5분 간격이라 완전 제거는 어렵고, 유니크(session_id)로 로그 중복은 방지됨. |

### 1.5 제안하는 추가 방어

- **handleEventClick**: `startObj`/`endObj` 없을 때 `alert('이 수업은 편집할 수 없습니다.')` 등 안내.
- **handleUpdate**: `editFields.date`/`start`/`end` 파싱 후 `Number.isFinite(y) && ...` 등으로 유효성 검사 후 Invalid Date면 저장 차단 + alert.
- **handleCloneGroup**: `baseSession.start`/`end`로 Date 생성 후 `Number.isNaN(date.getTime())` 체크.
- **autoFinishSessions**: `teacherCounts` 순회 시 `teacherId`가 빈 문자열이거나 null이면 해당 건 스킵 (users.update/session_count_logs 모두).

---

## 2. 수업 로그가 “김민창선생님 말고는 안 찍히는” 이유

### 2.1 수업 로그가 찍히는 경로

- **자동 완료**: `app/admin/classes/page.tsx` 의 `autoFinishSessions`  
  - 종료 시각 지난 수업을 `finished`로 바꾸고, `session_count_logs`에 INSERT (`teacher_id` = `session.created_by`).
- **수동 완료**: 같은 파일의 `updateStatus('finished')`  
  - `session_count_logs`에 INSERT (`teacher_id` = `selectedEvent.teacherId`).

두 경로 모두 **teacher_id**로 `session_count_logs`에 한 건씩 넣는다.

### 2.2 DB 제약

- `sql/04_create_session_count_logs.sql` 에서:
  - `session_count_logs.teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- 즉 **teacher_id는 반드시 auth.users(id)에 존재하는 UUID**여야 INSERT가 성공한다.

### 2.3 앱에서 쓰는 teacher_id

- `useClassManagement`에서: `teacherId: s.users?.id || ''`  
  - 여기서 `users`는 `sessions.created_by`로 조인한 **public.users** 행.
- 수업 생성/수정 시 `created_by`에는 **public.users.id**가 들어감 (예: class/create, admin/classes 수정).
- 따라서 **앱이 넣는 teacher_id = public.users.id** 이다.

### 2.4 왜 김민창만 찍히나

- **session_count_logs.teacher_id**는 **auth.users(id)** 를 참조한다.
- **김민창선생님**은 아마 **Supabase Auth로 로그인한 계정**이라 `public.users.id` = `auth.users(id)` 일 가능성이 높다.  
  → 그의 teacher_id만 auth.users에 있어서 로그 INSERT가 성공한다.
- **다른 강사**는:
  - Auth 없이 **public.users에만** 추가되었거나,
  - 다른 시스템/마이그레이션으로 **auth.users와 다른 UUID**로 들어갔을 수 있다.  
  → 이들의 `users.id`를 teacher_id로 쓰면 **auth.users(id) FK 위반(23503)** 으로 INSERT가 실패한다.
- 자동 완료에서는 일괄 INSERT 실패 시 한 건씩 INSERT하고, 실패한 건은 스킵만 하므로 에러는 안 나지만 **해당 강사 로그는 안 쌓인다**.
- 수동 완료에서는 `logError?.code === '23505'` 만 처리하고, **23503(FK)은 처리하지 않아** 같은 결과: 해당 강사는 로그 미기록, session_count만 올라갈 수 있다.

정리하면, **“수업 로그는 auth.users(id)에 있는 강사에게만 기록된다”** 고 보면 되고, 김민창선생님만 Auth 쪽에 있어서 그분만 찍히는 상황으로 보는 것이 타당하다.

### 2.5 해결 방향

1. **스키마 변경 (권장)**  
   - `session_count_logs.teacher_id`를 **auth.users(id)** 대신 **public.users(id)** 로 참조하도록 변경.  
   - 그러면 “수업 담당 강사”를 public.users 기준으로 통일할 수 있어, Auth 로그인 여부와 관계없이 수업 로그가 모두 찍힌다.  
   - 단, public.users.id가 현재 Auth와 1:1로 맞춰져 있는지, 다른 테이블에서 auth.users를 참조하는 정책이 있는지 확인 후 진행해야 한다.

2. **Auth 쪽 정합성 유지**  
   - 로그인이 필요한 강사는 모두 Supabase Auth로 계정을 만들고, public.users.id = auth.users(id) 로 동기화되게 유지.  
   - 그러면 현재 스키마 그대로도 해당 강사들은 로그가 찍힌다. (이미 김민창만 되는 이유와 동일)

3. **앱에서 23503 처리**  
   - 로그 INSERT 실패 시 `logError?.code === '23503'` 인 경우 사용자에게 “이 강사는 수업 로그에 기록되지 않습니다 (Auth 미등록).” 같은 안내를 주면, 원인 파악과 보정에 도움이 된다.

---

## 3. 요약

- **수업 관리 페이지**: eventContent는 방어 적용됨. 클릭(모달), 수정(날짜/시간 파싱), 복제(날짜 유효성), 자동 완료(created_by null/빈 값) 쪽에 추가 방어와 안내를 두면 오류 대비에 좋다.
- **수업 로그가 김민창선생님 말고 안 찍히는 이유**: `session_count_logs.teacher_id`가 **auth.users(id)** 를 참조하는데, 다른 강사는 **public.users에만 있고 auth.users에는 없어서** INSERT 시 FK(23503)로 실패하고, 실패한 건은 스킵되기 때문이다.  
  해결은 `teacher_id`를 public.users(id)로 참조하도록 바꾸거나, 해당 강사들을 Auth와 동기화하는 방식으로 정합성을 맞추는 것이다.
