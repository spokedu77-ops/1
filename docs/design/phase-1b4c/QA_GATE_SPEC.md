# Phase 1-B4C — QA_GATE_SPEC

## Gate 1 — STATIC CSS CONTRACT

- **명령:** `node docs/design/phase-1b4c/home-css-contract.mjs`
- **PASS:** missingCount === 0, exit 0
- **FAIL:** exit 1

## Gate 2 — RUNTIME VISUAL CONTRACT

- **전제:** `npm run build` → `PORT` fresh `npm run start` → BUILD_ID 기록
- **명령:** `node docs/design/phase-1b4c/home-visual-qa.mjs after`
- **필수 PASS:**
  - GATEWAY_LAYOUT_1440: 3 cards, same row (top within 8px)
  - GATEWAY_LAYOUT_390: 3 cards vertical stack
  - RECORDS_BG_1440: bg rgb(11,31,70), 3 tiles
  - RECORDS_LAYOUT_390: 3 tiles
  - LAB_STYLE_390: no `144+`, img naturalWidth > 0
  - LAB_OBJECT_FIT_MOBILE: object-fit contain
  - HERO_CTA_941: both CTAs in viewport, top ≥ 0
  - all viewports overflowX false
- **FAIL:** any check FAIL → exit 1

## Gate 3 — INDEPENDENT AUDIT

- **명령:** `node docs/design/phase-1b4c/home-qa-audit.mjs`
- **PASS:** live gatewayCards === 3, evidence overall PASS, no mismatches

## Fail-closed

NOT_VERIFIED/BLOCKED on any mandatory gate → **전체 PASS 금지**
