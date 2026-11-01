# STITCH baseline render gate

**Verdict:** `STITCH_BASELINE_RENDER_PARTIAL`
**Scope:** Isolated static serve of Stitch ZIP HTML — no `app/spokedu/**` changes
**Stitch HTML SHA256:** unchanged after run (see per-page table)

## Summary

| Page | Ref WxH | Render WxH | Mismatch % | Structural notes |
|------|---------|------------|------------|------------------|
| home_spomove | 2358×10000 | 2358×5429 | 36.80% | Full-page height delta 4571px — section spacing or asset load |
| education_programs_spomove | 2560×9668 | 2560×4834 | 32.11% | Full-page height delta 4834px — section spacing or asset load |
| private_lesson_spomove | 2560×9460 | 2560×4730 | 28.99% | Full-page height delta 4730px — section spacing or asset load |
| spomove_system_spomove | 2463×10000 | 2463×5196 | 23.93% | Full-page height delta 4804px — section spacing or asset load |
| field_records_spomove | 2560×7044 | 2560×3522 | 36.48% | Full-page height delta 3522px — section spacing or asset load |
| about_spomove | 2560×9866 | 2560×4955 | 31.29% | Full-page height delta 4911px — section spacing or asset load |

## Evidence per page (`stitch-baseline-render/evidence/<folder>/`)

1. `01-stitch-reference.png` — ZIP screen.png copy
2. `02-local-render.png` — Playwright full-page (original copy, CDN assets)
3. `03-pixel-diff.png` — full-page threshold diff (top segment only when heights differ)
4. `04-ref-top-crop.png` / `04-viewport-top.png` / `05-viewport-top-diff.png` — first ~1200px hero band compare

### home_spomove (`/`)

- **HTML SHA256:** `745e1f03b4ee27ea66678c995424b656d0a7da106d9d85b2894804ccef227b07`
- **Pixel mismatch (full page):** 4710422/12801582 (36.80%)
- **Hero band mismatch (top crop):** 17.74%
- **Structural / environment:**
  - Full-page height delta 4571px — section spacing or asset load
- **Review issues (not auto-PASS):**
  - High pixel mismatch (>8%) — likely CDN images/fonts or environment drift

### education_programs_spomove (`/education`)

- **HTML SHA256:** `218d15152b6297c2d4c45e408c6e52a170de7432da00e07d67d67bad62d66e2b`
- **Pixel mismatch (full page):** 3973715/12375040 (32.11%)
- **Hero band mismatch (top crop):** 9.18%
- **Structural / environment:**
  - Full-page height delta 4834px — section spacing or asset load
- **Review issues (not auto-PASS):**
  - High pixel mismatch (>8%) — likely CDN images/fonts or environment drift

### private_lesson_spomove (`/private`)

- **HTML SHA256:** `cd46826d848cfea33d0b581a25aa209d88fd67d5ee7a32695e5fb367de090187`
- **Pixel mismatch (full page):** 3509988/12108800 (28.99%)
- **Hero band mismatch (top crop):** 9.42%
- **Structural / environment:**
  - Full-page height delta 4730px — section spacing or asset load
- **Review issues (not auto-PASS):**
  - High pixel mismatch (>8%) — likely CDN images/fonts or environment drift

### spomove_system_spomove (`/spomove`)

- **HTML SHA256:** `c035e7178ba07a1926794a3565c7420d6c42b62740f566a65d75a65b9459d09b`
- **Pixel mismatch (full page):** 3062715/12797748 (23.93%)
- **Hero band mismatch (top crop):** 8.12%
- **Structural / environment:**
  - Full-page height delta 4804px — section spacing or asset load
- **Review issues (not auto-PASS):**
  - High pixel mismatch (>8%) — likely CDN images/fonts or environment drift

### field_records_spomove (`/records`)

- **HTML SHA256:** `07750ef8f76be417b8715b941d93b688a542a8260ba8276aba4d4d62f70bf436`
- **Pixel mismatch (full page):** 3288997/9016320 (36.48%)
- **Hero band mismatch (top crop):** 7.49%
- **Structural / environment:**
  - Full-page height delta 3522px — section spacing or asset load
- **Review issues (not auto-PASS):**
  - High pixel mismatch (>8%) — likely CDN images/fonts or environment drift

### about_spomove (`/about`)

- **HTML SHA256:** `3c01db334e3df2be8164433446a0a584d891f230cc07d59ebe7dc9c0d4159090`
- **Pixel mismatch (full page):** 3969185/12684800 (31.29%)
- **Hero band mismatch (top crop):** 9.18%
- **Structural / environment:**
  - Full-page height delta 4911px — section spacing or asset load
- **Review issues (not auto-PASS):**
  - High pixel mismatch (>8%) — likely CDN images/fonts or environment drift

## PASS criteria assessment

| Criterion | Status |
|-----------|--------|
| 6/6 render success | YES |
| Original HTML unmodified | YES |
| Unapproved structure change in repo | N/A (no repo HTML edits) |
| Visual match (human + diff) | PARTIAL — see diffs |
| Zero external load failures | YES |

> Pixel ratio alone does not grant PASS. PO must review reference vs render side-by-side.

## Pixel vs structural (gate interpretation)

| Class | Finding | Resolution in this pass |
|-------|---------|-------------------------|
| **Structural** | Local full-page height ≈ **54–50%** of ZIP `screen.png` height on all 6 pages (width matches). | **Not “fixed”** — Stitch export bitmap appears to use a taller canvas than Playwright `fullPage` CSS layout. Compare hero crops + side-by-side; do not stretch HTML. |
| **Structural** | DOM/HTML **unchanged** (SHA256 before/after). | **PASS** — no repo Stitch edits. |
| **Pixel (hero band)** | Top ~1200px mismatch **~7–18%** depending on page. | Fonts (Google CDN), Tailwind CDN compile, anti-aliasing, hero CDN image decode timing. |
| **Pixel (full page)** | **24–37%** mismatch on overlapping height. | Dominated by height mismatch + per-section asset/font drift; **not used for auto-PASS**. |

## Mismatch register (common root causes — not duplicated per page)

1. **External Tailwind CDN** (`cdn.tailwindcss.com`) — runtime config vs Stitch capture environment.
2. **Google Fonts / Material Symbols** — load order and FOUT vs static Stitch PNG.
3. **`lh3.googleusercontent.com` hero images** — network latency; not bundled in ZIP.
4. **Reference PNG geometry** — `screen.png` height not equal to browser document height at same width.

## Approved exceptions (require PO)

- Accept hero-band visual parity (~10–20% pixel diff) for **`STITCH_BASELINE_RENDER_PASS`** hero gate, **or**
- Re-export Stitch reference PNGs with documented viewport/DPR/capture method matching Playwright, then re-run gate.

## Re-run

```bash
node docs/operations/public-website-refactor/contract-draft/scripts/run-stitch-baseline-render-gate.mjs
```

## Next gate

- After `STITCH_BASELINE_RENDER_PASS`: approved SPOKEDU copy/image swap without layout change.
- Phase C wiring to Next.js remains separately authorized.

## Capture environment correction (CSS viewport + DPR 2, `scale: device`)

**Verdict (this run):** `STITCH_BASELINE_RENDER_PARTIAL`
**Run at:** 2026-10-31T21:26:49.654Z

### DPR / viewport hypothesis

Prior run used **CSS viewport width = reference PNG width** with `scale: css`, which matched **DPR 1 at 2560px CSS** while Stitch `screen.png` is **device pixels at ~1280 CSS × DPR 2**. Education / Private / Records showed **exact 2× height ratio** — consistent with that mismatch, not HTML layout drift.

### DOM probe (after networkidle + fonts.ready + images)

| Page | CSS W | DPR | innerWidth | scrollHeight | Expected PNG W×H | Actual PNG W×H | Imgs pending |
|------|-------|-----|------------|--------------|------------------|----------------|--------------|
| home_spomove | 1179 | 2 | 1179 | 5295 | 2358×10590 | 2358×10590 | 0 |
| education_programs_spomove | 1280 | 2 | 1280 | 4834 | 2560×9668 | 2560×9668 | 0 |
| private_lesson_spomove | 1280 | 2 | 1280 | 4730 | 2560×9460 | 2560×9460 | 0 |
| spomove_system_spomove | 1232 | 2 | 1232 | 5185 | 2464×10370 | 2464×10370 | 0 |
| field_records_spomove | 1280 | 2 | 1280 | 3522 | 2560×7044 | 2560×7044 | 0 |
| about_spomove | 1280 | 2 | 1280 | 4955 | 2560×9910 | 2560×9910 | 0 |

### Summary (aligned capture)

| Page | Ref WxH | Render WxH | Full mismatch % | Hero band % | Structural |
|------|---------|------------|-----------------|-------------|------------|
| home_spomove | 2358×10000 | 2358×10590 | 17.42% | 27.91% | PNG height delta 590px (ref 10000 vs render 10590; CSS scroll 5295×DPR2≈10590) |
| education_programs_spomove | 2560×9668 | 2560×9668 | 2.35% | 3.27% | — |
| private_lesson_spomove | 2560×9460 | 2560×9460 | 2.23% | 2.94% | — |
| spomove_system_spomove | 2463×10000 | 2464×10370 | 8.34% | 6.26% | PNG height delta 370px (ref 10000 vs render 10370; CSS scroll 5185×DPR2≈10370) |
| field_records_spomove | 2560×7044 | 2560×7044 | 2.53% | 2.70% | — |
| about_spomove | 2560×9866 | 2560×9910 | 11.77% | 3.18% | — |

#### home_spomove

- **Capture:** viewport 1179×900, DPR 2, `scale: device`, fonts `loaded`, images 6/6
- **Full-page pixel diff:** 17.42%
- **Hero band diff:** 27.91%
- **Structural:**
  - PNG height delta 590px (ref 10000 vs render 10590; CSS scroll 5295×DPR2≈10590)
  - CSS scrollHeight delta 295px (DOM 5295 vs ref-implied 5000)
- **Residual (pixel / CDN):**
  - High pixel mismatch (>8%) — likely CDN images/fonts or environment drift

#### education_programs_spomove

- **Capture:** viewport 1280×900, DPR 2, `scale: device`, fonts `loaded`, images 8/8
- **Full-page pixel diff:** 2.35%
- **Hero band diff:** 3.27%

#### private_lesson_spomove

- **Capture:** viewport 1280×900, DPR 2, `scale: device`, fonts `loaded`, images 6/6
- **Full-page pixel diff:** 2.23%
- **Hero band diff:** 2.94%

#### spomove_system_spomove

- **Capture:** viewport 1232×900, DPR 2, `scale: device`, fonts `loaded`, images 1/1
- **Full-page pixel diff:** 8.34%
- **Hero band diff:** 6.26%
- **Structural:**
  - PNG height delta 370px (ref 10000 vs render 10370; CSS scroll 5185×DPR2≈10370)
  - CSS scrollHeight delta 185px (DOM 5185 vs ref-implied 5000)
- **Residual (pixel / CDN):**
  - High pixel mismatch (>8%) — likely CDN images/fonts or environment drift

#### field_records_spomove

- **Capture:** viewport 1280×900, DPR 2, `scale: device`, fonts `loaded`, images 6/6
- **Full-page pixel diff:** 2.53%
- **Hero band diff:** 2.70%

#### about_spomove

- **Capture:** viewport 1280×900, DPR 2, `scale: device`, fonts `loaded`, images 7/7
- **Full-page pixel diff:** 11.77%
- **Hero band diff:** 3.18%
- **Residual (pixel / CDN):**
  - High pixel mismatch (>8%) — likely CDN images/fonts or environment drift

### PASS criteria (this correction run)

| Criterion | Status |
|-----------|--------|
| 6/6 render success | YES |
| PNG W×H vs ref (±2px W, ±80px H) | NO |
| No geometry structural flags | NO |
| Hero band diff < 5% each | NO |
| Images pending at capture | 0 |
| HTML unmodified | YES |
| **Overall** | **STITCH_BASELINE_RENDER_PARTIAL** — pixel % alone does not grant PASS; side-by-side required |

> **10 000px ref height:** Playwright did **not** clip at 10 000px (Home render **10 590px** device height). `home_spomove` and `spomove_system_spomove` reference PNGs are **exactly 10 000px** tall while DOM `scrollHeight×DPR2` is **10 590** and **10 370** — consistent with **Stitch export max canvas height**, not missing local sections. Width on SPOMOVE ref is **2463** vs **2464** (CSS **1231.5** not representable with integer DPR 2; profile uses **1232**).

### Residual differences (post-alignment, not repeating prior “half-height” diagnosis)

| Page | Geometry vs ref | Likely cause |
|------|-----------------|--------------|
| education / private / records | **Exact** W×H match | Residual **~2.3–2.7%** pixel diff — Tailwind CDN, Google Fonts/Material, image decode/AA |
| about | H **+44px** (within ±80) | Hero **~3.2%**; full-page **~11.8%** driven by **lower-page** drift (fonts/spacing), not hero layout collapse |
| home | H **+590px** vs ref | Ref likely **truncated** at 10 000px; hero **~28%** — truncated ref vs full DOM + CDN/font drift (review `03`/`05` in evidence) |
| spomove | W **+1px**, H **+370px** | Ref **10 000px** cap + **1232** vs **1231.5** CSS width; hero **~6.3%**, full **~8.3%** |

## Final visual diagnosis (2026-11-01)

**Overall gate:** `STITCH_BASELINE_RENDER_PARTIAL` (unchanged)  
**Method:** Existing `evidence/*/01–03` PNGs + vertical band diff (500px / Home hero 200px), `diagnosis/*/overlay-top.png`, Home `hero-diff-heatmap-2400.png`, DOM probe (`diagnosis/VISUAL_DIAGNOSIS.json`). No Stitch HTML/CSS edits.

```bash
node docs/operations/public-website-refactor/contract-draft/scripts/run-stitch-visual-diagnosis.mjs
```

### Per-page verdict

| Page | Visual PASS | Notes |
|------|-------------|--------|
| education_programs_spomove | **PO review** | PNG W×H exact; no layout-height drift |
| private_lesson_spomove | **PO review** | Same |
| field_records_spomove | **PO review** | Same |
| about_spomove | **NO** | +44px H; bottom-band drift (not top accumulation) |
| home_spomove | **NO** | Hero image band ≠ ref; ref 10k cap |
| spomove_system_spomove | **NO** | Ref 10k cap; dashboard/chart bands ≠ ref within overlap |

---

### education_programs_spomove / private_lesson_spomove / field_records_spomove

1. **일치:** DOM·캡처 환경(1280×DPR2) 기준 **PNG 크기 = ref**; GNB~본문 **섹션 순서·폭** 동일; 이미지 `complete` + `naturalWidth>0`.
2. **불일치:** 전역 **~2.2–2.7%** 픽셀 + 국소 band(히어로·사진 구간 **~3–6.5%**). Education 예: y=4000–4500 band **~0.001%** (거의 동일) ↔ y=500–1000 **~6.6%** (히어로/타이포·CDN).
3. **원인:** **픽셀/환경** — Tailwind CDN, Plus Jakarta/Material, `lh3` 512px 업스케일·AA. **구조 변경 아님.**
4. **캡처로 해결 가능:** DPR/viewport는 이미 정합; 추가 이득은 **동일 시점·동일 CDN 캐시** 또는 ref 재export뿐.
5. **치환 전:** 없음 (레이아웃 SSOT OK).
6. **PASS:** 자동 PASS 금지 — **`02` vs `01` + `diagnosis/*/overlay-top.png` side-by-side** 후 PO 확정.

---

### home_spomove (최우선)

1. **일치:** GNB **device y 0–162**, `innerWidth=1179`, DPR 2; H1 **2줄**, `56px/800`, Plus Jakarta; 히어로 `<img>` **complete, natural 512×279, visible**; rect **y≈1357, h≈975** (probe).
2. **불일치 (영역):** Hero band 27.91%는 **y=1200–2200 device px**에 집중 (**56–69%** band mismatch) = **16:9 쇼케이스 이미지 + gradient overlay + 하단 칩**. y=600–900 **~15–18%** (제목·CTA 주변). y=200–400 **~0%** (GNB 하단~배지 상단 일부). y=2700+ **~37–41%** = Section 02 **사진 카드** (CDN 픽셀).
3. **원인 구분:**
   - **디자인/콘텐츠:** ref PNG에 ** bake된 히어로 사진 픽셀** ≠ 현재 `lh3` 동일 URL 재-fetch (object-cover 크롭·디코드 차). **DOM/타이포 구조는 probe상 Stitch 스펙과 일치.**
   - **캡처:** ref **10 000px** 잘림 vs render **10 590px** — 하단 590px은 ref에 없음; hero diff와 **무관**.
   - **애니메이션:** `.animate-pulse` 배지 존재 → **프레임 차** 가능하나, y=1200+ 대 diff 주원인은 **아님** (heatmap 참조).
4. **캡처로 해결:** ref **전체 높이 재export** 또는 hero만 동일 타임스탬프 캡처; HTML 수정 없음.
5. **치환 전:** 히어로 **원본 대비 픽셀 정합** 또는 PO “Stitch ref 이미지 bake = SSOT” 승인; SPOKEDU 사진 치환은 **별 게이트**.
6. **PASS:** **NO** — `diagnosis/home_spomove/hero-diff-heatmap-2400.png`, `overlay-top.png`.

---

### about_spomove

1. **일치:** 히어로 band **~3.2%**; y=0–500 **~1.3%**; y=2000–4500 **~0.4–2.4%** (중단 **누적 오프셋 없음**).
2. **불일치:** PNG H **9910 vs 9866 (+44px)**; y=**7500–8500** band **~11–16%** (하단 CTA/푸터·이미지 밀집); full-page 11.77%는 **하단 가중** (히어로 아님).
3. **원인:** **+44px** = tail padding/마지막 섹션 **미세 레이아웃·줄바꿈** (CSS scroll 4955 vs ref-implied 4933). **7500+** = CDN 이미지/타이포 **픽셀 drift** — 상단 섹션 **위치 어긋남으로 누적된 것 아님** (band 증가가 7500에서 시작).
4. **캡처:** DPR2 정합; ref **9866 vs 9910** 재export 또는 PO tolerance.
5. **치환 전:** 하단 **44px·band 7500+** PO side-by-side.
6. **PASS:** **NO** (exact H 아님 + 하단 drift).

---

### spomove_system_spomove

1. **일치 (공통 10 000px):** y=0–500 **~2.6%**; y=3000–3500 **~1.7%**; width **2463 vs 2464** (1px).
2. **불일치:** ref **정확히 10 000px**; render **10 370px** (+370 below ref). **공통 10 000px** full diff **~19.5%** (cap만으로 설명 불가). 국소 spike: y=**2000–2500 ~41%**, **5000 ~33%**, **6000–6500 ~33–38%**, **8000–9000 ~28–51%** (다크 대시보드·차트·게이지 raster). Top **2400px** diff **~14.2%** (gate hero clip **~6.3%** — 클립 범위·임계값 차).
3. **10k 상한:** ref 파일 **exact 10 000**; 로컬 **clip 없음** — **Stitch export cap 기록**.
4. **1px 폭:** x-offset 1px 시험 **diff 동일** → 레이아웃 문제 아니라 **내용 픽셀** 차.
5. **치환 전:** 차트/대시보드 **ref bake vs live render** PO 확인; ref **10370** 높이 재export.
6. **PASS:** **NO** within overlap (dashboard bands).

---

### Evidence (diagnosis)

| Asset | Path |
|-------|------|
| Band + probe JSON | `stitch-baseline-render/diagnosis/VISUAL_DIAGNOSIS.json` |
| Overlay (ref 45% on render) | `stitch-baseline-render/diagnosis/<folder>/overlay-top.png` |
| Home hero heatmap | `stitch-baseline-render/diagnosis/home_spomove/hero-diff-heatmap-2400.png` |

**PO action to close gate:** Side-by-side on Education/Private/Records; Home hero + About 7500+ + SPOMOVE dashboard bands; optional Stitch **uncapped** `screen.png` for Home/SPOMOVE.

---

## Phase C0 — Next.js direct port (2026-11-01)

**Status:** Implementation landed behind `NEXT_PUBLIC_SPOKEDU_STITCH_C0=1` (default **off** → existing public site unchanged).  
**Verdict:** `STITCH_NEXTJS_FIDELITY_PASS` **not granted** — fidelity gate not executed (requires local dev + flag).

| Item | Location |
|------|----------|
| Ingested Stitch bodies | `app/spokedu/stitch/c0/bodies/*.html` |
| Shell (CDN Tailwind + fonts) | `app/spokedu/stitch/c0/StitchC0Shell.tsx` |
| Public route switch | `app/(spokedu-public)/*/page.tsx` + `SpokeduPublicLayoutGate` |
| Preview docs | `app/spokedu/stitch/c0/README.md` |
| QA script | `contract-draft/scripts/run-stitch-c0-fidelity-gate.mjs` |

**Worktree:** Not created — `main` has unrelated admin/settlement WIP; use `git worktree add ../1-stitch-c0 -b phase-c0/stitch-six-pages` when clean.

**Known risk (STOP if visual drift):** Root `app/globals.css` Tailwind v4 theme may interact with Stitch CDN utilities on the same document. If fidelity gate shows systematic color/spacing drift, PO must approve root-level CSS isolation (no Stitch HTML edits).

---

## Phase C direct integration (2026-11-01)

| Pre-check | Result |
|-----------|--------|
| HEAD | `986e2d46a542d8db30c736d94250cf4f2e817d51` |
| Working tree | Clean vs `origin/main` (no auto commit/reset) |
| C0 tree | `app/spokedu/stitch/c0/**` present |
| ZIP `code.html` SHA-256 | 6/6 match `STITCH_HTML_SHA256_MANIFEST.json` |

**Switch:** Stitch is **default on** for the six exact public paths. Rollback: `NEXT_PUBLIC_SPOKEDU_STITCH_C0=0`.

**Wired (step 6 partial):** `data-path` anchors → `SPOKEDU_PATHS` (inquiry → `/contact`). Visual DOM unchanged.

**Not done (awaiting approval / QA):** SPOKEDU final copy swap (step 4), approved photo swap (step 5), full fidelity gate screenshots, `STITCH_NEXTJS_FIDELITY_PASS`.

**Regression guard:** `/records/[slug]`, `/spokedu-lab`, `/spomat`, `/spomove/catalog`, `/contact` — not in `isStitchC0Path` exact set.
