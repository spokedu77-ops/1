# DB Safety & Cleanup

## Pre-write gate (`run-contact-db-e2e.mjs`)

실행 전 **모두** 필요. 하나라도 실패 → `DB_ENVIRONMENT_BLOCKED`, **쓰기 0건**.

| 조건 | 변수 |
|------|------|
| 명시적 쓰기 허용 | `CONTACT_E2E_ALLOW_DB_WRITES=1` |
| 승인 프로젝트 ref | `CONTACT_E2E_APPROVED_PROJECT_REF` = URL에서 파싱한 ref와 **일치** |
| Production 차단 | `CONTACT_E2E_BLOCKED_PROJECT_REFS`에 연결 ref 포함 시 거부 |
| Service Role | 설정됨 (값은 로그·JSON에 **미출력**) |
| 재사용 서버 | `CONTACT_E2E_NO_SPAWN=1` 시 `CONTACT_E2E_EXPECTED_BUILD_ID` = `.next/BUILD_ID` |

`.env.local` 파일명만으로 테스트 환경 판단 **하지 않음**.

## Cleanup

- `trackedIds`에만 delete
- delete 후 `maybeSingle`로 **gone** 재검증
- cleanup 실패 시 overall **FAIL** (PASS 불가)

Run `PHASE2C-MVDD2F18`: 8 consultations + 2 dispatch_leads 삭제, verify 전건 `gone: true`.

## Evidence redaction

제출 JSON의 `actualProjectRef`·호스트는 `[REDACTED]` 처리됨.
