# DB SAFETY — 최종

## 공통 SSOT

`docs/operations/phase-2c-contact-e2e/lib/contact-e2e-db-safety.mjs`

## 정책

| 규칙 | 설명 |
|------|------|
| 승인 ID | `CONTACT_E2E_APPROVED_PROJECT_REF`는 **.env.local 등에 독립 설정** |
| 금지 | 셸에서 URL 파싱 ref를 곧바로 `APPROVED`에 대입하는 실행 방식 |
| 검증 | `approved === parse(NEXT_PUBLIC_SUPABASE_URL)` 일치 + `ALLOW=1` |
| 차단 | `CONTACT_E2E_BLOCKED_PROJECT_REFS` |
| 쓰기 | gate 실패 시 **0건** |

## 이번 재점검

| 스크립트 | 조건 | 결과 |
|----------|------|------|
| `run-contact-db-safety-audit.mjs` | CONTACT_E2E env **없음** (상속 제거) | **DB_ENVIRONMENT_BLOCKED**, exit 1 |
| `run-contact-db-e2e.mjs` | 공유 lib 사용 | **C01–C05 재실행 없음** (closure PASS 증거 유지) |

`.env.local` 현재: `CONTACT_E2E_*` 키 **미설정** → Production/로컬 릴리스 전 **필수 설정**.

증거: `DB_SAFETY_AUDIT.json`
