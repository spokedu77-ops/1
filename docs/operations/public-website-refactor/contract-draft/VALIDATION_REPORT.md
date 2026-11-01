# VALIDATION_REPORT — Phase B1 contract draft

**Generated:** 2026-10-31T20:06:13.841Z  
**Git HEAD:** `2a7125fa0a5305f286ff6c816db49e5d3a360af1`  
**Overall:** `CONTRACT_DRAFT_READY_FOR_REVIEW`

## Summary

| Metric | Value |
|--------|------:|
| Public surface files in manifest | 445 |
| FACT_REGISTRY rows | 34 |
| DESIGN_CONTRACT components | 51 |
| CHANGE_CONTRACT rows | 31 |
| CONTENT_CROSSWALK rows (excl. header) | 914 |
| Stage7 baseline IDs loaded | 910 / 914 expected |
| Stage7 copy rewrite proposals (편집 판정) | 256 |
| B0 input zip present | true |
| Stitch HTML parsed | 6 / 6 |
| Stitch screen images | 6 / 6 |
| Stitch text/media elements | 135 |
| Baseline→Stitch EXACT (normalized) | 0 |
| Baseline UNRESOLVED (Stitch on route, no exact match) | 631 |
| Unmapped Stitch elements | 135 |
| Validation checks passed | 16 / 17 |

## Checks

| ID | Pass | Detail |
|----|:----:|--------|
| V1_STAGE7_914_IDS | PASS | 914 archive rows; 910 unique 검수 ID (2 duplicated IDs in source — not auto-fixed); 1289 ALL rows; 24 root issues |
| V2_STITCH_HTML_6 | PASS | HTML parsed 6/6; elements 135; images 6/6; DESIGN.md yes |
| V2b_B0_MANIFEST_HASH | PASS | SOURCE_INPUT_MANIFEST.json OK (6 files checked) |
| V2c_STITCH_ID_DUPES | PASS | Stitch element IDs unique |
| V3_ROOT_ISSUES_24 | PASS | 24 root issues; representative evidence tokens found in 1289 union ID set |
| V4_FILE_PATHS_EXIST | PASS | All manifest paths exist |
| V5_SOURCE_HASH_RECORDED | PASS | SHA-256 and git blob recorded for enumerated public surface files |
| V6_BEFORE_VALUES | PASS | Stage7 crosswalk before strings archived; automated live HEAD string diff not run (BY DESIGN B0) |
| V7_APPROVAL_NOT_POLLUTED | PASS | No APPROVED statuses |
| V8_NO_UNAPPROVED_NEW_FACTS | PASS | proposed_claim empty for all facts (no new published claims) |
| V9_PUBLIC_CODE_UNTOUCHED | PASS | Generator only writes under contract-draft/ |
| V10_WORKING_TREE_PRESERVED | PASS | No git write operations performed by generator |
| V1b_CROSSWALK_DUP | PASS | 914 unique composite keys (검수 ID + 원문 대장 번호) in CONTENT_CROSSWALK export |
| V1c_STAGE7_REVIEW_ID_DUPES | PASS | META-01×3, META-02×3 only — disambiguated by archive_row_number + duplicate_review_id_in_914; source IDs unchanged, no merge |
| V11_MAPPING_COVERAGE | PASS | 914 baseline rows; Stitch EXACT 0; UNRESOLVED 631; NO_MAPPING 0; unmapped stitch elements 135 |
| V12_DESIGN_ASSET_INVENTORY | PASS | 13 assets SHA-256; DESIGN_LOCKED elements 44 |
| V13_DESIGN_FIDELITY_PASS | FAIL | NOT_GRANTED in Phase B1 — inventory + lock contract only; visual QA deferred to Phase C per addendum |

## Doc vs implementation notes (no auto-resolution)

- `docs/SPOKEDU_PUBLIC_WEBSITE_SSOT.md` §05 primary header ≠ `SPOKEDU_HOME_DESIGN_CANONICAL.md` nav list ≠ current `site.ts` labels/order.
- `PUBLIC_REFACTOR_AUDIT.md` records partition copy targets `records-landing-legacy` patterns; HEAD uses `records-v0-landing` via re-export.

## Blockers for `CONTRACT_DRAFT_READY_FOR_REVIEW`

1. `SPOKEDU_PHASE_B0_SOURCE_INPUTS.zip` ingested.
2. SOURCE_INPUT_MANIFEST hash check PASS.
3. Stitch 6 HTML + 6 images + DESIGN.md OK.
4. Automated HEAD live-text diff vs 914 archive — **not run** (by design).

## Paths

- Stage7: `contract-draft/sources/stage7/`
- B0 extract: `contract-draft/sources/b0-extracted/`
