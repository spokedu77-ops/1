# Stage 2 P0 구현 보고서

기준일: 2026-10-26

## 완료한 변경

### 1. 독립 버전과 원자적 RPC

- `spokedu_master_sessions`에 기존 행 호환 기본값이 있는 `memo_version`, `attendance_version`을 추가했다.
- 출석 delta 저장용 `spokedu_master_update_session_attendance_v2`를 추가했다.
- 메모/수업 저장용 `spokedu_master_save_session_v2`를 추가했다.
- 완료용 `spokedu_master_complete_session_v2`는 memo와 attendance 버전을 한 행 잠금 아래 함께 검사하고 기존 완료 계약을 호출한다.
- legacy 무버전 RPC의 `service_role` 실행을 제거했다. 함수 자체는 migration/history 및 v2 내부 호출 호환을 위해 삭제하지 않았다.

### 2. API와 충돌 응답

- sessions 조회 DTO에 두 버전을 포함했다.
- PATCH와 완료 PUT이 예상 버전을 필수 전달하고 PostgreSQL `40001`을 HTTP 409로 변환한다.
- attendance API는 전체 배열 대신 `{ changes, expectedVersion }`을 받고 성공 시 새 `attendanceVersion`을 반환한다.
- 잠긴 roster는 기존 학생 상태 변경만 허용하며 삭제나 명단 밖 학생 추가를 거부한다.

### 3. 화면 draft와 저장 순서

- 출석 변경을 직렬 queue로 전송하고 성공한 delta만 Provider snapshot에 반영한다.
- pending 저장 중 서버 재조회가 로컬 출석 draft를 덮어쓰지 않는다.
- 출석 저장 오류는 화면 draft를 보존하면서 이후 저장/시작/완료를 차단한다.
- 수업 완료 전 출석 queue를 flush하고 반환된 최신 attendance version을 완료 요청에 사용한다.
- 메모 저장은 활성 수업의 `memoVersion`을 사용한다.

### 4. 기존 보호 유지

- `capture_version`, capture 409, `(owner_id, session_id)` upsert, 완료 전 capture 저장 순서를 유지했다.
- 이전 감사의 동명이인 roster 보존, 관리자 회원 강제 새로고침 변경을 유지했다.
- 요금제, navigation, 환불, SPOMOVE 의미는 변경하지 않았다.

## 변경 파일

- DB Expand: `supabase/migrations/20261026115102_stage2_session_writes_expand.sql`
- DB Contract 준비본: `supabase/contract-migrations/20261026115108_stage2_session_writes_contract.sql`
- API: sessions route, attendance route
- 클라이언트: `OperationalDataProvider`, `SessionDetailSheet`, `useSessionAttendance`, `useSessionDraft`, operational types
- 테스트: Stage 2 concurrency contract 및 기존 workflow/integrity/roster-lock 계약 정합화
- QA: `scripts/spokedu-master-stage2-p0-postgres-qa.mjs`

## 변경하지 않은 항목

- Production DB 적용, Production 데이터 변경, 배포, commit, push
- 환불·결제, 수업기록 페이지네이션, SPOMOVE 콘텐츠, 현장 도구
- 기존 migration 파일과 기존 요금제/권한 정책

## 데이터 영향

- 신규 컬럼은 `NOT NULL DEFAULT 1`이므로 기존 session 행은 파괴적 backfill 없이 버전 1에서 시작한다.
- attendance 및 class-record 행의 삭제/재작성 migration은 없다.
- 학생 이름 snapshot은 기존 행에서 재명명/soft-delete 후에도 보존된다.
- migration은 재실행 가능한 `IF NOT EXISTS` 컬럼/제약과 `CREATE OR REPLACE FUNCTION`을 사용한다.

## 복구

배포 전 롤백은 애플리케이션과 migration을 함께 조정해야 한다. 컬럼/함수를 즉시 삭제하지 말고 legacy 실행권한과 이전 앱 버전을 원자적으로 되돌린 뒤, 버전 컬럼은 데이터 보존을 위해 남기는 것이 안전하다. 실제 롤백 SQL은 운영 스키마 확인 및 별도 승인을 받은 후 작성·실행한다.
