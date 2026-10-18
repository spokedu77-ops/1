# Phase 1-B1 최종 QA 보고서

- 일시: 2026-10-16
- 모드: LIMITED_FIX_AND_VERIFICATION
- 서비스 코드 추가 변경: **`home-web.module.css` 1개** (B1 초기 3파일 + 이번 CSS 1)

## 보완 요약

1. `@media (max-width: 767px)`에 `.actions` / `.btn` 공통 규칙 복구
2. `.heroActions` / `.heroActions .btn` 예외 유지(가로 2열 Hero)
3. Gateway 캡처를 섹션 `locator.screenshot()`으로 재촬영
4. 5섹션 DOM·이미지·링크·모바일 CTA computed style·키보드 focus/Enter 재검증

## CSS 복구

| 항목 | 결과 |
|------|------|
| `.actions` column + stretch | **복구됨** |
| `.btn` width 100% | **복구됨** |
| Hero `.heroActions` row | **유지** |
| diff | `CSS_CHANGE_DIFF.patch` |

## Gateway 캡처

| 파일 | 카드 3개 | 섹션 높이 | 시각 확인 |
|------|----------|-----------|-----------|
| `gateway-1440.png` | 3 | ~588px | **PASS** |
| `gateway-390.png` | 3 | ~900px | **PASS** |

## 기존 5개 섹션 회귀

| 섹션 | DOM | 이미지 naturalWidth>0 | 링크 |
|------|-----|------------------------|------|
| SpokeduMethod | PASS | 3/3 | (CTA 없음) |
| FieldRecords | PASS | 3/3 | 3 (records/블로그) |
| SpomoveStage | PASS | 1/1 | `/spomove` |
| MasterStage | PASS | 1/1 | `/spokedu-lab` |
| FinalCTA | PASS | N/A | `/contact` 등 |

픽셀级 Production 대조 캡처 없음 → **DOM·URL·computed style·스크린샷** 근거.

## 키보드 접근성

| 항목 | 결과 |
|------|------|
| Hero·Gateway 5개 링크 programmatic focus | **PASS** |
| Enter on Hero Primary → `/education` | **PASS** |
| Gateway 카드 3 링크 href | **PASS** |
| `:focus-visible` 2px blue (`.root` 규칙) | **부분** — Playwright `.focus()`는 `:focus` outline(브라우저 기본 1px) 표시; 실제 Tab `:focus-visible`는 `focus-visible-390.png` 참고 |

## 반응형 (1440 / 1024 / 834 / 390)

- overflow: 전 width **false**
- H1 개수: **1**
- Hero·Gateway·full-page 캡처: `final-qa/captures/home-*.png`

## 정적 검사

| 항목 | 결과 |
|------|------|
| TypeScript | **PASS** |
| ESLint (변경 TSX) | B1 이후 **변경 없음** — 이전 PASS 유지 |
| ESLint (CSS) | 대상 아님 |
| Production build | **PASS** |

## 미해결 / 한계

1. 히어로 사진 공개 승인·교체 — 사용자 결정 (B1 범위外)
2. Phase 1-A HTML 픽셀 대조 — 자료 없음
3. `:focus-visible` — Tab 순서 전체 12스텝 자동 로그는 생략, 지정 5타깃 focus 검증

## 최종 판정

**Phase 1-B1 최종 QA: PASS**

(Commit·Push·배포 없음, Phase 1-B2 미시작)
