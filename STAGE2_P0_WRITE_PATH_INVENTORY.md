# Stage 2 P0 쓰기 경로 인벤토리

기준일: 2026-10-26
범위: 수업 출석, 수업 메모/상태, 수업 완료, 수업 캡처
판정 기준: UI → Provider → API → 권한 → RPC/SQL → 테이블 → 응답 → UI

## 런타임 경로

| 데이터 | UI/호출자 | 클라이언트/API | DB 진입점 | 보호 장치 | 판정 |
|---|---|---|---|---|---|
| 출석 개별 변경 | `SessionDetailSheet` → `useSessionAttendance` | `OperationalDataProvider.saveSessionAttendance` → `PUT /api/spokedu-master/sessions/[sessionId]/attendance` | `spokedu_master_update_session_attendance_v2` | owner/capability 검사, `attendance_version`, 행 잠금, 부분 delta, 잠긴 명단 검사, 409 | 안전화 완료 |
| 수업 메모·시간·상태 저장 | `SessionDetailSheet.persist/startSession` | `OperationalDataProvider.saveSession` → `PATCH /api/spokedu-master/sessions` | `spokedu_master_save_session_v2` | owner/capability 검사, `memo_version`, 행 잠금, 409 | 안전화 완료 |
| 수업 완료 | `SessionDetailSheet` → `completeSessionWithCapture` | `OperationalDataProvider.completeSession` → `PUT /api/spokedu-master/sessions` | `spokedu_master_complete_session_v2` | capture 저장 선행, 출석 flush, memo/attendance 양쪽 버전 검사, 단일 DB 트랜잭션, 409 | 안전화 완료 |
| 수업 캡처 | `SessionCapturePanel` | `POST /api/spokedu-master/session-captures` | `spokedu_master_save_session_capture_v2` | 기존 `capture_version`, 낙관적 잠금, 409, `(owner_id, session_id)` upsert | 기존 보호 유지 |
| 수업 시작/되돌리기 | `SessionDetailSheet.startSession` | `/sessions/[sessionId]/start` | 직접 update / `spokedu_master_undo_session_start` | 시작 전 출석 flush, owner/capability 검사 | 범위 내 회귀 확인 |
| 다음 수업 생성 | `NextSessionSheet` | `/sessions/[sessionId]/next` | `spokedu_master_create_next_session_v2` 또는 legacy create | owner 검사, 충돌 검사 | Stage 2 변경 없음 |
| 활동 추가·삭제·순서·완료 | session activity UI | `/sessions/[sessionId]/programs/*` | 전용 RPC들 | owner/capability 및 상태 검사 | Stage 2 변경 없음 |
| 보호자 공지 | session detail | `/sessions/[sessionId]/parent-notice` | `spokedu_master_sessions` update | owner/capability 검사 | Stage 2 변경 없음 |
| 레거시 수업 기록 | report/class-record UI | `/api/spokedu-master/class-records` | `spokedu_master_class_records` | owner 필터 | 캡처 경로와 별도; Stage 2 변경 없음 |

## 데이터 소유권과 실패 동작

- 서버 SSOT는 `spokedu_master_sessions`, `spokedu_master_session_attendance`, `spokedu_master_class_records`이다.
- 메모 draft와 출석 draft는 화면 로컬 상태로 유지한다. 소프트 reload 중 dirty/saving/pending 상태에서는 출석 draft를 서버 snapshot으로 교체하지 않는다.
- 출석 변경은 전체 명단 교체가 아니라 변경 학생만 전송한다. 서로 다른 학생의 편집은 stale 충돌 후 최신 버전으로 재시도하면 합쳐지고, 같은 학생의 stale 쓰기는 409로 중단된다.
- 출석 큐 실패는 `flushAttendance`에서 다시 throw되어 메모 저장·시작·완료가 이어지지 않는다. 실패한 화면 입력은 롤백하지 않는다.
- 수업 완료는 memo 및 attendance 예상 버전을 동시에 검사한다. 어느 한쪽이라도 stale이면 전체 트랜잭션이 롤백된다.
- 네트워크 재시도는 고유 attendance 키와 예상 버전으로 중복 부작용을 만들지 않는다.

## 레거시·비런타임 경로

- `scripts/smoke-spokedu-master-foundation-lockdown.sql` 및 `scripts/verify-spokedu-master-foundation-lockdown.sql`은 DB 검증용으로 legacy RPC를 직접 호출한다. 앱 런타임 호출자는 아니다.
- legacy `spokedu_master_replace_session_attendance`, `spokedu_master_save_session`, `spokedu_master_complete_session` 함수 정의는 기존 migration 및 v2 내부 호환을 위해 유지한다.
- 기존 migration에서 `PUBLIC/anon/authenticated` 실행권한이 제거되어 있고, 이번 migration에서 `service_role`의 legacy 실행권한을 제거했다. 실 PostgreSQL의 `has_function_privilege` 결과는 세 함수 모두 `false`였다.
- v2 함수는 `SECURITY DEFINER`, 고정 `search_path`, 함수 내부 owner 검사를 사용하고 `service_role`에만 명시적으로 실행권한을 부여한다.

## 권한 회귀

`app/lib/server/spokeduMasterAccess.ts` 기준 Lite와 Premium 모두 attendance/records capability가 `true`이고 서버 API는 해당 capability를 다시 검사한다. Free/비인가 사용자의 기존 제한은 변경하지 않았다.
