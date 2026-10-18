# B4C → B4D QA 판정 수정

| 결함 | B4C | B4D |
|------|-----|-----|
| overflowX 미반영 | 기록만 | `OVERFLOW_X` FAIL → overall FAIL |
| Gateway border | 측정만 | 3카드 `borderWidth >= 1`, href |
| Records 이미지 높이 | tileCount만 | 390px mediaH ≥ 0.6×mediaW |
| Hero CTA | scroll 버그 | scroll(0,0)+top≥0 |
| Audit evidence FAIL 무시 | 가능 | overall/checks FAIL → audit FAIL |
| Gallery 1440 | N/A | `fr` 문자열 대신 column count ≥2 |

스크립트 SSOT: `docs/design/phase-1b4d/home-visual-checks.mjs`
