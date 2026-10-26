# STAGE2_CUTOVER_PREFLIGHT

기준일: 2026-10-26
범위: 애플리케이션·Vercel 배포 호환성 및 격리 PostgreSQL 리허설
Production DB 변경/Commit/Push/Deploy: 수행하지 않음

```text
STAGE2_CUTOVER_PREFLIGHT

EXPAND_SQL_SHA: A2F1EE46DDCF283C54F49873DC5DDC3886A0624B40B7AFA5BEC3318B1510E986
CONTRACT_SQL_SHA: 55C5EC1093EC17394AFC3C6249D7DF8321819EF26B4BC11557FEC8D8CE30CD9D
SOURCE_COMMIT_SHA: 9d7ab5dddde64c37f00f6081e065d6e46add95b0
CURRENT_DEPLOYMENT_SHA: 9d7ab5dddde64c37f00f6081e065d6e46add95b0
TARGET_DEPLOYMENT_SHA: BLOCKED — Stage 2 변경이 미커밋 상태이며 다른 사용자 변경과 같은 worktree에 존재

WRITE_GATE_READY: CODE READY / DEPLOYMENT BLOCKED — DB trigger gate + 앱 503 매핑 구현·로컬 검증, 아직 운영 미배포
WRITE_GATE_ALL_INSTANCES: DATA ENFORCEMENT YES AFTER EXPAND; EXPLICIT 503 REQUIRES GATE-AWARE APP — DB 경계는 구/신 API·직접 URL·service-role SQL 모두 차단
INFLIGHT_DRAIN_VERIFIED: YES — shared/exclusive transaction advisory lock 대기 및 drain 재현
BACKGROUND_WRITERS_CHECKED: PARTIAL — 저장소 내 관련 Vercel cron/queue 없음; 저장소 밖 작업은 확인 불가
EXTERNAL_SERVICE_ROLE_CONSUMERS: BLOCKED — Production secret consumer/외부 자동화 inventory 필요
ATOMIC_TRAFFIC_SWITCH_READY: NO — staged production + promote 절차 및 auto-domain-assignment 비활성화 증빙 필요
LEGACY_CALL_OBSERVABILITY: BLOCKED — Production RPC별 호출량/로그 지표 없음
LEGACY_CAPTURE_BYPASS_COVERED: YES — 우회 재현 후 Gate 55P03 및 Contract 42501 차단 검증

EXPAND_STAGING_QA: PASS — 구 API/신 API, 기본 version, ACL, Gate false 기본값 검증
MIXED_VERSION_RISK_CONTROLLED: CONDITIONAL — Gate 활성화·drain 이후에만 통제됨
CONTRACT_STAGING_QA: PASS — 신규 API 정상, legacy 4 RPC 실제 role 호출 42501
ROLLBACK_PLAN_VERIFIED: PARTIAL — Contract 전 앱 복귀 가능; Contract 후 권한 선복원+Gate 유지 절차만 허용

PRODUCTION_MIGRATION_READY: NO
REMAINING_BLOCKERS: clean Stage-2-only target commit SHA; 외부 service_role 소비자 확인; legacy 호출 0 관측; Vercel staged-production/promote 및 auto assignment 설정 확인; 승인된 Gate 운영자와 Production schema precheck
```

## 1. 배포 대상과 현재 운영 배포

- 로컬 branch/HEAD: `main` / `9d7ab5dddde64c37f00f6081e065d6e46add95b0`.
- Vercel project: `spokedu` (`prj_xXzgJOr6bBGmlUFBzAygZS4PgRDA`).
- 현재 Production deployment: `dpl_CWSF92oQ5y2k2F1RTzhEzQazzsEL`, READY.
- 현재 Production commit: `9d7ab5dddde64c37f00f6081e065d6e46add95b0`.
- 현재 고유 URL: `spokedu-czq43y0u2-jihoonchois-projects.vercel.app`.
- 연결 alias: `spokedu.kr`, `www.spokedu.kr`, `spokedu.vercel.app`, project alias, main branch alias.
- 이전 Production 고유 URL과 현재 고유 URL 모두 인증 없는 Sessions GET에 HTTP 401을 반환했다. 즉 Deployment URL 자체는 직접 도달 가능하며, alias 전환만으로 구 deployment를 제거했다고 볼 수 없다. DB Gate가 이 우회 경로까지 보호한다.
- 작업트리에는 Stage 2 외 public landing/marketing 등 다수의 수정·미추적 파일이 존재한다. 현재 worktree 전체를 배포하면 사용자 작업이 혼입되므로 금지한다.
- Commit/Push 금지 조건 때문에 신규 변경을 포함한 정확한 target SHA는 아직 존재하지 않는다. Stage 2 파일만 별도 검토·선택한 뒤 승인된 commit이 생성되어야 확정할 수 있다.

### Stage 2 배포 파일 범위

- `app/api/spokedu-master/sessions/route.ts`
- `app/api/spokedu-master/sessions/[sessionId]/attendance/route.ts`
- `app/api/spokedu-master/session-captures/route.ts`
- `app/lib/server/spokeduMasterStage2WriteGate.ts`
- Stage 2 관련 contract tests
- `supabase/migrations/20261025152845_harden_spokedu_master_session_capture_concurrency.sql`
- `supabase/migrations/20261026115102_stage2_session_writes_expand.sql`
- release-gated Contract 준비본과 QA/운영 문서

일부 API 파일에는 이번 preflight 이전 Stage 2 미커밋 변경도 함께 있으므로 commit 전 hunk 단위 검토가 필요하다.

## 2. API와 RPC 매핑

| 쓰기 | API | 최종 RPC |
|---|---|---|
| 기존 Session 메모·일반 수정 | `PATCH /api/spokedu-master/sessions?id=...` | `spokedu_master_save_session_v2(uuid,uuid,bigint,uuid,timestamptz,timestamptz,text,text)` |
| 출석 delta | `PUT /api/spokedu-master/sessions/[sessionId]/attendance` | `spokedu_master_update_session_attendance_v2(uuid,uuid,bigint,jsonb)` |
| 수업 완료 | `PUT /api/spokedu-master/sessions` | `spokedu_master_complete_session_v2(uuid,uuid,bigint,bigint,uuid,timestamptz,timestamptz,text,jsonb)` |
| 학생 관찰·다음 수업 메모 | `POST /api/spokedu-master/session-captures` | `spokedu_master_save_session_capture_v2(uuid,uuid,bigint,text,jsonb)` |

위 네 보호 대상 경로는 legacy 대응 RPC를 호출하지 않는다. 신규 Session 생성, 프로그램 구성, 시작/복원 등에는 별도의 기존 RPC가 남아 있으나 v2 대체 함수가 정의된 네 경로의 legacy 우회 호출자는 아니다. Gate trigger는 이 경로들의 기반 테이블 쓰기도 함께 차단한다.

## 3. 쓰기 Gate와 drain

Expand는 다음 테이블에 동일한 BEFORE trigger를 설치한다.

- `spokedu_master_sessions`
- `spokedu_master_session_attendance`
- `spokedu_master_session_programs`
- `spokedu_master_class_records`
- `spokedu_master_class_record_students`

각 write transaction은 advisory shared lock `(742021,2)`을 보유한다. 운영자는 같은 키의 exclusive transaction lock을 획득한 뒤 Gate row를 `blocked=true`로 변경한다. exclusive lock 획득은 기존 쓰기가 commit/rollback될 때까지 대기하며, 이후 구·신 API 쓰기는 SQLSTATE `55P03`으로 실패한다. 신규 앱의 관련 Session·출석·프로그램·관찰 기록 endpoint는 이를 HTTP 503, `Retry-After: 30`, `STAGE2_CUTOVER_WRITE_GATE`로 변환한다.

현재 운영 SHA에는 이 503 변환 코드가 없으므로 Gate가 데이터를 보호하더라도 구 API 응답은 기존 일반 저장 실패 문구일 수 있다. 명확한 재시도 응답까지 충족하려면 Gate-aware 코드를 먼저 모든 활성 앱 경로에 배포했다는 증빙이 필요하다. 이 때문에 Production 준비 판정은 NO다.

Vercel 현재 함수 timeout은 inspect 결과 300초다. 운영 Gate 트랜잭션의 `lock_timeout`은 330초이며, timeout이면 Gate 활성화가 rollback되므로 전환을 중단한다. drain 완료 조건은 Gate row가 true이고 advisory `ShareLock granted`가 0인 것이다.

## 4. 백그라운드·외부 작성자

- 저장소의 `vercel.json`에는 Stage 2 세션 쓰기 cron이 없다.
- 앱 내부에서 세션 쓰기를 재생하는 서버 queue/worker는 발견하지 못했다.
- 클라이언트 재시도는 Gate 동안 DB에서 거부되며 durable server queue 증거는 없다.
- SQL smoke/QA 스크립트에는 legacy 호출이 있으나 배포 runtime이 아니다.
- 외부 service-role 스크립트, Supabase Dashboard scheduled task, 별도 CI/운영 도구는 로컬 저장소로 확인할 수 없다. Production 담당자가 반드시 inventory와 호출량을 확인해야 한다.

## 5. 원자적 트래픽 전환

권장 방식은 production 환경으로 빌드하되 domain을 할당하지 않는 staged production deployment를 생성하고, Gate/drain 후 해당 deployment를 promote하는 것이다. Vercel 문서상 staged production promote는 rebuild 없이 current deployment를 교체한다.

현재 main 배포가 자동으로 Production alias를 받은 이력이 있으므로 Auto-assign Custom Production Domains 비활성화가 확인되기 전에는 준비 완료로 판정하지 않는다. 이전 고유 Deployment URL은 계속 도달 가능하므로 이전 인스턴스 종료 여부에만 의존하지 않고 DB Gate를 유지한다. Contract 및 신규 smoke가 끝난 뒤에만 Gate를 해제한다.

## 6. 격리 리허설 결과

`scripts/spokedu-master-stage2-mixed-version-qa.mjs`가 다음을 실제 임시 PostgreSQL database에서 수행했다.

1. 구 DB에서 구 API write PASS
2. Expand 적용
3. Expand에서 구 API write PASS
4. 신 v2 write/version 증가 PASS
5. Gate 이전 혼재 overwrite와 capture bypass 재현
6. 진행 중 transaction이 shared lock을 잡은 상태에서 Gate exclusive lock 대기 확인
7. 기존 transaction commit 후 Gate 활성화 확인
8. 구 API와 신 API 모두 `55P03`, 데이터 불변 확인
9. Gate 해제 후 Contract 적용
10. 신 API 정상 및 legacy 네 RPC `42501` 확인

결과: Mixed/Cutover 10/10 PASS, 기존 동시성 회귀 9/9 PASS, 관련 Vitest 7 files/32 tests PASS, typecheck·변경 파일 ESLint·Next.js production build PASS.

## 7. 실패 복구 경계

- Expand 실패: migration transaction 결과와 객체를 확인하고 재실행하지 않는다.
- Gate exclusive lock timeout: activation transaction rollback, 트래픽 전환 금지.
- Gate 후 신규 deployment 문제: Gate를 유지한 채 domain을 기존 deployment로 되돌릴 수 있다. Contract 전이면 legacy 권한은 살아 있다.
- Contract 후: 구 API를 먼저 되돌리는 것은 금지한다. Gate를 유지하고 승인된 SQL로 필요한 legacy EXECUTE를 먼저 복원한 뒤 기존 deployment로 전환한다.
- 데이터 불변 검증 또는 legacy 호출 0 확인 실패: Contract 적용 및 Gate 해제 금지.

## 8. SQL 전달

- Expand: `supabase/migrations/20261026115102_stage2_session_writes_expand.sql`
- Contract: `supabase/contract-migrations/20261026115108_stage2_session_writes_contract.sql`
- Contract는 표준 `supabase/migrations` 디렉터리 밖에 있으므로 자동 DB push에 포함되지 않는다.
- 적용 전/후 SQL, Gate enable/disable SQL, rollback 권한 SQL은 `STAGE2_DB_HANDOFF.md`를 사용한다.

Expand SHA는 Gate 추가로 기존 보고의 `526D...`에서 `A2F1...`로 변경됐다. Contract SHA는 기존 보고와 동일하다. 새 Expand 원문과 보고서 내 원문 일치 여부를 다시 검증해야 한다.
