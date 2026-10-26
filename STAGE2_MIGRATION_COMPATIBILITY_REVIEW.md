# Stage 2 P0 DB Migration 배포 호환성 검토

기준일: 2026-10-26
검토 대상: 최초 단일 `20261026123000_harden_spokedu_master_session_writes.sql` 설계, HEAD API, 현재 작업트리 API, Session Capture RPC, 출석 lifecycle
작업 성격: 정적 감사 및 기존 PostgreSQL QA 범위 재평가. Production DB 변경 없음.

## 결론

최초 단일 migration과 현재 작업트리 API의 **최종 함수 시그니처는 일치**했다. 그러나 신규 RPC 추가와 legacy 세션 RPC 권한 회수를 한 번에 수행해 구 API와 신 API가 공존하는 무중단 배포에는 호환되지 않았다. 후속 작업에서 이 파일은 미적용 상태를 확인한 범위 안에서 Expand `20261026115102`와 Contract `20261026115108`로 분리되었다.

또한 legacy `spokedu_master_save_session_capture(uuid,uuid,text,jsonb)`는 현재 저장소 앱 런타임 호출자는 없지만 `service_role` 실행권한이 남아 있다. 이 함수는 `capture_version`을 확인하거나 증가시키지 않고 자식 관찰 행을 전체 삭제·재삽입하므로, 호출 가능한 서버 또는 구 배포가 존재하면 v2 동시성 보호를 우회할 수 있다.

따라서 현 상태 판정은 다음과 같다.

| 필수 결과 | 판정 |
|---|---|
| `MIGRATION_BEFORE_DEPLOY_SAFE` | **NO** |
| `DEPLOY_BEFORE_MIGRATION_SAFE` | **NO** |
| 현재 artifact 그대로 무중단 배포 | **BLOCKED** |
| additive → app → revoke의 단계 배포 | **권장, 별도 migration/승인 필요** |

## CURRENT_API_RPC_MAPPING

여기서 CURRENT는 Git `HEAD` (`9d7ab5dddde64c37f00f6081e065d6e46add95b0`)의 배포 가능 코드 기준이다.

| API 경로 | 동작 | HEAD RPC | DB 시그니처 | Stage 2 migration 영향 |
|---|---|---|---|---|
| `PATCH /api/spokedu-master/sessions?id=…` | 기존 수업 저장 | `spokedu_master_save_session` | `(uuid, uuid, uuid, timestamptz, timestamptz, text, text, jsonb, jsonb) → uuid` | `service_role` EXECUTE 회수로 실패 |
| `PUT /api/spokedu-master/sessions/[sessionId]/attendance` | 출석 전체 교체 | `spokedu_master_replace_session_attendance` | `(uuid, uuid, jsonb) → void` | `service_role` EXECUTE 회수로 실패 |
| `PUT /api/spokedu-master/sessions` | 수업 완료 | `spokedu_master_complete_session` | `(uuid, uuid, uuid, timestamptz, timestamptz, text, jsonb) → uuid` | `service_role` EXECUTE 회수로 실패 |
| `POST /api/spokedu-master/sessions` | 신규 수업 생성 | `spokedu_master_create_session_with_activities` | 기존 시그니처 유지 | 직접 영향 없음. 다만 GET은 아래 신규 컬럼을 사용하지 않는 HEAD라 계속 동작 |
| `POST /api/spokedu-master/session-captures` | capture 저장 | `spokedu_master_save_session_capture_v2` | `(uuid, uuid, bigint, text, jsonb) → uuid` | 2026-10-25 capture migration이 적용되어 있다는 전제에서 영향 없음 |

즉 Stage 2 migration을 HEAD 앱보다 먼저 적용하면 조회와 신규 생성 일부는 남더라도 기존 수업 저장, 출석 저장, 완료가 권한 오류로 중단된다.

## NEW_API_RPC_MAPPING

여기서 NEW는 현재 미커밋 작업트리 기준이다.

| API 경로 | 신규 RPC | API 전달 인자 | SQL 선언 순서/형식 | 대조 결과 |
|---|---|---|---|---|
| attendance PUT | `spokedu_master_update_session_attendance_v2` | `p_owner_id`, `p_session_id`, `p_expected_version`, `p_changes` | `(uuid, uuid, bigint, jsonb) → bigint` | MATCH |
| sessions PATCH | `spokedu_master_save_session_v2` | `p_owner_id`, `p_session_id`, `p_class_id`, `p_start_at`, `p_end_at`, `p_status`, `p_memo`, `p_expected_memo_version` | `(uuid, uuid, bigint, uuid, timestamptz, timestamptz, text, text) → uuid` | MATCH. named argument이므로 API 객체 순서는 무관 |
| sessions completion PUT | `spokedu_master_complete_session_v2` | `p_owner_id`, `p_session_id`, `p_class_id`, `p_start_at`, `p_end_at`, `p_memo`, `p_attendance`, `p_expected_memo_version`, `p_expected_attendance_version` | `(uuid, uuid, bigint, bigint, uuid, timestamptz, timestamptz, text, jsonb) → uuid` | MATCH. named argument이므로 API 객체 순서는 무관 |
| capture POST | `spokedu_master_save_session_capture_v2` | `p_owner_id`, `p_session_id`, `p_expected_version`, `p_next_session_note`, `p_observation_changes` | `(uuid, uuid, bigint, text, jsonb) → uuid` | MATCH, 기존 Stage 2 capture 보호 유지 |

현재 작업트리의 세션 저장·출석·완료 경로는 신규 `*_v2`만 호출한다. 신규 수업 생성, 다음 수업, 시작 취소, 활동 변경 등 별도 의미의 RPC는 이번 교체 대상이 아니므로 그대로 남는다. v2 SQL 함수 내부에서는 기존 `spokedu_master_save_session` 및 `spokedu_master_complete_session`을 호출하지만 이는 함수 owner 권한으로 실행되는 내부 호환 호출이며 앱의 무버전 RPC 직접 호출은 아니다.

신 API를 migration보다 먼저 배포하면 다음 실패가 발생한다.

- sessions GET이 존재하지 않는 `memo_version`, `attendance_version`을 select한다. 현재 fallback은 `roster_locked_at` 누락만 인식하므로 GET 전체가 500이 된다.
- 세 v2 RPC가 존재하지 않아 PATCH/attendance/completion이 실패한다.
- 따라서 기능 flag나 dual-call fallback이 없는 현재 신 API는 구 DB와 공존할 수 없다.

## LEGACY_CAPTURE_RPC_CALLERS

저장소 전체 문자열 검색 결과:

| 위치 | 구 RPC 직접 실행 여부 | 설명 |
|---|---|---|
| `app/api/spokedu-master/session-captures/route.ts` | No | 이미 `spokedu_master_save_session_capture_v2`만 호출 |
| `supabase/migrations/20260827120000_spokedu_master_session_capture.sql` | 정의 | legacy 함수 생성 및 `service_role` grant |
| `supabase/migrations/20261025152845_harden_spokedu_master_session_capture_concurrency.sql` | 언급/신규 정의 | v2를 추가하지만 legacy 권한은 회수하지 않음. 주석도 구 앱 호환을 위해 남긴다고 명시 |
| `supabase/tests/stage2_session_capture_regression.sql` | No | v2만 직접 시험 |
| capture contract tests | 실행 아님 | 함수 정의/권한 문자열 검증 |

현재 저장소의 제품 런타임에는 legacy capture RPC 호출자가 없다. 다만 실제 Production이 어느 SHA인지, 외부 운영 스크립트나 다른 service-role 소비자가 있는지는 저장소만으로 확정할 수 없다.

legacy 함수의 우회 가능성은 **CONFIRMED**다.

- `capture_version` 예상값을 받지 않는다.
- parent record의 `capture_version`을 증가시키지 않는다.
- 해당 record의 모든 child observation을 삭제한 뒤 전달된 전체 배열을 재삽입한다.
- v2 편집과 교차 실행되면 v2의 partial change 및 충돌 감지를 거치지 않고 관찰 기록을 유실시킬 수 있다.
- 기존 migration이 `service_role`에 EXECUTE를 부여했고 후속 capture migration이 이를 회수하지 않았다.

legacy capture 권한 회수는 필요하지만, 실제 Production 구 앱이 아직 legacy 함수를 호출하지 않는다는 증거를 먼저 확보한 후 contract 단계에서 수행해야 한다.

## PRIVILEGE_TRANSITION_SAFETY

Stage 2 migration의 세 v2 함수는 생성 직후 `PUBLIC`, `anon`, `authenticated` 권한을 회수하고 `service_role`만 grant한다. 함수 본문도 `owner_id`를 검사한다. 이 최종 상태는 서버 전용 RPC 의도와 일치한다.

문제는 **회수 시점**이다.

1. migration 한 트랜잭션 안에서 신규 함수 생성과 legacy 세션 함수 세 개의 `service_role` 권한 회수가 함께 일어난다.
2. migration commit 직후부터 실행 중인 구 앱 인스턴스는 legacy RPC를 호출할 수 없다.
3. rolling deployment에서 구 인스턴스가 남아 있으면 사용자 쓰기 요청이 간헐적으로 성공/실패한다.
4. 신규 v2 함수는 내부적으로 legacy 함수를 호출한다. 함수 owner가 실행하는 내부 호출은 `service_role` grant 회수와 별개이므로 최종 신 API는 동작한다.
5. legacy capture RPC는 이번 migration에서 회수하지 않으므로 capture 우회 창은 그대로 남는다.

Supabase/PostgreSQL 함수는 기본적으로 `PUBLIC EXECUTE`가 생길 수 있으므로 최종 권한 검증은 역할별 직접 grant뿐 아니라 `PUBLIC` 상속까지 포함한 `has_function_privilege` 또는 `SET ROLE service_role` 실행 실패로 확인해야 한다. 현재 세션 legacy 함수들은 이전 migration에서 `PUBLIC/anon/authenticated`가 이미 회수된 전제라 이번 `service_role` revoke가 유효하다.

## ATTENDANCE_SNAPSHOT_SAFETY

### 상태별 규칙 대조

| 상태 | `roster_locked_at` | 허용 상태/삭제 | snapshot 영향 | 판정 |
|---|---|---|---|---|
| 일반 PREP/RUN (`scheduled`, unlocked) | null | `present`, `absent`, `null` 삭제. 신규 `pending` 금지 | upsert 시 현재 학생 이름으로 갱신 | 현재 class roster 기반 준비 데이터와 일치 |
| legacy locked scheduled | not null | 기존 snapshot 학생만 `present/absent/pending`; 삭제/추가 금지 | 기존 이름 snapshot 유지 | legacy/frozen roster 호환 목적과 일치 |
| 완료 | normally not null | API가 완료 RPC를 사용. partial RPC에서는 삭제/추가 금지, `pending` 금지 | 기존 이름 snapshot 유지 | 역사 보존과 일치 |
| 취소 | any | attendance v2가 모든 변경 거부 | 기존 행 유지 | 취소 이력 잠금과 일치 |
| 취소 해제 | 기존 save 함수가 scheduled로 복원 | 일반적으로 기존 unlocked attendance 유지 | unlocked 행은 이후 변경 시 이름 갱신 가능 | 기존 복원 계약 유지 |
| 완료 복원 | trigger/save가 `roster_locked_at=null`로 해제 | 기존 attendance는 유지하되 이후 일반 scheduled 규칙 적용 | 이후 수정/삭제 가능 | Product Contract의 복원 가능 상태와 일치하나 역사 snapshot이 다시 편집 가능한 준비 데이터가 됨 |
| 시작 취소 | `started_at=null`, `roster_locked_at=null` | attendance 보존, 이후 일반 scheduled 규칙 | 이후 수정 가능 | PD-012의 “attendance 보존”과 일치 |

### `pending` 의미

- DTO의 사용자 출석 결과에서는 `pending`을 제외하고, `roster` snapshot에는 포함한다.
- 현재 제품의 신규 다음 수업 API는 source attendance를 복제하지 않는 fresh semantics를 사용하므로 일반 신규 session에 `pending` snapshot을 만들지 않는다.
- `pending`은 과거 `spokedu_master_create_next_session_fresh`가 만든 locked scheduled snapshot 등 legacy 데이터 호환에 필요하다.
- v2 delta 함수가 `pending`을 오직 `scheduled + locked`에서만 허용하는 조건은 기존 최신 `spokedu_master_replace_session_attendance` 규칙과 동일하다.
- 완료 assertion은 locked roster에 `pending`이 하나라도 있으면 완료를 거부한다. 완료 payload는 모든 snapshot 학생을 `present/absent`로 확정해야 한다.

### 행 삭제와 snapshot

- unlocked scheduled에서 `null`은 “아직 출석 결과가 없음”으로 되돌리는 의미이며 행 삭제가 허용된다.
- locked roster 또는 completed history에서는 `null` 삭제가 금지되어 학생 식별 snapshot을 보존한다.
- 취소 중에는 편집 자체를 거부하고, 복원 후 lock이 해제된 경우에만 준비 상태 편집을 허용한다.
- 학생 soft-delete/rename은 기존 locked/completed attendance의 `student_name_snapshot`을 바꾸지 않는다.

정적 규칙은 lifecycle과 대체로 일치한다. 다만 기존 9/9 QA는 legacy locked scheduled의 `pending → present/absent`, pending 상태의 완료 거부, 취소/복원/시작 취소 후 attendance 보존을 실제 PostgreSQL에서 시험하지 않았다. 이들은 배포 전 추가 통합 검증 항목이다.

## MIGRATION_BEFORE_DEPLOY_SAFE

**NO.**

현재 migration을 먼저 적용하면 HEAD API의 세 legacy 세션 쓰기 RPC 실행권한이 즉시 사라진다. rolling deployment 또는 캐시된 구 서버 인스턴스가 남아 있는 동안 다음 기능이 실패한다.

- 기존 수업 메모/일정/취소/복원 저장
- 출석 저장
- 수업 완료

신규 컬럼이 추가되는 것 자체는 HEAD read에 호환되지만, 같은 migration의 revoke가 DB-first 호환성을 깨뜨린다.

## DEPLOY_BEFORE_MIGRATION_SAFE

**NO.**

신 API는 세 v2 RPC뿐 아니라 sessions GET의 두 신규 version 컬럼에도 즉시 의존한다. migration 전 DB에서는 목록 GET이 500이 되고 모든 변경 RPC가 존재하지 않는다. 현재 코드에는 구 DB용 fallback이나 feature flag가 없다.

## RECOMMENDED_DEPLOY_ORDER

현재 단일 migration을 그대로 사용하는 동시/rolling 배포는 권장하지 않는다. 안전한 순서는 expand/contract 방식이다.

1. **사전 확인**
   - Production의 실제 앱 SHA와 capture API가 이미 v2인지 확인한다.
   - `pg_get_function_identity_arguments`, `has_function_privilege`, 두 version 컬럼 존재 여부를 read-only로 확인한다.
   - 최근 서버 로그 또는 RPC telemetry에서 네 legacy 세션/capture 함수 호출자를 확인한다.
2. **Expand DB 단계**
   - 두 version 컬럼과 세 신규 세션 v2 RPC만 추가한다.
   - 신 RPC의 `PUBLIC/anon/authenticated`를 회수하고 `service_role`을 grant한다.
   - 이 단계에서는 세 legacy 세션 RPC 및 legacy capture RPC의 `service_role` 권한을 아직 유지한다.
   - 실제 service-role/PostgREST 경로에서 신규 RPC discoverability와 반환 타입을 smoke test한다.
3. **신 API 배포**
   - version 컬럼을 읽고 세션 쓰기에는 v2만 호출하는 앱을 배포한다.
   - 모든 인스턴스가 새 SHA로 교체될 때까지 legacy 권한을 유지한다.
4. **전환 검증**
   - GET, 메모 저장, 부분 출석 저장, 완료, capture 저장의 실제 API smoke test를 수행한다.
   - 409/5xx 및 legacy RPC 호출 지표를 확인한다.
5. **Contract DB 단계**
   - 구 인스턴스가 없고 legacy 호출량이 0임을 확인한 뒤 세 legacy 세션 RPC의 `service_role` 권한을 회수한다.
   - Production 앱/외부 소비자가 legacy capture를 사용하지 않음을 확인한 뒤 `spokedu_master_save_session_capture(uuid,uuid,text,jsonb)`의 `service_role` 권한도 회수한다.
   - 함수 정의는 v2 내부 호출 및 rollback 호환 때문에 즉시 drop하지 않는다.
6. **최종 검증**
   - `SET ROLE service_role` 또는 동등한 실제 호출로 legacy 네 함수가 permission denied이고 v2 네 함수는 실행 가능함을 확인한다.
   - rollback은 legacy 권한을 임시 복원한 후 구 앱을 되돌리는 순서로만 수행한다.

현재 migration은 아직 미커밋이므로 기술적으로 expand와 contract를 별도 migration으로 구성할 수 있지만, 본 감사에서는 파일을 수정하거나 신규 migration을 만들지 않았다.

## 기존 PostgreSQL 9/9 결과의 범위

| 검증 항목 | 9/9 포함 여부 | 비고 |
|---|---|---|
| 신규 attendance/memo/completion RPC 직접 호출 | Yes | `pg.Client`로 직접 SQL 호출 |
| 신규 RPC 동시성/40001/rollback | Yes | 간소화한 prerequisite schema 및 legacy 함수 위에서 검증 |
| 세 legacy 세션 RPC의 `service_role` 권한 메타데이터 | Yes | `has_function_privilege=false` 확인 |
| legacy 함수 실제 호출이 permission denied인지 | No | `SET ROLE service_role` 실행 시험 없음 |
| PostgREST/Supabase `.rpc()` named-argument 호출 | No | API 계층 미포함 |
| HEAD API → migration 후 DB | No | 배포 전환 미시험 |
| 신 API → migration 전 DB | No | 배포 전환 미시험 |
| 구·신 서버 인스턴스 혼재 | No | rolling deployment 미시험 |
| legacy capture RPC 차단/우회 | No | capture schema와 함수가 QA fixture에 없음 |
| pending/cancel/restore/undo lifecycle | No | 해당 시나리오 미포함 |
| 전체 실제 production migration chain | No | 기존 warmup bootstrap 오류로 별도 BLOCKED |

따라서 9/9 PASS는 신규 세션 RPC 핵심 동시성의 유효한 증거지만, 배포 호환성 또는 capture legacy 차단까지 PASS했다는 의미는 아니다.

## REMAINING_BLOCKERS

1. **P0 배포 호환성:** 현재 단일 migration은 DB-first와 app-first 모두 안전하지 않다. expand/contract 분리가 필요하다.
2. **P0 capture 우회:** legacy capture RPC의 `service_role` 권한이 남아 있다. 실제 구 호출자 부재 확인 후 별도 contract revoke가 필요하다.
3. **Production 상태 미확인:** 실제 배포 SHA, migration 적용 목록, 함수 ACL/default privileges, 외부 service-role 소비자를 확인하지 않았다.
4. **PostgREST 전환 미검증:** 신규 함수 schema cache 반영과 named-argument RPC를 staging에서 실제 API로 확인해야 한다.
5. **추가 lifecycle DB QA:** locked pending, 완료 거부, 취소/복원, 시작 취소의 attendance 보존을 실제 PostgreSQL에서 추가 검증해야 한다.
6. **전체 migration bootstrap:** 기존 `20260312000000_warmup_composite_id_pattern_index.sql` 선행 객체 부재로 fresh chain 검증이 막혀 있다.

## 최종 판단

- 함수 시그니처 정합성: **PASS**
- 신 API의 대상 세션 쓰기 RPC 전환: **PASS**
- 현 migration의 무중단 배포 호환성: **FAIL / BLOCKED**
- attendance snapshot 정적 계약: **CONDITIONAL PASS**, 미실행 lifecycle DB 시나리오 존재
- legacy capture 보호: **FAIL**, 런타임 호출자는 없으나 실행권한 기반 우회 가능
- Production 적용 승인 가능 상태: **NO**

Production DB 변경, commit, push, 배포는 수행하지 않았다.

## 참고 자료

- Supabase Database Functions: https://supabase.com/docs/guides/database/functions
- Supabase API 보안 및 default privileges: https://supabase.com/docs/guides/api/securing-your-api
