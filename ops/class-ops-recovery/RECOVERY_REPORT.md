# Class Ops 보조강사·연기 P0/P1 복구 결과

## 후속 게시 승인 기록 — 2026-10-30 KST

초기 로컬 QA 보고 이후 사용자가 테마별 커밋·푸시·CI 검수와 준비된 SQL의 운영 적용을 명시적으로 승인했다. 승인된 함수 DDL만 운영에 적용했고 migration 이력 `20261029171409_classops_assistant_postpone_recovery`를 확인했다. 로컬 파일 번호도 실제 원격 이력과 일치시켰다. 아래의 SQL 미적용/NONE 표기는 **초기 로컬 QA 시점의 기록**이다. 운영 데이터 6건·254건 보정은 승인 범위에 없으며 실행하지 않았다. 전체 인증/저장 E2E 미실행 제한도 그대로다.

작성 기준: 2026-10-30 KST. 기준 HEAD: `a8a93158375d8e664cda1dddd60bc547e749ba71`.

## 판정

아래 PASS는 로컬 코드·격리 PostgreSQL·실제 관리자 DOM에서 확인한 범위다. 운영 적용 완료나 운영 저장 E2E 통과를 뜻하지 않는다.

| 항목 | 결과 | 근거 |
|---|---|---|
| ASSISTANT_2_REGISTRATION | PASS | 세션별 draft, 0→1→2, 보조2만 변경, 보조1 삭제 후 재배치, 중복 차단, 0원 유지, 재조회·새로고침 |
| ASSISTANT_METADATA_PRESERVATION | PASS | EXTRA_TEACHERS JSON 값만 교체; 앞뒤 메모·스냅샷·다른 메타데이터 바이트 보존 단위/DB 테스트 |
| POSTPONE_SINGLE_WEEKDAY | PASS | 실제 RPC 연기·복구와 일정·회차·메인/보조 금액 대조 |
| POSTPONE_TWO_WEEKDAYS | PASS | 실제 RPC에서 도착 요일의 메인·보조1·보조2 및 금액 승계 |
| POSTPONE_ASSISTANT_ASSIGNMENT | PASS | 사용자가 승인한 도착 요일 기준 적용; 원래 회차 메모의 나머지 부분 보존 |
| POSTPONE_UNDO | PASS | 원래 일정·배정·금액·메모 복구; 이후 수정·복구 충돌 시 전체 롤백 |
| POSTPONE_MILEAGE_ATOMICITY | PASS | 공휴일 가산 0P, 연기 요청 -5000P, 원 지급/역정산, 지급 중간 실패 원자성 |
| POSTPONE_CONCURRENCY | PASS | 다른 요청 키의 두 관리자 요청은 stale 차단; 같은 키는 재실행 없이 응답 재생 |
| SCHEDULE_FAILURE_ROLLBACK | PASS | 실패한 일정 저장 뒤 회차 재정렬 0건; conflict/RLS/network/stale 입력 유지 |
| LEGACY_RECORD_PROTECTION | PASS | 스냅샷 없거나 구형/손상된 기록의 자동 복구 차단; 운영 6건·254건 무변경 |
| RELEASE_READY | NO | 운영 SQL 미적용. 운영 반영 승인 및 실제 인증→API→DB까지 연결된 배포 전 통합 확인이 필요함 |

## 수정 내용

- 보조 추가·ID 선택·금액 변경·삭제는 로컬 draft만 변경한다. 명시적 **보조 저장** 전에는 쓰기 요청하지 않는다.
- 서버에서 UUID·중복·금액·강사 존재를 검증한다. 세션의 시작/종료/메인/메모/금액/상태 전체를 조건부 UPDATE에 포함해 동시 수정을 감지한다.
- 성공 응답은 실제 저장 행이며, 클라이언트는 그룹을 다시 조회한 후 반영한다. 재조회 실패는 저장 실패와 구분해 재저장 전에 확인하도록 안내한다.
- 일정 저장 함수는 성공 여부를 반환한다. 실패하면 후속 회차 재정렬을 실행하지 않는다.
- 일괄 수정에도 기존 상태를 전달한다. 새 CAS wrapper가 잠금과 상태 검사를 수행한 뒤 기존 Stage 2C RPC를 호출한다. 기존 Stage 2C RPC·충돌 트리거 자체는 변경하지 않았다.
- 연기 RPC는 완료/검수 회차 및 연쇄 대상의 완료/검수 회차를 차단한다. 보조 배정·금액은 승인된 도착 요일 기준으로 승계한다.
- 신규 스냅샷은 원래/이동 후 메모를 포함한다. 복구 시 이후 메모·배정 변경도 감지한다. 구형 스냅샷에 값을 추정해 채우지 않는다.
- Stage 2A·2B·2C 원본, 마일리지 정책, 인증·RLS, 운영 데이터는 변경하지 않았다.

## 실행한 QA

| 검증 | 결과 |
|---|---|
| 관련 Vitest/계약 테스트 | 19 files, 112 tests PASS |
| 복구 전용 PostgreSQL 테스트 | 27 cases PASS; 운영 RPC 원본으로 두 결함 재현 후 수정 SQL 검증 |
| 기존 Stage 2A PostgreSQL 회귀 | PASS |
| 기존 Stage 2C PostgreSQL 회귀 | PASS |
| TypeScript / Production Build | PASS |
| 실제 관리자 DOM | 1440 / 390 / 375px PASS; 각 폭 저장 요청 9건, 그룹 재조회 6건, 실패 후 재정렬 0건 |
| 읽기 전용 운영 재확인 | 빈 ID 포함 6행의 상태·memo MD5·카운팅 행 수 동일; 스냅샷 없는 연기 254건 동일 |
| Git diff whitespace | 변경한 기존 파일 PASS |

UI 테스트는 실제 `/admin/classes/calendar`와 `ClassBundlePanel`을 렌더링했다. 인증·조회·저장 응답은 테스트 fixture로 가로채며, 운영 인증 세션 생성과 운영 쓰기를 실행하지 않는다. 자동 완료 요청도 가로챘다. 실제 API 처리 계약은 Vitest, 실제 쓰기·충돌·카운팅·마일리지·동시성은 독립 PostgreSQL에서 검증했다. 이 세 계층을 하나의 실제 HTTP 인증/DB 연결로 묶은 전체 E2E는 실행하지 않았으므로 그 범위의 PASS를 주장하지 않는다.

각 실패 테스트는 `sessions`, `session_count_logs`, `mileage_logs`, `users.points` 전체 스냅샷을 비교했다. 마일리지 일부 지급 이후의 주입 실패 및 복구 시 충돌도 원자적으로 롤백됐다. 3개 이상 운영 요일은 임의로 추정하지 않고 `POSTPONE_WEEKDAY_TEMPLATE_AMBIGUOUS`로 변경 없이 차단한다.

## 변경 파일 영향표

| 파일 | 범위 |
|---|---|
| `app/admin/classes/components/ClassBundlePanel.tsx` | assistant draft·저장/취소·오류 표시, 안전한 메모 교체, 성공 게이트, 역사 복구 UI |
| `app/admin/classes-shared/lib/sessionMetadata.ts` | JSON metadata span 탐색·EXTRA_TEACHERS 교체·중복/금액 검증·복구 가능성 판별 |
| `app/admin/classes-shared/lib/sessionMetadata.test.ts` | 메모·스냅샷 보존 및 검증 회귀 |
| `app/api/admin/classes/sessions/checked-update/route.ts` | 기존 requireAdmin을 사용하는 단건 조건부 저장·실제 저장 행 반환 |
| `app/api/admin/classes/sessions/checked-update/route.test.ts` | 권한·무효 입력·CAS·0원·RLS·네트워크 오류 계약 |
| `app/api/admin/classes/sessions/bulk-update/route.ts` | expected가 있는 요청만 CAS wrapper로 분기; 기존 호출 호환 |
| `app/api/admin/classes/postpone/route.ts` | 구형 스냅샷 별도 검토 오류의 안전한 공개 코드 추가 |
| `app/admin/classes/lib/teacherScheduleConflict.contract.test.ts` | 기존 직접 UPDATE 대신 인증된 단건/일괄 CAS 경로 확인 |
| `supabase/migrations/20261029171409_classops_assistant_postpone_recovery.sql` | 승인 후 운영 적용한 SQL. 메모 보존 helper, 연기 RPC 수정, 기존 Stage 2C 위임 wrapper. 데이터 보정/일괄 UPDATE 없음 |
| `scripts/class-ops-recovery-postgres-qa.mjs` | 루프백 전용 독립 DB 생성·27개 실제 트랜잭션 검증·테스트 DB 정리 |
| `scripts/class-ops-recovery-ui-qa.mjs` | 실제 관리자 DOM PC/모바일 상호작용과 의도하지 않은 쓰기 차단 |
| `ops/class-ops-recovery/fixtures/production-*.sql` | 읽기 전용으로 확보한 운영 함수 원본. 격리 재현용이며 운영 적용 대상 아님 |

센터·정산·MASTER·공개 페이지 등 기존/병행 미커밋 작업은 수정 대상에서 제외했다. 작업 중 같은 모달 파일의 외부 덮어쓰기를 확인했고 사용자에게 알린 뒤, 현재 파일이 수정 상태로 유지되는 것을 재확인했다.

## 운영 빈 ID 6행: 개별 조사 목록과 변경 전제

아래 행은 조사 대상으로만 등록했다. 빈 ID는 총 7개 슬롯이며 어떤 행도 삭제·보정하지 않았다. 수업료 0원은 그대로 보존해야 한다.

| session ID | 상태 / 실제 배정·카운팅 확인 | 개별 계획 — 실행 전 별도 승인 필요 |
|---|---|---|
| `429a37b6-90a1-4a3b-90ae-8b1f3d1dd4ce` | opened, 메인만 유효, 빈 보조1, 카운팅 0 | 원 배정 의도 확인. 보조 없음이 확인되면 해당 빈 슬롯만 제거; 의도된 강사가 있으면 근거 ID·금액으로 지정. 메인/일정 유지 |
| `87a1ed1e-793c-4ee1-8dfb-afb8f47dadc0` | opened, 같은 그룹의 메인만 유효, 빈 보조1, 카운팅 0 | 위 행과 별개 회차로 배정 의도 확인. 같은 그룹이라는 이유로 ID를 복사하지 않음 |
| `5d69fe5c-2db0-4e3f-b680-01d44da66e19` | finished, 유효 메인+보조1(35000원), 빈 보조2, 자동 카운팅 2 | 기존 메인·보조1·35000원 및 두 자동 로그 보존. 보조2 필요 여부만 확인. 빈 슬롯 제거만 승인되면 카운팅 변동 0을 검증; 실제 추가 배정이면 별도 실적 영향 계획 필요 |
| `f13ba7d3-8db9-4750-baba-45e37ded186c` | opened, 유효 메인, 빈 보조1·보조2, 카운팅 0 | 두 슬롯 각각의 의도 확인. 둘 다 삭제하거나 임의 강사로 채우지 않음. 0원과 메인 배정 유지 |
| `50565445-3a1a-42e8-af33-6adcf8a37ab2` | verified, 메인 자동 카운팅 1, 빈 보조1 | 검수 완료 이력 보호. 보조 없음 확인 시 빈 슬롯만 교체하고 기존 로그 ID/내용 불변 검증. 실제 보조 추가 필요 시 별도 실적·정산 영향 검토 |
| `fd6cf6f7-f038-4c8b-aeac-9e805650fb63` | verified, 메인 자동 카운팅 1, 빈 보조1 | 위 행과 독립 검토. 원 실적·메인 수업료 보존; 근거 없이 보조 배정이나 카운팅 생성 금지 |

재확인한 memo MD5는 opened 첫 두 행 및 verified 두 행 `b095f688da9892b5cee19e02ec3e6a7c`, finished 행 `7d8b593de7760227f4d76f595c7202c0`, 빈 보조 2개 행 `0cc9f4d0f8a1bd3b959992b32cf750a0`로 최초 조회와 같다.

## 증빙과 재현 명령

- `.tmp/class-ops-recovery-qa/postgres-results.json`
- `.tmp/class-ops-recovery-qa/ui-results.json`
- `.tmp/class-ops-recovery-qa/assistant-failed-save-{1440,390,375}.png`
- `.tmp/class-ops-recovery-qa/assistant-legacy-safety-{1440,390,375}.png`

```powershell
node scripts/class-ops-recovery-postgres-qa.mjs
node --import tsx scripts/class-ops-recovery-ui-qa.mjs
node node_modules/vitest/vitest.mjs run app/admin/classes-shared app/admin/classes/lib app/admin/classes/calendar/lib app/api/admin/classes app/lib/teacherTierSchedule.test.ts
node node_modules/typescript/bin/tsc --noEmit --pretty false
node node_modules/next/dist/bin/next build
```

PostgreSQL 기본 접속은 전용 로컬 `127.0.0.1:55432`다. 외부 DB URL은 거부하며 `.env.local` DB URL을 읽지 않는다. 실행마다 독립 DB만 생성·삭제한다.

## REMAINING_RISKS

1. 신규 SQL은 로컬 격리 DB에서만 적용했다. 운영에서는 기존 RPC가 유지 중이며, 새 일괄 CAS wrapper도 아직 없다. 따라서 **SQL 적용 전에 변경 UI를 단독 출시하면 안 된다.** SQL 승인·적용 후 UI를 배포해야 한다.
2. 실제 인증→HTTP API→DB→화면을 연결한 배포 전 통합 확인은 별도로 남아 있다. fixture UI 검증과 실제 PostgreSQL 검증을 전체 E2E로 포장하지 않는다.
3. 빈 ID 6행 및 스냅샷 없는 연기 254건은 의도적으로 미보정 상태다. 자동 복구/일괄 정리하지 않는다. 3개 이상 운영 요일 및 메모 기준이 없는 구형 스냅샷은 개별 검토가 필요하다.

`PRODUCTION_MUTATION: NONE`. Git stage·commit·push 및 배포 미실행. 운영 SQL 미적용은 최종 읽기 전용 조회에서도 확인했다.
