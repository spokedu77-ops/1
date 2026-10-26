# Stage 2 P0 Expand / Transition / Contract 계획

기준일: 2026-10-26
상태: 로컬 준비 완료, Production 미적용, 승인 대기

## 파일 구조

| 단계 | 파일 | 내용 |
|---|---|---|
| Expand | `supabase/migrations/20261026115102_stage2_session_writes_expand.sql` | 두 version 컬럼/제약, 세 v2 RPC, v2 최소 권한, DB 경계 쓰기 Gate 및 drain lock |
| Transition | 애플리케이션 배포 및 트래픽 전환 | 신 API만 v2를 호출하도록 전환. DB migration 없음 |
| Contract | `supabase/contract-migrations/20261026115108_stage2_session_writes_contract.sql` | release-gated 준비본. legacy attendance/save/complete/capture RPC 실행권한 회수 |

최초 단일 파일 `20261026123000_harden_spokedu_master_session_writes.sql`은 Git 미추적, 로컬 DB migration history 미적용, 저장소 밖 적용 증거 없음으로 확인한 뒤 제거했다. 외부/Production 환경은 이 작업에서 조회하지 않았으므로 DB 담당자가 적용 전 migration history와 객체 존재 여부를 다시 확인해야 한다.

## 기존 migration 처리

- 기존 추적 migration은 수정하지 않았다.
- 최초 단일 미적용 파일의 SQL을 Expand와 Contract로 분리했다.
- Expand는 legacy 권한을 유지한다. 따라서 구 API + Expand DB는 기능적으로 동작한다.
- Contract는 네 legacy 함수 정의를 삭제하지 않고 실행권한만 회수한다. v2의 내부 owner 호출과 롤백 선택지를 보존하기 위함이다.
- Contract 준비본은 표준 migration 디렉터리 밖에 둔다. 그렇지 않으면 일반 `db push`가 Expand 직후 Contract까지 자동 적용할 수 있다. 전환 증빙과 승인을 받은 시점에 DB 담당자가 정식 migration으로 승격하거나 승인된 SQL 실행 절차로 적용한다.
- Contract는 신규 API 안정화 및 legacy 호출량 0 증빙 전에는 실행하지 않는다.

## 혼재 버전 불변식

Expand만으로는 구·신 API 혼재 쓰기가 안전해지지 않는다.

- 구 attendance RPC는 전체 교체이며 expected version을 받지 않는다.
- 신 v2 변경 후 구 요청이 도착하면 신 변경을 삭제하면서 `attendance_version`은 증가시키지 않는다.
- legacy capture도 같은 방식으로 v2 observation을 전체 삭제·재삽입하면서 `capture_version`을 증가시키지 않는다.
- 구 memo RPC 역시 expected version 없이 신 메모를 덮어쓸 수 있다.

이 정보 부재는 DB가 추론할 수 없으므로 legacy API를 자동으로 안전한 partial update로 변환할 수 없다. 지원하는 전환 방식은 다음뿐이다.

1. Expand 적용 후 신 앱을 traffic-off 상태에서 검증한다.
2. 배타 advisory lock `(742021,2)`을 획득한 같은 트랜잭션에서 DB Gate를 활성화한다. 기존 관련 쓰기의 공유 transaction lock이 해제될 때까지 자동 대기하며 이후 쓰기는 `55P03`으로 거부된다.
3. 모든 트래픽을 한 번에 신 앱으로 전환한다. rolling 방식으로 구·신 쓰기를 동시에 허용하지 않는다.
4. legacy RPC 호출량이 0인지 확인한다.
5. Contract를 적용하고 쓰기 gate를 해제한다.

읽기 서비스는 계속 제공할 수 있지만, 데이터 유실 없는 전환을 위해 짧은 쓰기 제한 구간은 필요하다. 해당 gate가 없다면 `신·구 API 혼재`는 출시 차단 조건이다.

## 운영 적용 순서

### 0. 사전 확인

- 두 신규 migration version이 Production migration history에 없어야 한다.
- 최초 단일 version `20261026123000`도 없어야 한다.
- production 함수 signatures 및 ACL이 예상과 일치해야 한다.
- `20261025152845` capture v2 migration 적용 여부와 현재 앱 SHA를 확인한다.
- 백업/복구 지점과 쓰기 gate 담당자를 확정한다.

### 1. Expand

`20261026115102_stage2_session_writes_expand.sql`만 적용한다.

- 기존 행은 두 version 모두 1로 시작한다.
- legacy 네 RPC 권한은 유지된다.
- v2는 `service_role`만 실행 가능해야 한다.
- Gate 기본값은 `blocked=false`이고 control table은 `service_role`에서도 직접 접근할 수 없어야 한다.
- 구 API smoke와 신 API staging smoke를 모두 실행한다.

### 2. Transition

- 신 앱을 배포하되 구 앱과 동시에 쓰기를 받게 하지 않는다.
- DB 담당자가 배타 advisory lock을 획득하고 Gate를 활성화해 in-flight drain을 완료한 뒤 atomic traffic switch를 수행한다.
- sessions GET, 메모, 출석 delta, 완료, capture를 확인한다.
- 409/5xx와 legacy RPC 호출을 관찰한다.

### 3. Contract

다음 증빙이 모두 있을 때만 release-gated `20261026115108_stage2_session_writes_contract.sql`을 정식 migration으로 승격·적용한다.

- 모든 앱 인스턴스가 신 SHA
- legacy 네 RPC 호출량 0
- 신 API smoke PASS
- rollback 담당자 대기
- DB 담당자 최종 승인

Contract 후 실제 `service_role` 전환으로 구 RPC 네 개가 `42501`로 거부되고 v2가 실행되는지 확인한다.

## 롤백 전략

### Expand 직후

Expand는 additive이므로 장애가 없다면 DB 객체를 제거하지 않고 구 앱을 유지하는 것이 가장 안전하다. 컬럼/함수 drop은 신 앱이 단 한 번도 배포되지 않았고 외부 호출자가 없음을 확인한 경우에만 별도 승인으로 수행한다.

### 신 앱 전환 실패

1. 쓰기 gate 유지
2. 신 앱 트래픽 제거
3. 구 앱으로 전환
4. Contract가 아직 미적용이면 구 API 재개
5. Expand 객체는 남겨 데이터 보존

### Contract 이후 앱 롤백

구 앱을 먼저 배포하면 안 된다. 먼저 legacy 세션 RPC와 필요한 capture RPC의 `service_role` EXECUTE를 명시적으로 복원한 뒤 구 앱으로 전환한다. capture 권한 복원은 version 보호 우회를 다시 여는 조치이므로 비상시에만 허용하고 즉시 추적한다.

## 승인 경계

이 저장소 작업은 SQL 파일과 테스트만 준비한다. 실제 Supabase 적용, migration history 변경, Production role grant/revoke, 배포 및 traffic gate 실행은 DB 담당자와 최종 승인자가 수행한다.
