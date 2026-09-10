# SPOKEDU MASTER — Product Contract

**Status:** Canonical product SSOT
**Scope:** SPOKEDU MASTER product meaning and product-change governance
**Audience:** Product Owner, implementers, reviewers, Codex, Cursor, and other agents
**Authority:** This is the sole MASTER product and product-decision authority. It does not replace visual, domain, or code-owned SSOTs identified below.

## 1. Product Definition

SPOKEDU MASTER is a professional operating product for physical-education instructors, not a child-facing game UI. It helps instructors repeatedly discover, prepare, run, remember, and follow up on instruction.

## 2. Product North Star

MASTER reduces the need for instructors to prepare every class from scratch. It should answer recurring operational questions: what to do today, how to prepare, how to run it, what happened last time, and what must happen after class.

## 3. Core Value Loop

The official internal product loop is:

`DISCOVER → PREPARE → RUN → REMEMBER → FOLLOW-UP`

These labels are an internal model and need not appear verbatim in UI. Do not replace them with `DISCOVER → BUILD → TEACH → CAPTURE → REUSE` or invent another product loop.

## 4. Commercial Value

- Content provides discovery and acquisition value.
- Workflow continuity and history provide retention value.
- Premium must strengthen PREPARE, RUN, REMEMBER, and FOLLOW-UP continuity rather than merely expose more catalog items.
- Pricing and purchasability are owned by `app/spokedu-master/lib/productCatalog.ts`; do not duplicate price numbers here.

## 5. Returning User Principle

Returning users should regain known context faster than first users. Speed must not bypass safety, important settings, execution confirmation, or SPOMOVE Start confirmation.

## 6. Home Principle

Home owns curated discovery, operational continuity, and fast re-entry. It is not a Library replacement, analytics dashboard, record manager, or admin console. Home 4+4 remains approved: four weekly lesson recommendations and four featured SPOMOVE items.

## 7. Product Truth

Do not claim recommendation, personalization, matching, automation, AI, real-time behavior, or smart behavior without backing data and actual behavior. CTA text must name the next real transition. Do not imply immediate engine execution when confirmation still occurs.

## 8. User Segments

Audits and decisions must distinguish:

- First user and returning user
- Free, Lite, and Premium
- Team / Center, which is not another name for Premium
- Admin / internal, which is not a customer plan

Capability comes from the access code SSOT, not from profile badges or visual locks.

## 9. Content Quality

Classify representative content as READY, NEEDS IMPROVEMENT, or INCOMPLETE. Technically renderable content is not necessarily commercially usable. Do not fill gaps with fake data that implies a live or personalized recommendation. Editorial product previews are allowed where PD-004 permits them.

## 10. Data / Privacy / Trust

Student records, notes, and class data are sensitive operational data. Preserve owner/tenant isolation, purpose limitation, data minimization, and safe logging without client-side PII leakage.

## 11. Reliability

Save, recovery, retry, drafts, offline awareness, and loading/error/empty states are product UX. Silent data loss or success UI without durable persistence is P0.

## 12. Contract Hierarchy

Resolve importance top-down:

1. Product Truth / North Star
2. User Journey
3. Domain Meaning
4. Information Architecture
5. Interaction Semantics
6. Visual System
7. Existing Implementation
8. Existing Tests

A higher contract defines importance; it does not grant permission to change a lower contract. Change authority is governed by the next section.

## 13. Change Authority

Use only this classification:

- **KEEP:** preserve current product meaning and behavior; no separate product decision is required.
- **REFINE:** improve UI, expression, structure, code shape, or visual consistency without changing product meaning. It must be explicitly within the user request or approved Sprint Brief.
- **REPLACE CANDIDATE:** replace an existing CTA meaning, journey entry, navigation default, or workflow. Product Owner approval is required.
- **REMOVE CANDIDATE:** delete a surface, persistence behavior, or user-visible capability. Product Owner approval is required.

Product Owner approval is also required for new workflow, navigation, plan, entitlement, persistence, session-lifecycle, product-promise, or ambiguous semantics. North Star alignment is not approval.

## 14. Product Change Workflow

1. **READ-ONLY AUDIT:** inspect actual behavior and classify KEEP, REFINE, REPLACE CANDIDATE, or REMOVE CANDIDATE.
2. **DECISION GATE:** the Product Owner approves, approves with change, rejects, or defers candidates.
3. **IMPLEMENTATION:** implement only the approved user request or Sprint Brief scope. Stop when a new semantic conflict appears.
4. **CROSS-CHECK:** verify upstream/downstream behavior, parallel flows, user segments, entitlement, persistence, responsive surfaces, and relevant contracts.

## 15. Audit Requirements

Before a meaningful product change, inspect current runtime behavior, callers, consumers, tests, contracts, state source and destination, upstream/downstream and parallel flows, user segment, entitlement, persistence, and first-user versus returning-user behavior. Never infer behavior from a URL or component name alone.

## 16. Decision Candidate Format

```text
ID:
CURRENT CONTRACT:
OBSERVED BEHAVIOR:
WHY IT MAY BE WRONG:
USER IMPACT:
COMMERCIAL IMPACT:
OPTION A:
OPTION B:
OPTION C:
RECOMMENDED OPTION:
WHY:
AFFECTED SURFACES:
AFFECTED TESTS:
MIGRATION / PERSISTENCE RISK:
IMPLEMENTATION RISK:
PRODUCT OWNER DECISION: PENDING
```

Do not implement a candidate while its decision is PENDING.

## 17. Approved Product Decisions

| ID | Decision |
|---|---|
| PD-001 | Home 4+4 is CORE: four weekly lesson cards and four featured SPOMOVE slots. |
| PD-002 | Today Lesson primary CTA is lesson preparation. |
| PD-003 | The compact operational ActivityPanel does not mix account/plan badges; account surfaces own subscription identity. |
| PD-004 | Entitlement preview may show an editorial category/type preview, but must not imitate live or personalized recommendation. |
| PD-005 | SPOMOVE new exploration and recent rerun may have different navigation depth; rerun may skip Hub but still passes StartBriefing, confirmation, then run. |
| PD-006 | Session route entry is not autostart; determine behavior from entry mode, briefing, legacy autostart flag, confirmation, and engine state. |
| PD-007 | `masterUserLoop` / `rerun_spomove` remains KEEP in the current cycle. |
| PD-008 | Closed legacy governance ID; superseded and not reusable. It is not a behavior decision. |
| PD-009 | Library NEW is only for newly listed 놀이체육 activities, for 14 days from catalog listed time. The unfiltered catalog end copy is 「업데이트 예정」 only. |

## 18. Pending Decision Candidates

All remain **PENDING** and must not be implemented without Product Owner approval.

| ID | Candidate |
|---|---|
| DC-001 | Connect `selectMasterLoopAction` to a visible CTA or remove dead logic. |
| DC-002 | Decide treatment of legacy `?autostart=1` without `entry`. |
| DC-003 | Define Center / Team self-serve versus sales-led UX. |
| DC-004 | Clarify the Free user journey. |
| DC-005 | Consolidate continuity-signal priority. |
| DC-006 | Resolve stale subscription helpers versus the access snapshot SSOT. |

The [Product Audit Baseline](./SPOKEDU_MASTER_PRODUCT_AUDIT_BASELINE.md) is historical evidence only, not current authority.

## 19. Domain / Code SSOT

| Responsibility | Authority |
|---|---|
| Visual character, tokens, type, spacing, media, CTA grammar | `app/spokedu-master/MASTER_VISUAL_SYSTEM.md` |
| Surface role and rendered-QA ledger | `app/spokedu-master/MASTER_SURFACE_MATRIX.md` |
| SPOMOVE semantics | `app/spokedu-master/spomove/SPOMOVE_PRODUCT_CONTRACT.md` |
| Pricing / product availability | `app/spokedu-master/lib/productCatalog.ts` |
| Public product slice | `app/spokedu-master/lib/publicProductContract.ts` |
| Client access / entitlement | `app/spokedu-master/lib/masterAccessModel.ts` |
| Server access / entitlement | `app/lib/server/spokeduMasterAccess.ts` |
| Primary navigation labels | `app/spokedu-master/components/layout/masterNavLabels.ts` |
| Route capability / safe return | `app/spokedu-master/components/layout/masterRouteAccess.ts` |
| Persistence / domain models | Actual schema, migrations, and implementation code for the affected domain |

Code-owned values must not be duplicated here. Confirm current paths before relying on them.

## 20. Implementation Scope Rule

A completed [Sprint Brief](./SPOKEDU_MASTER_SPRINT_BRIEF_TEMPLATE.md), or an explicit user request with equally clear scope, defines implementation permission. Global analysis does not authorize global refactoring. Governance cleanup does not authorize product behavior, UI, route, entitlement, pricing, database, persistence, navigation, session, or SPOMOVE runtime changes.

## 21. Verification / Cross-check

By default, use file inspection, static reasoning, available diagnostics, link-path checks, authority-reference searches, and changed-file review. Do not run `npm`, `npx`, tests, TypeScript, ESLint, or builds unless the user explicitly requests them or an approved Sprint Brief requires them.

Static verification is not a rendered visual PASS. Rendered visual PASS requires the evidence defined by the Visual System and recorded in the Surface Matrix.

## 22. Core Principle

> Think globally. Decide explicitly. Implement only approved scope.
