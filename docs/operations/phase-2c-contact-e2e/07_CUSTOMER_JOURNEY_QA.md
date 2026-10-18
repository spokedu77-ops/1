# 07 — E01~E20 QA 매트릭스

증거: `DB_E2E_EVIDENCE.json`, `CUSTOMER_QA_EVIDENCE.json`, `captures/`

| ID | status | DB | Admin UI | Mock | 비고 |
|----|--------|-----|----------|------|------|
| E01 | PASS | ✓ | parity | — | C01 |
| E02 | PASS | ✓ | parity | — | C02 + dispatch_leads |
| E03 | PASS | ✓ | parity | — | C03 SPOMOVE |
| E04 | PASS | ✓ | — | — | C04 master (RC-1 fix 후) |
| E05 | PASS | ✓ | — | — | C05 license |
| E06 | PASS | — | — | — | 400 |
| E07 | PASS | — | — | — | invalid email |
| E08 | NOT_VERIFIED | — | — | partial | outage 미주입 |
| E09 | NOT_VERIFIED | — | — | — | detail_failed 미강제 |
| E10 | NOT_VERIFIED | — | — | — | Resend 미설정 |
| E11 | PASS | — | — | — | private+curriculum dup |
| E12 | PASS | — | — | ✓ | failure UI+ draft (mock API) |
| E13 | PASS | — | — | ✓ | success clears draft (unit+mock UI) |
| E14 | PASS | — | — | — | 401 |
| E15 | PARTIAL | ✓ | ✗ | — | inbox parity only |
| E16 | PASS | — | — | — | contact/private/education |
| E17 | PASS | — | — | — | 390 capture |
| E18 | PASS | — | — | — | 941 |
| E19 | PASS | — | — | — | 1440 |
| E20 | NOT_VERIFIED | — | — | — | log audit |

## UI 캡처 (합성 데이터)

- `contact-390.png`, `contact-941.png`, `contact-1440.png`
- `contact-validation-390.png`
- `contact-success-synthetic.png` (API mock)
- `contact-failure-retry.png` (API mock)
- `admin-inquiry-synthetic.png` (비인증)

## 자동 검증 (실행됨)

| 검사 | exit |
|------|------|
| `npm run build` | 0 |
| `npx tsc --noEmit` | 0 |
| ESLint (변경 4파일) | 0 |
| vitest inquiry-submit + resolve + leadEnvelope | 0 (12 tests) |
| DB E2E script | 0 (`PASS_WITH_GAPS`) |
| Customer Playwright | 0 |
| Catalog smoke (`CATALOG_QA_NO_ENV`, 3024) | 0 |

BUILD_ID (공통): `G4z318r0n1BxAVZ8LAwPz`
