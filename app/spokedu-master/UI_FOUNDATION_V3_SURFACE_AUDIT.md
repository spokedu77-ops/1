# ARCHIVE — UI Foundation v3 surface audit

**Authority: none.** This file is a historical screenshot / migration log from Visual Foundation v3.

- Do not implement UI from this table.
- Do not treat `PASSED` here as rendered visual PASS.
- Live 390/1440 ledger: `MASTER_SURFACE_MATRIX.md`
- Visual SSOT: `MASTER_VISUAL_SYSTEM.md`
- Governance: `docs/SPOKEDU_MASTER_DESIGN_GOVERNANCE.md`

Product behavior, routes, persistence, entitlement, and session lifecycle were never owned here.

---

# UI Foundation v3 surface audit (historical)

This inventory was the implementation companion to `MASTER_VISUAL_SYSTEM.md` (now superseded).

| Route family | Surface family | Primary primitive | State model | Implementation | Visual proof |
| --- | --- | --- | --- | --- | --- |
| `/spokedu-master` | Editorial | Editorial hierarchy, media rails, contextual continuity | Inline | MIGRATED | PASSED |
| `/programs` | Editorial | Page shell, page header, media gateway | Inline | MIGRATED | PENDING |
| `/favorites` | Editorial | Page shell, page header, typed content cards | Inline | MIGRATED | PENDING |
| `/library` | Editorial | Editorial header, search hierarchy, sections, content cards | Inline | MIGRATED | PASSED |
| `/spomove`, SPOMOVE preview | Digital | Digital taxonomy, media cards, shared preview | Inline / gate | MIGRATED | PASSED |
| `/manage` | Operational | Page shell, page header, agenda, section, collection row | Inline | MIGRATED | PASSED |
| `/classes`, `/students` | Operational | Page shell, page header, section, collection row | Inline | MIGRATED | PASSED |
| `/classes/:id`, `/students/:id` | Operational detail | Operational header, row history, inline guidance/state | Inline | MIGRATED | PASSED |
| `/activity` | Session workspace | Lifecycle-owned composition with context, activity sequence, capture, and one state primary | Contextual | MIGRATED | BLOCKED |
| `/report` | Document | Document surface | Inline | MIGRATED | PASSED |
| `/class-tools` | Live utility | Existing utility surface | Immediate | COMPATIBILITY | PASSED |
| `/payment`, `/subscription` | Commercial support | Existing gate/payment surface | Contextual | NOT_MIGRATED | UNVERIFIED |

## Visual evidence policy

Static contracts, lint, TypeScript, and token-count checks establish `STATIC VISUAL CONTRACT`; they do not establish rendered quality. `RENDERED VISUAL PROOF` is tracked independently as `PASSED`, `PENDING`, `FAILED`, or `UNVERIFIED`. A route without reviewed screenshots is `UNVERIFIED` (or `PENDING` while its required capture set is in progress), never a Visual PASS.

SPOMOVE rendered proof was reviewed at 1440px and 390px in both default and selected-Family states. The reviewed captures have no document-level horizontal overflow or repeated Browse execution actions and preserve the five-item Family navigation.

## Rendered visual proof sweep — 2026-09-04

Empty Favorites must not be treated as mixed-content visual proof. Surfaces listed as PENDING require populated screenshots at 390px and 1440px before they can be marked PASSED.

| Surface | Implementation | Rendered proof | Fixture state |
| --- | --- | --- | --- |
| Home | MIGRATED | PASSED | Weekly recommendations |
| Programs populated | MIGRATED | PENDING | Editorial gateway with representative content |
| Library | MIGRATED | PASSED | Editorial landing |
| Favorites mixed populated | MIGRATED | PENDING | Lesson + SPOMOVE saved together |
| Program Preview populated | MIGRATED | PENDING | Short and long summary content |
| SPOMOVE Start mobile | MIGRATED | PENDING | Ready confirmation at 390px |
| Library Detail execution | MIGRATED | PENDING | Video + 2-step method, no equal-height panels |
| Library Detail preparation | MIGRATED | PENDING | Equipment rail + setup image + description script + briefing |
| Library Detail related | MIGRATED | PENDING | Three related videos with reasons |
| Library Detail recall | MIGRATED | PENDING | Last-class continuity note present |
| SPOMOVE default | MIGRATED | PASSED | All Families |
| SPOMOVE selected Family | MIGRATED | PASSED | Signal response |
| Manage | MIGRATED | PASSED | Current week |
| Classes | MIGRATED | PASSED | Three classes |
| Class Detail | MIGRATED | PASSED | One-student class with history |
| Students | MIGRATED | PASSED | Three students |
| Student Detail | MIGRATED | PASSED | One completed-session history |
| Session PREP | MIGRATED | PASSED | Scheduled session with two programs |
| Session TEACH | MIGRATED | BLOCKED | No in-progress fixture; no lifecycle mutation permitted |
| Session CAPTURE | MIGRATED | BLOCKED | No wrap/capture fixture; no lifecycle mutation permitted |
| Report | MIGRATED | PASSED | Completed-session notice |
| Class Tools | COMPATIBILITY | PASSED | Stopwatch landing |

### Human review matrix

| Surface | Role | Hierarchy | Density | CTA | Mobile | Consistency |
| --- | --- | --- | --- | --- | --- | --- |
| Home | PASS | PASS | PASS | PASS | PASS | PASS |
| Programs populated | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| Library | PASS | PASS | PASS | PASS | PASS | PASS |
| Favorites mixed populated | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| Program Preview populated | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| SPOMOVE Start mobile | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| Library Detail execution | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| Library Detail preparation | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| Library Detail related | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| Library Detail recall | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| SPOMOVE default | PASS | PASS | PASS | PASS | PASS | PASS |
| SPOMOVE selected Family | PASS | PASS | PASS | PASS | PASS | PASS |
| Manage | PASS | PASS | PASS | PASS | PASS | PASS |
| Classes | PASS | PASS | PASS | PASS | PASS | PASS |
| Class Detail | PASS | PASS | PASS | PASS | PASS | PASS |
| Students | PASS | PASS | PASS | PASS | PASS | PASS |
| Student Detail | PASS | PASS | PASS | PASS | PASS | PASS |
| Session PREP | PASS | PASS | PASS | PASS | PASS | PASS |
| Session TEACH | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Session CAPTURE | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Report | PASS | PASS | PASS | PASS | PASS | PASS |

Session compatibility note: `SPM_JOURNEY_STACK`, `CONTEXT`, `SECTION`, `HEADING`, `META`, and `FIELD` remain as narrow lifecycle presentation roles. Generic `SPM_JOURNEY_SURFACE` and decorative `SPM_JOURNEY_EYEBROW` are no longer dependencies of the Session workspace. Runtime selectors, persistence, and action policy remain unchanged.

## Remaining compatibility boundary

The session workspace still consumes the established `SPM_JOURNEY_*` semantic tokens. They are a lifecycle-specific compatibility layer, not a general page/card architecture. Removing them requires a dedicated no-behavior-change session pass and is intentionally not mixed into the operational list migration.

Home, Library, and the SPOMOVE Hub/Preview are migrated as representative visual surfaces. SPOMOVE runtime/Engine internals are outside that presentation status and remain unchanged.

The deprecated general-purpose `SPM_COLLECTION_CARD`, `SPM_STATE_PANEL`, and `SPM_EMPTY_PANEL` tokens have no runtime consumers and were removed. Deep operational details and live/session utilities remain explicit compatibility backlog.

The Favorites API `legacySchema` branch remains a transition shim until the production typed migration, NOT NULL constraint, typed unique key, and API health are verified. The steady-state cleanup target is zero untyped reads and writes.
