# B2_MAPPING_RECONCILIATION

**Git HEAD:** `2a7125fa0a5305f286ff6c816db49e5d3a360af1`  
**914 partition sum:** 914 (must be 914)

## Mutually exclusive B2 states

| State | Count | Meaning |
|-------|------:|---------|
| DIRECT_MAPPING | 0 | Stitch element ID linked (normalized exact) |
| REWRITE_REQUIRED | 256 | Stage7 수정 제안 — PO copy approval |
| RETAIN_EXISTING_ROUTE | 35 | Outside Stitch 6 screens; keep LIVE route |
| REMOVAL_PROPOSED | 0 | Stage7 삭제/제거 판정 |
| NEW_ROUTE_REQUIRED | 213 | LIVE-only routes (/contact, /spokedu-lab, …) — IA PO |
| UNRESOLVED | 410 | On Stitch route; LIVE≠Stitch; no auto link |

## Reconciling prior B1 “UNRESOLVED 631”

B1 `CONTENT_CROSSWALK.mapping_status=UNRESOLVED`: **631** (Stitch-route rows with no exact normalized text match).

B2 uses **mutually exclusive** editorial + route states (256 rewrite rows are **not** also counted as UNRESOLVED):

| B2 state | Count |
|----------|------:|
| UNRESOLVED | 410 |
| REWRITE_REQUIRED | 256 |
| NEW_ROUTE_REQUIRED | 213 |
| RETAIN_EXISTING_ROUTE | 35 |
| DIRECT_MAPPING | 0 |
| REMOVAL_PROPOSED | 0 |

**410 + 256 + 213 + 35 + 0 + 0 = 914**

**283 “non-631” archive rows (914−631):** 256 rewrites + 213 LIVE-only Stitch-absent routes + 35 retain (e.g. `/spomat`) + 0 direct + 0 removal.

**631 → 410 UNRESOLVED:** 221 rows reclassified (chiefly 256 `수정 제안` prioritized over stitch-match UNRESOLVED).

### RETAIN_EXISTING_ROUTE by base route (top)

- `/spomat`: 35

Detail: `B2_BASELINE_914_CLASSIFICATION.csv`
