# Phase 1-B4A Main Recovery — QA_RESULTS

**판정:** `LOCAL_QA_PASS` (main, BUILD_ID 정합, Playwright 완료)

## TypeScript

- `next build` 내 TS 단계: **PASS** (2026-10-17)

## ESLint

- 별도 `eslint` CLI: **미실행** (AGENTS.md 기본 정책). 변경 1줄 CSS, 빌드 TS 통과.

## Build

- 명령: `npm run build`
- **BUILD_ID:** `K-6oOhNLPPniCxJn7yAaE`

## 서버

- 명령: `PORT=3012 npm run start` (repo root, fresh build)
- URL: `http://127.0.0.1:3012/spokedu/`
- 기존 3010 등 프로세스: **임의 종료 없음**

## CSS 적용

- Playwright computed: 태블릿 `englishColor: rgb(36, 93, 255)` (= `--blue`)
- Grid 768–1023: 2열 (`gridColumnCount: 2`)

## Playwright

- 스크립트: `docs/design/phase-1b4a-main-recovery/run-qa.mjs after`
- 폭: 390, 767, 768, 834, 941, 941×700, 1023, 1024, 1440 — **캡처 생성**
- `RESPONSIVE_METRICS.json`: viewport별 `pass: true`
- 941 CTA: primary/secondary `pass: true`

## 접근성

- Tab 순서 샘플: skip → nav → **수업 알아보기** → **수업자료 둘러보기**
- `focusPrimary` / `focusSecondary`: href 유지, `outline: 2px`
- Enter 제출: **미수행** (링크만 검증)

## 회귀

- Before: `captures/before-941.png` (이전 세션, BUILD_ID `VjP2ttvpdcToEnUMrBN4y`, 영문 Navy)
- After: `captures/after-941.png` (BUILD_ID `K-6oOhNLPPniCxJn7yAaE`, 영문 Blue)
- `before-after-941.png`: 나란히 비교 (색상 차이 주 목적)
- 390/767/1024/1440 Hero 캡처: **이번 빌드 기준**

## Commit / Push / Deploy

- **0건**
