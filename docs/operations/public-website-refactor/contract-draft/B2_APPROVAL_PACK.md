# B2_APPROVAL_PACK

**Purpose:** PO decides **6 bundles**, not 914 line-by-line. Trace via CSV IDs.

| decision_id | Bundle | approval_status |
|-------------|--------|-----------------|
| DEC-PACK-01 | 브랜드 및 페이지 정보구조 | PENDING_APPROVAL |
| DEC-PACK-02 | 주요 사업·제품 사실 | PENDING_APPROVAL |
| DEC-PACK-03 | 페이지별 핵심 문구 | PENDING_APPROVAL |
| DEC-PACK-04 | 디자인 예외 | PENDING_APPROVAL |
| DEC-PACK-05 | 실제 이미지·사례 | PENDING_APPROVAL |
| DEC-PACK-06 | 문의 및 CTA 기능 계약 | PENDING_APPROVAL |

### DEC-PACK-01 — 브랜드 및 페이지 정보구조

- Scope: Stitch header/nav vs site.ts vs SSOT §05 vs HOME_DESIGN_CANONICAL
- Links: {"scope":"Stitch header/nav vs site.ts vs SSOT §05 vs HOME_DESIGN_CANONICAL","linked_facts":"FACT-NAV-SSOT-001;FACT-NAV-CANON-001","linked_changes":"CHG-NAV-CONFLICT-001","baseline_rows":213}

### DEC-PACK-02 — 주요 사업·제품 사실

- Scope: G05–G08,G07 SPOMOVE/KC/metrics; FACT registry UNVERIFIED
- Links: {"scope":"G05–G08,G07 SPOMOVE/KC/metrics; FACT registry UNVERIFIED","linked_issues":"G05;G06;G07;G08","linked_changes":"CHG-STAGE7-G05..G08"}

### DEC-PACK-03 — 페이지별 핵심 문구

- Scope: 256 REWRITE_REQUIRED + 631 UNRESOLVED Stitch-route copy slots
- Links: {"scope":"256 REWRITE_REQUIRED + 631 UNRESOLVED Stitch-route copy slots","linked_file":"B2_COPY_REVIEW.csv;B2_BASELINE_914_CLASSIFICATION.csv","trace":"baseline_text_id → proposed_copy_draft (not final)"}

### DEC-PACK-04 — 디자인 예외

- Scope: 44 DESIGN_LOCKED elements; structure_change REQUIRED_SPOKEDU_FACTS
- Links: {"scope":"44 DESIGN_LOCKED elements; structure_change REQUIRED_SPOKEDU_FACTS","linked_file":"STITCH_DESIGN_FIDELITY.json;B2_DESIGN_EXCEPTIONS.md"}

### DEC-PACK-05 — 실제 이미지·사례

- Scope: Stitch CDN imgs; Gate B; catalog card counts
- Links: {"scope":"Stitch CDN imgs; Gate B; catalog card counts","linked_conflicts":"DC-005;DC-006"}

### DEC-PACK-06 — 문의 및 CTA 기능 계약

- Scope: G01–G04; contact/private forms; Stitch CTA regions
- Links: {"scope":"G01–G04; contact/private forms; Stitch CTA regions","linked_issues":"G01;G02;G03;G04"}


Phase C **not authorized** by this pack.
