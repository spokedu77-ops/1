# Stage 2 P0 최종 판단

기준일: 2026-10-26

## 결론

**STAGE2_P0_READY: YES**
**REAL_POSTGRESQL_TEST: PASS**
**PRODUCTION_DEPLOY_READY: NO — 별도 승인과 운영 사전점검 필요**

Stage 2 범위의 출석 부분 저장, 메모 낙관적 잠금, 완료 원자성, legacy 무버전 우회 차단은 코드·계약 테스트·실제 PostgreSQL 동시 트랜잭션으로 확인됐다. 기존 capture 보호와 사용자의 미저장 draft도 유지된다.

## 완료된 P0

- 서로 다른 학생의 동시 출석 변경이 조용히 유실되지 않음
- 같은 학생 및 stale 메모 수정은 명시적 충돌로 중단
- 출석 저장 실패 후 메모 저장·수업 시작·완료 진행 차단
- 완료와 출석 변경의 race에서 부분 완료 방지
- legacy service-role RPC 우회 차단
- owner isolation, 과거 학생명 snapshot, 재시도 멱등성 확인
- Lite/Premium attendance·records 권한 유지, Free 정책 변경 없음

## 배포 전 차단 조건

1. Production DB에는 migration을 적용하지 않았다.
2. 운영 schema에서 선행 함수 signatures, grants, 두 버전 컬럼 부재/존재를 read-only로 확인해야 한다.
3. DB backup 및 migration/앱 동시 배포 순서를 승인해야 한다. DB보다 앱을 먼저 배포하면 신규 RPC/컬럼 부재로 실패한다.
4. 로컬 전체 fresh migration chain의 기존 warmup migration 결함을 별도 처리하거나, 운영과 동등한 staging에서 전체 migration dry-run을 통과해야 한다.
5. 최초 배포 후 409 비율, attendance 저장 5xx, 완료 실패율을 모니터링해야 한다.

## 기존 사용자 영향

- 기존 session은 두 version이 1로 초기화된다.
- 학생·출석·수업기록·구독 데이터 삭제 또는 초기화가 없다.
- 동일 화면의 정상 단일 사용자 흐름은 유지되고, 충돌 시에는 기존의 last-write-wins 대신 명시적 오류와 draft 보존이 적용된다.

## 승인 대기 사항

- migration 적용 승인
- staging/운영 동등 환경 dry-run 승인
- 앱 배포 승인
- 필요 시 rollback runbook 승인

Commit, push, Production DB 적용, 배포는 수행하지 않았다.
