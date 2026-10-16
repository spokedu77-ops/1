# Playwright QA — Phase 1-B3A

## 환경

| 항목 | 값 |
|---|---|
| BUILD_ID | `CRXHj0T0tTWJPlpW8Zhml` |
| 포트 | `3002` (`B3A_QA_PORT`, 기존 3000/3001 **미종료**) |
| 명령 | `node docs/design/phase-1b3a/run-captures-b3a.mjs` |
| CSS | `[data-spokedu-home-build]` `--navy: #0b1f46` **4 viewport PASS** |

## 캡처 (현재 **프로덕션 홈** 섹션)

| 파일 | 1440 | 1024 | 834 | 390 |
|---|---|---|---|---|
| spomove-*.png | ✓ | ✓ | ✓ | ✓ |
| lab-*.png | ✓ | ✓ | ✓ | ✓ |
| combined-1440/390 | ✓ | — | — | ✓ |

가로 넘침: **전 viewport false**

## 시각 (육안, 현재 구현)

| 검사 | 1440 | 390 |
|---|---|---|
| SPOMOVE split/grid | PASS | PASS (1열) |
| SPOMOVE 이미지 로딩 | PASS | PASS |
| LAB stat 144+ | PASS 표시 | PASS |
| LAB productFrame | PASS (crop) | PARTIAL (UI 글자 작음) |
| 헤더 겹침 | NOT_VERIFIED | NOT_VERIFIED |

## 링크 (코드)

| CTA | href |
|---|---|
| SPOMOVE | `/spomove` |
| LAB | `/spokedu-lab` |

키보드 focus 전용 캡처: **NOT_VERIFIED** (B3B 수준 미실시)

## 접근성

| 항목 | 결과 |
|---|---|
| 섹션 `aria-labelledby` | PASS (코드) |
| alt 텍스트 | PASS (assets alt) |
| WCAG 대비 자동 | NOT_VERIFIED |
| 터치 44px CTA | PASS (`.btn` min-height 48px, CSS) |

## 고객 과업 (전문가)

| 과업 | SPOMOVE | LAB |
|---|---|---|
| 1 기관 | PARTIAL | LOW |
| 2 학부모 | PARTIAL | N/A |
| 3 지도자 | PARTIAL | PARTIAL |
| 4 신규 LAB | N/A | PARTIAL |

## HTML 시안

`PRODUCT_EXPERIENCE_PREVIEW.html` — Playwright **미캡처** (로컬 file URL 별도). 브라우저 수동 1440/390 권장.

## 미검증

- HTML 개선안 rendered PASS  
- 로그인 상태 CTA 리다이렉트  
- `/spomove/catalog`  
- 144+ factual
