# APPROVAL_DECISIONS — Phase B1 (all pending)

**Status:** Every row in generated contracts defaults to `PENDING_APPROVAL`.  
**Phase C:** Forbidden until human approval recorded here.

| Decision ID | Subject | Options | Decision | Approver | Date |
|-------------|---------|---------|----------|----------|------|
| DEC-NAV-001 | Global header IA | SSOT §05 vs HOME_DESIGN_CANONICAL vs current site.ts | PENDING | | |
| DEC-STAGE7-001 | Import Stage7 audit pack | Files in contract-draft/sources/stage7 | INGESTED — line approval still PENDING | | |
| DEC-STAGE7-GATES | Stage7 integrated gates G01–G24 | Per ROOT_ISSUES CSV | PENDING | | |
| DEC-STITCH-001 | Stitch redesign baseline | B0 zip + canonical vs SSOT | INGESTED — approval still PENDING | | |
| DEC-STITCH-MAP | Baseline↔Stitch UNRESOLVED rows | Manual review only — no AI semantic merge | PENDING | | |
| DEC-HERO-001 | Hero representative photo | gym-motion vs coaching (PUBLIC_REFACTOR_AUDIT) | PENDING | | |
| DEC-GATEB-001 | Image remapping | GATE_B plan + rights | PENDING | | |
| DEC-RELEASE-001 | Production deploy | FINAL_QA PO gate | PENDING | | |

## How to approve a contract row

1. Set `approval_status` / `publication_approval` on the specific CSV/JSON row (never bulk APPROVED).
2. Copy approved `after_proposal` into a new Phase C execution registry (separate from this draft).
3. Re-run validation items V6–V8 for approved rows only.
