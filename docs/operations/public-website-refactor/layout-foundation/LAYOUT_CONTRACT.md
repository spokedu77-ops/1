# LAYOUT_CONTRACT — Gate A (공개 사이트 공통 정렬)

**범위:** 11개 공개 URL · **변경:** 홈 Hero 반응형 브레이크포인트만 (`home-web.module.css`)  
**미변경:** `app/globals.css` `.site-container`, `site.ts` / SEO / sitemap

---

## 1. 설계 정본 (저장소 내 실행 가능 SSOT)

첨부 문서 `SPOKEDU_PUBLIC_SITE_FOUNDATION_V2.md`, `SPOKEDU_CODEX_GATE_A_EXECUTION.md`는 **저장소에서 발견되지 않음** (`GATE_A_BASELINE.json`).  
이번 Gate A는 **사용자 지시서 §4·§6** + 다음 코드 SSOT로 실행했다.

| 토큰 | 값 | 코드 위치 |
|------|-----|-----------|
| 외곽 최대 폭 | **1368px** (padding 포함 box) | `app/globals.css` `.site-container`, `home-web` `--rail-max: 1368px` |
| gutter 320–767 | **20px** | `.site-container` padding-inline; home `--gutter: 20px` |
| gutter 768–1199 | **32px** | `@media (min-width: 768px)` |
| gutter 1200+ | **48px** | `@media (min-width: 1200px)` |
| 마케팅 rem 토큰 | 85.5rem (=1368px) | `.spokedu-marketing` `--spokedu-marketing-content-max` |

**`.site-container` 전역 사용:** 공개 마케팅 일부 페이지 + `app/spokedu/private`, `contact`, `records/[slug]`, `curriculum-landing`, `spomove-public-catalog`. MASTER/admin shell에는 **미사용** (별도 `[data-spm-app-shell]` 계약).

---

## 2. 컨테이너 역할 (페이지별)

| 역할 | 의미 | Gate A 처리 |
|------|------|-------------|
| **standard** | 공통 정렬선 (1368 + gutter) | `.site-container` 또는 `.rail` 동일 gutter |
| **reading** | 본문 폭 제한 | 섹션 내부 `max-width` — 정렬 실패로 보지 않음 |
| **focused** | 폼·집중 UI | `private`, `contact` — outer는 standard |
| **visual** | 이미지·제품 UI | `records` featured, `/spomove` — rail 예외 기록 |
| **full-bleed** | 배경만 풀폭 | 내부 카피는 standard rail |

**의도적 예외 (유지):**

- **`/spokedu-lab`:** `CommercialLanding` — max-width **1120–1220px**, 자체 `MasterLocalNav`. 공개 site header 없음.
- **`/spomove`:** `spomove-program.module.css` — `.rail` + clamp gutter; **정렬 QA는 marketing-rail 예외** (토큰은 20/32/48과 정합).
- **홈 Hero 1200+:** 텍스트·사진 2열 + 제한적 bleed margin (visual); **1200 미만 단일 열**.

---

## 3. Gate A 코드 교정 (홈 Hero만)

**문제:** 1024–1199px에서 base `.heroVisual { grid-column: 7/13 }` + 1024px 2열 규칙 → 좁은 2열 회귀. `overflow-x: clip`으로 넘침 은폐.

**조치 (`home-web.module.css`):**

1. 기본 `.heroVisual` — full-width 단일 열 (`grid-column: 1/-1`, bleed margin 제거).
2. **`@media (max-width: 1199px)`** — Hero만 copy → visual → actions 단일 열.
3. **`@media (min-width: 1200px)`** — 2열 + bleed margin (데스크톱만).
4. **`overflow-x: clip` 제거** (`.root`).

카피·CTA href·섹션 순서·이미지 경로 **무변경**.

---

## 4. 검증

- **154 폭 × 11 URL:** `WIDTH_QA.json` — **154/154 pass** (콘텐츠 박스 left = gutter, overflow 없음).
- **캡처:** `BEFORE_AFTER/` — BEFORE=HEAD hero CSS, AFTER=Gate A fix; 390×844, 941×900, 1440×900.
- **회귀:** `public-marketing-visual.contract.test.ts`, `field-records-catalog.test.ts`, `npm run build`.

**디자인·SEO·메뉴 개편:** 이번 Gate A **미포함** → PO/후속 Gate.
