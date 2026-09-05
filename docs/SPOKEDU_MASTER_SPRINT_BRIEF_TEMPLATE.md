# SPOKEDU MASTER — Sprint Brief Template

**Use with:** [Constitution](./SPOKEDU_MASTER_PRODUCT_CONSTITUTION.md) + [Decision Protocol](./SPOKEDU_MASTER_PRODUCT_DECISION_PROTOCOL.md) + (UI) [Art Direction](../app/spokedu-master/MASTER_VISUAL_SYSTEM.md)

Copy this file per sprint. Fill all sections before implementation.

---

## SPRINT NAME

`[e.g. HOME-CONTINUITY-01]`

## PRODUCT PROBLEM

What recurring instructor job is painful or broken?

## USER JOURNEY

Which loop phase(s)? DISCOVER / PREPARE / RUN / REMEMBER / FOLLOW-UP  
Which journey ID(s) from audit? (J1–J10)

## TARGET USERS

- [ ] First user
- [ ] Returning user
- [ ] Free / Lite / Premium / Team / Admin

## CURRENT BEHAVIOR

Evidence-based summary (files, runtime flow). No URL-only inference.

## APPROVED PRODUCT DECISIONS

List PD-XXX IDs that apply. Link new decisions approved in Stage 2.

## IN SCOPE

Bullet list of allowed changes (files/surfaces).

## OUT OF SCOPE

Explicit exclusions. Include “no unrelated refactors”.

## FILES / SURFACES TO INSPECT

| Path | Why |
|------|-----|
| | |

## CONTRACTS TO PRESERVE

Tests, SSOT docs, PD-XXX, behavior that must not change.

## APPROVED CONTRACT CHANGES

Only items approved at Decision Gate. Empty = none.

| ID | From → To | Approval date |
|----|-----------|---------------|
| | | |

## STOP CONDITIONS

When implementer must halt and report (e.g. new entitlement semantics, persistence key change).

## ACCEPTANCE CRITERIA

Checkable outcomes per user segment.

## REGRESSION CHECK

- [ ] Upstream entry paths
- [ ] Downstream destinations
- [ ] Parallel surfaces with same semantics
- [ ] Mobile / tablet / desktop
- [ ] Entitlement gates (Free/Lite/Premium/expired)
- [ ] Persistence / drafts
- [ ] Contract tests listed: ___

## TEST / QA SCOPE

What manual or automated verification is expected (user runs unless explicitly delegated).

## FINAL REPORT FORMAT

Implementer returns:

1. Summary of changes vs brief
2. PD / DC references
3. Deviations (if any) and why stopped
4. Regression check results
5. Files touched

---

## Example (minimal)

```markdown
SPRINT NAME: SPOMOVE-BRIEFING-COPY-01

PRODUCT PROBLEM: StartBriefing CTA copy inconsistent with PD-002 grammar.

USER JOURNEY: J3, J4 — PREPARE → RUN

TARGET USERS: Premium returning

CURRENT BEHAVIOR: StartBriefing shows 「수업 시작」 (StartBriefing.tsx)

IN SCOPE: Copy-only alignment in StartBriefing.tsx if approved

OUT OF SCOPE: autostart, entry= semantics, engine routing

CONTRACTS TO PRESERVE: PD-006, spomoveFlow.contract.test.ts

APPROVED CONTRACT CHANGES: none

ACCEPTANCE CRITERIA: Contract tests pass; no autostart behavior change
```
