# Negative tests

환경: BUILD `PDfrXWiKQ86Qbr0xYi_ld`, port 3016, 격리 Playwright context + `addStyleTag` / DOM probe.

| Test | 기대 | 결과 | exit |
|------|------|------|------|
| A Gateway border 제거 | bordersOk false | PASS (detected) | |
| B Records media 24px | mobileHeightsOk false | PASS | |
| C 200vw probe | overflowX true | PASS | |
| D mock evidence FAIL | auditWouldFail | PASS | |

`NEGATIVE_TEST_EVIDENCE.json` — overall **PASS** (탐지 성공).

운영 CSS/JSX 변경 없음.
