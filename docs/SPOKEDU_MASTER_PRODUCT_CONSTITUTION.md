# SPOKEDU MASTER — Product Constitution

**Status:** Foundation SSOT (Product Foundation Sprint)  
**Scope:** SPOKEDU MASTER (`app/spokedu-master`, related API, contract tests)  
**Audience:** Product Owner, implementers (Codex/agents), reviewers

This document defines **what good SPOKEDU MASTER means**. It is not an implementation spec.

---

## 1. Product North Star

SPOKEDU MASTER is a **professional operating product for physical-education instructors** — not a child-facing game UI.

Through MASTER, instructors should answer these recurring questions with less friction:

- 오늘 뭘 하지?
- 어떻게 준비하지?
- 어떻게 진행하지?
- 지난번에 뭐 했지?
- 수업 후 뭘 해야 하지?

**Core value:** Because MASTER exists, instructors do not have to prepare from scratch every time.

---

## 2. Core Value Loop

Internal product model (surfaces need not expose these labels verbatim):

| Phase | Job | Question |
|-------|-----|----------|
| **DISCOVER** | Find what to do | 무엇을 할까? |
| **PREPARE** | Get ready | 어떻게 준비할까? |
| **RUN** | Execute now | 지금 어떻게 진행할까? |
| **REMEMBER** | Restore context | 지난번 맥락을 어떻게 되살릴까? |
| **FOLLOW-UP** | Record, communicate, next | 기록·안내·다음 수업으로 어떻게 이어갈까? |

Every major surface must be explainable as serving one or more of these jobs.

---

## 3. Commercial Value

Paid subscription is justified by **reduced repetitive work**, not feature count.

- **Content** → discovery / acquisition value
- **Workflow continuity + history** → retention value
- **Premium** must strengthen the loop (Prepare → Run → Remember → Follow-up), not merely show more catalog items

Questions that must have clear answers before shipping paid promises:

- 4 weeks of use later, what becomes annoying without MASTER?
- What gets **repeatedly** better in Premium vs Lite?

If unclear → mark **COMMERCIAL GAP**; do not hide with copy.

---

## 4. Returning User Principle

Returning users must be **faster** than first-time users.

- Do not force re-discovery of context already chosen, confirmed, or used
- Do **not** skip safety, important settings, or execution confirmation for speed

Returning flows may skip exploration depth (e.g. Hub) when context is preserved — but must still pass appropriate confirmation gates (e.g. StartBriefing).

---

## 5. Home Principle

Home owns:

- **Curated discovery**
- **Operational continuity**
- **Fast re-entry**

Home is **not**:

- Library replacement
- Record manager
- Analytics dashboard
- Admin console

**Home 4+4 is CORE:** 4 lesson recommendations + 4 SPOMOVE featured slots (see PD-001).

---

## 6. Product Truth

UI must not claim more than the product actually delivers.

**Forbidden without backing data/behavior:**

- 추천 (when not algorithmically or editorially defined)
- 개인화 / 맞춤
- 자동화 / AI
- 실시간 / 스마트

CTA labels must describe what **actually happens** on the next step.

Examples:

- ✅ 「수업 준비」→ detail/prep surface
- ❌ 「바로 실행」→ implies autostart without confirmation
- ❌ 「이번 주 추천」→ without editorial/data contract

---

## 7. Professional Design

Priorities: **professional, fast, clear, trustworthy, field-usable**

- Not childish or overly colorful UI merely because the domain is youth PE
- Metadata neutral by default; emphasis only for status / execution / warning
- Same role = same grammar across pages
- Visual tokens, type, width, media, rhythm, CTA six: [Art Direction](../app/spokedu-master/MASTER_VISUAL_SYSTEM.md) only

Do not duplicate type scales or CTA recipes here.

---

## 8. Content Quality

Distinguish **technically renderable** from **commercially usable**:

| Tier | Meaning |
|------|---------|
| **READY** | Usable in the field now |
| **NEEDS IMPROVEMENT** | Usable but below commercial bar |
| **INCOMPLETE** | Unsuitable for representative exposure |

Do not fill empty areas with fake data or static samples that imply live recommendation.

Entitlement preview may use **editorial product preview** (category/type showcase) — not fake personalized recommendation (see PD-004).

---

## 9. Data / Privacy / Trust

Student records, class notes, and memos are **sensitive operational data**.

Maintain:

- Owner / tenant isolation
- Logging safety (no PII leaks in client logs)
- Purpose limitation
- Data minimization

---

## 10. Reliability

MASTER is used **before and during class**. These are UX, not backend-only:

- Save / recover / retry / draft
- Offline awareness
- Loading / error / empty states

Silent data loss or “saved” UI without durable persistence is P0.

---

## Contract Hierarchy

When principles conflict, resolve top-down:

1. **Product Truth / North Star**
2. **User Journey**
3. **Domain Meaning**
4. **Information Architecture**
5. **Interaction Semantics**
6. **Art Direction** (look)
7. **Existing implementation**
8. **Existing tests**

**Critical boundary:** Higher hierarchy defines **importance**, not **permission to change**.

Codex does **not** gain authority to REPLACE/REMOVE existing contracts because a higher principle suggests a better design. That authority lives in [Decision Protocol](./SPOKEDU_MASTER_PRODUCT_DECISION_PROTOCOL.md).

---

## Governance Relationship

| Document / Rule | Role |
|-----------------|------|
| This Constitution | Why and what “good” means |
| [Decision Protocol](./SPOKEDU_MASTER_PRODUCT_DECISION_PROTOCOL.md) | When and how contracts change |
| [Art Direction](../app/spokedu-master/MASTER_VISUAL_SYSTEM.md) | Visual SSOT (L2) |
| [Sprint Brief Template](./SPOKEDU_MASTER_SPRINT_BRIEF_TEMPLATE.md) | Scoped implementation input |
| [Design Governance](./SPOKEDU_MASTER_DESIGN_GOVERNANCE.md) | Visual doc/rule inventory (not a fifth UI spec) |
| `.cursor/rules/spokedu-master-product-governance.mdc` | Agent enforcement |
| `.cursor/rules/preserve-existing-behavior.mdc` | No unapproved behavior change |

**Core principle:**

> Think globally. Decide explicitly. Implement only approved scope.

---

## Seed Product Decisions (Approved)

These are binding until explicitly superseded via Decision Protocol.

| ID | Decision |
|----|----------|
| **PD-001** | Home 4+4 (4 lesson + 4 SPOMOVE featured) is CORE |
| **PD-002** | Today Lesson primary CTA = 「수업 준비」 |
| **PD-003** | Operational record panel (compact ActivityPanel) does not mix account/plan badges; account surfaces own subscription identity |
| **PD-004** | Entitlement preview: no static samples that read as live recommendation; editorial category preview allowed |
| **PD-005** | SPOMOVE new exploration vs recent rerun need not share navigation depth; rerun may skip Hub after StartBriefing + user confirmation |
| **PD-006** | Session route entry ≠ autostart; judge by runtime state (entry mode, briefing, autostart flag, confirmation) |

Full registry: [Decision Protocol § Approved Decisions](./SPOKEDU_MASTER_PRODUCT_DECISION_PROTOCOL.md#approved-product-decisions).

---

## Related SSOT (do not duplicate)

- Visual SSOT: `app/spokedu-master/MASTER_VISUAL_SYSTEM.md`
- Commercial ops: [spokedu-master-commercial-runbook.md](./spokedu-master-commercial-runbook.md)
- SPOMOVE contract: `app/spokedu-master/spomove/SPOMOVE_PRODUCT_CONTRACT.md`
- Public product slice: `app/spokedu-master/lib/publicProductContract.ts`
