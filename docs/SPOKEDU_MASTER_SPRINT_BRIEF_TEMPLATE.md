# SPOKEDU MASTER — Sprint Brief Template

**Use with:** [Product Contract](./SPOKEDU_MASTER_PRODUCT_CONTRACT.md), [Visual System](../app/spokedu-master/MASTER_VISUAL_SYSTEM.md) for UI work, and the relevant domain contract when applicable.

Complete every section before implementation.

## SPRINT NAME

## PRODUCT PROBLEM

## USER JOURNEY

Use only: DISCOVER / PREPARE / RUN / REMEMBER / FOLLOW-UP.

## TARGET USERS

- [ ] First user
- [ ] Returning user
- [ ] Free
- [ ] Lite
- [ ] Premium
- [ ] Team / Center
- [ ] Admin / internal

## CURRENT BEHAVIOR

Evidence-based summary. Do not infer runtime behavior from pathname or component name alone.

## APPROVED PRODUCT DECISIONS

List applicable PD IDs and Product Owner decisions.

## TARGET REFERENCE

- Type: None / Inspiration Reference / User-approved Target Reference
- Artifact or link:
- Affected surface(s):
- Approved visual attributes (composition, proportions, spacing, hierarchy, density, alignment, controls, disclosure defaults, emphasis, responsive intent):
- MASTER adaptations required to preserve product/data/security invariants:

## IN SCOPE

## OUT OF SCOPE

Include no unrelated refactors.

## FILES / SURFACES TO INSPECT

| Path | Reason |
|---|---|
| | |

## CONTRACTS TO PRESERVE

Separate protected product behavior/capabilities from visual implementation that may change. Do not list DOM, Tailwind classes, pixel values, or current component decomposition as protected contracts unless they directly implement an accessibility or semantic API.

## APPROVED CONTRACT CHANGES

| ID | From → To | Approval date |
|---|---|---|
| | | |

Empty means none.

## STOP CONDITIONS

Stop and report any unapproved entitlement, persistence, route/navigation, session lifecycle, SPOMOVE runtime, pricing/product-promise, or approved-PD conflict, and any ambiguous product change with multiple reasonable interpretations.

## ACCEPTANCE CRITERIA

## REGRESSION CHECK

- [ ] Upstream entry paths
- [ ] Downstream destinations
- [ ] Parallel surfaces with the same semantics
- [ ] Mobile / tablet / desktop
- [ ] Entitlement gates by applicable segment
- [ ] Persistence / drafts
- [ ] First-user / returning-user behavior

## TEST / QA SCOPE

State the approved manual, static, automated, and rendered-QA scope. An approved brief may explicitly authorize targeted unit/contract tests, TypeScript checking, lint for changed files, rendered QA, and responsive screenshot comparison. Do not assume permission to run shell verification when it is absent here.

Tests should protect behavior, state transitions, persistence, permissions, accessibility contracts, and access to core functions—not exact Tailwind classes, pixel values, or incidental DOM hierarchy.

Static verification is not rendered visual PASS. UI PASS requires at minimum populated desktop and populated mobile review. When a Target Reference exists, include side-by-side visual review.

## FINAL REPORT FORMAT

1. Changes versus brief
2. PD / DC references
3. Deviations or stop conditions
4. Regression and QA results
5. Files touched
