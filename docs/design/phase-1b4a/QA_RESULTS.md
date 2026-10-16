# Phase 1-B4A — QA Results

**HEAD:** `9b370e2e3b798d6518dc7fdcac0dec6f18da0c82` · **Branch:** toss-review  
**Build:** `npm run build` PASS · `.next/BUILD_ID`: `VjP2ttvpdcToEnUMrBN4y`  
**QA server:** port **3008** (fresh start, spawned by script)  
**HTML marker:** `SPOKEDU_HOME_BUILD_ID` = `2026-09-21-explorer-16x9` (≠ `.next/BUILD_ID` — CSS/DOM 기준 PASS)

## Static

| Check | Result |
|-------|--------|
| TypeScript | PASS (next build) |
| ESLint `home-hero.tsx` | PASS |
| Production build | PASS |

## Playwright

Script: `run-captures-b4a.mjs` · Metrics: `RESPONSIVE_METRICS.json`

### 941×861 Primary CTA (필수)

- `top` 431.7 · `bottom` 475.7 · `fullyInFirstViewport`: **true**

### 기타 폭 (861px 높이)

| Width | Primary in viewport | overflowX |
|-------|---------------------|-----------|
| 768 | PASS | false |
| 834 | PASS | false |
| 1023 | PASS | false |
| 767 | PASS | false |
| 390 | PASS | false |
| 1024 | PASS | false |
| 1440 | PASS | false |
| 941×700 | PASS (bottom 476 ≤ 700) | false |

### DOM

- H1 ×1 · Hero img ×1 · Primary/Secondary ×1  
- href: `/education`, `/spokedu-lab`

### Computed @941

- `heroGrid`: `display: grid`, columns ~459px / ~391px, gap ~26px  
- `heroEnglish` fontSize ~43.3px  

### 회귀 (6 sections)

@941 DOM presence: gateway, method steps, records gallery, spomove heading, master heading, final CTA — **present** (automated). Copy/CSS 픽셀 diff **NOT_VERIFIED**.

### Keyboard

Tab order / focus ring — **NOT_VERIFIED**

## Overall

**Hero tablet goals:** PASS on measured CTA + grid + captures  
**Full phase checklist:** keyboard/a11y automation **NOT_VERIFIED** — 전체 PASS 주장 안 함
