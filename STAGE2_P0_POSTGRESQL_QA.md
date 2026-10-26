# Stage 2 P0 PostgreSQL QA

기준일: 2026-10-26
환경: 로컬 Supabase PostgreSQL, 테스트 전용 임시 database 생성 후 자동 제거
운영 DB 변경: 없음

## 실행 명령

```text
node scripts/spokedu-master-stage2-p0-postgres-qa.mjs
```

## 실제 DB 결과

| 시나리오 | 결과 | 증거 |
|---|---|---|
| 서로 다른 학생 동시 수정 | PASS | stale 요청은 충돌하고 최신 버전 재시도 후 두 학생 상태 모두 보존 |
| 같은 학생 동시 수정 | PASS | 두 동시 트랜잭션 중 정확히 1 성공, 1 `40001` |
| 실패 트랜잭션 롤백 | PASS | 실패 전/후 `attendance_version=4`, 부분 변경 없음 |
| stale 메모 수정 | PASS | 첫 memo와 `memo_version=2` 보존, stale 요청 충돌 |
| 완료와 출석 동시 수정 | PASS | 정확히 1 성공, 1 충돌; 혼합 완료 없음 |
| 네트워크 재시도 | PASS | attendance 고유 행 수 1, 중복 부작용 없음 |
| 학생 재명명·soft delete 이후 과거 snapshot | PASS | 기존 `student_name_snapshot='Student A'` 유지 |
| 다른 owner 접근 | PASS | owner-scoped row not found |
| legacy RPC 우회 | PASS | legacy 3개 권한 false, 신규 attendance RPC 권한 true |

총 9/9 PASS.

## 애플리케이션 회귀

| 검사 | 결과 |
|---|---|
| 관련 Vitest 19 files / 142 tests | PASS |
| `npm run typecheck` | PASS |
| 변경 TS/TSX ESLint | PASS |
| `npm run build` (Next.js 16.2.11, 242 static pages) | PASS |
| `git diff --check` | PASS |

Vitest는 Windows 로그인 셸이 `process.cwd()`를 사용자 홈으로 바꾸는 현상을 피하기 위해 저장소 `workdir`와 `login:false`로 실행했다. 첫 잘못된 루트 실행 결과는 제품 실패로 판정하지 않았고, 동일 테스트를 올바른 저장소 루트에서 재실행했다.

## 환경 제한과 잔여 위험

- 저장소 전체 migration을 빈 로컬 프로젝트에 순차 적용하면 기존 `20260312000000_warmup_composite_id_pattern_index.sql`이 선행 `warmup_programs_composite` 부재로 실패했다. 이번 Stage 2 migration 이전의 bootstrap 결함이며 기존 migration은 수정하지 않았다.
- 따라서 이번 QA는 실제 PostgreSQL에서 필요한 기존 테이블·legacy 함수 계약을 격리 DB에 구성한 뒤 **새 migration 원문을 그대로 적용**한 통합 시험이다. Mock 시험이 아니다.
- Production schema drift와 실제 데이터 분포는 건드리지 않았으므로 배포 전 read-only schema 확인, migration dry-run/backup, 승인된 maintenance 절차가 필요하다.
