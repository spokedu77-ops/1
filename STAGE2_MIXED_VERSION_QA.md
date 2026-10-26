# Stage 2 P0 Mixed Version QA

기준일: 2026-10-26
환경: 로컬 Supabase PostgreSQL의 테스트 전용 임시 database. 테스트 종료 후 drop.
운영 데이터 사용: 없음

## 실행 명령

```text
node scripts/spokedu-master-stage2-mixed-version-qa.mjs
node scripts/spokedu-master-stage2-p0-postgres-qa.mjs
```

## 조합별 결과

| 상태 | 결과 | 증거/해석 |
|---|---|---|
| 구 API + 구 DB | PASS | legacy save RPC를 실제 `service_role`로 호출해 memo 저장 |
| 구 API + Expand DB | PASS | 기존 memo 보존, version 기본값 1, legacy RPC 계속 실행 가능 |
| 신 API + Expand DB | PASS | v2 memo 저장 후 `memo_version` 1→2 |
| 신·구 API 혼재 | **FAIL — 위험 재현** | v2가 학생 A를 저장한 뒤 legacy 전체교체가 학생 B만 남김. `attendance_version=2`로 유지되어 유실 감지 불가 |
| 신 API + Contract DB | PASS | legacy 권한 회수 후 v2 save 정상 |
| 구 API + Contract DB | PASS(안전 거부) | attendance/save/complete/capture 모두 실제 role 전환 호출에서 `42501` |

혼재 항목의 테스트 자체는 위험을 정확히 재현했기 때문에 진단 스크립트는 PASS로 종료하지만, 제품 기대 결과인 “조용한 데이터 유실 없음”은 충족하지 않는다.

## Legacy capture 결과

1. legacy capture로 학생 A observation 생성
2. v2 capture로 expected version 1을 사용해 갱신, `capture_version=2`
3. legacy capture로 학생 B 전체 payload 저장
4. 학생 A가 삭제되고 학생 B만 남았지만 `capture_version`은 2 유지

판정: legacy capture의 v2 보호 우회가 실제 PostgreSQL에서 재현됐다. Contract 적용 후 같은 legacy 호출은 `service_role`에서 `42501`로 차단됐다.

## 권한 결과

Expand 후 세 신규 v2 함수 모두 다음을 만족했다.

| 항목 | 결과 |
|---|---|
| PUBLIC EXECUTE | false |
| anon EXECUTE | false |
| authenticated EXECUTE | false |
| service_role EXECUTE | true |
| owner | postgres |
| SECURITY DEFINER | true |
| search_path | `pg_catalog, public` |

검증은 ACL 조회뿐 아니라 실제 `SET LOCAL ROLE service_role` 함수 실행을 포함한다. Contract 후 legacy 네 함수의 실제 실행은 모두 permission denied였다. v2 내부에서 owner 권한으로 legacy helper를 호출하는 간접 경로는 계속 동작했다.

## 기존 9개 동시성 회귀

분리된 Expand를 적용하고 마지막에 Contract를 적용하도록 기존 QA를 갱신했다. 다음 9개가 모두 PASS했다.

- 서로 다른 학생 수정 보존
- 같은 학생 동시 수정 충돌
- 잘못된 payload 트랜잭션 롤백
- stale memo 충돌
- 완료 vs 출석 경쟁
- 네트워크 재시도 중복 방지
- 과거 학생명 snapshot 보존
- cross-owner 차단
- Contract 후 legacy 세션 RPC 권한 차단

## 기존 데이터 영향

- Expand 전 memo를 적용 후에도 그대로 확인했다.
- 기존 session의 `memo_version`, `attendance_version`은 1이었다.
- 기존 attendance/capture 삭제 migration은 없다.
- Contract는 함수 정의나 데이터를 삭제하지 않고 EXECUTE만 회수한다.

## 서비스 중단 가능성과 전환 게이트

- Expand 자체는 구 API 기능을 중단하지 않는다.
- Contract를 구 인스턴스가 남은 상태에서 적용하면 해당 인스턴스의 쓰기는 안전하게 실패한다.
- Expand 상태에서 구·신 쓰기를 동시에 허용하면 조용한 유실이 가능하다.
- 따라서 무중단 읽기는 가능하지만, 안전한 쓰기 전환에는 짧은 **쓰기 gate + in-flight drain + atomic traffic switch**가 필수다.
- 이 제어 없이 일반 rolling deployment를 수행하는 것은 BLOCKED다.

## 테스트 한계

- Production schema/data는 사용하지 않았다.
- 앱 HTTP/PostgREST 전체 E2E가 아니라 실제 PostgreSQL 함수와 역할을 검증했다.
- Production의 실제 앱 SHA, 외부 service-role 소비자, legacy 호출 telemetry는 DB 담당자가 확인해야 한다.
- 저장소 전체 fresh migration chain의 기존 warmup bootstrap 문제는 이 QA 범위 밖이며 계속 별도 blocker다.

## 최종 로컬 검증

- Mixed transition PostgreSQL: 10/10 진단 PASS
- 기존 Stage 2 PostgreSQL 동시성 회귀: 9/9 PASS
- 관련 Vitest: 7 files / 32 tests PASS
- `npm run typecheck`: PASS
- 변경 테스트·QA 스크립트 ESLint: PASS (`--max-warnings 0`)
- `git diff --check`: PASS
- 로컬 migration list: Expand `20261026115102`만 표준 migration으로 표시되고, 원본 `20261026123000`과 release-gated Contract `20261026115108`은 표시되지 않음

첫 Vitest 시도는 `npx`가 저장소 상위 사용자 디렉터리를 root로 선택해 복제 작업트리들을 수집했으므로 실행 범위 오류로 폐기했다. 저장소 로컬 `npm test -- <target files>`로 최종 재실행한 결과는 32/32 PASS다.
