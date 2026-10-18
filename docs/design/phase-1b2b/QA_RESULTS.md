# Phase 1-B2B — QA Results

검증 일: 2026-10-16 (로컬, production build + `next start` @ port 3001)

## TypeScript

| 항목 | 결과 |
|---|---|
| `npm run typecheck` | **PASS** |

## ESLint

| 항목 | 결과 |
|---|---|
| `spokedu-method.tsx`, `field-records.tsx`, `home-web-assets.ts` | **PASS** (0 errors) |
| `home-web.module.css` | eslint 대상外 (설정 없음) — **미검증(도구)** |

## Build

| 항목 | 결과 |
|---|---|
| `npm run build` | **PASS** |

## Playwright (섹션 locator screenshot)

| 뷰포트 | Method | Records | 가로 넘침 |
|---|---|---|---|
| 1440×900 | PASS (`method-1440.png`) | PASS (`records-1440.png`) | 없음 |
| 1024×900 | PASS | PASS | 없음 |
| 834×900 | PASS | PASS | 없음 |
| 390×844 | PASS (`method-390.png`) | PASS (`records-390.png`) | 없음 |

추가: `home-full-1440.png`, `home-full-390.png`, `focus-records-390.png`

자동 수집 (`playwright-report.json`):

- `#home-method-heading` = 지시서 H2 일치
- `#home-records-heading` = 지시서 H2 일치
- Method `article` = 3
- Records href 3건 = `/records/dongjak-spomove`, 네이버 블로그 2 URL (지시서와 일치)

## 이미지 로딩

- 섹션 캡처 전 `img.decode()` 호출 — 캡처 11장 육안 확인 **PASS**

## 접근성

| 항목 | 결과 |
|---|---|
| 섹션 `aria-labelledby` | PASS |
| 사례 카드 전체 단일 링크(중첩 `<a>` 없음) | PASS |
| 외부 링크 `target="_blank"` + `rel="noreferrer"` | PASS (기존 정책) |
| focus-visible (Records 첫 카드) | **PARTIAL** — `focus-records-390.png` 1건; Method 3타일·Tab 순서 전체는 미자동 |
| WCAG 2.2 AA 대비 4.5:1 자동 측정 | **미실시** (B2A HTML 대비 스크립트 없음) |

## CTA 및 사례 링크

| 사례 | href | 라벨 |
|---|---|---|
| 동작 SPOMOVE | `/records/dongjak-spomove` | 사례 자세히 보기 → |
| 동행 체육교실 | `https://blog.naver.com/spokedutogether/224338186918` | 블로그에서 보기 ↗ |
| 매동 스텝업 | `https://blog.naver.com/spokedutogether/224288711414` | 블로그에서 보기 ↗ |

## 기존 5개 섹션 회귀 (B1 로컬 기준)

| 섹션 | 방법 | 결과 |
|---|---|---|
| Hero, Gateway, SPOMOVE, LAB, FinalCTA | `home-full-*.png` + 해당 TSX/CSS diff에 B2B가 Hero/Gateway 미포함 | **PASS (시각·범위)** — computed style 수치 자동 diff는 미실시 |

## 고객 과업 점검 (전문가 기반)

| 과업 | 결과 | 비고 |
|---|---|---|
| 기관: 실제 수업 경험 확인 | PASS | Records 3건 운영 정보 + 링크 |
| 학부모: 맞춤 조정 이해 | PASS | 동행 사례 설명문 |
| 지도자: Field·Content·System 관계 | PASS | Method 병렬 3영역 + 본문 |
| 사례 상세 탐색 | PASS | CTA 라벨·href 구분 |
| 신뢰(효과 혼동 방지) | PASS | 효과·「증명」H2 제거 |

**실사용자 테스트:** 미실시.
