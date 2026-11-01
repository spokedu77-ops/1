# SCOPE_CORRECTION — Stitch 6 pages only

**Git HEAD:** `2a7125fa0a5305f286ff6c816db49e5d3a360af1`  
**Phase C:** **NOT STARTED**

## Final scope

| Stitch route | HTML folder |
|--------------|-------------|
| `/` | `home_spomove/code.html` |
| `/education` | `education_programs_spomove/code.html` |
| `/private` | `private_lesson_spomove/code.html` |
| `/spomove` | `spomove_system_spomove/code.html` |
| `/records` | `field_records_spomove/code.html` (landing only) |
| `/about` | `about_spomove/code.html` |

## Out of scope (retain unchanged)

`/spokedu-lab`, `/spomat`, `/spomove/catalog`, `/contact`, `/records/*` detail, `/partners`, all other routes.

**213 `NEW_ROUTE_REQUIRED` B2 rows → execution `OUT_OF_SCOPE_RETAIN_UNCHANGED` (not deleted).**

## 914 archive + execution layer

| Layer | Count |
|-------|------:|
| B2 classification preserved | 914 (`B2_BASELINE_914_CLASSIFICATION.csv`) |
| `IN_SCOPE_STITCH_6` | 547 |
| `OUT_OF_SCOPE_RETAIN_UNCHANGED` | 367 |

Detail: `B2_BASELINE_914_EXECUTION_SCOPE.csv`

## Copy work (not 914 bulk apply)

| Metric | Count |
|--------|------:|
| Stitch text/media elements (6 routes) | 135 |
| `STITCH_6_COPY_LEDGER` rows | 135 |
| Stage7 `수정 제안` on 6 routes | 205 (subset of 256) |
| 256 total rewrites (reference) | 256 — **205 in scope** |

Per page summary:

- `/`: 23 stitch elements; 25 rewrite proposals (stage7 in-scope rows 61)
- `/education`: 24 stitch elements; 75 rewrite proposals (stage7 in-scope rows 160)
- `/private`: 23 stitch elements; 37 rewrite proposals (stage7 in-scope rows 79)
- `/spomove`: 18 stitch elements; 37 rewrite proposals (stage7 in-scope rows 87)
- `/records`: 23 stitch elements; 14 rewrite proposals (stage7 in-scope rows 81)
- `/about`: 24 stitch elements; 17 rewrite proposals (stage7 in-scope rows 79)

## Deliverables

1. `STITCH_6_COPY_LEDGER.csv` — per Stitch element
2. `STITCH_6_IMAGE_MAPPING.csv` — 34 image frames (CDN → approved asset TBD)
3. `STITCH_6_REWRITE_SUBSET.csv` — in-scope editorial proposals only
4. Design exceptions — `B2_DESIGN_EXCEPTIONS.md` (6-page conflicts)
5. Out-of-scope code changes: **0** (generator-only; `app/spokedu/**` untouched)
6. Pending approval — below

## Pending user approval

- DEC-PACK-01 — Stitch nav labels vs SPOKEDU site.ts (6 pages only)
- DEC-PACK-03 — STITCH_6_COPY_LEDGER draft slots
- DEC-PACK-04 — Design exceptions on 6 pages
- DEC-PACK-05 — Images: Stitch CDN → approved /public/images/spokedu
- DEC-PACK-06 — /education & /private CTA → existing contact flows (no /contact page refactor)
- G01–G04 — consent/API (verify only; fix out of scope unless CTA on 6 pages)

## Principles

- Stage7 = fact/copy **reference** only
- Stitch = **design SSOT**
- No finalized copy without `PENDING_APPROVAL` → explicit PO sign-off per DEC-PACK

## B2 delta

- Added execution scope layer; did **not** remove B2 states or 914 rows
- `NEW_ROUTE_REQUIRED` remains in B2 file but **excluded from execution**
