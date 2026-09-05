# SPOKEDU MASTER — Product Decision Protocol

**Status:** Foundation SSOT  
**Companion:** [Product Constitution](./SPOKEDU_MASTER_PRODUCT_CONSTITUTION.md)

This document defines **how product contracts change** — not what the product should become.

---

## 1. Decision Authority Boundary

### Codex / agents MAY (without extra approval)

- **KEEP** — preserve existing approved behavior
- **REFINE** — propose or implement when change is **explicitly in Sprint Brief** or user request, and does not alter product semantics listed below

### Codex / agents MUST NOT implement without Product Owner approval

| Class | Examples |
|-------|----------|
| **REPLACE** | Swap CTA meaning, change journey entry, new default navigation |
| **REMOVE** | Delete surface, drop persistence, remove user-visible capability |
| New **workflow semantics** | autostart, skip briefing, merge discover/run |
| New **navigation semantics** | tab order, shell visibility, gate bypass |
| New **plan semantics** | tier capability, pricing promise, entitlement matrix |
| New **persistence semantics** | draft keys, owner scope, merge rules |
| New **product promise** | “추천”, “맞춤”, “자동”, AI, real-time |
| **Ambiguous changes** | Multiple reasonable interpretations |

**North Star is not approval.** Logical fit ≠ Product Decision.

---

## 2. Three-Stage Protocol (+ Cross-Check)

Every meaningful MASTER product change follows:

### Stage 1 — READ-ONLY AUDIT

**No code changes.**

Document:

- Current behavior (runtime, not URL guess)
- Callers & consumers
- Tests & contracts
- State source → destination
- User segment & entitlement
- Upstream / downstream

Output classification per item:

- KEEP
- REFINE
- REPLACE CANDIDATE
- REMOVE CANDIDATE

### Stage 2 — DECISION GATE

Product Owner selects one:

- **APPROVE**
- **APPROVE WITH CHANGE**
- **REJECT**
- **DEFER**

**No REPLACE/REMOVE implementation before approval.**

Approved decisions become Sprint Brief entries or update PD registry below.

### Stage 3 — IMPLEMENTATION

Implement **only** approved scope from Sprint Brief.

If new product-meaning conflict appears mid-implementation:

1. **STOP**
2. Report with evidence
3. Await additional approval

### Stage 4 — CROSS-CHECK

After implementation, verify:

- Upstream / downstream surfaces
- Same semantics elsewhere (duplicate CTAs, parallel flows)
- Responsive layouts
- Entitlement gates
- Persistence side effects
- Contract tests

---

## 3. Contract Replacement Before-Rule

Before classifying behavior as REPLACE/REMOVE candidate:

1. Search all **callers**
2. Search all **consumers**
3. Search related **tests**
4. Find **adjacent flows** with same user intent
5. Compare **first-use vs returning-user**
6. Confirm **actual runtime transition** on destination screen
7. Check **state / persistence** side effects
8. Check **entitlement** differences

**Do not classify behavior by URL pathname alone.**

Example: `/spomove/session` entry is not autostart. Trace:

- `entry` query (`start` | `settings`)
- `autostart` legacy flag
- `StartBriefing` visibility
- Engine idle → running transition
- User confirmation action

Evidence: `sessionEntryMode.ts`, `session/page.tsx`, `SPOMOVE_PRODUCT_CONTRACT.md`.

---

## 4. User Segment Contract

Every audit must segment:

| Segment | Notes |
|---------|-------|
| First user | No history, drafts, or today lesson |
| Returning user | Has drafts, recent, today lesson, or records |
| Free | Capability from access snapshot |
| Lite | Library + class tools |
| Premium | + records, SPOMOVE |
| Team / Center | Sales-led; **not** same as Premium identity |
| Admin / internal | Capability override; **not** a customer plan |

Verify capability from `/api/spokedu-master/access` → `masterAccessModel.ts`, not stale profile helpers alone.

---

## 5. Decision Candidate Format

REPLACE/REMOVE candidates **must** use this template (in audit or brief):

```
ID: DC-XXX
CURRENT CONTRACT:
OBSERVED BEHAVIOR:
WHY IT MAY BE WRONG:
USER IMPACT:
COMMERCIAL IMPACT:
OPTION A:
OPTION B:
OPTION C: (if relevant)
RECOMMENDED OPTION:
WHY:
AFFECTED SURFACES:
AFFECTED TESTS:
MIGRATION / PERSISTENCE RISK:
IMPLEMENTATION RISK:
PRODUCT OWNER DECISION: PENDING
```

**No code change while PENDING.**

---

## 6. Approved Product Decisions (Seed Registry)

| ID | Decision | Evidence / Notes |
|----|----------|------------------|
| **PD-001** | Home **4+4** is CORE (4 weekly lesson cards + 4 SPOMOVE featured slots) | `DashboardView.tsx` `WEEKLY_RECOMMENDATION_COUNT = 4`; featured SPOMOVE slots |
| **PD-002** | Today Lesson primary CTA = **「수업 준비」** | `LessonCatalogCard`, `homeOpsModel` today_lesson anchor |
| **PD-003** | Compact operational ActivityPanel (**안내문 · 기록**) excludes account/plan badges; profile/subscription surfaces own plan identity | Dashboard uses `ActivityPanel compact`; full variant badge → profile link (non-compact only) |
| **PD-004** | Entitlement preview: editorial category preview OK; no fake live/personalized recommendation | `EntitlementPreviewHome.tsx` `LIBRARY_PREVIEW_CATEGORIES`; `publicProductContract.ts` |
| **PD-005** | SPOMOVE new vs recent rerun: different depth OK; rerun → StartBriefing → confirm → run; may skip Hub | `SpomoveHubView` recent actions; `masterUserLoop` `rerun_spomove` |
| **PD-006** | Session URL entry ≠ autostart; use runtime transition | `sessionEntryMode.ts`, `publicOfficialPresetSessionHref` forces `autostart: false` for public links |
| **PD-007** | `masterUserLoop` / `rerun_spomove` contract — **no further change** in current cycle | Restored baseline; treat as KEEP until new decision |

Visual file authority is **not** a Product Decision. See `MASTER_VISUAL_SYSTEM.md` header. Do not add PD-009+ for typography source, audit source, or component authority.

**PD-008 (closed):** legacy governance, 2026-09-05 — **SUPERSEDED.** Not a behavior decision. Kept here only so the ID is not reused.

---

## 7. Pending Decision Candidates (Foundation Sprint)

These are **not approved**. Do not implement.

| ID | Summary | Status |
|----|---------|--------|
| **DC-001** | Wire `selectMasterLoopAction` to visible primary CTA vs remove dead logic | PENDING |
| **DC-002** | Legacy `?autostart=1` without `entry` — retain, redirect, or remove post-release | PENDING |
| **DC-003** | Center/Team self-serve UX vs sales-only (capability exists; journey UNKNOWN) | PENDING |
| **DC-004** | Free user path clarity: EntitlementPreviewHome vs class-tools-only loop | PENDING |
| **DC-005** | Consolidate continuity signals (drafts vs today lesson vs recent SPOMOVE priority UX) | PENDING |
| **DC-006** | Deprecate stale `lib/subscription.ts` profile helpers vs access snapshot SSOT | PENDING |

Details: [Audit Baseline](./SPOKEDU_MASTER_PRODUCT_AUDIT_BASELINE.md).

---

## 8. Sprint Brief Requirement

Implementation sprints must include:

1. [Product Constitution](./SPOKEDU_MASTER_PRODUCT_CONSTITUTION.md) (reference, not paste)
2. This Decision Protocol
3. Completed [Sprint Brief](./SPOKEDU_MASTER_SPRINT_BRIEF_TEMPLATE.md)
4. UI work: [Art Direction](../app/spokedu-master/MASTER_VISUAL_SYSTEM.md) — not archived v3, not Foundation audit, not `MASTER_ART_DIRECTION.md` pointer

Codex must not implement product behavior **outside** Sprint Brief scope.

---

## 9. Rule Conflict Resolution

If Cursor rules conflict:

1. **Product governance** (this sprint) defines hierarchy and approval gates
2. **preserve-existing-behavior** blocks unapproved changes
3. **Visual SSOT** (`MASTER_VISUAL_SYSTEM.md`) owns look; work-principles / cta-unity are pointers only
4. **no-verify-shell** — no test/lint/build commands unless user explicitly requests

If still ambiguous → **report**; do not pick arbitrarily.

**Think globally. Decide explicitly. Implement only approved scope.**
