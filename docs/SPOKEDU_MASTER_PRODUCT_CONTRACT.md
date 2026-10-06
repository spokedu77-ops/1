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
- Lite owns the complete general teaching-management loop across PREPARE, RUN, REMEMBER, and FOLLOW-UP. Premium inherits that complete loop and adds SPOMOVE digital movement content and execution capability.
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

## 12. Decision Authority

Resolve work top-down:

1. Product, data, and security invariants
2. The user's current explicit request and approved Product Decisions
3. A user-approved Target Reference for the affected surface
4. Surface role and User Journey
5. Visual System defaults
6. Existing implementation
7. Existing tests

Existing implementation and tests are evidence, not higher authority than an approved change. This ordering never authorizes a visual request to change data meaning, session lifecycle, persistence, owner/tenant isolation, entitlement, pricing, authentication/authorization, navigation destination meaning, SPOMOVE runtime semantics, or an approved Product Decision. Those changes remain governed by the Product Decision workflow.

## 13. Change Authority

Use only this classification:

- **KEEP:** preserve current product meaning and behavior; no separate product decision is required.
- **REFINE:** improve UI, expression, structure, code shape, or visual consistency without changing product meaning. This expressly includes layout recomposition, DOM/component structure, panel/card structure, spacing, typography hierarchy, responsive structure, content density, visual presentation of information disclosure, CSS architecture, and component splitting or consolidation. It must be explicitly within the user request or approved Sprint Brief.
- **REPLACE CANDIDATE:** replace an existing CTA meaning, journey entry, navigation default, or workflow. Product Owner approval is required.
- **REMOVE CANDIDATE:** delete a surface, persistence behavior, or user-visible capability. Product Owner approval is required.

Product Owner approval is also required for new workflow, navigation, plan, entitlement, persistence, session-lifecycle, product-promise, or ambiguous semantics. North Star alignment is not approval.

A UI structure change is not by itself a Product Change. A Product Decision Gate is required when the change alters the meaning of the workflow, stored data, state transitions, permissions, persistence, navigation destination, entitlement, or another protected invariant. Existing user-visible capabilities remain unless removal is explicitly approved.

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
| PD-010 | Session-linked roster tools use only students explicitly recorded as `present` for that Session. `absent` and unrecorded students are excluded; missing attendance must never be inferred as absence. Standalone Class Tools default to the selected Class roster and allow a non-persistent `today participant` inclusion set; this must not be represented as saved attendance. The resolved participant scope applies uniformly to random picker, team assignment, order, tournament, and ladder tools. |
| PD-011 | The commercial plan contract is: Free may browse Library, open exactly the first `WEEKLY_PROGRAM_IDS` slot as its single full-detail weekly preview, and run stopwatch, timer, and scoreboard; the five roster-based Class Tools require Lite. Lite is the complete general teaching-management plan, including full Library, Favorites, all eight Class Tools, Classes, Students, schedules, Session composition and operation, attendance, Session memo, student observations, next-Session notes, previous-record continuity, and parent notices. Premium is Lite plus all SPOMOVE capabilities; records and continuity are not Premium differentiators. SPOMAT member pricing is not a MASTER subscription benefit. Existing prices, Toss billing, promotion grants, persistence, Session semantics, and SPOMOVE runtime semantics remain unchanged. |
| PD-012 | To recover an accidental Session start without rewriting real teaching history, a started scheduled Session may return from RUN to PREP only while it has no run evidence. The server must atomically reject the transition when any Session activity is completed or any non-deleted Session Capture exists. A successful undo clears `startedAt` and `rosterLockedAt`, while preserving Session composition, attendance, memo, and other preparation data. The RUN footer exposes this as a small secondary **수업 시작 취소** action beside **수업 완료**. Compatibility impact is additive: existing Sessions and evidence remain unchanged, and only an explicit eligible undo invokes the new transition. |
| PD-013 | Every existing PREP Session (`scheduled` with `startedAt == null`) must expose **수업 시작** as its primary footer action, including Sessions with no activities yet. Activity preparation guidance may remain visible, but it must not replace or remove the lifecycle start action. |
| PD-014 | Standalone Class Tools expose an optional Session selector beside the Class selector. With no Session selected, tools use the selected Class's current roster and any inclusion changes are temporary and non-persistent. When a Session is explicitly selected, Class Tools read and write that Session's canonical attendance through the existing attendance persistence path; only students explicitly marked `present` participate in roster tools, while `absent` and unrecorded students remain excluded. Class Tools must not silently reuse attendance from a previously edited Session. |
| PD-015 | SPOMOVE execution volume must match the engine's real completion condition. Instant color-layout memory (`spatial` level 7) is round-based and completes after the Preset's authored round count, not after `cueSeconds × rounds` wall time; its runtime HUD uses the shared display-number typography. Color-number memory is described as 10 memory items plus 5 questions and must not expose the internal engine level number. `dive-standard` includes five 20-second training stages plus a 60-second BONUS by default; Start and Result describe 160 seconds as active exercise time with transition guidance separate, and do not present the irrelevant generic cue-seconds value. |
| PD-016 | The public Sequential Memory catalog follows learning progression rather than legacy insertion order: sequence-memory activities first, then instant color-layout memory 3×3 before 4×4, followed by color-number memory. The 3-color, 5-color, and growing-sequence activities use a per-stimulus random exposure duration from 1 to 3 seconds and describe it consistently as `1~3초 랜덤` in Admin, Start, Settings, and Result. Internal engine level numbers and generated color distributions are not user-facing performance results. |
| PD-017 | Motion Gate (`dive-color-gate-61`) is a fixed 20-gate repetition activity, not a time-limited stage. Cue seconds control each gate's approach duration. Runtime completes after the twentieth passed gate and shows `current / 20` with a matching bottom progress bar; Start, Settings, Result, and catalog metadata describe 20 repetitions rather than 60 seconds. |

## 18. Pending Decision Candidates

All remain **PENDING** and must not be implemented without Product Owner approval.

| ID | Candidate |
|---|---|
| DC-001 | Connect `selectMasterLoopAction` to a visible CTA or remove dead logic. |
| DC-002 | Decide treatment of legacy `?autostart=1` without `entry`. |
| DC-003 | Define Center / Team self-serve versus sales-led UX. |
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

An approved implementation scope may authorize targeted unit or contract tests, TypeScript checks, lint for changed files, rendered QA, and responsive screenshot comparison. Verification remains limited to that approved scope.

Static verification is not a rendered visual PASS. Visual PASS requires populated desktop and mobile review and, when a Target Reference exists, side-by-side review. The Visual System defines the evidence and the Surface Matrix records it.

## 22. Core Principle

> Think globally. Decide explicitly. Implement only approved scope.

## 23. Class Management Protected Invariants

The rules in this section are protected product contracts, not incidental descriptions of the current implementation. General refactoring, cleanup, or visual polish must not alter them.

### 23.1 Session lifecycle

- `scheduled` with `startedAt == null` is PREP and is displayed as **예정**.
- `scheduled` with `startedAt != null` is RUN and is displayed as **진행 중**.
- `completed` is displayed as **완료**. `cancelled` is displayed as **취소**.
- `startedAt` is the authoritative RUN marker. Activity completion counts must not infer that a Session has started.
- RUN may offer **수업 시작 취소** beside completion only when PD-012 eligibility is satisfied. The server is authoritative and performs the evidence check and rollback atomically. A successful undo returns the Session to PREP by clearing `startedAt` and `rosterLockedAt`; it must not delete preparation data.
- Starting a clean Session calls start directly. Starting a dirty Session must persist the Session, then attendance, then call start. A failed save must prevent start.
- Every existing PREP Session must retain **수업 시작** regardless of whether activities have been added. The add-activity intent must not suppress the lifecycle action.
- RUN must retain its footer/action area and must always offer **수업 완료**.
- Incomplete activities do not block Session completion. They require user confirmation; completed activities require no such warning.
- Activity completion and Session completion are independent states. Completing every activity does not automatically complete the Session.

### 23.2 Canonical status display

User-visible Session status is resolved canonically from `status + startedAt`. Session Detail, Agenda, and Month Calendar must use that same resolver. A surface must not map every `scheduled` Session to **예정** without considering `startedAt`.

### 23.3 Previous Session import

- **이전 수업 가져오기** candidates are every completed Session before `targetDay`, sorted newest first. Candidates must not be collapsed to the newest Session per Class.
- The supported modes are **활동 없이 만들기**, **모든 활동 가져오기**, and **가져올 활동 선택**.
- All-activity import sends every currently selectable source activity ID through the selective carryover semantics.
- The next-Session API requires explicit copy intent: `copyPrograms: false` for no activities, or `sourceSessionProgramIds` for selective/all import. Missing intent must return HTTP 400 and must never fall back to a historical roster-copy path.

### 23.4 Carryover data and roster

Previous Session import may reuse only the Class identity, activity identity, activity order, and the source time of day as a default. It must not copy attendance results, present/absent state, memo, observation, capture, parent notice, `startedAt`, `completedAt`, historical records, or completed activity state. Every copied activity starts with `isCompleted = false`.

The roster meaning of the new Session is current Class membership, not the source Session's historical roster. Stale roster cloning, source attendance cloning, conversion of previous attendance to pending attendance, and immediate roster locking are prohibited. A Session created through previous Session import has `rosterLockedAt = null`.

### 23.5 Recurrence

Weekly, biweekly, and `RegularSchedulePanel` recurrence controls are not current product surfaces. Historical backend artifacts do not make recurrence a user feature. Recurrence must not be exposed again without an explicit approved Product Decision.

### 23.6 Protected existing capabilities

The following Class Management capabilities are protected existing behavior: Calendar, date Agenda, new Session, new Class creation, Session schedule change, cancel, restore, cancelled Session deletion, Program activity addition, SPOMOVE activity addition, Favorites activity addition, activity reorder/removal/completion, attendance, mark-all-present, Session memo, per-student observation, next-Session note, previous Session memory, Session start/completion, previous Session import, Class roster management, and monthly attendance projection.

UI polish or refactoring must not remove these capabilities or narrow their semantics without approval.

### 23.7 Change authority and regression protection

Changing a protected invariant requires this order:

1. Write and approve a Product Decision.
2. Update this Product Contract first, including the reason and migration/compatibility impact.
3. Change implementation only after contract approval.
4. Update the invariant regression tests.
5. Perform browser/manual verification when the real user flow changes.

The prohibited order is implementation change, test accommodation, then retrospective contract editing. The required order is **PRODUCT DECISION → CONTRACT → IMPLEMENTATION → TEST**.

Regression coverage must reject at least these failures: `run-next-activity` resolving to no action; a started scheduled Session displaying **예정**; previous Sessions collapsing to one per Class; source roster or attendance cloning; copied activities retaining `isCompleted = true`; missing carryover intent falling back to the fresh RPC; and recurrence UI reappearing without a Product Decision.

## 24. Commercial Access Hardening Decision

- Billing subscriptions describe only real paid Toss billing state. Promotional access must never create fake subscriptions, billing keys, payment orders, payment successes, renewal schedules, or automatic charges.
- Promotional entitlement is stored as a separate, auditable grant owned by the verified `user_id`. Unregistered recipients receive a revocable invite whose one-time token is stored only as a hash; redemption occurs only after account and email verification.
- A one-month event grant means 30 days from activation/redeem time. Timestamps are stored in UTC and rendered in the user's display timezone.
- Effective access is the highest currently valid entitlement across paid billing and active promotional grants: Free < Lite < Premium. Expiry or revocation of a grant reveals the still-valid paid entitlement; it never modifies or deletes billing state or user data.
- Promotion-only users must see promotion wording and an end date. Billing-only controls such as next payment, automatic billing cancellation, or billing failure must not be shown without a real billing subscription.
- Server capability checks and owner scoping remain authoritative. Client plan values and hidden navigation are never authorization sources.
- Production accepts only Toss `live_*` server and client keys. QA authentication bypasses and display-name-based administrator authorization are prohibited in product runtime.
