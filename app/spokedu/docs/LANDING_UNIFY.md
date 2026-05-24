# SPOKEDU 서브 랜딩 — Home 패턴 통일

**공통 컴포넌트**

- `LandingHero` — Hero shell·H1·CTA (음수 margin 없음)
- `LandingFinalCta` — 하단 CTA 좌측 정렬
- `landingPageStack` — `max-w-6xl` 중복 제거, Home과 동일 폭
- `landingH1` — 모바일 2~3줄 의미 유지

**적용 완료 (2026-05-24)**

| 순서 | 페이지 |
|------|--------|
| 1 | Home (기준) |
| 2 | About |
| 3 | Private, Dispatch, Programs |
| 4 | Records, Cases |
| 5 | SPOMOVE, PAPS, 원데이, 캠프 |
| 6 | Monthly, Insights, Case/Monthly/Program 상세 |
| 7 | **Curriculum** (마지막 퍼널) |
| 8 | Contact (Hero shell·H1만) |

**QA:** `node scripts/spokedu-qa.mjs http://localhost:3000`
