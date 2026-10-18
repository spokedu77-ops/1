# Phase 1-B3B — QA Results

**Build ID (local):** `GvJA6zsUrRbbkyFABOdj2`  
**QA server:** `http://127.0.0.1:3004/` (fresh `npm run start` after `npm run build`)  
**Stale servers (not used for PASS):** 3000/3001/3002 → marker `2026-09-21-explorer-16x9`

## Static checks

| Check | Result | Notes |
|-------|--------|-------|
| TypeScript | **PASS** | Via `next build` |
| Production build | **PASS** | `npm run build` exit 0 |
| ESLint (changed TSX) | **PASS** | 0 errors on spomove/master-stage |
| ESLint (CSS module) | **N/A** | File ignored by ESLint config (warning only) |

## CSS / build integrity

| Viewport | `--navy` #0b1f46 | Horizontal overflow |
|----------|------------------|---------------------|
| 1440 | OK | none |
| 1024 | OK | none |
| 941 | OK | none |
| 834 | OK | none |
| 390 | OK | none |

## Playwright captures

Script: `docs/design/phase-1b3b/run-captures-b3b.mjs`  
Raw metrics: `capture-report.json`

| File | Purpose |
|------|---------|
| `captures/spomove-{1440,1024,941,834,390}.png` | SPOMOVE section |
| `captures/lab-{1440,1024,941,834,390}.png` | LAB section |
| `captures/home-full-{1440,941,390}.png` | Full page regression |
| `captures/lab-mobile-crop-after-390.png` | LAB crop choice |

### Images (LAB)

- `img.complete` true, `naturalWidth` 1536 at all tested widths.

### CTA hrefs

- SPOMOVE → `/spomove`
- LAB → `/spokedu-lab`

## Regression (other sections)

Not modified in code; full-page captures at 1440 / 941 / 390 for visual spot-check. **No automated diff score** — manual review of captures recommended.

## Accessibility (WCAG 2.2 AA)

| Item | Method | Result |
|------|--------|--------|
| Heading hierarchy (h2 in sections) | DOM | **PASS** (expert) |
| CTA keyboard focus | Not automated this phase | **Not verified** |
| Contrast 4.5:1 body / 3:1 large | Not run with axe | **Not verified** |
| Touch target 44px | Not measured | **Not verified** |
| Alt text | Existing asset alts retained | **PASS** (static review) |

Do **not** treat unrun automated a11y as full AA PASS.

## Expert customer tasks (§12-4)

| # | Can answer from new copy? |
|---|---------------------------|
| 1 SPOMOVE signal → movement | Yes — 본문 + 반응 유형 |
| 2 vs passive video | Partially — implied by “신호 확인·선택·움직임” (no negative framing) |
| 3 LAB instructor tasks | Yes — 콘텐츠 찾기 + 운영 도구 |
| 4 “all free” misread | Lower risk — 요금제 문장 추가 |
| 5 SPOMOVE vs LAB | Yes — movement program vs leader tools |
| 6 Detail navigation | Yes — CTA hrefs verified |

*Expert review only — no live user testing.*

## Overall

**Implementation QA:** PASS for scoped sections on fresh build, subject to manual hero/regression visual review and incomplete a11y automation.
