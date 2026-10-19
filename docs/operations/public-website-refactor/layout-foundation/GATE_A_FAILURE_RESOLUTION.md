# Gate A — failure resolution (50 → 0)

## Execution state (final)

| Field | Value |
|--------|--------|
| Git HEAD | `7f32fc3a18925fe0e463471a494b45072f3ca753` |
| Prior run (history) | `WIDTH_QA_HISTORY_104x50_2026-10-19.json` — **104 PASS / 50 FAIL** |
| Final run | `WIDTH_QA.json` — **154 PASS / 0 FAIL** |
| Build ID | see final `WIDTH_QA.json` (`buildId`) |
| CSS product diff | `home-web.module.css` (Gate A hero), `about-landing.tsx` (capture stability only) |
| CSS swap in runner | **disabled** — `gate-a-run-evidence.mjs` no longer mutates working tree |

## Root-cause classes (prior 50)

| Route | Count | Class | Resolution |
|-------|------:|-------|------------|
| `/contact` | 14 | `QA_SELECTOR_ERROR` | Multi-step **contact flow** (type select → form → submit present/visible); no submit-on-load assumption |
| `/partners` | 4 | `QA_SELECTOR_ERROR` | `#cta` scoped CTA + post-scroll Playwright box check; not global `a[href="/contact"]` |
| `/education` | 14 | `QA_MEASUREMENT_ERROR` | Hero **H1 text left** vs `education-hub` breakpoints (not `.site-container` rail) |
| `/spomove` | 8 | `QA_MEASUREMENT_ERROR` | Hero H1 vs **clamp gutter** + text-rail centering formula |
| `/spokedu-lab` | 8 | `QA_MEASUREMENT_ERROR` | LAB nav **padding tiers** (18 / 24 / 40px) on `masterLocalNavInner` |
| `/records` | 2 | `QA_MEASUREMENT_ERROR` | Hero title left vs records rail inset at 1024–1199 |
| `/private` | (in full run) | `QA_MEASUREMENT_ERROR` | **Focused marketing** inset ladder (same family as contact) |

No additional layout CSS was changed to “force pass” beyond existing approved Gate A hero + about motion fix.

## Contact flow fields (all widths)

Recorded per result under `contact`: `typeSelectorVisible`, `typeSelectionWorked`, `formVisibleAfterSelection`, `submitControlPresent`, `submitControlVisible`, `formLayoutValid`, `failureReason`.

## Alignment anchors

See `scripts/gate-a-alignment.mjs` — modes: `standard`, `education-hero`, `spomove-hero`, `records-hero`, `lab-nav`, `contact-page`, `focused-marketing`.

## Evidence unchanged

- BEFORE/AFTER manifests + home 1024·1199 fold SHA diffs  
- `HERO_BREAKPOINT_METRICS_{BEFORE,AFTER}.json`  

## Final verdict

`LAYOUT_TECHNICAL_PASS_PO_PENDING` — technical QA 154/154; PO visual sign-off separate.
