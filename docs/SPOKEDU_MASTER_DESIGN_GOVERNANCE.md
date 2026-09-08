# SPOKEDU MASTER — Visual Document Inventory / Authority Map

**Status:** Governance inventory; not a visual or product SSOT
**Scope:** MASTER visual documents, surface QA, and adjacent agent rules

No fifth visual/product SSOT may be created.

| Responsibility | Authority |
|---|---|
| Product meaning and decisions | [Product Contract](./SPOKEDU_MASTER_PRODUCT_CONTRACT.md) |
| Visual system | [MASTER_VISUAL_SYSTEM.md](../app/spokedu-master/MASTER_VISUAL_SYSTEM.md) |
| Surface role / rendered-QA ledger | [MASTER_SURFACE_MATRIX.md](../app/spokedu-master/MASTER_SURFACE_MATRIX.md) |
| SPOMOVE domain semantics | [SPOMOVE_PRODUCT_CONTRACT.md](../app/spokedu-master/spomove/SPOMOVE_PRODUCT_CONTRACT.md) |
| Implementation scope | A completed [Sprint Brief](./SPOKEDU_MASTER_SPRINT_BRIEF_TEMPLATE.md) or explicit user request |

## Inventory

| Path | Classification | Role |
|---|---|---|
| `app/spokedu-master/MASTER_VISUAL_SYSTEM.md` | KEEP | Sole visual SSOT |
| `app/spokedu-master/MASTER_SURFACE_MATRIX.md` | KEEP | Roles and 390/1440 rendered-QA ledger only |
| `app/spokedu-master/MASTER_ART_DIRECTION.md` | POINTER | Compatibility pointer; no independent authority |
| `app/spokedu-master/UI_FOUNDATION_V3_SURFACE_AUDIT.md` | ARCHIVE IN PLACE | Historical evidence; no implementation authority |
| `docs/archive/spokedu-master-visual/MASTER_VISUAL_SYSTEM_v3.md` | ARCHIVE | Historical visual text |
| `docs/SPOKEDU_MASTER_PRODUCT_CONSTITUTION.md` | POINTER | Superseded product pointer |
| `docs/SPOKEDU_MASTER_PRODUCT_DECISION_PROTOCOL.md` | POINTER | Superseded decision pointer |
| `docs/SPOKEDU_MASTER_PRODUCT_AUDIT_BASELINE.md` | HISTORICAL EVIDENCE | Product audit evidence, not authority |
| `.cursor/rules/spokedu-master-product-governance.mdc` | KEEP / ENFORCEMENT | Points to repository entry and canonical contracts |
| `.cursor/rules/spokedu-master-work-principles.mdc` | POINTER | No local philosophy |
| `.cursor/rules/spokedu-master-cta-unity.mdc` | POINTER | No local CTA grammar |
| `.cursor/rules/preserve-existing-behavior.mdc` | KEEP | Behavior guardrail |
| `.cursor/rules/no-verify-shell.mdc` | KEEP | Verification guardrail |

Archived audits and static tests cannot declare rendered visual PASS. Rendered status belongs only in the Surface Matrix and requires the evidence defined by the Visual System. Home status must not be changed to PASSED without populated 390 and 1440 human review evidence.

Canonical surface roles remain distinct: Home is Editorial Discovery; Library Detail is Editorial Preparation; SPOMOVE Hub is Digital Sports Discovery; SPOMOVE Start is Execution Confirmation. Shared grammar does not require identical pages. Class Tools remains a Live Instrument exception; Session / Activity remains BLOCKED where populated lifecycle evidence is unavailable.
